// core/shell-ui.js
// Shared UI shell: element wiring, global event handlers, question loading,
// the step-by-step guide container, results, progress. One copy for every
// module. (Was: basic-methods/ui.js.) Two things became generic:
//   - the answer area is rendered by the question-type plugin (numeric-input)
//   - filter checkboxes are discovered from config.filters
// Unit-cancellation init is delegated to the step plugin's afterRender hook.

import { renderStep } from './render-step.js';

export function createShellUI(ctx) {
  const { state, dom, config } = ctx;
  const quiz = () => ctx.quiz;

  const baseElementIds = [
    'questionText', 'answerInput', 'answerUnit', 'answerUnitDropdown', 'answerFeedback',
    'checkAnswer', 'showStepsBtn', 'nextQuestion', 'prevQuestion', 'stepsContainer',
    'steps', 'progressBar', 'questionsCompleted', 'questionsRemaining', 'questionCard',
    'results', 'restartBtn', 'viewHistoryBtn', 'answerContainer',
  ];
  const filterElementIds = (config.filters || []).map((f) => `${f.id}Filter`);

  const ui = {
    elements: {},
    _currentHistoryEntry: null,

    init() {
      [...baseElementIds, ...filterElementIds].forEach((id) => {
        this.elements[id] = dom.get(id);
      });
      this.setupEventHandlers();
    },

    setupEventHandlers() {
      document.addEventListener('click', (e) => {
        if (e.target.id === 'checkAnswer') {
          quiz().checkAnswer();
        } else if (e.target.id === 'showStepsBtn') {
          quiz().toggleSteps();
        } else if ((e.target.id === 'nextQuestion' || e.target.id === 'stepNextQuestion') && !e.target.disabled) {
          quiz().nextQuestion(e);
        } else if (e.target.id === 'restartBtn') {
          ctx.storage.clearState();
          quiz().init();
        } else if (e.target.classList.contains('step-check-btn')) {
          const stepContainer = e.target.closest('.equation-container, .operation-container');
          if (stepContainer) quiz().checkStepInputs(stepContainer);
        } else if (e.target.id === 'viewHistoryBtn') {
          ctx.history.openHistoryModal();
        } else if (e.target.id === 'clearProgressBtn') {
          if (confirm('Are you sure you want to clear all your saved progress? This action cannot be undone.')) {
            ctx.storage.clearState();
            alert('Your saved progress has been cleared.');
            quiz().init();
          }
        } else if (e.target.id === 'prevQuestion') {
          quiz().prevQuestion();
        } else if (e.target.id === 'answerBtn') {
          quiz().showAnswer();
        }
      });

      document.addEventListener('keyup', (e) => {
        if (e.key !== 'Enter') return;
        if (e.target === this.elements.answerInput) { quiz().checkAnswer(); return; }
        if (e.target.classList.contains('answer-input')) { quiz().checkAnswer(); return; }
        if (e.target.classList.contains('box-input')) {
          const stepContainer = e.target.closest('.equation-container, .operation-container');
          const checkBtn = stepContainer && stepContainer.querySelector('.step-check-btn');
          if (checkBtn) {
            checkBtn.click();
            setTimeout(() => {
              if (stepContainer.querySelector('.hint-correct')) {
                const currentStep = e.target.closest('.step');
                const nextStep = currentStep && currentStep.nextElementSibling;
                const nextInput = nextStep && nextStep.querySelector('.box-input');
                if (nextInput) nextInput.focus();
                else {
                  const nb = document.getElementById('stepNextQuestion');
                  if (nb && !nb.disabled) nb.focus();
                }
              }
            }, 50);
          }
        }
        if ((e.target.id === 'stepNextQuestion' || e.target.id === 'nextQuestion') && !e.target.disabled) {
          quiz().nextQuestion(e);
        }
      });

      this.elements.steps.addEventListener('input', (e) => {
        if (e.target.classList.contains('box-input')) e.target.style.backgroundColor = '';
      });

      (config.filters || []).forEach((f) => {
        const el = this.elements[`${f.id}Filter`];
        if (el) el.addEventListener('change', (e) => quiz().toggleFilter(f.id, e.target.checked));
      });
    },

    updateProgressUI() {
      const completed = state.completedQuestionNumbers.length;
      const remaining = state.remainingQuestionNumbers.length;
      this.elements.questionsCompleted.textContent = completed;
      this.elements.questionsRemaining.textContent = remaining;
      const total = completed + remaining;
      this.elements.progressBar.style.width = `${total > 0 ? (completed / total) * 100 : 0}%`;
    },

    categoryTitle(tag) {
      const cat = (config.categories || []).find((c) => c.tag === tag);
      return cat ? cat.title : tag;
    },

    // Resolve the question-type plugin for a question. Prefer the question's
    // own `type` field (drag, applied, numeric, ...); fall back to the first
    // entry in config.questionTypes for legacy questions without a type field.
    questionTypeFor(question) {
      const fallback = (config.questionTypes && config.questionTypes[0]) || null;
      const key = (question && question.type) || (fallback && fallback.key) || 'numeric';
      return ctx.registry.questionType(key);
    },

    loadQuestion() {
      const question = state.quizQuestions[state.index];
      const qType = this.questionTypeFor(question);

      this.elements.answerContainer.innerHTML = '';
      // Per-question reset: a question-type plugin may hide the step-by-step
      // button in its render() (e.g. drag questions have no guide). Default it
      // back to visible first so the next stepped question shows it again.
      if (this.elements.showStepsBtn) this.elements.showStepsBtn.style.display = '';
      // A plugin may also inject extra buttons into the shared button row
      // (tagged .qtype-injected, e.g. drag's "Show Hint"); clear any leftover
      // so they don't carry over to a different question type.
      document.querySelectorAll('.qtype-injected').forEach((el) => el.remove());
      qType.render(this.elements.answerContainer, question, ctx);

      if (this.elements.stepsContainer) this.elements.stepsContainer.style.display = 'none';
      if (this.elements.showStepsBtn) this.elements.showStepsBtn.textContent = 'Step-by-Step Guide';
      this.elements.answerFeedback.textContent = '';
      this.elements.answerFeedback.className = 'feedback';
      if (this.elements.steps) this.elements.steps.innerHTML = '';
      state.currentQuestionAttempts = 0;
      this.elements.nextQuestion.disabled = false;
      this.elements.prevQuestion.disabled = false;

      const isCompleted = state.completedQuestions.includes(state.index);
      this.elements.checkAnswer.disabled = isCompleted;

      if (isCompleted) {
        state.currentAnswerCorrect = true;
        if (this.elements.answerBtn) this.elements.answerBtn.style.display = 'none';
        const entry = state.history.find((i) => i.question === question.question);
        if (entry) {
          if (qType.restore) qType.restore(this.elements.answerContainer, entry, question, ctx);
          this.elements.answerFeedback.textContent = entry.isCorrect ? 'Correct!' : 'Your previous answer was incorrect.';
          this.elements.answerFeedback.className = `feedback ${entry.isCorrect ? 'correct' : 'incorrect'}`;
          this._currentHistoryEntry = entry;
        } else {
          this.elements.answerFeedback.textContent = 'Already completed';
          this.elements.answerFeedback.className = 'feedback correct';
        }
        this.elements.nextQuestion.disabled = false;
      } else {
        state.currentAnswerCorrect = false;
        state.answered = false;
        this._currentHistoryEntry = null;
      }

      state.stepsShown = false;
      this.elements.questionText.innerHTML = '';
      if (ctx.navigator && ctx.navigator.updateActiveLinkStyle) ctx.navigator.updateActiveLinkStyle();

      if (question.tag) {
        const tagEl = dom.create('div', `question-tag ${question.tag}`, this.categoryTitle(question.tag));
        this.elements.questionText.appendChild(tagEl);
      }
      // Question text is rendered as HTML so authors can use inline markup
      // (e.g. <b>...</b>, <em>...</em>) in questions.json. The Q# prefix is
      // plain text. See note in questions.json authoring docs about HTML
      // being an intentional content-format choice — switch to markdown or
      // structured fragments later if the question bank grows large enough
      // to warrant a migration.
      const questionBody = dom.create('span', 'question-body');
      questionBody.innerHTML = `Q${question.number}. ${question.question}`;
      this.elements.questionText.appendChild(questionBody);

      // Optional per-question image (e.g. a prescription). Opt-in via
      // config.showQuestionImage so modules that render their own image in the
      // answer area (prescription-interpretation) aren't given a duplicate.
      if (config.showQuestionImage && question.path) {
        const imageContainer = dom.create('div', 'question-image-container');
        const image = dom.create('img', 'question-image');
        image.src = question.path;
        image.alt = 'Question image';
        imageContainer.appendChild(image);
        this.elements.questionText.appendChild(imageContainer);
      }

      // Optional per-question static table (e.g. the "original formula" the
      // enlarging/reducing questions give you). Opt-in via config.showQuestionTable.
      if (config.showQuestionTable && question.tableHeaders && question.tableRows) {
        const tableContainer = dom.create('div', 'question-table-container');
        tableContainer.appendChild(dom.renderQuestionTable(question.tableHeaders, question.tableRows));
        this.elements.questionText.appendChild(tableContainer);
      }

      this.updateProgressUI();
      if (quiz().updateFilteredQuestions) quiz().updateFilteredQuestions();

      // Resuming mid-question: if the saved session left off partway through the
      // step-by-step guide, reopen the guide so the user lands back where they
      // were instead of at step 1. Gated on a one-shot flag set by the resume
      // path and consumed here, so a normal filter/navigation load never
      // auto-opens the guide (and never with another question's step indices).
      const resumeSteps = state.pendingStepResume;
      state.pendingStepResume = false;
      if (resumeSteps && !isCompleted && state.completedSteps.length > 0) {
        this.showSteps();
        this.setupStepNavigation();
      }
    },

    showSteps() {
      const question = state.quizQuestions[state.index];
      if (this.elements.steps.children.length === 0) {
        question.steps.forEach((step, i) => {
          const isLast = i === question.steps.length - 1;
          const stepDiv = dom.createFromHTML(`
            <div class="step" data-step="${i}" ${i > 0 ? 'style="display: none;"' : ''}>
              <div class="step-label">Step ${i + 1}: ${step.text}</div>
              <div class="equation-container"></div>
            </div>
          `);
          const eqContainer = stepDiv.querySelector('.equation-container');
          renderStep(eqContainer, step, ctx, isLast);
          const plugin = ctx.registry.stepType(step.type);
          if (plugin.afterRender) plugin.afterRender(eqContainer, step, ctx);
          this.elements.steps.appendChild(stepDiv);
        });

        if (state.currentAnswerCorrect) {
          const nb = this.elements.steps.querySelector('#stepNextQuestion');
          if (nb) { nb.disabled = false; nb.classList.remove('disabled-btn'); }
          this.elements.steps.querySelectorAll('.step').forEach((s) => { s.style.display = 'block'; });
          // Already complete (possibly solved via the main answer box): show the
          // worked solution if we have it, and lock every step's Check button so
          // the guide can't re-complete the question.
          const entry = this._currentHistoryEntry
            || state.history.find((i) => i.question === question.question);
          if (entry && entry.steps) this.populateStepsFromHistory(entry);
          this.elements.steps.querySelectorAll('.step-check-btn').forEach((btn) => { btn.disabled = true; });
        }
      }
      if (this.elements.stepsContainer) this.elements.stepsContainer.style.display = 'block';
      state.stepsShown = true;
      if (this.elements.showStepsBtn) this.elements.showStepsBtn.textContent = 'Hide Step-by-Step Guide';
      state.completedSteps.forEach((stepIndex) => {
        const s = this.elements.steps.querySelector(`[data-step="${stepIndex}"]`);
        if (s) {
          s.style.display = 'block';
          // When the guide is (re)opened on an in-progress question — e.g. after
          // a page reload, where the steps were just re-rendered blank — repaint
          // each already-completed step as done. (When the whole question is
          // already correct, the currentAnswerCorrect branch above restored it
          // from history, so skip to avoid double work.)
          if (!state.currentAnswerCorrect) this.restoreCompletedStep(s, stepIndex);
        }
        const next = this.elements.steps.querySelector(`[data-step="${stepIndex + 1}"]`);
        if (next) next.style.display = 'block';
      });
    },

    // Repaint a single previously-completed step as done: fill its box-inputs
    // from their data-answer (locked + green), re-select a chosen multiple-choice
    // option, defer to the step plugin's restoreCompleted for richer steps
    // (interpretation/hotspot), and lock the Check button. Used when reopening
    // the guide after a reload re-renders the steps fresh.
    restoreCompletedStep(stepDiv, stepIndex) {
      const question = state.quizQuestions[state.index];
      const step = question.steps[stepIndex];
      if (!step) return;
      stepDiv.querySelectorAll('input.box-input').forEach((input) => {
        if (input.dataset.answer) {
          input.value = dom.answerInputValue(input.dataset.answer);
          input.style.backgroundColor = '#ddffdd';
          input.disabled = true;
        }
      });
      if (step.type === 'MULTIPLE_CHOICE' && step.answer) {
        stepDiv.querySelectorAll('.multiple-choice-option').forEach((opt) => {
          if (opt.dataset.value === step.answer) opt.classList.add('selected', 'correct');
          opt.disabled = true;
        });
      }
      const plugin = ctx.registry.stepType(step.type);
      if (plugin.restoreCompleted) plugin.restoreCompleted(stepDiv, step, ctx);
      const checkBtn = stepDiv.querySelector('.step-check-btn');
      if (checkBtn) checkBtn.disabled = true;
      const hintContainer = stepDiv.querySelector('.hint-container');
      if (hintContainer) dom.setFeedback(hintContainer, true, 'Correct!');
    },

    populateStepsFromHistory(entry) {
      entry.steps.forEach((step, stepIndex) => {
        const stepDiv = this.elements.steps.querySelector(`.step[data-step="${stepIndex}"]`);
        if (!stepDiv) return;
        stepDiv.querySelectorAll('input.box-input').forEach((input) => {
          if (input.dataset.answer) {
            input.value = dom.answerInputValue(input.dataset.answer);
            input.style.backgroundColor = '#ddffdd';
          }
        });
        if (step.type === 'MULTIPLE_CHOICE' && step.answer) {
          stepDiv.querySelectorAll('.multiple-choice-option').forEach((opt) => {
            if (opt.dataset.value === step.answer) opt.classList.add('selected', 'correct');
          });
        }
        const plugin = ctx.registry.stepType(step.type);
        if (plugin.restoreCompleted) plugin.restoreCompleted(stepDiv, step, ctx);
        const checkBtn = stepDiv.querySelector('.step-check-btn');
        if (checkBtn) checkBtn.disabled = true;
        const hintContainer = stepDiv.querySelector('.hint-container');
        if (hintContainer) dom.setFeedback(hintContainer, true, 'Correct!');
      });
    },

    hideSteps() {
      if (this.elements.stepsContainer) this.elements.stepsContainer.style.display = 'none';
      state.stepsShown = false;
      if (this.elements.showStepsBtn) this.elements.showStepsBtn.textContent = 'Step-by-Step Guide';
    },

    showResults() {
      this.elements.questionCard.style.display = 'none';
      this.elements.results.style.display = 'block';
    },

    setFeedback(isCorrect, message) {
      this.elements.answerFeedback.textContent = message;
      this.elements.answerFeedback.className = `feedback ${isCorrect ? 'correct' : 'incorrect'}`;
    },

    setupStepNavigation() {
      document.querySelectorAll('.step').forEach((step, stepIndex) => {
        step.querySelectorAll('.box-input').forEach((input, inputIndex) => {
          input.setAttribute('tabindex', '0');
          input.dataset.stepIndex = stepIndex;
          input.dataset.inputIndex = inputIndex;
        });
        const checkBtn = step.querySelector('.step-check-btn');
        if (checkBtn) checkBtn.setAttribute('tabindex', '0');
      });
      const nb = document.getElementById('stepNextQuestion');
      if (nb) nb.setAttribute('tabindex', '0');
    },

    updateFilterUI() {
      (config.filters || []).forEach((f) => {
        const el = this.elements[`${f.id}Filter`];
        if (el) el.checked = state.activeFilters[f.id];
      });
    },
  };

  return ui;
}
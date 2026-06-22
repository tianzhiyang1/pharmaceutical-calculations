// core/quiz-controller.js
// Shared quiz logic: init, filters, progression, answer checking, step checking.
// One copy for every module. This is the old basic-methods/quiz.js with:
//   - module singletons (state/ui/storage/navigator) replaced by `ctx`
//   - validateAnswer delegated to core/grading.js
//   - filter logic driven by config.filters instead of hardcoded names
//   - unit cancellation + help mode REMOVED (they were basic-methods-only and
//     now live in modules/basic-methods/unit-cancellation-step.js). Core calls
//     two optional plugin hooks instead:
//       stepPlugin.validateExtra(container, step, ctx) -> { ok, message }
//       stepPlugin.hintForInput(input, step)           -> string | null

export function createQuizController(ctx) {
  const { state, grading } = ctx;
  const storage = () => ctx.storage;
  const ui = () => ctx.ui;

  const quiz = {
    init() {
      // Normalize each question so downstream readers can use either field
      // interchangeably. basic-methods JSON uses `question`, while the
      // prescription-interpretation JSON uses `text` — both are valid source
      // shapes. Mirror them here so the engine doesn't need to know which.
      // Also assign a sequential `number` if any question is missing one
      // (interpretation-style applied questions sometimes omit it).
      state.questions = (ctx.config.questions || []).map((q, i) => {
        const text = q.question ?? q.text ?? '';
        return {
          ...q,
          question: text,
          text,
          number: q.number ?? i + 1,
        };
      });
      this.initializeQuestionMappings();
      const saved = storage().loadState();
      if (saved) {
        ctx.showResumeDialog(
          saved,
          () => this.startFresh(),
          () => this.resumeWithFreshContent(saved)
        );
      } else {
        this.startFresh();
      }
    },

    initializeQuestionMappings() {
      state.questionMap = {};
      state.questionIndices = [];
      state.questions.forEach((question, index) => {
        state.questionMap[question.number] = question;
        state.questionIndices[question.number] = index;
      });
    },

    // Active tag list derived from config.filters + current checkbox state.
    activeFilterTags() {
      const tags = [];
      (ctx.config.filters || []).forEach((f) => {
        if (state.activeFilters[f.id] && f.tag) tags.push(f.tag);
      });
      return tags;
    },

    applyFilters() {
      const activeTags = this.activeFilterTags();
      // When a module has no filters configured (config.filters is empty or
      // undefined), every question passes. The check `activeTags.includes(tag)`
      // would otherwise be false for every question, leaving the quiz empty.
      const noFilters = !(ctx.config.filters && ctx.config.filters.length > 0);
      const passes = (tag) => noFilters || activeTags.includes(tag);

      const currentFiltered = [...state.filteredQuestions];
      const currentMissed = [...state.missedQuestions];
      const currentRemaining = [...state.remainingQuestionNumbers];
      const allUncompleted = [...currentFiltered, ...currentMissed, ...currentRemaining];

      state.remainingQuestionNumbers = [];
      state.filteredQuestions = [];
      state.missedQuestions = [];

      const currentQuestion = state.quizQuestions[state.index];
      const currentNumber = currentQuestion?.number;

      const matching = [];
      allUncompleted.forEach((n) => {
        if (!state.completedQuestionNumbers.includes(n)) {
          const tag = state.questionMap[n]?.tag || '';
          if (passes(tag)) matching.push(n);
        }
      });
      matching.sort((a, b) => state.questionIndices[a] - state.questionIndices[b]);
      const firstMatchingIndex = matching.length > 0 ? state.questionIndices[matching[0]] : -1;

      const nowPassing = [];
      allUncompleted.forEach((n) => {
        if (state.completedQuestionNumbers.includes(n)) return;
        const tag = state.questionMap[n]?.tag || '';
        const idx = state.questionIndices[n];
        if (passes(tag)) {
          nowPassing.push({ number: n, wasMissed: currentMissed.includes(n), index: idx });
        } else if (firstMatchingIndex === -1 || idx < firstMatchingIndex) {
          state.missedQuestions.push(n);
        } else {
          const beforeCurrent = currentNumber && idx < state.questionIndices[currentNumber];
          (beforeCurrent ? state.missedQuestions : state.filteredQuestions).push(n);
        }
      });

      const nonMissed = nowPassing.filter((q) => !q.wasMissed).sort((a, b) => a.index - b.index).map((q) => q.number);
      const prevMissed = nowPassing.filter((q) => q.wasMissed).map((q) => q.number);
      state.remainingQuestionNumbers = [...nonMissed, ...prevMissed];

      if (state.quizQuestions.length > 0 && state.index < state.quizQuestions.length) {
        const currentPasses = passes(currentQuestion?.tag || '');
        const currentCompleted = currentNumber && state.completedQuestionNumbers.includes(currentNumber);
        if (!currentPasses && !currentCompleted && state.remainingQuestionNumbers.length > 0) {
          state.index = state.questionIndices[state.remainingQuestionNumbers[0]];
          // Moving to a different question: drop the prior question's step
          // progress so its indices don't bleed into the new one's guide.
          state.completedSteps = [];
          ui().loadQuestion();
        }
      }
      this.updateFilterUI();
      ui().updateProgressUI();
    },

    toggleFilter(filterName, isActive) {
      state.activeFilters[filterName] = isActive;
      const anyActive = Object.values(state.activeFilters).some((v) => v);
      if (!anyActive) {
        state.activeFilters[filterName] = true;
        ui().updateFilterUI();
        alert('At least one category must be selected.');
        return;
      }
      this.applyFilters();

      const currentQuestion = state.quizQuestions[state.index];
      const activeTags = this.activeFilterTags();
      if (!currentQuestion || !activeTags.includes(currentQuestion.tag)) {
        // Filter change is sending us to a different question; clear the prior
        // question's step progress (it doesn't belong to the new one).
        state.completedSteps = [];
        if (state.remainingQuestionNumbers.length > 0) {
          state.index = state.questionIndices[state.remainingQuestionNumbers[0]];
        } else {
          state.index = 0;
          state.quizQuestions = [];
          ui().updateProgressUI();
          ui().showResults();
          return;
        }
      }
      ui().loadQuestion();
      ui().updateProgressUI();
      ctx.navigator.refreshNavigator();
      storage().saveState();
    },

    resumeWithFreshContent(saved) {
      const savedIndex = saved.index;
      state.reset();
      state.quizQuestions = state.questions.slice();
      // Carry over per-question step progress onto the fresh question content.
      // Most step types record progress in state.completedSteps (handled below),
      // but the interpretation/hotspot steps keep their completed steps and saved
      // responses on the question object itself — which the fresh slice() would
      // otherwise drop. Match by number so reopening those guides restores them.
      if (Array.isArray(saved.quizQuestions)) {
        const savedByNumber = {};
        saved.quizQuestions.forEach((sq) => {
          if (sq && sq.number != null) savedByNumber[sq.number] = sq;
        });
        state.quizQuestions.forEach((q) => {
          const sq = savedByNumber[q.number];
          if (!sq) return;
          if (sq.completedSteps) q.completedSteps = sq.completedSteps;
          if (sq.stepResponses) q.stepResponses = sq.stepResponses;
        });
      }
      state.index = Math.min(savedIndex, state.quizQuestions.length - 1);
      state.history = saved.history || [];
      state.completedQuestions = saved.completedQuestions || [];
      state.activeFilters = saved.activeFilters || state.activeFilters;
      state.missedQuestions = saved.missedQuestions || [];
      state.filteredQuestions = saved.filteredQuestions || [];
      state.completedQuestionNumbers = [];
      state.remainingQuestionNumbers = [];
      state.questions.forEach((q) => {
        const idx = state.questionIndices[q.number];
        if (state.completedQuestions.includes(idx)) state.completedQuestionNumbers.push(q.number);
        else state.remainingQuestionNumbers.push(q.number);
      });
      this.applyFilters();
      ui().elements.progressBar.style.width = '0%';
      ui().elements.questionCard.style.display = 'block';
      ui().elements.results.style.display = 'none';
      if (state.remainingQuestionNumbers.length === 0 && state.missedQuestions.length === 0) {
        ui().showResults();
      } else {
        const currentNumber = state.quizQuestions[state.index].number;
        if (state.completedQuestionNumbers.includes(currentNumber) || !state.remainingQuestionNumbers.includes(currentNumber)) {
          if (state.remainingQuestionNumbers.length > 0) {
            state.index = state.questionIndices[state.remainingQuestionNumbers[0]];
          }
        }
        // Restore in-progress step state only if we actually landed back on the
        // same, still-unfinished question we saved on. (If the resume bumped us
        // to a different/first-remaining question, those step indices wouldn't
        // belong to it.) loadQuestion() then auto-reopens the guide.
        if (state.index === savedIndex && !state.completedQuestions.includes(savedIndex)) {
          state.completedSteps = saved.completedSteps || [];
          // One-shot signal for loadQuestion to reopen the guide at this spot.
          state.pendingStepResume = state.completedSteps.length > 0;
        }
        ui().loadQuestion();
      }
      ui().updateProgressUI();
      this.updateFilterUI();
      storage().saveState();
    },

    startFresh() {
      state.reset();
      state.quizQuestions = state.questions.slice();
      if (Object.keys(state.questionMap).length === 0) this.initializeQuestionMappings();
      state.completedQuestionNumbers = [];
      state.remainingQuestionNumbers = [];
      state.missedQuestions = [];
      state.filteredQuestions = [];
      state.questions.forEach((q) => {
        if (!state.remainingQuestionNumbers.includes(q.number)) state.remainingQuestionNumbers.push(q.number);
      });
      this.applyFilters();
      ui().elements.progressBar.style.width = '0%';
      ui().elements.questionCard.style.display = 'block';
      ui().elements.results.style.display = 'none';
      if (state.remainingQuestionNumbers.length > 0) {
        state.index = state.questionIndices[state.remainingQuestionNumbers[0]];
      }
      ui().loadQuestion();
      this.updateFilterUI();
      storage().saveState();
    },

    checkAnswer() {
      if (state.currentAnswerCorrect) return;
      const question = state.quizQuestions[state.index];

      // Plugin-owned grading: if the question-type plugin implements its own
      // checkAnswer, delegate to it entirely. This is how drag, applied, etc.
      // own their full grading flow without core needing to know about them.
      // The plugin is responsible for setting state.currentAnswerCorrect,
      // appending to completedQuestions, calling storage.saveState, etc.
      const qType = ctx.ui.questionTypeFor(question);
      if (qType && qType.checkAnswer) {
        qType.checkAnswer(question, ctx);
        return;
      }

      const answerInputs = ui().elements.answerContainer.querySelectorAll('.answer-input');
      const userAnswers = Array.from(answerInputs).map((i) => i.value.trim());

      let allCorrect = true;
      let answersCorrect = true;
      let unitsCorrect = true;
      // grading.js can return a more specific message (wrong ratio format, not
      // a number); keep the first one so we show it instead of the generic hint.
      let answerFeedbackMessage = '';
      if (!userAnswers.some((a) => a !== '')) {
        ui().setFeedback(false, 'Please enter an answer for at least one part.');
        return;
      }
      userAnswers.forEach((userAnswer, index) => {
        if (userAnswer !== '') {
          const { isCorrect, feedbackMessage } = grading.validateAnswer(userAnswer, question.answerValue[index], question);
          if (!isCorrect) {
            answersCorrect = false;
            allCorrect = false;
            if (!answerFeedbackMessage && feedbackMessage) answerFeedbackMessage = feedbackMessage;
          }
        }
      });

      let selectedUnits;
      if (question.optionUnits && question.optionUnits.length > 0) {
        const dropdowns = ui().elements.answerContainer.querySelectorAll('.unit-dropdown');
        dropdowns.forEach((dropdown, index) => {
          if (dropdown.value !== question.answerUnit[index]) { unitsCorrect = false; allCorrect = false; }
        });
        selectedUnits = Array.from(dropdowns).map((d) => d.value);
      } else {
        selectedUnits = question.answerUnit;
      }

      state.addToHistory(question, userAnswers, selectedUnits, allCorrect);
      if (allCorrect) {
        ui().setFeedback(true, 'Correct!');
        state.currentAnswerCorrect = true;
        if (!state.completedQuestions.includes(state.index)) {
          state.completedQuestions.push(state.index);
          state.answered = true;
        }
        this.moveQuestionToCompleted(question.number);
        storage().saveState();
      } else {
        state.currentQuestionAttempts++;
        if (state.currentQuestionAttempts >= 2) ui().elements.answerBtn.disabled = false;
        ui().setFeedback(
          false,
          answersCorrect && !unitsCorrect
            ? 'The answer is correct but the unit needs to be different. Try again!'
            : answerFeedbackMessage || 'Try again. Your answer is not correct.'
        );
      }
    },

    checkInput(input) {
      const question = state.quizQuestions[state.index];
      const { isCorrect } = grading.validateAnswer(input.value.trim(), input.dataset.answer, question);
      input.style.backgroundColor = isCorrect ? '#ddffdd' : '#ffdddd';
      return isCorrect;
    },

    // Generic step-input checker. Numeric correctness is handled here; anything
    // extra (e.g. unit cancellation) is delegated to the step plugin.
    checkStepInputs(container) {
      if (container.querySelector('.multiple-choice-container')) return; // MC owns its own flow
      const inputs = container.querySelectorAll('.box-input');
      const hintContainer = container.querySelector('.hint-container');
      if (inputs.length === 0) return;

      let allCorrect = true;
      let anyInvalid = false;
      let firstIncorrectInput = null;
      inputs.forEach((input) => {
        // Text-answer inputs (e.g. "Male"/"Female") are graded as strings — the
        // "enter a valid number" guard only applies to numeric-answer fields.
        const expectsNumber = grading.isNumericAnswer(input.dataset.answer);
        if (expectsNumber && Number.isNaN(parseFloat(input.value))) {
          input.style.backgroundColor = '#ffdddd';
          anyInvalid = true; allCorrect = false;
          if (!firstIncorrectInput) firstIncorrectInput = input;
        } else if (!this.checkInput(input)) {
          allCorrect = false;
          if (!firstIncorrectInput && !anyInvalid) firstIncorrectInput = input;
        }
      });

      const stepElement = container.closest('.step');
      const stepIndex = stepElement ? parseInt(stepElement.dataset.step, 10) : -1;
      const question = state.quizQuestions[state.index];
      const step = stepIndex >= 0 ? question.steps[stepIndex] : null;
      const plugin = step ? ctx.registry.stepType(step.type) : null;

      // Plugin extra-validation hook (unit cancellation lives here for basic-methods)
      let extra = { ok: true, message: '' };
      if (allCorrect && !anyInvalid && plugin && plugin.validateExtra) {
        extra = plugin.validateExtra(container, step, ctx) || { ok: true };
        if (!extra.ok) allCorrect = false;
      }

      if (!hintContainer) return allCorrect;

      if (anyInvalid) {
        ctx.dom.setFeedback(hintContainer, false, 'Please enter valid numbers for all fields');
        if (firstIncorrectInput) firstIncorrectInput.focus();
      } else if (extra.ok === false) {
        ctx.dom.setFeedback(hintContainer, false, extra.message || 'Some answers are not correct.');
      } else if (allCorrect) {
        ctx.dom.setFeedback(hintContainer, true, 'Correct!');
        this.lockCompletedStep(container, plugin, step);
        this.advanceAfterStep(container);
      } else if (firstIncorrectInput) {
        const hint = (plugin && plugin.hintForInput && plugin.hintForInput(firstIncorrectInput, step))
          || 'Please complete or correct the highlighted field.';
        ctx.dom.setFeedback(hintContainer, false, hint);
        firstIncorrectInput.focus();
      } else {
        ctx.dom.setFeedback(hintContainer, false, 'Try again. Some answers are not correct.');
      }
      return allCorrect;
    },

    lockCompletedStep(container, plugin, step) {
      container.querySelectorAll('.box-input').forEach((el) => { el.disabled = true; });
      if (plugin && plugin.onStepComplete) plugin.onStepComplete(container, step, ctx);
      const checkBtn = container.querySelector('.step-check-btn');
      if (checkBtn) checkBtn.disabled = true;
    },

    advanceAfterStep(container) {
      const stepContainer = container.closest('.step');
      if (!stepContainer) return;
      const stepIndex = parseInt(stepContainer.dataset.step, 10);
      if (!state.completedSteps.includes(stepIndex)) state.completedSteps.push(stepIndex);

      const isLastStep = !stepContainer.nextElementSibling;
      if (isLastStep) {
        const nextBtn = ui().elements.steps.querySelector('#stepNextQuestion');
        if (nextBtn) {
          nextBtn.disabled = false;
          nextBtn.classList.remove('disabled-btn');
          nextBtn.dataset.readyToProceed = 'true';
          nextBtn.focus();
          if (!state.currentAnswerCorrect) {
            state.currentAnswerCorrect = true;
            const question = state.quizQuestions[state.index];
            state.addToHistory(question, question.answerValue, question.answerUnit, true);
            if (!state.completedQuestions.includes(state.index)) {
              state.completedQuestions.push(state.index);
              state.answered = true;
            }
            this.moveQuestionToCompleted(question.number);
            storage().saveState();
          }
        }
      } else {
        const nextStep = ui().elements.steps.querySelector(`[data-step="${stepIndex + 1}"]`);
        if (nextStep) {
          nextStep.style.display = 'block';
          const nextInput = nextStep.querySelector('.box-input');
          if (nextInput) setTimeout(() => nextInput.focus(), 50);
        }
        // Persist the intermediate progress so a reload reopens the guide here.
        // (The last-step branch above already saves when the question completes.)
        storage().saveState();
      }
    },

    toggleSteps() {
      if (state.stepsShown) {
        ui().hideSteps();
      } else {
        ui().showSteps();
        ui().setupStepNavigation();
      }
    },

    updateFilteredQuestions() {
      const currentQuestion = state.quizQuestions[state.index];
      if (!currentQuestion) return;
      const currentIndex = state.questionIndices[currentQuestion.number];
      const newFiltered = [];
      state.filteredQuestions.forEach((n) => {
        if (state.questionIndices[n] < currentIndex) {
          if (!state.missedQuestions.includes(n)) state.missedQuestions.push(n);
        } else {
          newFiltered.push(n);
        }
      });
      state.filteredQuestions = newFiltered;
      ui().updateProgressUI();
      storage().saveState();
    },

    nextQuestion() {
      // Clear step progress BEFORE loading the next question so loadQuestion's
      // auto-reopen doesn't fire with the previous question's step indices.
      state.completedSteps = [];
      if (state.index < state.quizQuestions.length - 1) {
        state.index++;
        ui().loadQuestion();
      } else if (state.completedQuestions.length === state.quizQuestions.length) {
        ui().showResults();
      } else {
        state.index = 0;
        ui().loadQuestion();
      }
      this.updateFilteredQuestions();
      storage().saveState();
    },

    prevQuestion() {
      state.completedSteps = [];
      state.index = state.index > 0 ? state.index - 1 : state.quizQuestions.length - 1;
      ui().loadQuestion();
      storage().saveState();
    },

    updateFilterUI() {
      (ctx.config.filters || []).forEach((f) => {
        const el = ui().elements[`${f.id}Filter`];
        if (el) el.checked = state.activeFilters[f.id];
      });
    },

    setProgressComplete() {
      ui().elements.questionsCompleted.textContent = state.completedQuestionNumbers.length;
      ui().elements.questionsRemaining.textContent = 0;
      ui().elements.progressBar.style.width = '100%';
    },

    moveQuestionToCompleted(number) {
      const idx = state.remainingQuestionNumbers.indexOf(number);
      if (idx === -1) return false;
      state.remainingQuestionNumbers.splice(idx, 1);
      if (!state.completedQuestionNumbers.includes(number)) state.completedQuestionNumbers.push(number);
      // Once a question is complete, neither answer path may check again: lock
      // the main "Check Answer" and any rendered step "Check" buttons. (The
      // guide may not be open yet — shell-ui.showSteps re-applies this when it
      // renders steps for an already-correct question.)
      if (ui().elements.checkAnswer) ui().elements.checkAnswer.disabled = true;
      if (ui().elements.steps) {
        ui().elements.steps.querySelectorAll('.step-check-btn').forEach((btn) => { btn.disabled = true; });
      }
      if (state.remainingQuestionNumbers.length === 0 && state.missedQuestions.length === 0) {
        this.setProgressComplete();
      } else {
        ui().updateProgressUI();
      }
      return true;
    },

    showAnswer() {
      const question = state.quizQuestions[state.index];

      // Plugin-owned show-answer: if the question-type plugin has its own
      // showAnswer (e.g. applied questions display a single value, not an
      // array of answer parts), delegate to it.
      const qType = ctx.ui.questionTypeFor(question);
      if (qType && qType.showAnswer) {
        qType.showAnswer(question, ctx);
        return;
      }

      const answers = question.answerValue.map((value, index) => {
        const unit = question.answerUnit && question.answerUnit[index] ? ` ${question.answerUnit[index]}` : '';
        return `${value}${unit}`;
      });
      ui().setFeedback(true, `The correct answer is: ${answers.join(', ')}`);
      if (state.currentQuestionAttempts < 2) ui().elements.answerBtn.disabled = true;
    },
  };

  return quiz;
}
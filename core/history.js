// core/history.js
// Shared history + solution modal. One copy for every module.
// The old hardcoded "Dimensional Analysis" / "Ratio and Proportion" sections
// are now driven by config.categories = [{ tag, title, cssClass? }]. A module
// with no categories falls back to a single ungrouped grid.

import { renderStep } from './render-step.js';

// Pair each answer value with its own unit so multi-part answers read
// "2500 mL of 25% solution, 2500 mL of 15% solution" instead of all the values
// then all the units ("2500,2500 mL of 25% solution,mL of 15% solution").
// Mirrors quiz-controller.showAnswer. Scalars / missing units are handled.
function formatAnswer(correctAnswer, answerUnit) {
  const values = Array.isArray(correctAnswer) ? correctAnswer : [correctAnswer];
  const units = Array.isArray(answerUnit) ? answerUnit : [answerUnit];
  return values
    .map((value, i) => {
      const unit = units[i] != null && units[i] !== '' ? ` ${units[i]}` : '';
      return `${value}${unit}`;
    })
    .join(', ');
}

export function createHistory(ctx) {
  const { state, config, dom } = ctx;
  const categories = config.categories || [];

  const tagTitle = (tag) => {
    const cat = categories.find((c) => c.tag === tag);
    return cat ? cat.title : '';
  };

  const history = {
    init() {
      this.historyModal = dom.get('historyModal');
      this.closeModalBtn = document.querySelector('.close-modal');
      this.historyList = dom.get('historyList');
      this.solutionModal = dom.get('solutionModal');
      this.closeSolutionBtn = document.querySelector('.close-solution-modal');
      this.solutionQuestion = dom.get('solutionQuestion');
      this.solutionSteps = dom.get('solutionSteps');

      if (this.closeModalBtn) this.closeModalBtn.addEventListener('click', () => this.closeHistoryModal());
      if (this.closeSolutionBtn) this.closeSolutionBtn.addEventListener('click', () => this.closeSolutionModal());
      window.addEventListener('click', (e) => {
        if (e.target === this.historyModal) this.closeHistoryModal();
        if (e.target === this.solutionModal) this.closeSolutionModal();
      });
    },

    openHistoryModal() {
      this.renderHistoryGrid();
      this.historyModal.style.display = 'block';
      document.body.style.overflow = 'hidden';
    },

    closeHistoryModal() {
      this.historyModal.style.display = 'none';
      document.body.style.overflow = 'auto';
    },

    openSolutionModal(index) {
      const item = state.history.find((i) => i.index === index);
      if (!item) return;

      this.solutionQuestion.textContent = '';
      if (item.tag && tagTitle(item.tag)) {
        const tagEl = dom.create('div', `question-tag ${item.tag}`, tagTitle(item.tag));
        this.solutionQuestion.appendChild(tagEl);
      }

      let questionNumber = null;
      for (const qNum in state.questionMap) {
        if (state.questionMap[qNum].question === item.question) {
          questionNumber = qNum;
          break;
        }
      }
      const prefix = questionNumber ? `Q${questionNumber}. ` : '';
      // Mirrors shell-ui.loadQuestion: the question body is rendered as HTML
      // so inline markup (e.g. <b>...</b>) in questions.json comes through.
      const questionBody = dom.create('span', 'question-body');
      questionBody.innerHTML = prefix + item.question;
      this.solutionQuestion.appendChild(questionBody);

      // Mirror loadQuestion: show the question's static "original formula" table
      // (opt-in via config.showQuestionTable) so the worked solution has context.
      const solQuestion = questionNumber ? state.questionMap[questionNumber] : null;
      if (config.showQuestionTable && solQuestion && solQuestion.tableHeaders && solQuestion.tableRows) {
        const tableContainer = dom.create('div', 'question-table-container');
        tableContainer.appendChild(dom.renderQuestionTable(solQuestion.tableHeaders, solQuestion.tableRows));
        this.solutionQuestion.appendChild(tableContainer);
      }

      const answerContainer = dom.create('div', 'history-answer-display');
      answerContainer.appendChild(dom.create('span', 'history-answer-label', 'Answer: '));
      answerContainer.appendChild(
        dom.create('span', 'history-answer-value', formatAnswer(item.correctAnswer, item.answerUnit))
      );
      this.solutionQuestion.appendChild(answerContainer);

      this.solutionSteps.innerHTML = '';
      // Tell image-aware step plugins (hotspot) which question this solution is
      // for — the practice index may be on a different question right now.
      ctx.currentSolutionQuestion = questionNumber ? state.questionMap[questionNumber] : null;
      // Some question types (e.g. drag conversions) have no step-by-step
      // solution; the modal then shows just the question and its answer.
      (item.steps || []).forEach((step, i) => {
        const stepDiv = dom.createFromHTML(`
          <div class="step">
            <div class="step-label">Step ${i + 1}: ${step.text}</div>
            <div class="equation-container"></div>
          </div>
        `);
        const eqContainer = stepDiv.querySelector('.equation-container');
        renderStep(eqContainer, step, ctx);

        // Let the step plugin paint its own read-only "completed" view
        // (e.g. hotspot swaps to its answer image; interpretation fills blanks).
        const plugin = ctx.registry.stepType(step.type);
        if (plugin && plugin.restoreCompleted) plugin.restoreCompleted(stepDiv, step, ctx);

        stepDiv.querySelectorAll('input').forEach((input) => {
          input.disabled = true;
          if (input.dataset.answer) {
            input.value = dom.answerInputValue(input.dataset.answer, 2);
            input.style.backgroundColor = '#ddffdd';
          }
        });
        if (step.type === 'MULTIPLE_CHOICE' && step.answer) {
          stepDiv.querySelectorAll('.multiple-choice-option').forEach((opt) => {
            if (opt.dataset.value === step.answer) opt.classList.add('selected', 'correct');
            opt.disabled = true;
          });
        }
        stepDiv.querySelectorAll('.unit.cancellable').forEach((unit) => {
          if (unit.dataset.cancellable !== 'false') unit.classList.add('cancelled', 'correct');
          unit.style.cursor = 'default';
        });
        stepDiv.querySelectorAll('.step-check-btn').forEach((btn) => btn.remove());
        this.solutionSteps.appendChild(stepDiv);
      });
      ctx.currentSolutionQuestion = null;

      this.solutionModal.style.display = 'block';
      document.body.style.overflow = 'hidden';
    },

    closeSolutionModal() {
      this.solutionModal.style.display = 'none';
      if (this.historyModal.style.display !== 'block') document.body.style.overflow = 'auto';
    },

    renderHistoryGrid() {
      this.historyList.innerHTML = '';
      if (!state.questions || state.questions.length === 0) {
        this.historyList.innerHTML = '<p class="empty-history">No questions available.</p>';
        return;
      }

      const groups = categories.length
        ? categories.map((cat) => ({
            cat,
            questions: state.questions.filter((q) => q.tag === cat.tag),
          }))
        : [{ cat: { title: '' }, questions: state.questions.slice() }];

      groups.forEach(({ cat, questions }) => {
        if (questions.length > 0) {
          this.historyList.appendChild(this.createTagSection(cat, questions));
        }
      });

      this.historyList.addEventListener('click', (e) => {
        const btn = e.target.closest('.history-question-button');
        if (!btn || !btn.classList.contains('completed')) return;
        const number = parseInt(btn.dataset.number, 10);
        const q = state.questionMap[number];
        const item = state.history.find((i) => i.question === q.question);
        if (item) this.openSolutionModal(item.index);
      });
    },

    createTagSection(cat, questions) {
      const section = dom.create('div', 'history-tag-section');
      const title = dom.create('h3', 'history-section-title', cat.title);
      if (cat.cssClass) title.classList.add(`${cat.cssClass}-title`);
      section.appendChild(title);

      const grid = dom.create('div', 'history-question-grid');
      questions.forEach((question) => {
        const number = question.number;
        const isCompleted = state.completedQuestionNumbers.includes(number);
        const button = dom.create(
          'button',
          `history-question-button ${isCompleted ? 'completed' : 'incomplete'}`
        );
        if (cat.cssClass) button.classList.add(cat.cssClass);
        button.dataset.number = number;
        button.textContent = number;
        button.title = `Question ${number}: ${question.question} (${isCompleted ? 'Completed' : 'Not completed'})`;
        if (!isCompleted) button.disabled = true;
        grid.appendChild(button);
      });
      section.appendChild(grid);
      return section;
    },
  };

  return history;
}
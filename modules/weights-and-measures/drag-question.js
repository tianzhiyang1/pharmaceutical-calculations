// modules/weights-and-measures/drag-question.js
// MODULE-LOCAL question-type plugin, key "drag".
//
// A unit-conversion question: the prompt (e.g. "2.89 kilograms =") is rendered
// by the shell, and the student completes it by dropping — or tapping — one of
// four option chips into a single slot, giving "[ 2890 ] grams". Multiple
// attempts are allowed and counted (the attempts badge is kept here even though
// the other modules don't show one).
//
// This is a clean rewrite of the old 728-line custom clone-drag engine. It uses
// native HTML5 drag-and-drop plus click/tap-to-place, which is a fraction of
// the code and works on touch.
//
// Grading is owned here via the `checkAnswer` hook on the question-type
// contract: core/quiz-controller delegates entirely, so this plugin updates the
// feedback, marks the question complete, records history, and saves state.

import dom from '../../core/dom.js';

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const dragQuestion = {
  key: 'drag',

  // ----- rendering --------------------------------------------------------
  render(answerContainer, question, ctx) {
    const { state } = ctx;
    answerContainer.style.flexDirection = 'column';
    answerContainer.style.alignItems = 'flex-start';

    // Drag questions have no step-by-step guide; hide that shared button.
    // (shell-ui re-shows it before each question renders, so stepped questions
    //  still get it.)
    if (ctx.ui.elements.showStepsBtn) ctx.ui.elements.showStepsBtn.style.display = 'none';
    // A previous calc question may have left its "Show Answer" button ref on
    // ctx; drag has none, so drop it to avoid the shell hiding a stale node.
    ctx.ui.elements.answerBtn = null;

    // Persist the shuffled chip order across re-renders within a session.
    if (!question.shuffledOptions) {
      question.shuffledOptions = shuffle((question.options || []).map((o) => o.value));
    }

    const completed = state.completedQuestions.includes(state.index) || question.isCorrect === true;

    // --- answer slot row: [drop-zone] unit ---
    const slotRow = dom.create('div', 'drag-slot-row');
    const dropZone = dom.create('div', 'drop-zone');
    dropZone.appendChild(dom.create('span', 'drop-zone-answer hidden'));
    slotRow.appendChild(dropZone);
    if (question.unit) slotRow.appendChild(dom.create('span', 'drop-zone-unit', question.unit));
    answerContainer.appendChild(slotRow);

    // --- option chips ---
    const grid = dom.create('div', 'options-grid');
    question.shuffledOptions.forEach((value) => {
      const opt = dom.create('div', 'option', value);
      opt.dataset.value = value;
      opt.draggable = !completed;
      grid.appendChild(opt);
    });
    answerContainer.appendChild(grid);

    // --- attempts counter (hidden until the first attempt) ---
    const attemptsBox = dom.create('div', 'attempts-container');
    attemptsBox.appendChild(dom.create('span', 'attempts-label', 'Attempts: '));
    attemptsBox.appendChild(dom.create('span', 'attempts-counter', '0'));
    answerContainer.appendChild(attemptsBox);
    this.renderAttempts(attemptsBox, question.attempts || 0);

    // --- hint toggle ---
    // The toggle button lives in the shared button row (right after "Check
    // Answer", in place of the step-by-step button drag questions don't use);
    // the collapsible text sits in the answer area. The button is tagged
    // `qtype-injected` so the shell removes it when the next question renders.
    if (question.hint) {
      const hintBox = dom.create('div', 'drag-hint');
      hintBox.style.display = 'none';
      hintBox.innerHTML = `<strong>Hint:</strong> ${String(question.hint).replace(/\n/g, '<br>')}`;
      answerContainer.appendChild(hintBox);

      const hintBtn = dom.create('button', 'button-accent qtype-injected', 'Show Hint');
      hintBtn.type = 'button';
      hintBtn.addEventListener('click', () => {
        const show = hintBox.style.display === 'none';
        hintBox.style.display = show ? 'block' : 'none';
        hintBtn.textContent = show ? 'Hide Hint' : 'Show Hint';
      });
      const checkBtn = ctx.ui.elements.checkAnswer;
      checkBtn.parentNode.insertBefore(hintBtn, checkBtn.nextSibling);
    }

    // --- paint prior state ---
    // On resume, question.userAnswer is gone (fresh content) but the question
    // is flagged completed, so fall back to the correct answer.
    const placed = question.userAnswer != null
      ? question.userAnswer
      : (completed ? String(question.correctAnswer) : null);
    if (placed != null) this.place(answerContainer, placed);

    if (completed) {
      dropZone.classList.add('correct');
      grid.querySelectorAll('.option').forEach((o) => {
        o.classList.add('answered');
        o.style.pointerEvents = 'none';
      });
      ctx.ui.elements.checkAnswer.disabled = true;
    } else {
      if (question.attempted && question.userAnswer != null) dropZone.classList.add('incorrect');
      ctx.ui.elements.checkAnswer.disabled = placed == null;
      this.wireInteractions(answerContainer, ctx);
    }
  },

  // Put a value into the slot and mark its chip as selected.
  place(answerContainer, value) {
    const dropAnswer = answerContainer.querySelector('.drop-zone-answer');
    dropAnswer.textContent = value;
    dropAnswer.classList.remove('hidden');
    answerContainer.querySelectorAll('.option').forEach((o) => {
      o.classList.toggle('selected', o.dataset.value === String(value));
    });
  },

  renderAttempts(attemptsBox, n) {
    attemptsBox.querySelector('.attempts-counter').textContent = n;
    attemptsBox.classList.remove('first-attempt', 'multiple-attempts', 'many-attempts');
    attemptsBox.style.display = n > 0 ? '' : 'none';
    if (n === 1) attemptsBox.classList.add('first-attempt');
    else if (n === 2) attemptsBox.classList.add('multiple-attempts');
    else if (n >= 3) attemptsBox.classList.add('many-attempts');
  },

  // Native drag-and-drop + click/tap-to-place. Selecting a chip fills the slot.
  wireInteractions(answerContainer, ctx) {
    const grid = answerContainer.querySelector('.options-grid');
    const dropZone = answerContainer.querySelector('.drop-zone');

    const select = (value) => {
      this.place(answerContainer, value);
      dropZone.classList.remove('correct', 'incorrect');
      ctx.ui.elements.checkAnswer.disabled = false;
    };

    grid.querySelectorAll('.option').forEach((opt) => {
      opt.addEventListener('click', () => select(opt.dataset.value));
      opt.addEventListener('dragstart', (e) => {
        opt.classList.add('dragging');
        e.dataTransfer.setData('text/plain', opt.dataset.value);
        e.dataTransfer.effectAllowed = 'move';
      });
      opt.addEventListener('dragend', () => opt.classList.remove('dragging'));
    });

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('dragging-over');
    });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragging-over'));
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragging-over');
      const value = e.dataTransfer.getData('text/plain');
      if (value) select(value);
    });
  },

  // ----- grading (called by core/quiz-controller via checkAnswer hook) ----
  checkAnswer(question, ctx) {
    const { state, storage, ui } = ctx;
    const answerContainer = ui.elements.answerContainer;
    const dropZone = answerContainer.querySelector('.drop-zone');
    const dropAnswer = answerContainer.querySelector('.drop-zone-answer');
    const placed = dropAnswer && !dropAnswer.classList.contains('hidden') ? dropAnswer.textContent : null;

    if (placed == null) {
      ui.setFeedback(false, 'Drag an option into the box before checking.');
      return;
    }
    // Don't let the student re-check the same wrong answer.
    if (question.attempted && !question.isCorrect && placed === question.userAnswer) {
      ui.setFeedback(false, 'Change your answer before checking again.');
      return;
    }

    question.attempts = (question.attempts || 0) + 1;
    question.userAnswer = placed;
    question.attempted = true;
    const isCorrect = placed === String(question.correctAnswer);
    question.isCorrect = isCorrect;

    this.renderAttempts(answerContainer.querySelector('.attempts-container'), question.attempts);
    state.addToHistory(question, placed, question.unit || '', isCorrect);

    dropZone.classList.remove('correct', 'incorrect');
    dropZone.classList.add(isCorrect ? 'correct' : 'incorrect');

    if (isCorrect) {
      ui.setFeedback(true, 'Correct!');
      state.currentAnswerCorrect = true;
      if (!state.completedQuestions.includes(state.index)) {
        state.completedQuestions.push(state.index);
        state.answered = true;
      }
      ctx.quiz.moveQuestionToCompleted(question.number);
      answerContainer.querySelectorAll('.option').forEach((o) => {
        o.classList.add('answered');
        o.draggable = false;
        o.style.pointerEvents = 'none';
      });
      ui.elements.checkAnswer.disabled = true;
      ui.updateProgressUI();
    } else {
      ui.setFeedback(false, 'Incorrect. Try again!');
    }
    storage.saveState();
  },

  // render() repaints completed/attempted state from the question itself, so
  // there is nothing extra to restore when revisiting a completed question.
  restore() {},
};

export default dragQuestion;

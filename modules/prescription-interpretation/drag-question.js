// modules/prescription-interpretation/drag-question.js
// MODULE-LOCAL question-type plugin, key "drag".
// Implements drag-and-drop sentence assembly: shuffled option chips live in an
// "options" row above the answer area; the student drags or click-moves them
// into a "drag container" to form the correct interpretation in order.
//
// This plugin owns its full grading flow via the optional `checkAnswer` hook
// the engine added to the question-type contract. Core delegates entirely:
// the plugin sets state.currentAnswerCorrect, appends to completedQuestions,
// calls addToHistory and storage.saveState, and updates feedback itself.
//
// Was: prescription-interpretation/interpretation/drag.js (dragQuestionHandler),
// ported with the question/state singletons replaced by `ctx`.

import dom from '../../core/dom.js';

function shuffleArray(arr) {
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
    answerContainer.style.flexDirection = '';
    answerContainer.style.alignItems = '';

    // Persist the shuffled order so the student doesn't see options jump
    // around between checkAnswer attempts.
    if (!question.shuffledOptions) {
      question.shuffledOptions = shuffleArray(question.options || []);
    }

    // The drop target lives inside the shell's answerContainer.
    const dragContainer = dom.create('div', 'drag-container');
    answerContainer.appendChild(dragContainer);

    // The chip palette and feedback element live as siblings of answerContainer
    // (the old DOM contract). Remove any leftovers from a previous question.
    const parent = answerContainer.parentNode;
    parent.querySelector('#options-area')?.remove();
    parent.querySelector('#dragFeedback')?.remove();

    const optionsArea = dom.create('div', 'options-area');
    optionsArea.id = 'options-area';
    parent.insertBefore(optionsArea, answerContainer.nextSibling);

    const dragFeedback = dom.create('div', 'feedback drag-feedback');
    dragFeedback.id = 'dragFeedback';
    parent.insertBefore(dragFeedback, optionsArea.nextSibling);

    // Decide what to draw based on the question's prior state.
    const isCompleted = state.completedQuestions.includes(state.index);
    const isCorrect = question.isCorrect === true;
    const answerShown = question.answerShown === true;

    if (answerShown) {
      this.renderCorrectAnswerView(question, { dragContainer, optionsArea, dragFeedback });
      return;
    }
    if (isCorrect || isCompleted) {
      this.renderCorrectState(question, { dragContainer, optionsArea, dragFeedback });
      return;
    }
    if (question.attempted) {
      // Restore the student's last (incorrect) arrangement so they can adjust.
      this.renderAttemptedIncorrectState(question, { dragContainer, optionsArea, dragFeedback });
    } else {
      // Fresh: all options in the palette, drag area empty.
      question.shuffledOptions.forEach((option) => {
        optionsArea.appendChild(this.createDraggableOption(option));
      });
    }

    this.setupDragAndDrop(dragContainer, optionsArea);
  },

  createDraggableOption(text) {
    const el = dom.create('div', 'option', text);
    el.draggable = true;
    el.style.cursor = 'grab';
    return el;
  },

  createPlacedOption(text, { interactive }) {
    const el = dom.create('div', interactive ? 'option placed' : 'option placed correct-answer', text);
    el.draggable = interactive;
    el.style.cursor = interactive ? 'grab' : 'default';
    if (!interactive) el.style.pointerEvents = 'none';
    return el;
  },

  renderCorrectState(question, { dragContainer, optionsArea, dragFeedback }) {
    const placed = question.userAnswer && question.userAnswer.length
      ? question.userAnswer
      : (question.correctAnswer || []);
    placed.forEach((answer) => {
      dragContainer.appendChild(this.createPlacedOption(answer, { interactive: false }));
    });
    (question.shuffledOptions || []).forEach((option) => {
      if (!placed.includes(option)) {
        const el = dom.create('div', 'option', option);
        el.draggable = false;
        el.style.cursor = 'default';
        el.style.pointerEvents = 'none';
        optionsArea.appendChild(el);
      }
    });
    dragFeedback.textContent = 'Correct! Well done!';
    dragFeedback.className = 'feedback drag-feedback correct';
  },

  renderAttemptedIncorrectState(question, { dragContainer, optionsArea, dragFeedback }) {
    (question.userAnswer || []).forEach((answer) => {
      dragContainer.appendChild(this.createPlacedOption(answer, { interactive: true }));
    });
    (question.shuffledOptions || []).forEach((option) => {
      if (!(question.userAnswer || []).includes(option)) {
        optionsArea.appendChild(this.createDraggableOption(option));
      }
    });
    dragFeedback.textContent = 'Not quite. Try again by adjusting your answer.';
    dragFeedback.className = 'feedback drag-feedback incorrect';
  },

  renderCorrectAnswerView(question, { dragContainer, optionsArea, dragFeedback }) {
    const remaining = [...(question.shuffledOptions || [])];
    (question.correctAnswer || []).forEach((correct) => {
      dragContainer.appendChild(this.createPlacedOption(correct, { interactive: false }));
      const i = remaining.indexOf(correct);
      if (i > -1) remaining.splice(i, 1);
    });
    remaining.forEach((option) => {
      const el = dom.create('div', 'option', option);
      el.draggable = false;
      el.style.cursor = 'default';
      el.style.pointerEvents = 'none';
      optionsArea.appendChild(el);
    });
    dragFeedback.textContent = "Here is the correct answer.";
    dragFeedback.className = 'feedback drag-feedback';
  },

  // ----- drag/drop interaction (HTML5 DnD + click-to-move) ----------------
  setupDragAndDrop(dragContainer, optionsArea) {
    const allOptions = () => document.querySelectorAll('.option');

    // Where, in the drag container, should the dragging element land?
    const getInsertPosition = (x, y) => {
      const siblings = Array.from(dragContainer.querySelectorAll('.option:not(.dragging)'));
      if (siblings.length === 0) return null;
      let closestEl = null;
      let closestDist = Infinity;
      let closestIsAfter = false;
      siblings.forEach((sib) => {
        const box = sib.getBoundingClientRect();
        const cx = box.left + box.width / 2;
        const cy = box.top + box.height / 2;
        // Weight vertical distance heavier so wrapping rows behave naturally.
        const dist = Math.abs(y - cy) * 3 + Math.abs(x - cx);
        if (dist < closestDist) {
          closestDist = dist;
          closestEl = sib;
          closestIsAfter = (Math.abs(y - cy) < box.height / 2) ? (x > cx) : (y > cy);
        }
      });
      return closestIsAfter ? closestEl.nextElementSibling : closestEl;
    };

    allOptions().forEach((option) => {
      option.addEventListener('dragstart', () => option.classList.add('dragging'));
      option.addEventListener('dragend', () => option.classList.remove('dragging'));

      // Click-to-move: tap an option to toggle it between palette and drop zone.
      option.addEventListener('click', function () {
        if (this.parentElement === dragContainer) {
          optionsArea.appendChild(this);
          this.classList.remove('placed');
        } else {
          dragContainer.appendChild(this);
          this.classList.add('placed');
        }
      });
    });

    [dragContainer, optionsArea].forEach((area) => {
      area.addEventListener('dragover', (e) => {
        e.preventDefault();
        const dragging = document.querySelector('.dragging');
        if (!dragging) return;
        if (area === dragContainer) {
          const insertBefore = getInsertPosition(e.clientX, e.clientY);
          area.insertBefore(dragging, insertBefore);
          dragging.classList.add('placed');
        } else {
          area.appendChild(dragging);
          dragging.classList.remove('placed');
        }
      });
      area.addEventListener('drop', (e) => e.preventDefault());
    });
  },

  // ----- grading (called by core/quiz-controller via checkAnswer hook) ----
  checkAnswer(question, ctx) {
    const { state, storage, ui } = ctx;
    const dragContainer = ui.elements.answerContainer.querySelector('.drag-container');
    const dragFeedback = document.getElementById('dragFeedback');
    if (!dragContainer || !dragFeedback) return;

    const placedOptions = dragContainer.querySelectorAll('.option');
    if (placedOptions.length === 0) {
      dragFeedback.textContent = 'Please drag some options to the answer area before checking.';
      dragFeedback.className = 'feedback drag-feedback incorrect';
      return;
    }

    const currentAnswer = Array.from(placedOptions).map((o) => o.textContent);

    // No-op guard: stop the student from churning the same wrong answer.
    if (
      question.attempted &&
      JSON.stringify(currentAnswer) === JSON.stringify(question.userAnswer)
    ) {
      dragFeedback.textContent = 'Please adjust your answer before checking again.';
      dragFeedback.className = 'feedback drag-feedback incorrect';
      return;
    }

    question.attempts = (question.attempts || 0) + 1;
    question.userAnswer = currentAnswer;
    question.attempted = true;

    const expected = question.correctAnswer || [];
    const isCorrect =
      currentAnswer.length === expected.length &&
      currentAnswer.every((v, i) => v === expected[i]);
    question.isCorrect = isCorrect;

    // History tracks every attempt (per the policy you picked).
    state.addToHistory(question, currentAnswer, question.answerUnit || [], isCorrect);

    if (isCorrect) {
      dragFeedback.textContent = 'Correct! Well done!';
      dragFeedback.className = 'feedback drag-feedback correct';

      // Mark the question complete in core state so progress + navigator update.
      state.currentAnswerCorrect = true;
      if (!state.completedQuestions.includes(state.index)) {
        state.completedQuestions.push(state.index);
        state.answered = true;
      }
      ctx.quiz.moveQuestionToCompleted(question.number);

      // Freeze the chips in place.
      placedOptions.forEach((option) => {
        option.draggable = false;
        option.style.cursor = 'default';
        option.classList.add('correct-answer');
        option.style.pointerEvents = 'none';
      });
      const optionsArea = document.getElementById('options-area');
      if (optionsArea) {
        optionsArea.querySelectorAll('.option').forEach((option) => {
          option.draggable = false;
          option.style.cursor = 'default';
          option.style.pointerEvents = 'none';
        });
      }
      ui.updateProgressUI();
    } else {
      dragFeedback.textContent = 'Not quite. Try again by adjusting your answer.';
      dragFeedback.className = 'feedback drag-feedback incorrect';
    }
    storage.saveState();
  },

  // ----- restore (called by shell-ui when revisiting a completed question)
  // shell-ui's restore hook fires when a question was previously completed.
  // For drag, the render() path already handles correct/attempted state from
  // question.userAnswer + question.isCorrect, so we just no-op here.
  restore() {},
};

export default dragQuestion;
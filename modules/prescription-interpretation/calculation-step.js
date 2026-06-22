// modules/prescription-interpretation/calculation-step.js
// MODULE-LOCAL step plugin, key "CALCULATION".
// Renders fill-in-the-blank arithmetic steps used by applied questions.
//
// Data shape (from interpretation.json):
//   step = {
//     type: 'CALCULATION',
//     text: '...',                  // step title
//     format: 'fill-blanks',        // currently the only format
//     content: [                    // one or more "items"
//       {
//         type: 'fill-blanks' | undefined,  // default fill-blanks
//         text: '... *blank1* mg × *blank2* days = *blank3* mg ...',
//         blanks: { blank1: { answer: 20, hint: '...' }, blank2: {...}, ... },
//         hint: 'overall hint for this item'
//       }
//     ]
//   }
//
// Was: prescription-interpretation/.../applied-modules/step-types/calculation-step.js.
// Per-step user input is persisted under question.stepResponses[stepIndex].answers
// and the per-item correctness under .itemStates, exactly matching the old
// structure so saved progress in localStorage is compatible.

import dom from '../../core/dom.js';

const calculationStep = {
  key: 'CALCULATION',

  render(container, step, ctx) {
    const stepEl = container.closest('.step');
    const stepIndex = stepEl ? parseInt(stepEl.dataset.step, 10) : 0;
    const question = ctx.state.quizQuestions[ctx.state.index];

    const stepContent = dom.create('div', 'step-content calculation-step');

    if (Array.isArray(step.content)) {
      step.content.forEach((item, itemIndex) => {
        const itemContainer = dom.create('div', 'interpretation-item calculation-item');
        itemContainer.dataset.itemIndex = itemIndex;
        itemContainer.dataset.itemType = item.type || 'fill-blanks';
        this.renderFillBlanksItem(itemContainer, item, stepIndex, itemIndex);
        stepContent.appendChild(itemContainer);
      });
    }

    // Feedback area for the whole step.
    const stepFeedback = dom.create('div', 'step-feedback');
    stepFeedback.id = `step-feedback-${stepIndex}`;
    stepContent.appendChild(stepFeedback);

    // Buttons.
    const stepInputsRow = dom.create('div', 'step-inputs-row');
    const checkBtn = dom.create('button', 'step-check-btn', 'Check Answer');
    checkBtn.addEventListener('click', () =>
      this.checkAnswer(stepEl, step, stepIndex, ctx)
    );
    stepInputsRow.appendChild(checkBtn);
    stepContent.appendChild(stepInputsRow);

    container.appendChild(stepContent);

    // Enter-to-check behavior.
    stepContent.addEventListener('keyup', (e) => {
      if (e.key === 'Enter' && e.target.matches('.fill-blank-input')) {
        this.checkAnswer(stepEl, step, stepIndex, ctx);
      }
    });
  },

  renderFillBlanksItem(itemContainer, item, stepIndex, itemIndex) {
    const textContainer = dom.create('div', 'fill-blanks-text');

    // Format: first line as a bullet header, subsequent lines indented.
    const lines = (item.text || '').split('\n');
    const firstLineFormatted = `<strong>• ${lines[0]}</strong>`;
    const subsequentLines = lines.slice(1).map(
      (line) => `<span class="indented-calculation-line">${line}</span>`
    );
    let combinedLines = [firstLineFormatted, ...subsequentLines].join('<br>');

    // Replace *blankN* / *blank* placeholders with inputs, and collect the
    // canonical answer data on the container so checkAnswer can validate.
    const blankData = [];
    const processedText = combinedLines.replace(/\*blank(\d*)\*/g, (match, blankNum) => {
      const blankId = blankNum ? `blank${blankNum}` : 'blank';
      if (item.blanks && item.blanks[blankId]) {
        const info = item.blanks[blankId];
        blankData.push({
          id: blankId,
          num: blankNum ? parseInt(blankNum, 10) : 0,
          answer: info.answer,
          hint: info.hint || '',
        });
        return `<input type="number" class="fill-blank-input short-calculation-input" data-blank-id="${blankId}" data-step-index="${stepIndex}" data-item-index="${itemIndex}" step="any">`;
      }
      return match;
    });

    textContainer.innerHTML = processedText;
    itemContainer.appendChild(textContainer);
    itemContainer.dataset.blankData = JSON.stringify(blankData);
    if (item.hint) itemContainer.dataset.hint = item.hint;
  },

  // ----- grading ----------------------------------------------------------
  checkAnswer(stepEl, step, stepIndex, ctx) {
    if (!stepEl) return;
    const { state, storage } = ctx;
    const question = state.quizQuestions[state.index];
    const feedback = document.getElementById(`step-feedback-${stepIndex}`);
    const stepContent = stepEl.querySelector('.step-content');

    // Ensure per-step response object exists.
    if (!question.stepResponses) question.stepResponses = {};
    if (!question.stepResponses[stepIndex]) {
      question.stepResponses[stepIndex] = {
        answers: {},
        itemStates: (step.content || []).map(() => ({ correct: false, checked: false })),
        completed: false,
        attempts: 0,
      };
    }
    const stepResponse = question.stepResponses[stepIndex];
    stepResponse.attempts = (stepResponse.attempts || 0) + 1;

    if (feedback) { feedback.textContent = ''; feedback.className = 'step-feedback'; }

    let allCorrect = true;
    let anyEmpty = false;
    let firstIncorrectInput = null;

    const items = stepContent.querySelectorAll('.calculation-item');
    items.forEach((itemContainer) => {
      const itemIndex = parseInt(itemContainer.dataset.itemIndex, 10);
      const prev = itemContainer.querySelector('.item-feedback');
      if (prev) prev.remove();

      const blankData = JSON.parse(itemContainer.dataset.blankData || '[]');
      const inputs = itemContainer.querySelectorAll('.fill-blank-input');

      const itemFeedback = dom.create('div', 'item-feedback fade-in');
      let itemCorrect = true;
      let itemEmpty = false;

      inputs.forEach((input) => {
        const blankId = input.dataset.blankId;
        const info = blankData.find((b) => b.id === blankId);
        const userAnswer = input.value.trim();
        input.classList.remove('correct', 'incorrect');

        if (!userAnswer) {
          input.classList.add('incorrect');
          itemEmpty = true; anyEmpty = true; itemCorrect = false; allCorrect = false;
          if (!firstIncorrectInput) firstIncorrectInput = input;
        } else {
          const v = parseFloat(userAnswer);
          if (info && !Number.isNaN(v) && Math.abs(v - info.answer) < 0.001) {
            input.classList.add('correct');
          } else {
            input.classList.add('incorrect');
            itemCorrect = false; allCorrect = false;
            if (!firstIncorrectInput) firstIncorrectInput = input;
          }
        }

        // Persist user input regardless of correctness so resume works.
        stepResponse.answers[`item${itemIndex}_${blankId}`] = userAnswer;
      });

      stepResponse.itemStates[itemIndex] = { correct: itemCorrect, checked: true };

      if (itemEmpty) {
        itemFeedback.classList.add('incorrect');
        itemFeedback.textContent = 'Please fill in all blanks.';
      } else if (!itemCorrect) {
        itemFeedback.classList.add('incorrect');
        const hint = itemContainer.dataset.hint || '';
        itemFeedback.textContent = 'One or more values are incorrect. Try again.';
        if (hint) itemFeedback.textContent += ` Hint: ${hint}`;
      } else {
        itemFeedback.classList.add('correct');
        itemFeedback.textContent = 'Correct!';
        inputs.forEach((input) => { input.disabled = true; });
      }
      itemContainer.appendChild(itemFeedback);
    });

    if (allCorrect) {
      stepResponse.completed = true;
      if (!question.completedSteps) question.completedSteps = [];
      if (!question.completedSteps.includes(stepIndex)) question.completedSteps.push(stepIndex);
      // Lock the check button on success.
      const checkBtn = stepContent.querySelector('.step-check-btn');
      if (checkBtn) checkBtn.disabled = true;
      // Tell the applied flow to advance / wrap up.
      if (ctx.appliedFlow) ctx.appliedFlow.advance(question, stepIndex);
    } else if (firstIncorrectInput) {
      firstIncorrectInput.focus();
    }

    storage.saveState();
  },

  // ----- restore (for completed questions revisited) ---------------------
  restoreCompleted(stepDiv, step, ctx) {
    const stepIndex = parseInt(stepDiv.dataset.step, 10);
    const stepContent = stepDiv.querySelector('.step-content');
    if (!stepContent) return;
    const question = ctx.state.quizQuestions[ctx.state.index];
    const isComplete = question.completedSteps && question.completedSteps.includes(stepIndex);
    const saved = question.stepResponses ? question.stepResponses[stepIndex] : null;

    stepContent.querySelectorAll('.calculation-item').forEach((itemContainer) => {
      const itemIndex = parseInt(itemContainer.dataset.itemIndex, 10);
      const blankData = JSON.parse(itemContainer.dataset.blankData || '[]');
      itemContainer.querySelectorAll('.fill-blank-input').forEach((input) => {
        const blankId = input.dataset.blankId;
        const info = blankData.find((b) => b.id === blankId);
        if (isComplete) {
          // Show the canonical correct answer.
          if (info) {
            input.value = info.answer;
            input.classList.add('correct');
          }
          input.disabled = true;
        } else if (saved && saved.answers) {
          const v = saved.answers[`item${itemIndex}_${blankId}`];
          if (v !== undefined) {
            input.value = v;
            if (info && Math.abs(parseFloat(v) - info.answer) < 0.001) {
              input.classList.add('correct');
              input.disabled = true;
            }
          }
        }
      });
    });

    if (isComplete) {
      const checkBtn = stepContent.querySelector('.step-check-btn');
      if (checkBtn) checkBtn.disabled = true;
    }
  },
};

export default calculationStep;
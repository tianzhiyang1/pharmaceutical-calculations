// step-types/interpretation.js  — SHARED step plugin, key "INTERPRETATION".
// Used by both prescription-interpretation (applied questions) and
// general-dose-calculation (the tablet-splitting questions). Three sub-formats
// based on step.format (or the item type if format is absent):
//   - 'select'       : dropdown options chosen for "X = *answerN*" patterns
//   - 'short-answer' : free-text inputs matched (normalized) against a list
//                      of acceptable answers
//   - 'fill-blanks'  : numeric fill-in-the-blank (same shape as calculation)
//
// On completion it advances flow-agnostically (advanceStep): prescription's
// applied questions reveal one step at a time via ctx.appliedFlow; modules on
// the standard step flow (general-dose) use ctx.quiz.advanceAfterStep.
// State persists under question.stepResponses[stepIndex].

import dom from '../core/dom.js';

const interpretationStep = {
  key: 'INTERPRETATION',

  // The question this step belongs to. Normally the current question; in the
  // history solution modal core sets ctx.currentSolutionQuestion (which may
  // differ from the question on screen).
  questionFor(ctx) {
    return ctx.currentSolutionQuestion || ctx.state.quizQuestions[ctx.state.index];
  },

  // Hand control back to whichever step flow this module uses.
  advanceStep(question, stepIndex, ctx) {
    if (ctx.appliedFlow) {
      ctx.appliedFlow.advance(question, stepIndex);
      return;
    }
    if (ctx.quiz && ctx.quiz.advanceAfterStep) {
      const stepEl = document.querySelector(`#steps .step[data-step="${stepIndex}"]`);
      if (stepEl) ctx.quiz.advanceAfterStep(stepEl);
    }
  },

  render(container, step, ctx) {
    const stepEl = container.closest('.step');
    const stepIndex = stepEl ? parseInt(stepEl.dataset.step, 10) : 0;

    const stepContent = dom.create('div', 'step-content interpretation-step');
    const inputsContainer = dom.create('div', 'interpretation-inputs');

    if (step.format === 'select') {
      this.renderSelectFormat(inputsContainer, step, stepIndex);
    } else {
      this.renderShortAndFillBlanks(inputsContainer, step, stepIndex);
    }
    stepContent.appendChild(inputsContainer);

    const stepFeedback = dom.create('div', 'step-feedback');
    stepFeedback.id = `step-feedback-${stepIndex}`;
    stepContent.appendChild(stepFeedback);

    const row = dom.create('div', 'step-inputs-row');
    const hintBtn = dom.create('button', 'step-hint-btn', 'Show Hint');
    hintBtn.addEventListener('click', () => this.showHint(stepEl, step, stepIndex));
    row.appendChild(hintBtn);

    const checkBtn = dom.create('button', 'step-check-btn', 'Check Answer');
    checkBtn.addEventListener('click', () => this.checkAnswer(stepEl, step, stepIndex, ctx));
    row.appendChild(checkBtn);
    stepContent.appendChild(row);

    container.appendChild(stepContent);

    stepContent.addEventListener('keyup', (e) => {
      if (e.key === 'Enter' && e.target.matches('.short-answer-input, .fill-blank-input')) {
        this.checkAnswer(stepEl, step, stepIndex, ctx);
      }
    });
  },

  // ----- rendering: 'select' format --------------------------------------
  renderSelectFormat(container, step, stepIndex) {
    let optionsData = null;
    const textItems = [];
    (step.content || []).forEach((item) => {
      if (item.options) optionsData = item.options;
      else if (item.text) textItems.push(item);
    });
    if (!optionsData) {
      container.innerHTML = '<div class="error-message">Error: Missing options data for this step.</div>';
      return;
    }
    // Build a shuffled list of option keys so the dropdown order is randomized.
    const optionKeys = Object.keys(optionsData);
    for (let i = optionKeys.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [optionKeys[i], optionKeys[j]] = [optionKeys[j], optionKeys[i]];
    }

    textItems.forEach((item, itemIndex) => {
      const itemContainer = dom.create('div', 'interpretation-item select-item');
      itemContainer.dataset.itemIndex = itemIndex;
      itemContainer.dataset.itemType = 'select';

      const processedText = item.text.replace(/\n/g, '<br>');
      const m = processedText.match(/\*([a-zA-Z0-9]+)\*/);
      if (!m) {
        const textContainer = dom.create('div', 'select-text-container');
        textContainer.innerHTML = processedText;
        itemContainer.appendChild(textContainer);
        container.appendChild(itemContainer);
        return;
      }
      const answerKey = m[1];
      const selectEl = dom.create('select', 'interpretation-select');
      selectEl.dataset.correctAnswerKey = answerKey;
      selectEl.dataset.stepIndex = stepIndex;
      selectEl.dataset.itemIndex = itemIndex;

      const placeholder = dom.create('option', '', 'Select...');
      placeholder.value = '';
      selectEl.appendChild(placeholder);
      optionKeys.forEach((key) => {
        const opt = dom.create('option', '', optionsData[key]);
        opt.value = key;
        selectEl.appendChild(opt);
      });

      // Replace the placeholder in the text with the actual dropdown element.
      const before = processedText.slice(0, m.index);
      const after = processedText.slice(m.index + m[0].length);
      const textContainer = dom.create('div', 'select-text-container');
      const beforeNode = document.createElement('span');
      beforeNode.innerHTML = before;
      const afterNode = document.createElement('span');
      afterNode.innerHTML = after;
      textContainer.appendChild(beforeNode);
      textContainer.appendChild(selectEl);
      textContainer.appendChild(afterNode);

      if (item.hint) itemContainer.dataset.hint = item.hint;
      itemContainer.appendChild(textContainer);
      container.appendChild(itemContainer);
    });
  },

  // ----- rendering: short-answer + fill-blanks ---------------------------
  renderShortAndFillBlanks(container, step, stepIndex) {
    (step.content || []).forEach((item, itemIndex) => {
      const itemContainer = dom.create('div', 'interpretation-item');
      itemContainer.dataset.itemIndex = itemIndex;
      itemContainer.dataset.itemType = item.type;

      if (item.type === 'short-answer') {
        const textContainer = dom.create('div', 'fill-blanks-text');
        let processedText = (item.text || '').replace(/\n/g, '<br>');

        // Collect blankN array properties from the item (e.g. blank1: ['by mouth', 'orally']).
        const blankAnswerData = {};
        let hasBlanks = false;
        for (const key in item) {
          const m = key.match(/^blank(\d+)$/);
          if (m && Array.isArray(item[key])) {
            blankAnswerData[m[1]] = item[key];
            hasBlanks = true;
          }
        }
        if (hasBlanks) {
          itemContainer.dataset.blankAnswers = JSON.stringify(blankAnswerData);
          processedText = processedText.replace(/\*blank(\d+)\*/g, (m, blankNum) => {
            if (blankAnswerData[blankNum]) {
              return `<input type="text" class="short-answer-input" data-blank-number="${blankNum}" data-step-index="${stepIndex}" data-item-index="${itemIndex}">`;
            }
            return `<span>[Error: Missing data for blank ${blankNum}]</span>`;
          });
        }
        textContainer.innerHTML = processedText;
        itemContainer.appendChild(textContainer);
        if (item.hint) itemContainer.dataset.hint = item.hint;
      } else if (item.type === 'fill-blanks') {
        const textContainer = dom.create('div', 'fill-blanks-text');
        let processedText = (item.text || '').replace(/\n/g, '<br>');
        const blankData = [];
        processedText = processedText.replace(/\*blank(\d*)\*/g, (m, blankNum) => {
          const blankId = blankNum ? `blank${blankNum}` : 'blank';
          if (item.blanks && item.blanks[blankId]) {
            const info = item.blanks[blankId];
            blankData.push({
              id: blankId,
              num: blankNum ? parseInt(blankNum, 10) : 0,
              answer: info.answer,
              hint: info.hint || '',
            });
            return `<input type="number" class="fill-blank-input" data-blank-id="${blankId}" data-step-index="${stepIndex}" data-item-index="${itemIndex}" step="any">`;
          }
          return m;
        });
        textContainer.innerHTML = processedText;
        itemContainer.appendChild(textContainer);
        itemContainer.dataset.blankData = JSON.stringify(blankData);
        if (item.hint) itemContainer.dataset.hint = item.hint;
      }
      container.appendChild(itemContainer);
    });
  },

  // ----- hint button -----------------------------------------------------
  showHint(stepEl, step, stepIndex) {
    const feedback = document.getElementById(`step-feedback-${stepIndex}`);
    if (!feedback) return;
    const hints = (step.content || [])
      .map((item) => item.hint)
      .filter(Boolean);
    if (hints.length === 0) {
      feedback.textContent = 'No hint available for this step.';
      feedback.className = 'step-feedback';
      return;
    }
    feedback.innerHTML = hints.map((h) => `<div>${h}</div>`).join('');
    feedback.className = 'step-feedback hint-active';
  },

  // ----- grading ---------------------------------------------------------
  checkAnswer(stepEl, step, stepIndex, ctx) {
    if (!stepEl) return;
    const { storage } = ctx;
    const question = this.questionFor(ctx);
    const stepContent = stepEl.querySelector('.step-content');
    const feedback = document.getElementById(`step-feedback-${stepIndex}`);

    if (!question.stepResponses) question.stepResponses = {};
    if (!question.stepResponses[stepIndex]) {
      question.stepResponses[stepIndex] = { answers: {}, itemStates: [], completed: false };
    }
    const stepResponse = question.stepResponses[stepIndex];

    if (feedback) { feedback.textContent = ''; feedback.className = 'step-feedback'; }

    let allCorrect = true;
    let anyEmpty = false;

    const items = stepContent.querySelectorAll('.interpretation-item');
    items.forEach((itemContainer, itemArrayIndex) => {
      const itemType = itemContainer.dataset.itemType;
      const itemIndex = parseInt(itemContainer.dataset.itemIndex, 10);
      const prev = itemContainer.querySelector('.item-feedback');
      if (prev) prev.remove();

      let itemCorrect = true;

      if (itemType === 'select') {
        const selectEl = itemContainer.querySelector('select.interpretation-select');
        if (!selectEl) return;
        const selected = selectEl.value;
        const correctKey = selectEl.dataset.correctAnswerKey;
        selectEl.classList.remove('correct', 'incorrect');
        if (!selected) {
          selectEl.classList.add('incorrect'); itemCorrect = false; anyEmpty = true;
        } else if (selected === correctKey) {
          selectEl.classList.add('correct');
          selectEl.disabled = true;
          stepResponse.answers[`item${itemIndex}_select`] = selected;
        } else {
          selectEl.classList.add('incorrect'); itemCorrect = false;
        }
      } else if (itemType === 'short-answer') {
        const blanks = JSON.parse(itemContainer.dataset.blankAnswers || '{}');
        const inputs = itemContainer.querySelectorAll('.short-answer-input');
        let groupCorrect = true;
        let groupEmpty = false;
        const itemFeedback = dom.create('div', 'item-feedback fade-in');

        inputs.forEach((input) => {
          const blankNum = input.dataset.blankNumber;
          const accepted = blanks[blankNum] || [];
          const v = input.value.trim();
          input.classList.remove('correct', 'incorrect');

          if (!v) {
            input.classList.add('incorrect'); groupEmpty = true; groupCorrect = false; anyEmpty = true;
          } else {
            const normalize = (s) => s.toLowerCase().replace(/[.,!?;:]/g, '').replace(/\s+/g, ' ').trim();
            const ok = accepted.some((a) => normalize(a) === normalize(v));
            if (ok) {
              input.classList.add('correct');
              stepResponse.answers[`item${itemIndex}_blank${blankNum}`] = v;
            } else {
              input.classList.add('incorrect'); groupCorrect = false;
            }
          }
        });
        if (groupEmpty) {
          itemFeedback.classList.add('incorrect');
          itemFeedback.textContent = 'Please enter an answer for all blanks.';
        } else if (!groupCorrect) {
          itemFeedback.classList.add('incorrect');
          itemFeedback.textContent = 'Try again.';
          const hint = itemContainer.dataset.hint;
          if (hint) itemFeedback.textContent += ` Hint: ${hint}`;
        } else {
          itemFeedback.classList.add('correct');
          itemFeedback.textContent = 'Correct!';
          inputs.forEach((i) => { i.disabled = true; });
        }
        itemContainer.appendChild(itemFeedback);
        itemCorrect = groupCorrect;
      } else if (itemType === 'fill-blanks') {
        const blankData = JSON.parse(itemContainer.dataset.blankData || '[]');
        const inputs = itemContainer.querySelectorAll('.fill-blank-input');
        const itemFeedback = dom.create('div', 'item-feedback fade-in');
        let groupCorrect = true;
        let groupEmpty = false;

        inputs.forEach((input) => {
          const blankId = input.dataset.blankId;
          const info = blankData.find((b) => b.id === blankId);
          const v = input.value.trim();
          input.classList.remove('correct', 'incorrect');
          if (!v) {
            input.classList.add('incorrect'); groupEmpty = true; groupCorrect = false; anyEmpty = true;
          } else {
            const num = parseFloat(v);
            if (info && !Number.isNaN(num) && Math.abs(num - info.answer) < 0.001) {
              input.classList.add('correct');
              stepResponse.answers[`item${itemIndex}_${blankId}`] = v;
            } else {
              input.classList.add('incorrect'); groupCorrect = false;
            }
          }
        });
        if (groupEmpty) {
          itemFeedback.classList.add('incorrect');
          itemFeedback.textContent = 'Please fill in all blanks.';
        } else if (!groupCorrect) {
          itemFeedback.classList.add('incorrect');
          itemFeedback.textContent = 'One or more values are incorrect. Try again.';
          const hint = itemContainer.dataset.hint;
          if (hint) itemFeedback.textContent += ` Hint: ${hint}`;
        } else {
          itemFeedback.classList.add('correct');
          itemFeedback.textContent = 'Correct!';
          inputs.forEach((i) => { i.disabled = true; });
        }
        itemContainer.appendChild(itemFeedback);
        itemCorrect = groupCorrect;
      }

      if (!itemCorrect) allCorrect = false;
    });

    if (allCorrect) {
      stepResponse.completed = true;
      if (!question.completedSteps) question.completedSteps = [];
      if (!question.completedSteps.includes(stepIndex)) question.completedSteps.push(stepIndex);
      const checkBtn = stepContent.querySelector('.step-check-btn');
      if (checkBtn) checkBtn.disabled = true;
      this.advanceStep(question, stepIndex, ctx);
    }

    storage.saveState();
  },

  // ----- restore (for completed questions revisited) ---------------------
  restoreCompleted(stepDiv, step, ctx) {
    const stepIndex = parseInt(stepDiv.dataset.step, 10);
    const stepContent = stepDiv.querySelector('.step-content');
    if (!stepContent) return;
    const question = this.questionFor(ctx);
    // In the history solution modal the step is complete by definition.
    const isComplete = !!ctx.currentSolutionQuestion ||
      (question.completedSteps && question.completedSteps.includes(stepIndex));
    const saved = question.stepResponses ? question.stepResponses[stepIndex] : null;

    stepContent.querySelectorAll('.interpretation-item').forEach((itemContainer) => {
      const itemIndex = parseInt(itemContainer.dataset.itemIndex, 10);
      const itemType = itemContainer.dataset.itemType;

      if (itemType === 'select') {
        const selectEl = itemContainer.querySelector('select.interpretation-select');
        if (!selectEl) return;
        if (isComplete) {
          selectEl.value = selectEl.dataset.correctAnswerKey;
          selectEl.classList.add('correct');
          selectEl.disabled = true;
        } else if (saved && saved.answers) {
          const v = saved.answers[`item${itemIndex}_select`];
          if (v !== undefined) {
            selectEl.value = v;
            if (v === selectEl.dataset.correctAnswerKey) {
              selectEl.classList.add('correct');
              selectEl.disabled = true;
            }
          }
        }
      } else if (itemType === 'short-answer') {
        const blanks = JSON.parse(itemContainer.dataset.blankAnswers || '{}');
        itemContainer.querySelectorAll('.short-answer-input').forEach((input) => {
          const blankNum = input.dataset.blankNumber;
          const accepted = blanks[blankNum] || [];
          if (isComplete) {
            input.value = accepted[0] || '';
            input.classList.add('correct');
            input.disabled = true;
          } else if (saved && saved.answers) {
            const v = saved.answers[`item${itemIndex}_blank${blankNum}`];
            if (v !== undefined) {
              input.value = v;
              const normalize = (s) => s.toLowerCase().replace(/[.,!?;:]/g, '').replace(/\s+/g, ' ').trim();
              if (accepted.some((a) => normalize(a) === normalize(v))) {
                input.classList.add('correct'); input.disabled = true;
              }
            }
          }
        });
      } else if (itemType === 'fill-blanks') {
        const blankData = JSON.parse(itemContainer.dataset.blankData || '[]');
        itemContainer.querySelectorAll('.fill-blank-input').forEach((input) => {
          const blankId = input.dataset.blankId;
          const info = blankData.find((b) => b.id === blankId);
          if (isComplete && info) {
            input.value = info.answer; input.classList.add('correct'); input.disabled = true;
          } else if (saved && saved.answers) {
            const v = saved.answers[`item${itemIndex}_${blankId}`];
            if (v !== undefined) {
              input.value = v;
              if (info && Math.abs(parseFloat(v) - info.answer) < 0.001) {
                input.classList.add('correct'); input.disabled = true;
              }
            }
          }
        });
      }
    });

    if (isComplete) {
      const checkBtn = stepContent.querySelector('.step-check-btn');
      if (checkBtn) checkBtn.disabled = true;
    }
  },
};

export default interpretationStep;
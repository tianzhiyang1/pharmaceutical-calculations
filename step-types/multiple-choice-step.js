// step-types/multiple-choice-step.js  — shared plugin, key "MULTIPLE_CHOICE"
// Renders shuffled options and owns its own check/progression flow (matching
// the old template.MULTIPLE_CHOICE). Progression touches shared state via ctx.

import dom from '../core/dom.js';

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const multipleChoiceStep = {
  key: 'MULTIPLE_CHOICE',

  render(container, step, ctx) {
    const { state, storage } = ctx;
    const mcContainer = dom.create('div', 'multiple-choice-container');
    const optionsContainer = dom.create('div', 'multiple-choice-options');

    shuffle(step.options).forEach((option) => {
      const button = dom.create('button', 'multiple-choice-option', option);
      button.dataset.value = option;
      button.addEventListener('click', function () {
        optionsContainer.querySelectorAll('.multiple-choice-option').forEach((b) =>
          b.classList.remove('selected', 'correct', 'incorrect')
        );
        this.classList.add('selected');
      });
      optionsContainer.appendChild(button);
    });
    mcContainer.appendChild(optionsContainer);

    const feedback = dom.create('div', 'hint-container');
    mcContainer.appendChild(feedback);

    const checkBtnContainer = dom.create('div', 'check-btn-container');
    const checkBtn = dom.create('button', 'step-check-btn', 'Check Answer');
    checkBtn.addEventListener('click', () => {
      const selected = optionsContainer.querySelector('.multiple-choice-option.selected');
      if (!selected) {
        feedback.textContent = 'Please select an option';
        feedback.className = 'hint-container hint-error';
        return;
      }
      if (selected.dataset.value === step.answer) {
        selected.classList.add('correct');
        feedback.textContent = 'Correct!';
        feedback.className = 'hint-container hint-correct';
        checkBtn.disabled = true;

        const stepElement = mcContainer.closest('.step');
        if (stepElement) {
          const stepIndex = parseInt(stepElement.dataset.step, 10);
          if (!state.completedSteps.includes(stepIndex)) state.completedSteps.push(stepIndex);
          // Persist this step so a reload reopens the guide here (this plugin
          // owns its own advance and doesn't go through quiz.advanceAfterStep).
          if (storage && storage.saveState) storage.saveState();
          const nextStep = document.querySelector(`.step[data-step="${stepIndex + 1}"]`);
          if (nextStep) {
            nextStep.style.display = 'block';
            const nextInput = nextStep.querySelector('.box-input, .multiple-choice-option');
            if (nextInput) setTimeout(() => nextInput.focus(), 50);
          } else {
            const nb = document.getElementById('stepNextQuestion');
            if (nb) { nb.disabled = false; nb.classList.remove('disabled-btn'); nb.focus(); }
          }
        }
      } else {
        selected.classList.add('incorrect');
        feedback.textContent = step.hint || 'Incorrect. Try again.';
        feedback.className = 'hint-container hint-error';
      }
    });
    checkBtnContainer.appendChild(checkBtn);
    mcContainer.appendChild(checkBtnContainer);
    container.appendChild(mcContainer);
  },
};

export default multipleChoiceStep;
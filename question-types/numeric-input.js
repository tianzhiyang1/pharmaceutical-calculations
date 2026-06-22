// question-types/numeric-input.js  — shared plugin, key "numeric"
// Builds the main answer area: one row per expected answer value, each with a
// numeric input plus either a fixed unit label or a randomized unit dropdown
// (when question.optionUnits is present), and the "Show Answer" button.
// (Was: the answer-area construction inside basic-methods/ui.js loadQuestion.)
// Grading is done by core/quiz-controller.js via core/grading.js.

import dom from '../core/dom.js';

const numericInput = {
  key: 'numeric',

  render(answerContainer, question, ctx) {
    answerContainer.style.flexDirection = 'column';
    answerContainer.style.alignItems = 'flex-start';

    question.answerValue.forEach((value, index) => {
      const row = dom.create('div', 'answer-container');
      row.style.width = '100%';

      const label = dom.create('label');
      label.textContent = index === 0 ? 'Answer:' : `Answer ${index + 1}:`;

      const input = dom.create('input', 'answer-input box-input');
      input.type = 'text';
      input.step = 'any';

      row.appendChild(label);
      row.appendChild(input);

      if (question.optionUnits && question.optionUnits.length > 0) {
        const dropdown = dom.create('select', 'unit-dropdown');
        dropdown.dataset.answerIndex = index;
        [...question.optionUnits].sort(() => 0.5 - Math.random()).forEach((unit) => {
          const option = dom.create('option', '', unit);
          option.value = unit;
          dropdown.appendChild(option);
        });
        dropdown.selectedIndex = 0;
        row.appendChild(dropdown);
        if (index === 0) ctx.ui.elements.answerUnitDropdown = dropdown;
      } else {
        const unit = dom.create('span', 'unit');
        unit.textContent = (question.answerUnit && question.answerUnit[index]) || '';
        row.appendChild(unit);
        if (index === 0) ctx.ui.elements.answerUnit = unit;
      }

      answerContainer.appendChild(row);
    });

    const showAnswerBtn = dom.create('button', 'button-accent');
    showAnswerBtn.id = 'answerBtn';
    showAnswerBtn.textContent = 'Show Answer';
    showAnswerBtn.disabled = true;
    answerContainer.appendChild(showAnswerBtn);
    ctx.ui.elements.answerBtn = showAnswerBtn;
  },

  restore(answerContainer, historyEntry, question, ctx) {
    const firstInput = answerContainer.querySelector('.answer-input');
    if (firstInput) {
      firstInput.value = Array.isArray(historyEntry.userAnswer)
        ? historyEntry.userAnswer[0]
        : historyEntry.userAnswer;
    }
    if (question.optionUnits && question.optionUnits.length > 0 && ctx.ui.elements.answerUnitDropdown) {
      const dd = ctx.ui.elements.answerUnitDropdown;
      const want = Array.isArray(historyEntry.userUnit) ? historyEntry.userUnit[0] : historyEntry.userUnit;
      if (Array.from(dd.options).some((o) => o.value === want)) dd.value = want;
    }
  },
};

export default numericInput;
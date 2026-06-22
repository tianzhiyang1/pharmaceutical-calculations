// core/dom.js
// Shared DOM helpers. (Was: basic-methods/dom-util.js.) Imports only the pure
// numeric-answer check from grading.js (no cycle — grading imports nothing).

import { isNumericAnswer } from './grading.js';

const dom = {
  get: (id) => document.getElementById(id),

  create(tag, className = '', text = '') {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text) el.textContent = text;
    return el;
  },

  createFromHTML(html) {
    const div = document.createElement('div');
    div.innerHTML = html.trim();
    return div.firstChild;
  },

  setFeedback(element, isCorrect, message) {
    element.textContent = message;
    element.className = `hint-container hint-${isCorrect ? 'correct' : 'error'}`;
  },

  // Static (non-interactive) table built from a question's tableHeaders/tableRows
  // — the "original formula" shown alongside enlarging/reducing questions. Cells
  // hold only literal `text` operands. Gated per-module by config.showQuestionTable
  // and rendered by both shell-ui.loadQuestion and history.openSolutionModal.
  renderQuestionTable(headers, rows) {
    const table = this.create('table', 'question-table');
    if (headers) {
      const thead = this.create('thead');
      const headerRow = this.create('tr');
      headers.forEach((h) => headerRow.appendChild(this.create('th', '', h)));
      thead.appendChild(headerRow);
      table.appendChild(thead);
    }
    if (rows) {
      const tbody = this.create('tbody');
      rows.forEach((rowCells) => {
        const tr = this.create('tr');
        rowCells.forEach((cellOperands) => {
          const td = this.create('td');
          cellOperands.forEach((operand) => {
            if (operand && (operand.type === 'text' || operand.type === 'value')) {
              td.appendChild(this.create('span', '', operand.value));
            } else if (typeof operand === 'string') {
              td.appendChild(this.create('span', '', operand));
            }
          });
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
    }
    return table;
  },

  // Shared input-with-unit factory used by the step-type plugins.
  // (Was: utils.createInput in basic-methods/script.js.)
  // `cancellable` is generic markup support; the actual cancel interaction is
  // wired only by the module that registers a cancellation step plugin.
  createInput(answer, hint = '', className = '', unit = '', cancellable = false, cancellableValue = 'true') {
    // Most step answers are numeric, but some are short text (e.g. "Male" /
    // "Female", "5'5\"" in nutritional-dosing). A type="number" field can't hold
    // text, so pick the field type from the answer; graded as a string in grading.js.
    const inputType = isNumericAnswer(answer) ? 'number' : 'text';
    const safeAnswer = String(answer).replace(/"/g, '&quot;');
    return this.createFromHTML(`
      <span>
        <input type="${inputType}" step="any" class="box-input ${className}"
               data-answer="${safeAnswer}" data-hint="${hint}">
        ${unit ? `<span class="unit${cancellable ? ' cancellable' : ''}"
                data-unit="${unit}" ${cancellable ? `data-cancellable="${cancellableValue}"` : ''}> ${unit}</span>` : ''}
      </span>
    `);
  },

  // The value to show in a step input when replaying a completed answer: the
  // number (optionally fixed to `decimals`), or the raw text for text answers.
  answerInputValue(rawAnswer, decimals) {
    if (!isNumericAnswer(rawAnswer)) return rawAnswer;
    const n = parseFloat(rawAnswer);
    return decimals != null ? n.toFixed(decimals) : String(n);
  },
};

export default dom;
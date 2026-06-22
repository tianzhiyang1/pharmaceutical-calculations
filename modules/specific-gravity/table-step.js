// modules/specific-gravity/table-step.js
// MODULE-LOCAL step-type plugin, key "TABLE" — the ingredient/scaling tables
// used by the enlarging-&-reducing questions (and a few specific-gravity ones).
// A TABLE step is a grid of cells; each cell is a list of operands (literal
// `text` and numeric `input`). The inputs are plain `.box-input`s carrying
// `data-answer`, so the shared flow grades and replays them for free:
//   - checkStepInputs() validates the inputs, shows the step hint on a miss,
//     locks the step and advances on success;
//   - the live guide, the read-only solution modal, and reload-resume all refill
//     each `.box-input` from its `data-answer`.
// So this plugin only needs render() + hintForInput(); no bespoke grading/restore.
// (Ported from the old specific-gravity template.js TABLE renderer.)

import dom from '../../core/dom.js';

const tableStep = {
  key: 'TABLE',

  render(container, step) {
    const tableContainer = dom.create('div', 'table-container');
    if (step.hint) tableContainer.dataset.hint = step.hint;

    const table = dom.create('table', 'calculation-table');

    if (step.tableHeaders) {
      const thead = dom.create('thead');
      const headerRow = dom.create('tr');
      step.tableHeaders.forEach((header) => headerRow.appendChild(dom.create('th', '', header)));
      thead.appendChild(headerRow);
      table.appendChild(thead);
    }

    if (step.tableRows) {
      const tbody = dom.create('tbody');
      step.tableRows.forEach((rowCells) => {
        const row = dom.create('tr');
        rowCells.forEach((cellOperands) => {
          const td = dom.create('td', 'table-cell');
          cellOperands.forEach((operand) => this.appendCellOperand(td, operand));
          row.appendChild(td);
        });
        tbody.appendChild(row);
      });
      table.appendChild(tbody);
    }

    tableContainer.appendChild(table);
    container.appendChild(tableContainer);

    tableContainer.appendChild(dom.create('div', 'hint-container'));

    // Check button only when the table actually has inputs to grade. The shell
    // routes the click to checkStepInputs(), which validates the .box-inputs and
    // advances the guide.
    if (tableContainer.querySelectorAll('.box-input').length > 0) {
      tableContainer.appendChild(dom.createFromHTML(
        '<div class="check-btn-container"><button class="step-check-btn">Check Answer</button></div>'
      ));
    }
  },

  // Cells hold inline text and/or an input box. (This module's tables only use
  // text + input; the markup mirrors the old `.table-operand-text` / box-input.)
  appendCellOperand(td, operand) {
    if (operand && (operand.type === 'text' || operand.type === 'value')) {
      td.appendChild(dom.create('span', 'table-operand-text', operand.value));
    } else if (operand && operand.type === 'input') {
      td.appendChild(dom.createInput(operand.answer, operand.hint || '', '', operand.unit || ''));
    } else if (typeof operand === 'string') {
      td.appendChild(dom.create('span', 'table-operand-text', operand));
    }
  },

  // Wrong-input feedback: prefer the input's own hint, else the step hint.
  hintForInput(inputElement, step) {
    if (!inputElement) return null;
    const own = inputElement.dataset.hint?.trim();
    if (own) return own;
    return step && step.hint ? step.hint : null;
  },
};

export default tableStep;

// modules/alligation/tic-tac-toe-step.js
// MODULE-LOCAL step-type plugin, key "TIC_TAC_TOE" — the alligation-alternate
// scheme. Renders the classic alligation "tic-tac-toe" grid: higher / lower /
// desired concentration in the left column, the parts taken from each in the
// right column, and the total parts beneath. Every cell is a `.box-input` with
// a `data-answer`, so the shared core flow grades it for free:
//   - checkStepInputs() validates the inputs, shows the step hint on a miss,
//     locks the step and advances on success;
//   - the live guide (populateStepsFromHistory) and the read-only solution modal
//     fill each `.box-input` from its `data-answer` when reviewing a completed
//     question.
// So this plugin only needs render() + hintForInput(); no bespoke grading.
// (Ported from the old alligation/template.js TIC_TAC_TOE renderer; the check
//  button now hands back to the shared step flow via the standard markup.)

import dom from '../../core/dom.js';

const ticTacToeStep = {
  key: 'TIC_TAC_TOE',

  render(container, step) {
    if (step.content) {
      container.appendChild(dom.createFromHTML(`<p class="step-explanation">${step.content}</p>`));
    }

    const gridContainer = dom.create('div', 'alligation-grid-container');
    const table = dom.create('table', 'alligation-grid');

    // Row 1: higher concentration | (empty) | higher parts
    const row1 = dom.create('tr');
    const higherConcentrationCell = dom.create('td', 'grid-cell higher-concentration');
    higherConcentrationCell.appendChild(this.createGridInput(step.higherConcentration, 'Higher %', step.hint));
    const higherPartsCell = dom.create('td', 'grid-cell wide higher-parts no-right-border');
    higherPartsCell.appendChild(this.createGridInput(step.higherParts, 'Higher parts', step.hint));
    row1.appendChild(higherConcentrationCell);
    row1.appendChild(dom.create('td', 'grid-cell'));
    row1.appendChild(higherPartsCell);

    // Row 2: (empty) | desired concentration | +
    const row2 = dom.create('tr');
    const desiredConcentrationCell = dom.create('td', 'grid-cell desired-concentration');
    desiredConcentrationCell.appendChild(this.createGridInput(step.desiredConcentration, 'Desired %', step.hint));
    const plusCell = dom.create('td', 'grid-cell wide no-right-border');
    plusCell.textContent = '+';
    row2.appendChild(dom.create('td', 'grid-cell'));
    row2.appendChild(desiredConcentrationCell);
    row2.appendChild(plusCell);

    // Row 3: lower concentration | (empty) | lower parts
    const row3 = dom.create('tr');
    const lowerConcentrationCell = dom.create('td', 'grid-cell lower-concentration no-bottom-border');
    lowerConcentrationCell.appendChild(this.createGridInput(step.lowerConcentration, 'Lower %', step.hint));
    const lowerPartsCell = dom.create('td', 'grid-cell wide lower-parts no-right-border no-bottom-border');
    lowerPartsCell.appendChild(this.createGridInput(step.lowerParts, 'Lower parts', step.hint));
    row3.appendChild(lowerConcentrationCell);
    row3.appendChild(dom.create('td', 'grid-cell no-bottom-border'));
    row3.appendChild(lowerPartsCell);

    // Row 4: (empty) | (empty) | total parts (under a divider)
    const row4 = dom.create('tr');
    const spacer1 = dom.create('td', 'grid-cell no-bottom-border');
    spacer1.style.cssText = 'padding: 0; border: none;';
    const spacer2 = dom.create('td', 'grid-cell no-bottom-border');
    spacer2.style.cssText = 'padding: 0; border: none;';
    const totalCell = dom.create('td', 'grid-total');
    const totalDivider = dom.create('div', 'grid-total-divider');
    const totalText = dom.create('span', 'grid-total-text');
    totalText.appendChild(this.createGridInput(step.totalParts, 'Total parts', step.hint));
    totalDivider.appendChild(totalText);
    totalCell.appendChild(totalDivider);
    row4.appendChild(spacer1);
    row4.appendChild(spacer2);
    row4.appendChild(totalCell);

    table.appendChild(row1);
    table.appendChild(row2);
    table.appendChild(row3);
    table.appendChild(row4);
    gridContainer.appendChild(table);
    container.appendChild(gridContainer);

    // Hint container + Check button: the shell routes the click to
    // checkStepInputs(), which grades the .box-input cells and advances.
    container.appendChild(dom.create('div', 'hint-container'));
    container.appendChild(dom.createFromHTML(
      '<div class="check-btn-container"><button class="step-check-btn">Check Answer</button></div>'
    ));
  },

  createGridInput(value, placeholder, hint) {
    const input = dom.create('input', 'grid-input box-input');
    input.type = 'number';
    input.step = 'any';
    input.placeholder = placeholder;
    input.dataset.answer = value;
    if (hint) input.dataset.hint = hint;
    return input;
  },

  // Wrong-input feedback: prefer the input's own hint, else the step hint.
  hintForInput(inputElement, step) {
    if (!inputElement) return null;
    const own = inputElement.dataset.hint?.trim();
    if (own) return own;
    return step && step.hint ? step.hint : null;
  },
};

export default ticTacToeStep;

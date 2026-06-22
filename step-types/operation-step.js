// step-types/operation-step.js  — shared plugin, key "OPERATION"
// Renders a horizontal equation with operands (text/value/fraction/input),
// optional inline units, fractions, and a Check button. This is the GENERIC
// operation step: no unit-cancellation behavior and no help mode (those are
// basic-methods-only and live in modules/basic-methods/unit-cancellation-step.js,
// which overrides this plugin under the same "OPERATION" key).
//
// Note: the markup already supports cancellable units when an operand carries a
// `cancellable` flag. That's harmless for modules whose questions never set it;
// the *interaction* (clicking to cancel, checking, help) is what the override adds.
// (Was: the OPERATION branch + renderHorizontal/appendOperand/getValueHTML/
//  createFractionElement/addCheckButton in basic-methods/template.js, plus
//  getHintForInput from basic-methods/quiz.js.)

import dom from '../core/dom.js';

const operationStep = {
  key: 'OPERATION',

  render(container, step) {
    if (step.content) {
      container.appendChild(dom.createFromHTML(`<p class="step-explanation">${step.content}</p>`));
    }
    const opContainer = dom.create('div', 'operation-container horizontal-format');
    if (step.hint) opContainer.dataset.hint = step.hint;

    // A step may express its equation as several stacked lines, keyed
    // operands1/operators1, operands2/operators2, ... (expressions-of-concentrations
    // and general-dose-calculation use this). Fall back to a single
    // `operands`/`operators` pair (basic-methods, weights) — that path renders
    // straight into opContainer, identical to before.
    let i = 1;
    let renderedMultiLine = false;
    while (step[`operands${i}`]) {
      const line = dom.create('div', 'operation-line-container horizontal-format');
      this.renderHorizontal(line, { operands: step[`operands${i}`], operators: step[`operators${i}`] || [] });
      opContainer.appendChild(line);
      renderedMultiLine = true;
      i++;
    }
    if (!renderedMultiLine) this.renderHorizontal(opContainer, step);

    container.appendChild(opContainer);
    opContainer.appendChild(dom.create('div', 'hint-container'));
    this.addCheckButton(opContainer);
  },

  renderHorizontal(container, step) {
    const eq = dom.create('div', 'horizontal-operation');
    step.operands.forEach((operand, index) => {
      if (operand.type === 'fraction' && operand.hint) {
        const el = this.createFractionElement(operand);
        el.dataset.hint = operand.hint;
        eq.appendChild(el);
      } else {
        this.appendOperand(eq, operand);
      }
      if (index < step.operands.length - 1 && step.operators && step.operators[index]) {
        eq.appendChild(dom.create('div', 'operator', step.operators[index]));
      }
    });
    container.appendChild(eq);
  },

  appendOperand(container, operand) {
    if (operand.type === 'text' || operand.type === 'value') {
      if (operand.cancellable !== undefined) {
        const cv = operand.cancellable === false ? 'false' : 'true';
        container.appendChild(dom.createFromHTML(`
          <div class="operand-text">
            <span class="unit cancellable" data-unit="${operand.value}" data-cancellable="${cv}">${operand.value}</span>
          </div>
        `));
      } else {
        // innerHTML so authors can use inline markup (e.g. <strong>) in operand text.
        const el = dom.create('div', 'operand-text');
        el.innerHTML = operand.value;
        container.appendChild(el);
      }
    } else if (operand.type === 'fraction') {
      container.appendChild(dom.createFromHTML(`
        <div class="fraction inline-fraction">
          <div class="fraction-numerator">${this.getValueHTML(operand.numerator)}</div>
          <div class="fraction-bar"></div>
          <div class="fraction-denominator">${this.getValueHTML(operand.denominator)}</div>
        </div>
      `));
    } else if (operand.type === 'input') {
      const cv = operand.cancellable === false ? 'false' : 'true';
      container.appendChild(
        dom.createInput(operand.answer, operand.hint || '', '', operand.unit || '', operand.cancellable !== undefined, cv)
      );
    } else if (operand.type === 'hybrid') {
      // An operand mixing literal text with an input box (e.g. "58.5 × [input]").
      container.appendChild(dom.createFromHTML(`<div class="operand-hybrid">${this.getValueHTML(operand)}</div>`));
    } else if (operand.type === 'squareRoot') {
      // √ over a radicand, e.g. BSA = √(wt × ht / 3600). The radicand's inputs are
      // rendered via getValueHTML so they remain gradable .box-inputs.
      container.appendChild(dom.createFromHTML(`<span class="square-root">${this.getValueHTML(operand.radicand)}</span>`));
    } else if (typeof operand === 'string') {
      const el = dom.create('div', 'operand-text');
      el.innerHTML = operand;
      container.appendChild(el);
    }
  },

  getValueHTML(value) {
    if (typeof value === 'string') return value;
    if (value && value.type === 'input') {
      const cv = value.cancellable === false ? 'false' : 'true';
      const unitHtml = value.unit
        ? value.cancellable !== undefined
          ? ` <span class="unit cancellable" data-unit="${value.unit}" data-cancellable="${cv}">${value.unit}</span>`
          : ` <span class="unit">${value.unit}</span>`
        : '';
      return `<input type="number" step="any" class="box-input"
              data-answer="${value.answer}"
              data-hint="${value.hint || ''}">${unitHtml}`;
    }
    if (value && value.type === 'hybrid') {
      // A fraction part (numerator/denominator) mixing literal text with an
      // input box, e.g. "58.5 × [input]" or "[input] × 1.8". Emit the text and
      // input in their JSON key order, reusing the 'input' rendering above.
      return Object.keys(value)
        .map((key) => {
          if (key === 'text' && value.text) return value.text;
          if (key === 'input' && value.input) return this.getValueHTML({ type: 'input', ...value.input });
          return '';
        })
        .join('');
    }
    if (value && value.type === 'text') {
      if (value.value && value.unit) {
        if (value.cancellable !== undefined) {
          const cv = value.cancellable === false ? 'false' : 'true';
          return `${value.value} <span class="unit cancellable" data-unit="${value.unit}" data-cancellable="${cv}">${value.unit}</span>`;
        }
        return `${value.value} ${value.unit}`;
      }
      if (value.value && value.cancellable !== undefined) {
        const cv = value.cancellable === false ? 'false' : 'true';
        const match = value.value.match(/^([\d.,]+)\s+(.+)$/);
        if (match) {
          const [, number, unit] = match;
          return `${number}&nbsp;<span class="unit cancellable" data-unit="${unit}" data-cancellable="${cv}">${unit}</span>`;
        }
        return `<span class="unit cancellable" data-unit="${value.value}" data-cancellable="${cv}">${value.value}</span>`;
      }
      return value.value;
    }
    if (value && value.type === 'fraction') {
      return `
        <div class="fraction inline-fraction">
          <div class="fraction-numerator">${this.getValueHTML(value.numerator)}</div>
          <div class="fraction-bar"></div>
          <div class="fraction-denominator">${this.getValueHTML(value.denominator)}</div>
        </div>
      `;
    }
    if (value && value.type === 'squareRoot') {
      return `<span class="square-root">${this.getValueHTML(value.radicand)}</span>`;
    }
    // A bare operand group { operands: [...], operators: [...] } with no `type`
    // (e.g. a fraction numerator that multiplies two inputs). Join the parts with
    // their operators — each part is rendered by getValueHTML in turn.
    if (value && Array.isArray(value.operands)) {
      return value.operands
        .map((op, i) => {
          const sep = i < value.operands.length - 1 && value.operators && value.operators[i]
            ? ` <span class="operator">${value.operators[i]}</span> `
            : '';
          return this.getValueHTML(op) + sep;
        })
        .join('');
    }
    return '';
  },

  createFractionElement(operand) {
    const el = dom.create('div', 'fraction inline-fraction');
    const num = dom.create('div', 'fraction-numerator');
    num.innerHTML = this.getValueHTML(operand.numerator);
    el.appendChild(num);
    el.appendChild(dom.create('div', 'fraction-bar'));
    const den = dom.create('div', 'fraction-denominator');
    den.innerHTML = this.getValueHTML(operand.denominator);
    el.appendChild(den);
    if (operand.hint) el.dataset.hint = operand.hint;
    return el;
  },

  // Generic check button (no help button — the cancellation override adds that).
  addCheckButton(container) {
    if (container.querySelectorAll('.box-input').length > 0) {
      container.appendChild(dom.createFromHTML(
        '<div class="check-btn-container"><button class="step-check-btn">Check Answer</button></div>'
      ));
    }
  },

  // Returns the most specific hint for a wrong input: the input's own hint,
  // else the enclosing fraction's hint, else the step's hint. This walks the
  // DOM rather than indexing into a single `operands` array, so it works for
  // both single-line and multi-line (operands1, operands2, ...) steps.
  hintForInput(inputElement, step) {
    if (!inputElement) return null;
    const specific = inputElement.dataset.hint?.trim();
    if (specific) return specific;
    const fraction = inputElement.closest('.fraction');
    if (fraction && fraction.dataset.hint) return fraction.dataset.hint.trim();
    return step && step.hint ? step.hint : null;
  },
};

export default operationStep;
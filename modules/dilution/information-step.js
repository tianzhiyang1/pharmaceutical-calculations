// modules/dilution/information-step.js
// MODULE-LOCAL step-type plugin, key "INFORMATION" — overrides the shared
// bullet-list INFORMATION step.
//
// Dilution's INFORMATION steps are explainer steps:
//   - string content: an explanatory paragraph (quoted phrases are bolded),
//     optionally followed by the question with `questionHighlights` terms
//     marked, and a "Next Step" button to advance.
//   - array content (text + optional input): rendered as info rows; if the
//     step has inputs the shared checkStepInputs flow grades them, otherwise a
//     "Next Step" button advances.
// (Ported from the old dilution/template.js INFORMATION code; "advance" now
//  goes through ctx.quiz.advanceAfterStep.)

import dom from '../../core/dom.js';

const informationStep = {
  key: 'INFORMATION',

  render(container, step, ctx) {
    if (Array.isArray(step.content)) {
      this.renderItems(container, step, ctx);
    } else if (typeof step.content === 'string') {
      this.renderExplainer(container, step, ctx);
    }
  },

  // ----- string content: paragraph + highlighted question + Next Step ------
  renderExplainer(container, step, ctx) {
    const text = step.content.replace(/"([^"]*)"/g, '<strong>"$1"</strong>');
    container.appendChild(dom.createFromHTML(`<p class="information-text">${text}</p>`));

    if (Array.isArray(step.questionHighlights) && step.questionHighlights.length) {
      const question = ctx.state.quizQuestions[ctx.state.index];
      if (question && question.question) {
        const highlighted = this.highlightTerms(question.question, step.questionHighlights);
        container.appendChild(dom.createFromHTML(
          `<div class="question-analysis"><p class="highlighted-question">${highlighted}</p></div>`
        ));
      }
    }
    this.addNextStepButton(container, ctx);
  },

  // Wrap each highlight term in the question text with a <mark>, using
  // placeholders so overlapping/substring terms don't double-wrap.
  highlightTerms(text, highlights) {
    const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const sorted = [...highlights].sort((a, b) => b.length - a.length);
    const originals = [];
    let result = text;
    sorted.forEach((term, i) => {
      const regex = new RegExp(`\\b(${escape(term)})\\b`, 'gi');
      result = result.replace(regex, (match) => {
        originals[i] = match;
        return `__HL_${i}__`;
      });
    });
    originals.forEach((orig, i) => {
      if (orig) {
        result = result.replace(new RegExp(`__HL_${i}__`, 'g'),
          `<mark class="dilution-highlight">${orig}</mark>`);
      }
    });
    return result;
  },

  // ----- array content: info rows (text + optional input) ------------------
  renderItems(container, step, ctx) {
    const infoContainer = dom.create('div', 'information-container');
    step.content.forEach((item) => {
      const row = dom.create('div', 'information-item');
      if (item.text) row.appendChild(dom.create('span', 'information-text', item.text));
      if (item.input) {
        const input = dom.create('input', 'box-input');
        input.type = 'number';
        input.step = 'any';
        input.dataset.answer = item.input.answer;
        if (item.input.hint) input.dataset.hint = item.input.hint;
        row.appendChild(input);
        if (item.input.unit) row.appendChild(dom.create('span', 'unit', item.input.unit));
      }
      infoContainer.appendChild(row);
    });
    container.appendChild(infoContainer);

    if (step.hasInputs) {
      // Let the shared step flow (checkStepInputs -> advanceAfterStep) grade.
      container.appendChild(dom.create('div', 'hint-container'));
      container.appendChild(dom.createFromHTML(
        '<div class="check-btn-container"><button class="step-check-btn">Check Answer</button></div>'
      ));
    } else {
      this.addNextStepButton(container, ctx);
    }
  },

  // A "Next Step" button for input-less info steps. It hands back to the shared
  // step flow, which reveals the next step or finishes the question.
  addNextStepButton(container, ctx) {
    const btnContainer = dom.createFromHTML(
      '<div class="check-btn-container"><button class="step-check-btn information-next-btn">Next Step</button></div>'
    );
    const btn = btnContainer.querySelector('button');
    btn.addEventListener('click', () => {
      btn.disabled = true;
      ctx.quiz.advanceAfterStep(container);
    });
    container.appendChild(btnContainer);
  },

  // Reviewing a completed question: the "Next Step" button is already spent.
  restoreCompleted(stepDiv) {
    const btn = stepDiv.querySelector('.information-next-btn');
    if (btn) btn.disabled = true;
  },
};

export default informationStep;

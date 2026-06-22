// modules/basic-methods/unit-cancellation-step.js
// MODULE-EXCLUSIVE to basic-methods. Registered under key "OPERATION", so it
// OVERRIDES the shared operation-step for this module only — no other module
// inherits unit cancellation or help mode.
//
// It composes the shared operation renderer (so the equation markup isn't
// duplicated) and adds:
//   - the "I need help" button on the cancellation step (step index 1)
//   - afterRender:      initialize cancellable units
//   - validateExtra:    require correct cancellation before a step counts
//   - onStepComplete:   lock the cancelled units
//   - restoreCompleted: re-mark cancelled units when reviewing history
//   - install(ctx):     the one global click listener that toggles .cancelled
//   - the full help-mode tooltip walkthrough
// (Was: spread across template.addCheckButton, quiz.initUnitCancellation /
//  checkUnitCancellation / toggleHelpMode / getHintForElement / showHint /
//  showNextHint / showPreviousHint / createHintTooltip / clearHelpHighlights /
//  closeHelpMode, and the global unit-click listener in script.js.)

import dom from '../../core/dom.js';
import operationStep from '../../step-types/operation-step.js';

const unitCancellationStep = {
  key: 'OPERATION',

  // ---- rendering ---------------------------------------------------------
  render(container, step) {
    operationStep.render(container, step); // shared equation markup + check btn

    if (step.requireUnitCancellation) {
      const stepEl = container.closest('.step');
      const stepIndex = stepEl ? parseInt(stepEl.dataset.step, 10) : -1;
      if (stepIndex === 1) {
        const btnContainer = container.querySelector('.check-btn-container');
        if (btnContainer) {
          const helpBtn = dom.create('button', 'step-help-btn', 'I need help');
          helpBtn.dataset.stepType = 'unitCancellation';
          helpBtn.addEventListener('click', () =>
            unitCancellationStep.toggleHelpMode(helpBtn, container, step)
          );
          btnContainer.insertBefore(helpBtn, btnContainer.firstChild);
        }
      }
    }
  },

  afterRender(container, step) {
    if (step.requireUnitCancellation) this.initUnitCancellation(container);
  },

  initUnitCancellation(container) {
    container.querySelectorAll('.unit.cancellable').forEach((unit) => {
      if (unit.dataset.cancellable === undefined) unit.dataset.cancellable = 'true';
    });
  },

  // ---- validation hooks (called by core/quiz-controller) -----------------
  validateExtra(container, step) {
    if (!step.requireUnitCancellation) return { ok: true };
    return {
      ok: this.checkUnitCancellation(container),
      message: 'Make sure to cancel out all necessary units.',
    };
  },

  checkUnitCancellation(container) {
    const units = container.querySelectorAll('.unit.cancellable');
    if (units.length === 0) return true;
    let allCorrect = true;
    units.forEach((unit) => {
      unit.classList.remove('correct', 'incorrect');
      const isCancelled = unit.classList.contains('cancelled');
      const shouldCancel = unit.dataset.cancellable !== 'false';
      if (!shouldCancel && isCancelled) { allCorrect = false; unit.classList.add('incorrect'); }
      else if (shouldCancel && !isCancelled) { allCorrect = false; }
      else if (shouldCancel && isCancelled) { unit.classList.add('correct'); }
    });
    return allCorrect;
  },

  onStepComplete(container) {
    container.querySelectorAll('.unit.cancellable').forEach((el) => {
      el.style.pointerEvents = 'none';
      el.style.cursor = 'default';
      el.classList.remove('cancellable');
    });
  },

  restoreCompleted(stepDiv, step) {
    if (!step.requireUnitCancellation) return;
    stepDiv.querySelectorAll('.unit.cancellable').forEach((unit) => {
      if (unit.dataset.cancellable !== 'false') unit.classList.add('cancelled');
    });
  },

  hintForInput: operationStep.hintForInput,

  // ---- one-time install of the global cancel toggle ----------------------
  install() {
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('unit') && e.target.classList.contains('cancellable')) {
        e.target.classList.toggle('cancelled');
      }
    });
  },

  // ---- help mode ---------------------------------------------------------
  toggleHelpMode(helpBtn, container, step) {
    if (!step || !step.requireUnitCancellation) return;
    const stepContainer = container.closest('.step');
    if (!stepContainer) return;

    helpBtn.classList.toggle('active');
    if (document.body.classList.contains('help-mode')) { this.closeHelpMode(); return; }

    helpBtn.textContent = 'Close Help';
    stepContainer.classList.add('help-mode');
    document.body.classList.add('help-mode');
    if (!document.querySelector('.help-overlay')) {
      document.body.appendChild(dom.create('div', 'help-overlay'));
    }
    if (!container.querySelector('.horizontal-operation')) return;

    const highlightElements = [];
    stepContainer.querySelectorAll('.fraction').forEach((fraction) => {
      highlightElements.push({ element: fraction, hint: this.getHintForElement(fraction, step) });
    });
    Array.from(stepContainer.querySelectorAll('.box-input'))
      .filter((input) => !input.closest('.fraction'))
      .forEach((input) => {
        const parent = input.parentNode;
        const el = parent.querySelector('.unit') ? parent : input;
        highlightElements.push({ element: el, hint: input.dataset.hint || 'Enter the correct value' });
      });

    this.clearHelpHighlights();
    this._helpElements = highlightElements;
    this._currentHintIndex = 0;

    const nav = dom.create('div', 'hint-navigation');
    const prevBtn = dom.create('button', 'hint-nav-btn hint-prev-btn', '\u2190');
    const nextBtn = dom.create('button', 'hint-nav-btn hint-next-btn', '\u2192');
    const counter = dom.create('div', 'hint-counter', `1/${highlightElements.length}`);
    prevBtn.addEventListener('click', () => this.showPreviousHint());
    nextBtn.addEventListener('click', () => this.showNextHint());
    prevBtn.disabled = true;
    nav.appendChild(prevBtn); nav.appendChild(counter); nav.appendChild(nextBtn);
    stepContainer.appendChild(nav);
    this._navContainer = nav;

    if (highlightElements.length > 0) this.showHint(0);

    const overlay = document.querySelector('.help-overlay');
    if (overlay) {
      overlay.addEventListener('click', () => {
        this.closeHelpMode();
        helpBtn.classList.remove('active');
        helpBtn.textContent = 'I need help';
      });
    }
  },

  getHintForElement(element, step) {
    if (element.classList.contains('fraction')) {
      if (element.dataset && element.dataset.hint) return element.dataset.hint;
      const numeratorInput = element.querySelector('.fraction-numerator .box-input');
      const denominatorInput = element.querySelector('.fraction-denominator .box-input');
      if (numeratorInput && numeratorInput.dataset.hint) return numeratorInput.dataset.hint;
      if (denominatorInput && denominatorInput.dataset.hint) return denominatorInput.dataset.hint;
    }
    const input = element.querySelector('.box-input');
    if (input && input.dataset.hint) return input.dataset.hint;
    if (element.querySelector('.unit.cancellable')) {
      return 'Click this unit to cancel it out if it appears in both a numerator and denominator.';
    }
    return step.hint || 'Complete this part of the equation.';
  },

  showHint(index) {
    if (!this._helpElements || index < 0 || index >= this._helpElements.length) return;
    document.querySelectorAll('.help-tooltip').forEach((t) => t.parentNode && t.parentNode.removeChild(t));
    const { element, hint } = this._helpElements[index];
    this.createHintTooltip(element, hint);
    const counter = this._navContainer?.querySelector('.hint-counter');
    if (counter) counter.textContent = `${index + 1}/${this._helpElements.length}`;
    const prevBtn = this._navContainer?.querySelector('.hint-prev-btn');
    const nextBtn = this._navContainer?.querySelector('.hint-next-btn');
    if (prevBtn) prevBtn.disabled = index === 0;
    if (nextBtn) nextBtn.disabled = index === this._helpElements.length - 1;
    this._currentHintIndex = index;
  },

  showNextHint() {
    if (this._currentHintIndex < this._helpElements.length - 1) this.showHint(this._currentHintIndex + 1);
  },

  showPreviousHint() {
    if (this._currentHintIndex > 0) this.showHint(this._currentHintIndex - 1);
  },

  createHintTooltip(element, hintText) {
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    const tooltip = dom.create('div', 'help-tooltip', hintText);
    tooltip.style.visibility = 'hidden';
    document.body.appendChild(tooltip);
    const tooltipHeight = tooltip.offsetHeight;
    const tooltipWidth = tooltip.offsetWidth;
    tooltip.style.visibility = '';
    tooltip.style.zIndex = 103;
    tooltip.style.top = `${rect.top + scrollTop + rect.height / 2 - tooltipHeight / 2}px`;
    tooltip.style.left = `${rect.right + scrollLeft + 15}px`;
    tooltip.classList.add('tooltip-right');
    if (parseInt(tooltip.style.left, 10) + tooltipWidth > window.innerWidth - 10) {
      tooltip.style.top = `${rect.top + scrollTop - tooltipHeight - 15}px`;
      tooltip.style.left = `${rect.left + scrollLeft + rect.width / 2 - tooltipWidth / 2}px`;
      tooltip.classList.remove('tooltip-right');
      tooltip.classList.add('tooltip-above');
    }
  },

  clearHelpHighlights() {
    document.querySelectorAll('.help-tooltip').forEach((t) => t.parentNode && t.parentNode.removeChild(t));
    if (this._navContainer && this._navContainer.parentNode) {
      this._navContainer.parentNode.removeChild(this._navContainer);
    }
    this._helpElements = [];
    this._currentHintIndex = 0;
    this._navContainer = null;
  },

  closeHelpMode() {
    document.querySelectorAll('.step.help-mode').forEach((s) => s.classList.remove('help-mode'));
    document.body.classList.remove('help-mode');
    this.clearHelpHighlights();
    const overlay = document.querySelector('.help-overlay');
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    document.querySelectorAll('.step-help-btn').forEach((btn) => {
      btn.classList.remove('active');
      btn.textContent = 'I need help';
    });
  },
};

export default unitCancellationStep;
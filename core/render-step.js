// core/render-step.js
// Shared step renderer. One copy for every module.
// Dispatches a step to its plugin (looked up by step.type), then appends the
// shared "Next Question" button after the final step. Used by both the live
// step-by-step guide (shell-ui) and the read-only solution modal (history).
// (Was: templates.render in basic-methods/template.js — the dispatch + isLast
//  button logic. The per-type rendering moved into the step-type plugins.)

export function renderStep(container, step, ctx, isLastStep = false) {
  const plugin = ctx.registry.stepType(step.type);
  plugin.render(container, step, ctx);

  if (isLastStep) {
    const nextBtnContainer = ctx.dom.create('div', 'step-next-btn-container');
    const nextBtn = ctx.dom.create(
      'button',
      'step-next-btn button-secondary disabled-btn',
      'Next Question'
    );
    nextBtn.id = 'stepNextQuestion';
    nextBtn.disabled = true;
    nextBtnContainer.appendChild(nextBtn);
    container.appendChild(nextBtnContainer);
  }
}
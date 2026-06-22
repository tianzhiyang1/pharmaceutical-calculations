// modules/prescription-interpretation/applied-question.js
// MODULE-LOCAL question-type plugin, key "applied".
// An applied question = prescription image + final numeric input + step-by-step
// guide that, when all steps are completed, auto-fills the numeric answer.
//
// This plugin owns its grading via the `checkAnswer` hook on the question-type
// contract, owns its step-by-step rendering via `showSteps`, and installs an
// `appliedFlow` helper onto `ctx` so the four step-type plugins (information,
// interpretation, calculation) can ask the orchestrator to advance after a
// step completes without reaching across the DOM the way the old code did.
//
// Was: prescription-interpretation/.../applied-modules/{ui-handler,
//      question-handler, step-handler, applied-question-handler}.js
//      plus the `_stepHandler` reach trick that glued them together.

import dom from '../../core/dom.js';
import { renderStep } from '../../core/render-step.js';

const appliedQuestion = {
  key: 'applied',

  // ----- rendering --------------------------------------------------------
  render(answerContainer, question, ctx) {
    const { state } = ctx;

    // Remove leftover sibling containers from prior question types (drag).
    const parent = answerContainer.parentNode;
    parent.querySelector('#options-area')?.remove();
    parent.querySelector('#dragFeedback')?.remove();
    parent.querySelector('#appliedFeedback')?.remove();

    // Reset container styling.
    answerContainer.style.flexDirection = '';
    answerContainer.style.alignItems = '';

    // Feedback element sits as a sibling, matching the old DOM contract.
    const appliedFeedback = dom.create('div', 'feedback applied-feedback');
    appliedFeedback.id = 'appliedFeedback';
    parent.insertBefore(appliedFeedback, answerContainer.nextSibling);

    // Applied container holds the image (if any) + the answer row.
    const appliedContainer = dom.create('div', 'applied-container');
    answerContainer.appendChild(appliedContainer);

    if (question.path) {
      const imageContainer = dom.create('div', 'applied-image-container');
      const image = dom.create('img', 'applied-image');
      image.src = question.path;
      image.alt = 'Prescription image';
      imageContainer.appendChild(image);
      appliedContainer.appendChild(imageContainer);
    }

    // Answer row.
    const answerRow = dom.create('div', 'answer-container');
    const label = dom.create('label', '', 'Answer:');
    const input = dom.create('input', 'answer-input box-input');
    input.type = 'number';
    input.step = 'any';
    input.id = 'answerInput';
    const unitSpan = dom.create('span', 'unit', question.answerUnit || '');
    unitSpan.id = 'answerUnit';
    answerRow.appendChild(label);
    answerRow.appendChild(input);
    answerRow.appendChild(unitSpan);

    // Show Answer button (shared shell expects this in ctx.ui.elements.answerBtn).
    const showAnswerBtn = dom.create('button', 'button-accent', 'Show Answer');
    showAnswerBtn.id = 'answerBtn';
    showAnswerBtn.disabled = true;
    if ((question.currentQuestionAttempts || 0) >= 2) showAnswerBtn.disabled = false;
    answerRow.appendChild(showAnswerBtn);
    appliedContainer.appendChild(answerRow);

    ctx.ui.elements.answerBtn = showAnswerBtn;
    ctx.ui.elements.answerUnit = unitSpan;

    // Has the question been completed (directly or via step-by-step)?
    const stepsCompleted =
      question.completedSteps &&
      question.steps &&
      question.completedSteps.length === question.steps.length;

    if (question.userAnswer !== undefined && !Number.isNaN(question.userAnswer)) {
      input.value = question.userAnswer;
    } else if (stepsCompleted) {
      input.value = question.answerValue || '';
      if (question.userAnswer === undefined) {
        question.userAnswer = parseFloat(question.answerValue || 0);
      }
    } else if (question.answerShown) {
      input.value = question.answerValue || '';
    }

    if (question.isCorrect || stepsCompleted || question.answerShown) {
      input.disabled = true;
      if (question.completed || stepsCompleted || question.answerShown) {
        input.value = question.answerValue || '';
      }
    }

    if (question.attempted || stepsCompleted) {
      if (question.isCorrect || stepsCompleted) {
        appliedFeedback.textContent = 'Correct! Well done!';
        appliedFeedback.className = 'feedback applied-feedback correct';
      } else if (question.answerShown) {
        appliedFeedback.textContent = "Here's the correct answer.";
        appliedFeedback.className = 'feedback applied-feedback';
      } else {
        appliedFeedback.textContent = 'Not quite. Try again or use the Step-by-Step Guide for help.';
        appliedFeedback.className = 'feedback applied-feedback incorrect';
      }
    }

    // Install ctx.appliedFlow (used by step plugins to advance and to wrap up).
    ctx.appliedFlow = this.makeAppliedFlow(ctx);
    // Override the shell's default showSteps for this question type.
    ctx.appliedFlow.takeOverShowSteps(question);
  },

  // ----- grading (called by core/quiz-controller via checkAnswer hook) ----
  checkAnswer(question, ctx) {
    const { state, storage } = ctx;
    const input = document.getElementById('answerInput');
    const feedback = document.getElementById('appliedFeedback');
    if (!input || !feedback) return;
    const userAnswer = parseFloat(input.value);

    if (Number.isNaN(userAnswer)) {
      feedback.textContent = 'Please enter a valid number.';
      feedback.className = 'feedback applied-feedback incorrect';
      return;
    }
    if (question.attempted && !question.isCorrect && userAnswer === question.userAnswer) {
      feedback.textContent = 'Please change your answer before checking again.';
      feedback.className = 'feedback applied-feedback incorrect';
      return;
    }
    const previousAnswer = question.userAnswer;
    question.userAnswer = userAnswer;

    const correct = parseFloat(question.answerValue || 0);
    const tolerance = 0.001;
    const isCorrect = Math.abs(userAnswer - correct) <= tolerance * Math.abs(correct);

    if (!question.attempted || userAnswer !== previousAnswer) {
      question.attempts = (question.attempts || 0) + 1;
      question.currentQuestionAttempts = (question.currentQuestionAttempts || 0) + 1;
      if ((question.currentQuestionAttempts || 0) >= 2 && ctx.ui.elements.answerBtn) {
        ctx.ui.elements.answerBtn.disabled = false;
      }
    }
    question.attempted = true;
    question.isCorrect = isCorrect;

    // Match basic-methods history policy: record every attempt.
    state.addToHistory(question, userAnswer, question.answerUnit || '', isCorrect);

    if (isCorrect) {
      question.completed = true;
      state.currentAnswerCorrect = true;
      if (!state.completedQuestions.includes(state.index)) {
        state.completedQuestions.push(state.index);
        state.answered = true;
      }
      ctx.quiz.moveQuestionToCompleted(question.number);
      feedback.textContent = 'Correct! Well done!';
      feedback.className = 'feedback applied-feedback correct';
      input.disabled = true;
      ctx.ui.updateProgressUI();
    } else {
      feedback.textContent = 'Not quite. Try again or use the Step-by-Step Guide for help.';
      feedback.className = 'feedback applied-feedback incorrect';
    }
    storage.saveState();
  },

  // ----- show answer (called by shell-ui's #answerBtn handler) -----------
  showAnswer(question, ctx) {
    const feedback = document.getElementById('appliedFeedback');
    if (!feedback) return;
    const text = `The correct answer is: ${question.answerValue}${question.answerUnit ? ' ' + question.answerUnit : ''}`;
    feedback.textContent = text;
    feedback.className = 'feedback applied-feedback';
    question.answerShown = true;
    if (!question.isCorrect) {
      ctx.state.addToHistory(question, question.userAnswer || 0, question.answerUnit || '', false);
    }
    ctx.storage.saveState();
  },

  // ----- restore for already-completed questions on re-entry --------------
  restore() {
    // The render() path already reads question.userAnswer / .completed / etc.
    // and paints the right state, so there's no extra work here.
  },

  // ======================================================================
  // The applied flow orchestrator — exposed to step plugins on ctx
  // ======================================================================
  makeAppliedFlow(ctx) {
    const { state, storage } = ctx;

    return {
      // Called by a step plugin when that step is fully completed. Reveals
      // the next step, or — if it was the last step — auto-fills the numeric
      // answer and marks the whole question complete.
      advance(question, stepIndex) {
        const nextIdx = stepIndex + 1;
        const stepsDiv = ctx.ui.elements.steps;
        if (nextIdx < question.steps.length) {
          let nextStepDiv = stepsDiv.querySelector(`.step[data-step="${nextIdx}"]`);
          if (nextStepDiv) {
            nextStepDiv.style.display = 'block';
            const focusEl = nextStepDiv.querySelector('.box-input, .fill-blank-input, .short-answer-input, select, button');
            if (focusEl) setTimeout(() => focusEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
          }
          storage.saveState();
        } else {
          // All steps done — finalize the question.
          this.finalize(question);
        }
      },

      finalize(question) {
        // Auto-complete the numeric answer.
        const input = document.getElementById('answerInput');
        const feedback = document.getElementById('appliedFeedback');
        if (input) {
          input.value = question.answerValue || '';
          input.disabled = true;
        }
        if (feedback) {
          feedback.textContent = 'Correct! Well done!';
          feedback.className = 'feedback applied-feedback correct';
        }
        question.userAnswer = parseFloat(question.answerValue || 0);
        question.isCorrect = true;
        question.completed = true;

        if (!state.completedQuestions.includes(state.index)) {
          state.completedQuestions.push(state.index);
          state.answered = true;
        }
        state.currentAnswerCorrect = true;
        ctx.quiz.moveQuestionToCompleted(question.number);
        // Record completion-via-steps in history.
        state.addToHistory(question, question.userAnswer, question.answerUnit || '', true);

        // Enable the in-steps Next button if it exists.
        const stepNext = document.getElementById('stepNextQuestion');
        if (stepNext) {
          stepNext.disabled = false;
          stepNext.classList.remove('disabled-btn');
        }
        ctx.ui.updateProgressUI();
        storage.saveState();
      },

      // Replace the shared shell's showSteps for this question with one that
      // only reveals one step at a time (matching the old applied behavior).
      // Restored on every render() since the next question may be drag-type
      // again and need the default behavior back.
      takeOverShowSteps(question) {
        const ui = ctx.ui;
        const dom = ctx.dom;

        // Stash the original showSteps so other question types still work.
        if (!ui._originalShowSteps) ui._originalShowSteps = ui.showSteps;

        ui.showSteps = function () {
          const q = state.quizQuestions[state.index];
          if (this.elements.steps.children.length === 0 && q.steps && q.steps.length > 0) {
            // Decide whether to render all-at-once (for already completed
            // questions, so students can review the whole solution) or
            // progressively (for active solving).
            const questionCompleted =
              q.completed || q.isCorrect ||
              (q.stepResponses && Object.keys(q.stepResponses).length > 0);

            const indicesToShow = questionCompleted
              ? q.steps.map((_, i) => i)
              : [0];

            q.steps.forEach((step, i) => {
              const isLast = i === q.steps.length - 1;
              const visible = indicesToShow.includes(i)
                            || (q.completedSteps && q.completedSteps.includes(i));
              const stepDiv = dom.createFromHTML(`
                <div class="step" data-step="${i}" ${visible ? '' : 'style="display: none;"'}>
                  <div class="step-label">Step ${i + 1}: ${step.text}</div>
                  <div class="equation-container"></div>
                </div>
              `);
              const eqContainer = stepDiv.querySelector('.equation-container');
              renderStep(eqContainer, step, ctx, isLast);
              const plugin = ctx.registry.stepType(step.type);
              if (plugin && plugin.afterRender) plugin.afterRender(eqContainer, step, ctx);
              this.elements.steps.appendChild(stepDiv);
            });

            // After all step DOM is built, restore any saved state.
            if (q.stepResponses && Object.keys(q.stepResponses).length > 0) {
              q.steps.forEach((step, i) => {
                const stepDiv = this.elements.steps.querySelector(`.step[data-step="${i}"]`);
                if (!stepDiv) return;
                const plugin = ctx.registry.stepType(step.type);
                if (plugin && plugin.restoreCompleted) plugin.restoreCompleted(stepDiv, step, ctx);
              });
            }

            if (questionCompleted) {
              const stepNext = this.elements.steps.querySelector('#stepNextQuestion');
              if (stepNext) { stepNext.disabled = false; stepNext.classList.remove('disabled-btn'); }
            }
          }
          this.elements.stepsContainer.style.display = 'block';
          state.stepsShown = true;
          this.elements.showStepsBtn.textContent = 'Hide Step-by-Step Guide';
        };
      },
    };
  },
};

export default appliedQuestion;
// step-types/hotspot-step.js  — SHARED step plugin, key "INFORMATION" (the
// interactive flavor; the bullet-list flavor lives in information-step.js).
// Used by both prescription-interpretation and general-dose-calculation.
// Two sub-formats based on step.format:
//   - 'hotspot':   absolute-positioned click regions overlaid on a Rx image,
//                  walked through in sequence with distractor handling and a
//                  per-step hint button
//   - 'highlight': drag-to-select text in the question. Matching the highlight
//                  list wraps the text in a styled span and updates a counter.
//                  A "Show One" button reveals the next item for stuck students.
//
// On completion it advances flow-agnostically (advanceStep): prescription's
// applied questions go through ctx.appliedFlow; modules on the standard step
// flow (general-dose) use ctx.quiz.advanceAfterStep. State persists under
// question.stepResponses[stepIndex]. In the read-only history/review view a
// module can opt into swapping the hotspot image for an annotated answer
// version via config.hotspotAnswerImage.

import dom from '../core/dom.js';

const informationStep = {
  key: 'INFORMATION',

  // The question this step belongs to (see interpretation.js for the
  // ctx.currentSolutionQuestion rationale).
  questionFor(ctx) {
    return ctx.currentSolutionQuestion || ctx.state.quizQuestions[ctx.state.index];
  },

  // Hand control back to whichever step flow this module uses.
  advanceStep(question, stepIndex, ctx) {
    if (ctx.appliedFlow) {
      ctx.appliedFlow.advance(question, stepIndex);
      return;
    }
    if (ctx.quiz && ctx.quiz.advanceAfterStep) {
      const stepEl = document.querySelector(`#steps .step[data-step="${stepIndex}"]`);
      if (stepEl) ctx.quiz.advanceAfterStep(stepEl);
    }
  },

  render(container, step, ctx) {
    const stepEl = container.closest('.step');
    const stepIndex = stepEl ? parseInt(stepEl.dataset.step, 10) : 0;
    const question = this.questionFor(ctx);
    if (!question.stepResponses) question.stepResponses = {};

    const stepContent = dom.create('div', 'step-content');

    if (step.format === 'hotspot' && step.content && step.content.length > 0) {
      this.renderHotspotUI(stepContent, step, question, stepIndex, ctx);
    } else if (step.format === 'highlight' && step.content && step.content.length > 0) {
      this.renderHighlightUI(stepContent, step, question, stepIndex, ctx);
    } else {
      // Simple text fallback.
      const content = dom.create('div', 'info-step');
      content.innerHTML = step.content || step.text || '';
      stepContent.appendChild(content);
      if (!question.stepResponses[stepIndex]) {
        question.stepResponses[stepIndex] = { completed: false };
      }
    }
    container.appendChild(stepContent);
  },

  // =====================================================================
  // HOTSPOT FORMAT
  // =====================================================================
  renderHotspotUI(stepContent, step, question, stepIndex, ctx) {
    const requiredHotspots = step.content.filter((item) => item.text);

    // Sequence indicator row.
    const sequenceRow = dom.create('div', 'hotspot-sequence-row');
    requiredHotspots.forEach((hotspot, index) => {
      const btn = dom.create('div', 'hotspot-sequence-btn', hotspot.text);
      btn.dataset.index = index;
      btn.dataset.contentIndex = step.content.indexOf(hotspot);
      btn.classList.add(index === 0 ? 'active' : 'disabled');
      sequenceRow.appendChild(btn);
    });
    stepContent.appendChild(sequenceRow);

    // Image with overlay.
    const distractorIndexes = [];
    if (question.path) {
      const imageContainer = dom.create('div', 'hotspot-image-container');
      const image = dom.create('img', 'hotspot-image');
      image.src = question.path;
      image.alt = 'Prescription image';
      const overlay = dom.create('div', 'hotspot-overlay');

      step.content.forEach((hotspot, index) => {
        const area = dom.create('div', 'hotspot-area');
        area.style.left = `${hotspot.position.x1}px`;
        area.style.top = `${hotspot.position.y1}px`;
        area.style.width = `${hotspot.position.x2 - hotspot.position.x1}px`;
        area.style.height = `${hotspot.position.y2 - hotspot.position.y1}px`;
        area.dataset.index = index;

        const isDistractor = !hotspot.text;
        if (isDistractor) {
          area.dataset.isDistractor = 'true';
          distractorIndexes.push(index);
        } else {
          area.dataset.text = hotspot.text;
          area.dataset.hint = hotspot.hint || '';
          area.dataset.requiredIndex = requiredHotspots.indexOf(hotspot);
        }
        area.addEventListener('click', (e) => {
          this.handleHotspotClick(e.target, question, stepIndex, ctx);
        });
        overlay.appendChild(area);
      });

      imageContainer.appendChild(image);
      imageContainer.appendChild(overlay);
      stepContent.appendChild(imageContainer);

      const stepFeedback = dom.create('div', 'step-feedback');
      stepFeedback.id = `step-feedback-${stepIndex}`;
      stepContent.appendChild(stepFeedback);
    }

    // Hint button toggles between Show Hint / Hide Hint.
    const hintBtn = dom.create('button', 'step-hint-btn', 'Show Hint');
    hintBtn.dataset.stepIndex = stepIndex;
    hintBtn.addEventListener('click', () => {
      const feedback = document.getElementById(`step-feedback-${stepIndex}`);
      const active = feedback.classList.contains('hint-active') ||
                     feedback.classList.contains('incorrect-hint') ||
                     hintBtn.textContent === 'Hide Hint';
      if (active) {
        feedback.textContent = ''; feedback.className = 'step-feedback';
        hintBtn.textContent = 'Show Hint';
      } else {
        this.showHotspotHint(question, stepIndex);
        hintBtn.textContent = 'Hide Hint';
      }
    });
    const row = dom.create('div', 'step-inputs-row');
    row.appendChild(hintBtn);
    stepContent.appendChild(row);

    if (!question.stepResponses[stepIndex]) {
      question.stepResponses[stepIndex] = {
        selectedHotspots: [],
        currentSequenceIndex: 0,
        completed: false,
        requiredHotspots: requiredHotspots.length,
        distractorIndexes,
      };
    }
  },

  handleHotspotClick(area, question, stepIndex, ctx) {
    const stepResponse = question.stepResponses[stepIndex];
    if (stepResponse.completed) return;
    const clickedIndex = parseInt(area.dataset.index, 10);
    const feedback = document.getElementById(`step-feedback-${stepIndex}`);
    const sequenceBtns = document.querySelectorAll('.hotspot-sequence-btn');
    const hintBtn = document.querySelector(`.step-hint-btn[data-step-index="${stepIndex}"]`);
    const isDistractor = area.dataset.isDistractor === 'true';

    if (isDistractor) {
      const required = question.steps[stepIndex].content.filter((i) => i.text);
      const expected = required[stepResponse.currentSequenceIndex];
      if (expected && expected.hint && feedback) {
        feedback.innerHTML = `<div class="hotspot-hint-content">${expected.hint}</div>`;
        feedback.className = 'step-feedback hint-active incorrect-hint';
        if (hintBtn) hintBtn.textContent = 'Hide Hint';
      } else if (feedback) {
        feedback.textContent = `Try finding the highlighted item: ${expected ? expected.text : 'Next item'}.`;
        feedback.className = 'step-feedback incorrect';
      }
      ctx.storage.saveState();
      return;
    }

    const requiredIndex = parseInt(area.dataset.requiredIndex, 10);
    if (requiredIndex === stepResponse.currentSequenceIndex) {
      area.classList.add('correct');
      sequenceBtns.forEach((btn) => {
        const i = parseInt(btn.dataset.index, 10);
        if (i === requiredIndex) {
          btn.classList.remove('active');
          btn.classList.add('completed');
          if (i + 1 < sequenceBtns.length) {
            sequenceBtns[i + 1].classList.remove('disabled');
            sequenceBtns[i + 1].classList.add('active');
          }
        }
      });
      if (!stepResponse.selectedHotspots.includes(clickedIndex)) {
        stepResponse.selectedHotspots.push(clickedIndex);
      }
      stepResponse.currentSequenceIndex++;
      if (feedback) {
        feedback.textContent = `Correct! Found: ${area.dataset.text}`;
        feedback.className = 'step-feedback correct';
        if (hintBtn && hintBtn.textContent === 'Hide Hint') hintBtn.textContent = 'Show Hint';
      }
      if (stepResponse.currentSequenceIndex >= stepResponse.requiredHotspots) {
        this.completeHotspotStep(question, stepIndex, ctx);
      }
    } else if (stepResponse.selectedHotspots.includes(clickedIndex)) {
      // Already-correct area clicked again — do nothing.
    } else {
      // Wrong required spot — show hint for the expected one.
      const required = question.steps[stepIndex].content.filter((i) => i.text);
      const expected = required[stepResponse.currentSequenceIndex];
      if (expected && expected.hint && feedback) {
        feedback.innerHTML = `<div class="hotspot-hint-content">${expected.hint}</div>`;
        feedback.className = 'step-feedback hint-active incorrect-hint';
        if (hintBtn) hintBtn.textContent = 'Hide Hint';
      } else if (feedback) {
        feedback.textContent = `Try finding the highlighted item: ${expected ? expected.text : 'Next item'}.`;
        feedback.className = 'step-feedback incorrect';
      }
    }
    ctx.storage.saveState();
  },

  showHotspotHint(question, stepIndex) {
    const stepResponse = question.stepResponses[stepIndex];
    const activeIndex = stepResponse ? stepResponse.currentSequenceIndex : 0;
    const activeBtn = document.querySelector(`.hotspot-sequence-btn[data-index="${activeIndex}"]`);
    if (!activeBtn) return;
    const contentIndex = parseInt(activeBtn.dataset.contentIndex, 10);
    const hotspotData = question.steps[stepIndex].content[contentIndex];
    const hint = hotspotData ? hotspotData.hint : null;
    const feedback = document.getElementById(`step-feedback-${stepIndex}`);
    if (!feedback) return;
    if (hint) {
      feedback.textContent = hint;
      feedback.className = 'step-feedback hint-active';
    } else {
      feedback.textContent = 'No hint available for this item.';
      feedback.className = 'step-feedback';
    }
  },

  completeHotspotStep(question, stepIndex, ctx) {
    const feedback = document.getElementById(`step-feedback-${stepIndex}`);
    if (!question.completedSteps) question.completedSteps = [];
    if (!question.completedSteps.includes(stepIndex)) question.completedSteps.push(stepIndex);
    question.stepResponses[stepIndex].completed = true;
    if (feedback) {
      feedback.innerHTML = "<div class=\"step-complete-message\">You've identified all required areas correctly.</div>";
      feedback.className = 'step-feedback correct';
    }
    document.querySelectorAll('.hotspot-area').forEach((area) => {
      if (area.dataset.isDistractor !== 'true') area.classList.add('correct');
      area.style.pointerEvents = 'none';
    });
    const hintBtn = document.querySelector(`.step-hint-btn[data-step-index="${stepIndex}"]`);
    if (hintBtn) hintBtn.style.display = 'none';
    this.advanceStep(question, stepIndex, ctx);
  },

  // =====================================================================
  // HIGHLIGHT FORMAT
  // =====================================================================
  renderHighlightUI(stepContent, step, question, stepIndex, ctx) {
    // Extract example from step text after "\n e.g., " if present.
    const exampleSeparator = '\n e.g., ';
    let questionText = step.text || '';
    let exampleText = '';
    const sepIdx = questionText.indexOf(exampleSeparator);
    if (sepIdx > -1) {
      exampleText = questionText.substring(sepIdx + exampleSeparator.length).trim();
      questionText = questionText.substring(0, sepIdx).trim();
    }

    const container = dom.create('div', 'highlight-container');

    const promptDiv = dom.create('div', 'highlight-prompt');
    promptDiv.innerHTML = questionText;
    container.appendChild(promptDiv);

    // The selectable text — the actual prescription text the student highlights.
    const textDiv = dom.create('div', 'highlight-question-text');
    textDiv.id = `highlight-text-${stepIndex}`;
    textDiv.innerHTML = question.text || ''; // selectable content
    container.appendChild(textDiv);

    if (exampleText) {
      const exampleDiv = dom.create('div', 'highlight-example');
      exampleDiv.innerHTML = `<em>e.g., ${exampleText}</em>`;
      container.appendChild(exampleDiv);
    }

    // Counter showing how many highlights remain.
    const counterDiv = dom.create('div', 'highlight-counter');
    counterDiv.id = `highlight-counter-${stepIndex}`;
    container.appendChild(counterDiv);

    // Feedback area.
    const feedbackEl = dom.create('div', 'highlight-feedback');
    feedbackEl.id = `highlight-feedback-${stepIndex}`;
    container.appendChild(feedbackEl);

    // "Show one" assist button.
    const showOneBtn = dom.create('button', 'step-help-btn', 'Show one for me');
    showOneBtn.id = `show-one-btn-${stepIndex}`;
    showOneBtn.addEventListener('click', () => this.handleShowOneHighlight(question, stepIndex, ctx));
    const btnRow = dom.create('div', 'step-inputs-row');
    btnRow.appendChild(showOneBtn);
    container.appendChild(btnRow);

    stepContent.appendChild(container);

    // Initialize state.
    if (!question.stepResponses[stepIndex]) {
      question.stepResponses[stepIndex] = {
        contentState: step.content.map((item) => ({ ...item, found: false })),
        highlightedCount: 0,
        totalHighlights: step.content.length,
        completed: false,
      };
    }
    const stepResponse = question.stepResponses[stepIndex];
    this.updateHighlightCounter(counterDiv, stepResponse.totalHighlights - stepResponse.highlightedCount);

    // mouseup listener on the selectable text.
    const listener = () => {
      const selection = window.getSelection();
      const selectedText = selection.toString().trim();
      if (selectedText && !stepResponse.completed) {
        this.handleHighlightSelection(selectedText, textDiv, question, stepIndex, ctx);
        selection.removeAllRanges();
      }
    };
    textDiv.addEventListener('mouseup', listener);
    textDiv._highlightListener = listener;
  },

  handleHighlightSelection(selectedText, textDiv, question, stepIndex, ctx) {
    const stepResponse = question.stepResponses[stepIndex];
    const feedback = document.getElementById(`highlight-feedback-${stepIndex}`);
    const counterDiv = document.getElementById(`highlight-counter-${stepIndex}`);
    if (feedback) { feedback.textContent = ''; feedback.className = 'highlight-feedback'; }
    const normalizedSel = selectedText.toLowerCase().trim();

    let matchFound = false;
    for (const item of stepResponse.contentState) {
      const normalizedTarget = item.highlight.toLowerCase().trim();
      if (normalizedSel.includes(normalizedTarget) && !item.found) {
        item.found = true;
        stepResponse.highlightedCount++;
        matchFound = true;
        this.applyHighlightStyle(textDiv, item.highlight);
        if (feedback) {
          feedback.textContent = item.feedback || 'Correctly highlighted!';
          feedback.className = 'highlight-feedback correct fade-in';
        }
        const remaining = stepResponse.totalHighlights - stepResponse.highlightedCount;
        this.updateHighlightCounter(counterDiv, remaining);
        if (stepResponse.highlightedCount >= stepResponse.totalHighlights) {
          this.completeHighlightStep(textDiv, question, stepIndex, ctx);
        }
        break;
      }
    }
    if (!matchFound && feedback) {
      feedback.textContent = 'Not quite — try selecting a specific piece of information.';
      feedback.className = 'highlight-feedback incorrect fade-in';
    }
    ctx.storage.saveState();
  },

  applyHighlightStyle(textDiv, highlightText) {
    const escaped = highlightText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Avoid wrapping inside an existing highlight span.
    const regex = new RegExp(`(?<!correct-highlight">)${escaped}(?!<\\/span>)`, 'i');
    if (textDiv.innerHTML.match(regex)) {
      textDiv.innerHTML = textDiv.innerHTML.replace(
        regex,
        `<span class="correct-highlight">${highlightText}</span>`
      );
    }
  },

  updateHighlightCounter(counterDiv, remaining) {
    if (!counterDiv) return;
    if (remaining > 0) {
      const plural = remaining === 1 ? 'piece' : 'pieces';
      counterDiv.innerHTML = `✨ You still have <strong>${remaining}</strong> ${plural} of information to highlight.`;
      counterDiv.style.display = 'block';
    } else {
      counterDiv.textContent = '';
      counterDiv.style.display = 'none';
    }
  },

  handleShowOneHighlight(question, stepIndex, ctx) {
    const stepResponse = question.stepResponses[stepIndex];
    if (!stepResponse || stepResponse.completed) return;
    const textDiv = document.getElementById(`highlight-text-${stepIndex}`);
    const feedback = document.getElementById(`highlight-feedback-${stepIndex}`);
    const counterDiv = document.getElementById(`highlight-counter-${stepIndex}`);
    const showOneBtn = document.getElementById(`show-one-btn-${stepIndex}`);

    const nextIdx = stepResponse.contentState.findIndex((item) => !item.found);
    if (nextIdx !== -1) {
      const item = stepResponse.contentState[nextIdx];
      item.found = true;
      stepResponse.highlightedCount++;
      this.applyHighlightStyle(textDiv, item.highlight);
      const remaining = stepResponse.totalHighlights - stepResponse.highlightedCount;
      this.updateHighlightCounter(counterDiv, remaining);
      if (feedback) {
        feedback.textContent = `Here is one piece of information: ${item.highlight}.`;
        feedback.className = 'highlight-feedback correct fade-in';
      }
      const anyUnfound = stepResponse.contentState.some((i) => !i.found);
      if (showOneBtn) {
        showOneBtn.disabled = !anyUnfound;
        showOneBtn.classList.toggle('disabled-btn', !anyUnfound);
      }
      if (stepResponse.highlightedCount >= stepResponse.totalHighlights) {
        this.completeHighlightStep(textDiv, question, stepIndex, ctx);
      }
    }
    ctx.storage.saveState();
  },

  completeHighlightStep(textDiv, question, stepIndex, ctx) {
    const stepResponse = question.stepResponses[stepIndex];
    stepResponse.completed = true;
    if (!question.completedSteps) question.completedSteps = [];
    if (!question.completedSteps.includes(stepIndex)) question.completedSteps.push(stepIndex);

    if (stepResponse.contentState) {
      stepResponse.contentState.forEach((item) => { item.found = true; });
      stepResponse.highlightedCount = stepResponse.contentState.length;
    }
    const feedback = document.getElementById(`highlight-feedback-${stepIndex}`);
    if (feedback) {
      feedback.textContent = "Great job! You've highlighted all the information correctly.";
      feedback.className = 'highlight-feedback correct';
    }
    const counterDiv = document.getElementById(`highlight-counter-${stepIndex}`);
    if (counterDiv) counterDiv.style.display = 'none';
    if (textDiv && textDiv._highlightListener) {
      textDiv.removeEventListener('mouseup', textDiv._highlightListener);
      delete textDiv._highlightListener;
    }
    const showOneBtn = document.getElementById(`show-one-btn-${stepIndex}`);
    if (showOneBtn) {
      showOneBtn.disabled = true;
      showOneBtn.classList.add('disabled-btn');
    }
    this.advanceStep(question, stepIndex, ctx);
  },

  // =====================================================================
  // RESTORE (for completed questions revisited)
  // =====================================================================
  restoreCompleted(stepDiv, step, ctx) {
    const stepIndex = parseInt(stepDiv.dataset.step, 10);
    const question = this.questionFor(ctx);
    // In the history solution modal the step is complete by definition (only
    // completed questions open it), even if question.completedSteps wasn't
    // rebuilt this session.
    const isComplete = !!ctx.currentSolutionQuestion ||
      (question.completedSteps && question.completedSteps.includes(stepIndex));

    if (step.format === 'hotspot') {
      const stepContent = stepDiv.querySelector('.step-content');
      if (!stepContent) return;
      if (isComplete) {
        // Opt-in: swap to an annotated answer image (e.g. q1.png -> q1-history.png)
        // and drop the interactive overlay. Otherwise mark the regions in place.
        const image = stepContent.querySelector('.hotspot-image');
        if (ctx.config && ctx.config.hotspotAnswerImage && image && question && question.path) {
          const parts = question.path.split('.');
          if (parts.length >= 2) {
            parts[parts.length - 2] += '-history';
            image.src = parts.join('.');
          }
          const overlay = stepContent.querySelector('.hotspot-overlay');
          if (overlay) overlay.remove();
        } else {
          stepContent.querySelectorAll('.hotspot-area').forEach((area) => {
            if (area.dataset.isDistractor !== 'true') area.classList.add('correct');
            area.style.pointerEvents = 'none';
          });
        }
        stepContent.querySelectorAll('.hotspot-sequence-btn').forEach((btn) => {
          btn.classList.remove('active', 'disabled');
          btn.classList.add('completed');
        });
        const feedback = stepContent.querySelector(`#step-feedback-${stepIndex}`);
        if (feedback) {
          feedback.innerHTML = '<div class="step-complete-message">Step completed.</div>';
          feedback.className = 'step-feedback correct';
        }
        const hintBtn = stepContent.querySelector('.step-hint-btn');
        if (hintBtn) hintBtn.style.display = 'none';
      }
    } else if (step.format === 'highlight') {
      if (isComplete) {
        const textDiv = document.getElementById(`highlight-text-${stepIndex}`);
        if (textDiv) {
          step.content.forEach((item) => this.applyHighlightStyle(textDiv, item.highlight));
          if (textDiv._highlightListener) {
            textDiv.removeEventListener('mouseup', textDiv._highlightListener);
            delete textDiv._highlightListener;
          }
        }
        const counterDiv = document.getElementById(`highlight-counter-${stepIndex}`);
        if (counterDiv) counterDiv.style.display = 'none';
        const feedback = document.getElementById(`highlight-feedback-${stepIndex}`);
        if (feedback) {
          feedback.textContent = "Step completed.";
          feedback.className = 'highlight-feedback correct';
        }
        const showOneBtn = document.getElementById(`show-one-btn-${stepIndex}`);
        if (showOneBtn) { showOneBtn.disabled = true; showOneBtn.classList.add('disabled-btn'); }
      }
    }
  },
};

export default informationStep;
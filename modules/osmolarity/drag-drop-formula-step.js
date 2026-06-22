// modules/osmolarity/drag-drop-formula-step.js
// MODULE-LOCAL step-type plugin, key "DRAG_DROP_FORMULA" — the osmolarity
// formula builder. The student drags (or taps) the four labelled tiles
// (weight, no. of species, 1000, MW) into the dropzones of a fraction skeleton:
//
//     mOsm/L = ( [weight] × [species] × [1000] ) / [MW]
//
// The three numerator dropzones are interchangeable (multiplication commutes),
// while the denominator dropzone must match exactly. Those groups are derived
// from the skeleton structure, not hardcoded, so a different formula shape would
// still grade correctly.
//
// The plugin owns its own check button (there are no `.box-input`s for the
// shared checkStepInputs to grade), so on success it hands back to the standard
// step flow via ctx.quiz.advanceAfterStep — which records the completed step,
// persists it, and reveals the next step. `restoreCompleted` rebuilds the filled
// formula from the step definition for the history modal AND for reopening the
// guide after a reload.
// (Ported from the old osmolarity template.js/quiz.js drag-drop code; added
//  tap-to-place alongside native drag so it works on touch and is testable.)

import dom from '../../core/dom.js';

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const dragDropFormulaStep = {
  key: 'DRAG_DROP_FORMULA',

  // ----- rendering --------------------------------------------------------
  render(container, step, ctx) {
    if (step.content) {
      container.appendChild(dom.createFromHTML(`<p class="step-explanation">${step.content}</p>`));
    }

    const ddc = dom.create('div', 'drag-drop-container');
    if (step.hint) ddc.dataset.hint = step.hint;

    // selection state shared by the tiles and dropzones (tap-to-place)
    const selection = { item: null };

    // --- draggable tiles ---
    const dragArea = dom.create('div', 'drag-area');
    dragArea.appendChild(dom.createFromHTML('<h4>Drag these elements to complete the formula:</h4>'));
    const items = dom.create('div', 'draggable-items');
    shuffle(step.draggableElements || []).forEach((el) => {
      const item = dom.create('div', 'draggable-item');
      item.draggable = true;
      item.dataset.id = el.id;
      item.dataset.value = el.value;
      item.innerHTML = el.value;
      this.wireTile(item, selection);
      items.appendChild(item);
    });
    dragArea.appendChild(items);
    ddc.appendChild(dragArea);

    // --- formula skeleton with dropzones ---
    const dropArea = dom.create('div', 'drop-area');
    const formula = dom.create('div', 'operation-container');
    const line = dom.create('div', 'operation-line-container horizontal-format');
    this.renderSkeleton(line, step.skeleton || [], selection, { n: 0 });
    formula.appendChild(line);
    dropArea.appendChild(formula);
    ddc.appendChild(dropArea);

    ddc.appendChild(dom.create('div', 'hint-container'));

    // --- Reset + Check buttons ---
    const btnRow = dom.create('div', 'check-btn-container');
    const resetBtn = dom.create('button', 'step-reset-btn', 'Reset Formula');
    resetBtn.type = 'button';
    resetBtn.addEventListener('click', () => this.reset(ddc, selection));
    const checkBtn = dom.create('button', 'step-check-btn', 'Check Answer');
    checkBtn.type = 'button';
    // The shell also routes .step-check-btn clicks to checkStepInputs, but that
    // no-ops here since there are no .box-inputs. We own the real check.
    checkBtn.addEventListener('click', () => this.check(ddc, step, ctx));
    btnRow.appendChild(resetBtn);
    btnRow.appendChild(checkBtn);
    ddc.appendChild(btnRow);

    container.appendChild(ddc);
  },

  // Walk the skeleton, emitting text / operators / fractions, and tagging each
  // dropzone with the answer it expects plus a "group". Dropzones that share a
  // group (a numerator's multiplied operands) are interchangeable; a group of
  // one means an exact match. `grp.n` is a render-local counter.
  renderSkeleton(lineContainer, skeleton, selection, grp) {
    const eq = dom.create('div', 'horizontal-operation');
    skeleton.forEach((element) => {
      if (element.type === 'text') {
        const el = dom.create('div', 'operand-text');
        el.innerHTML = element.value;
        eq.appendChild(el);
      } else if (element.type === 'operator') {
        eq.appendChild(dom.create('div', 'operator', element.value));
      } else if (element.type === 'fraction') {
        eq.appendChild(this.renderFraction(element, selection, grp));
      } else if (element.type === 'dropzone') {
        eq.appendChild(this.makeDropZone(element.expectedId, `s${grp.n++}`, selection));
      }
    });
    lineContainer.appendChild(eq);
  },

  renderFraction(fractionData, selection, grp) {
    const frac = dom.create('div', 'fraction inline-fraction');

    const num = dom.create('div', 'fraction-numerator');
    this.fillFractionPart(num, fractionData.numerator, selection, grp);
    frac.appendChild(num);

    frac.appendChild(dom.create('div', 'fraction-bar'));

    const den = dom.create('div', 'fraction-denominator');
    this.fillFractionPart(den, fractionData.denominator, selection, grp);
    frac.appendChild(den);

    return frac;
  },

  // A fraction numerator/denominator is one of: a single dropzone, a string of
  // literal text, or an operands/operators chain (whose dropzones form one
  // interchangeable group).
  fillFractionPart(holder, part, selection, grp) {
    if (part && part.type === 'dropzone') {
      holder.appendChild(this.makeDropZone(part.expectedId, `s${grp.n++}`, selection));
    } else if (part && Array.isArray(part.operands)) {
      const group = `g${grp.n++}`;
      const row = dom.create('div', 'horizontal-format ddf-group');
      part.operands.forEach((operand, i) => {
        if (operand && operand.type === 'dropzone') {
          row.appendChild(this.makeDropZone(operand.expectedId, group, selection));
        } else {
          const el = dom.create('div', 'operand-text');
          el.innerHTML = operand.value != null ? operand.value : operand;
          row.appendChild(el);
        }
        if (i < part.operands.length - 1 && part.operators && part.operators[i]) {
          row.appendChild(dom.create('div', 'operator', part.operators[i]));
        }
      });
      holder.appendChild(row);
    } else {
      holder.innerHTML = part && part.value != null ? part.value : part;
    }
  },

  makeDropZone(expectedId, group, selection) {
    const zone = dom.create('div', 'drop-zone');
    zone.dataset.expectedId = expectedId;
    zone.dataset.group = group;
    this.wireDropZone(zone, selection);
    return zone;
  },

  // ----- interaction: native drag + tap-to-place --------------------------
  wireTile(item, selection) {
    item.addEventListener('dragstart', (e) => {
      if (!item.draggable) return;
      e.dataTransfer.setData('text/plain', item.dataset.id);
      e.dataTransfer.effectAllowed = 'move';
      item.classList.add('dragging');
    });
    item.addEventListener('dragend', () => item.classList.remove('dragging'));
    item.addEventListener('click', () => {
      if (!item.draggable) return; // already placed/locked
      if (selection.item === item) {
        item.classList.remove('selected');
        selection.item = null;
      } else {
        if (selection.item) selection.item.classList.remove('selected');
        selection.item = item;
        item.classList.add('selected');
      }
    });
  },

  wireDropZone(zone, selection) {
    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('drag-over');
      this.place(zone, e.dataTransfer.getData('text/plain'), selection);
    });
    zone.addEventListener('click', () => {
      if (zone.dataset.droppedId) {
        this.clearZone(zone);
      } else if (selection.item) {
        this.place(zone, selection.item.dataset.id, selection);
      }
    });
  },

  place(zone, id, selection) {
    if (!id) return;
    const ddc = zone.closest('.drag-drop-container');
    const tile = ddc && ddc.querySelector(`.draggable-item[data-id="${id}"]`);
    if (!tile || !tile.draggable) return;
    // If this zone already holds something, return it to the pool first.
    if (zone.dataset.droppedId) this.clearZone(zone);
    zone.dataset.droppedId = id;
    zone.innerHTML = tile.innerHTML;
    zone.classList.add('filled');
    zone.style.borderColor = '';
    tile.style.display = 'none';
    if (selection.item) { selection.item.classList.remove('selected'); selection.item = null; }
  },

  clearZone(zone) {
    const ddc = zone.closest('.drag-drop-container');
    const id = zone.dataset.droppedId;
    if (id && ddc) {
      const tile = ddc.querySelector(`.draggable-item[data-id="${id}"]`);
      if (tile) tile.style.display = '';
    }
    zone.innerHTML = '';
    zone.classList.remove('filled');
    zone.style.borderColor = '';
    delete zone.dataset.droppedId;
  },

  reset(ddc, selection) {
    ddc.querySelectorAll('.drop-zone').forEach((zone) => this.clearZone(zone));
    ddc.querySelectorAll('.draggable-item').forEach((item) => {
      item.draggable = true;
      item.classList.remove('selected');
      item.style.display = '';
    });
    if (selection) selection.item = null;
    const hint = ddc.querySelector('.hint-container');
    if (hint) { hint.textContent = ''; hint.className = 'hint-container'; }
  },

  // ----- grading ----------------------------------------------------------
  check(ddc, step, ctx) {
    const zones = Array.from(ddc.querySelectorAll('.drop-zone'));
    const hint = ddc.querySelector('.hint-container');

    if (zones.some((z) => !z.dataset.droppedId)) {
      zones.forEach((z) => { if (!z.dataset.droppedId) z.style.borderColor = '#ff6b6b'; });
      if (hint) ctx.dom.setFeedback(hint, false, 'Please fill in all drop zones');
      return;
    }

    // Group zones; a group is correct when the multiset of dropped ids equals
    // the multiset of expected ids (so multiplied numerator terms can be in any
    // order, but each zone must still hold one of the right tiles).
    const groups = {};
    zones.forEach((z) => {
      const g = z.dataset.group;
      (groups[g] = groups[g] || []).push(z);
    });
    let allCorrect = true;
    Object.values(groups).forEach((groupZones) => {
      const expected = groupZones.map((z) => z.dataset.expectedId).sort();
      const dropped = groupZones.map((z) => z.dataset.droppedId).sort();
      const ok = expected.length === dropped.length && expected.every((v, i) => v === dropped[i]);
      groupZones.forEach((z) => { z.style.borderColor = ok ? '#51cf66' : '#ff6b6b'; });
      if (!ok) allCorrect = false;
    });

    if (!allCorrect) {
      if (hint) ctx.dom.setFeedback(hint, false, step.hint || 'Some elements are in the wrong position. Try again!');
      return;
    }

    if (hint) ctx.dom.setFeedback(hint, true, 'Correct!');
    this.lock(ddc);
    // Hand back to the standard step flow: records + persists the completed step
    // and reveals the next one (or finishes the question).
    ctx.quiz.advanceAfterStep(ddc);
  },

  lock(ddc) {
    ddc.querySelectorAll('.draggable-item').forEach((item) => {
      item.draggable = false;
      item.classList.remove('selected');
      item.style.opacity = '0.6';
      item.style.cursor = 'default';
    });
    ddc.querySelectorAll('.drop-zone').forEach((z) => { z.style.cursor = 'default'; });
    const checkBtn = ddc.querySelector('.step-check-btn');
    if (checkBtn) checkBtn.disabled = true;
    const resetBtn = ddc.querySelector('.step-reset-btn');
    if (resetBtn) resetBtn.disabled = true;
  },

  // ----- restore (history modal + resuming the guide after a reload) ------
  // Rebuild the solved formula straight from the step definition: drop each
  // expected tile into its zone, hide the tile pool, and lock it down.
  restoreCompleted(stepDiv, step) {
    const ddc = stepDiv.querySelector('.drag-drop-container');
    if (!ddc) return;
    const valueById = {};
    (step.draggableElements || []).forEach((el) => { valueById[el.id] = el.value; });

    ddc.querySelectorAll('.drop-zone').forEach((zone) => {
      const id = zone.dataset.expectedId;
      if (id && valueById[id] != null) {
        zone.dataset.droppedId = id;
        zone.innerHTML = valueById[id];
        zone.classList.add('filled');
        zone.style.borderColor = '#51cf66';
        zone.style.backgroundColor = '#ddffdd';
      }
      zone.style.pointerEvents = 'none'; // read-only once restored
    });
    const dragArea = ddc.querySelector('.drag-area');
    if (dragArea) dragArea.style.display = 'none';
    ddc.querySelectorAll('.step-check-btn, .step-reset-btn').forEach((btn) => { btn.style.display = 'none'; });
    const hint = ddc.querySelector('.hint-container');
    if (hint) { hint.textContent = 'Correct!'; hint.className = 'hint-container hint-correct'; }
  },
};

export default dragDropFormulaStep;

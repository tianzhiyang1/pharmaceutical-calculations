// modules/weights-and-measures/config.js
// Manifest for the weights-and-measures module. Two question types share the
// same linear practice set:
//   - drag : unit-conversion questions (questions-drag.json), answered by
//            dragging/tapping one of four option chips into a slot. A local
//            plugin owns the interaction + grading.
//   - calc : plain numeric step-by-step questions (questions-calc.json). These
//            are ordinary numeric questions, so they reuse the SHARED
//            numeric-input plugin (the registry falls back to "numeric" for the
//            "calc" type key) plus the shared INFORMATION / OPERATION /
//            MULTIPLE_CHOICE step plugins — no module-local code needed.

import numericInput from '../../question-types/numeric-input.js';
import informationStep from '../../step-types/information-step.js';
import operationStep from '../../step-types/operation-step.js';
import multipleChoiceStep from '../../step-types/multiple-choice-step.js';
import dragQuestion from './drag-question.js';

const config = {
  storageKey: 'weights_and_measures_progress',
  title: 'Weights and Measures',

  // numericInput must be registered so the "calc" type can fall back to it.
  questionTypes: [dragQuestion, numericInput],
  stepTypes: [informationStep, operationStep, multipleChoiceStep],

  // No practice filters — students work through every question in order.
  filters: [],

  // History grid is grouped into these two sections. The per-question category
  // chip is intentionally hidden on the practice/solution views (styles.css),
  // so the tags exist only to drive this grouping.
  // cssClass adds a `<class>-title` modifier to each section heading so
  // styles.css can color them with the shared filter palette (this module has
  // no filters, so those colors are only used here).
  categories: [
    { tag: 'conversion', title: 'Unit Conversions', cssClass: 'unit-conversions' },
    { tag: 'calculation', title: 'Calculations', cssClass: 'calculations' },
  ],
};

export default config;

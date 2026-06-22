// modules/specific-gravity/config.js
// Manifest for the specific-gravity module. Numeric questions in two flavors:
//   - gravity   : specific-gravity / density calculations. Step guide uses the
//                 shared multi-line OPERATION step.
//   - enlarging : enlarging & reducing compounding formulas. Step guide mixes
//                 OPERATION with a module-local TABLE step (an ingredient grid of
//                 text + input cells). Several questions are multi-answer.
// Per-question `rounding` is handled by core/grading.js. Two practice filters /
// history groups, color-coded with the filter palette.

import numericInput from '../../question-types/numeric-input.js';
import operationStep from '../../step-types/operation-step.js';
import tableStep from './table-step.js';
import reference from './reference.js';

const config = {
  storageKey: 'specific_gravity_progress',
  title: 'Specific Gravity',

  // The enlarging/reducing questions give an "original formula" as a static
  // table (question.tableHeaders/tableRows); render it in the question area and
  // in the solution modal.
  showQuestionTable: true,

  questionTypes: [numericInput],
  stepTypes: [operationStep, tableStep],

  filters: [
    { id: 'specificGravity', label: 'Specific Gravity', tag: 'gravity' },
    { id: 'enlargingReducing', label: 'Enlarging and Reducing Formulas', tag: 'enlarging' },
  ],

  categories: [
    { tag: 'gravity', title: 'Specific Gravity', cssClass: 'gravity' },
    { tag: 'enlarging', title: 'Enlarging and Reducing Formulas', cssClass: 'enlarging' },
  ],

  // Wire the collapsible reference cards on the practice page.
  onReady() {
    reference.init();
  },
};

export default config;

// modules/dose-calculation/config.js
// Manifest for the dose-calculation module. Numeric questions in three flavors:
//   - weights : body weights (BMI, IBW, AdjBW).
//   - crcl    : creatinine-clearance dosing.
//   - bsa     : body-surface-area dosing (Mosteller — uses √ via the shared
//               OPERATION step's squareRoot operand support).
// Step guides mix two SHARED step types — OPERATION and MULTIPLE_CHOICE — so no
// module-local plugins are needed. Some questions show a static "given values"
// table in the question area (showQuestionTable). Per-question `rounding` is
// handled by core/grading.js. Three practice filters / history groups.

import numericInput from '../../question-types/numeric-input.js';
import operationStep from '../../step-types/operation-step.js';
import multipleChoiceStep from '../../step-types/multiple-choice-step.js';
import reference from './reference.js';

const config = {
  storageKey: 'dose_calculation_progress',
  title: 'Dose Calculation',

  // A few crcl/weights questions present their given values as a static table
  // (question.tableHeaders/tableRows); render it in the question area + solution.
  showQuestionTable: true,

  questionTypes: [numericInput],
  stepTypes: [operationStep, multipleChoiceStep],

  // NOTE: the CrCl filter checkbox id is `crClFilter`, so the filter id is
  // `crCl` even though the tag is `crcl`.
  filters: [
    { id: 'weights', label: 'Body weights (BMI, IBW, AdjBW)', tag: 'weights' },
    { id: 'crCl', label: 'CrCl Dosing', tag: 'crcl' },
    { id: 'bsa', label: 'BSA Dosing', tag: 'bsa' },
  ],

  categories: [
    { tag: 'weights', title: 'Body weights (BMI, IBW, AdjBW)', cssClass: 'weights' },
    { tag: 'crcl', title: 'CrCl Dosing', cssClass: 'crcl' },
    { tag: 'bsa', title: 'BSA Dosing', cssClass: 'bsa' },
  ],

  // Wire the collapsible reference cards on the practice page.
  onReady() {
    reference.init();
  },
};

export default config;

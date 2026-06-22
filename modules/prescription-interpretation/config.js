// modules/prescription-interpretation/config.js
// Manifest for the prescription-interpretation module.

import dragQuestion from './drag-question.js';
import appliedQuestion from './applied-question.js';
// Interpretation + hotspot/highlight INFORMATION steps are shared with
// general-dose-calculation; calculation + drag/applied remain module-local.
import informationStep from '../../step-types/hotspot-step.js';
import interpretationStep from '../../step-types/interpretation.js';
import calculationStep from './calculation-step.js';

const config = {
  storageKey: 'prescription_interpretation_progress',
  title: 'Prescription Interpretation',

  // Two question types: drag (questions 1–27) and applied (28+).
  // The engine picks per question via question.type.
  questionTypes: [dragQuestion, appliedQuestion],

  // Three step types used inside applied questions' step-by-step guide.
  // - informationStep handles both 'hotspot' and 'highlight' formats; it
  //   registers under the key "INFORMATION", overriding the simple
  //   bullet-list version in step-types/ (which basic-methods uses).
  // - interpretationStep and calculationStep are new; no override needed.
  stepTypes: [informationStep, interpretationStep, calculationStep],

  // No filters and no categories — students work through questions linearly.
};

export default config;
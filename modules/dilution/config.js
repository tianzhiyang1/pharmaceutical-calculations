// modules/dilution/config.js
// Manifest for the dilution module. Plain numeric questions; the step guide
// mixes two step types:
//   - OPERATION   : shared step (renders the multi-line operands1/operators1,
//                   operands2/... equations these questions use).
//   - INFORMATION : a module-local "explainer" step — an explanatory paragraph
//                   plus key terms highlighted in the question, advanced with a
//                   "Next Step" button. (Overrides the shared bullet-list one.)
// No practice filters or history categories — a single linear set.

import numericInput from '../../question-types/numeric-input.js';
import operationStep from '../../step-types/operation-step.js';
import informationStep from './information-step.js';
import reference from './reference.js';

const config = {
  storageKey: 'dilution_progress',
  title: 'Dilution',

  questionTypes: [numericInput],
  stepTypes: [operationStep, informationStep],

  // Wire the collapsible reference card on the practice page.
  onReady() {
    reference.init();
  },
};

export default config;

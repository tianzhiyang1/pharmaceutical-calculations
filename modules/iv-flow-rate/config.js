// modules/iv-flow-rate/config.js
// Manifest for the iv-flow-rate module (IV flow rate + IV admixture). Plain
// numeric questions; the step guide mixes two SHARED step types:
//   - MULTIPLE_CHOICE : "identify what's being asked" / setup choices.
//   - OPERATION       : the shared multi-line equation step (fractions + inputs).
// No module-local plugins needed. A couple of questions are multi-answer. All
// answers are strict (no per-question rounding). Two practice filters / history
// groups, color-coded with the filter palette.

import numericInput from '../../question-types/numeric-input.js';
import operationStep from '../../step-types/operation-step.js';
import multipleChoiceStep from '../../step-types/multiple-choice-step.js';
import reference from './reference.js';

const config = {
  storageKey: 'iv_flow_rate_progress',
  title: 'IV Flow Rate and Admixture',

  questionTypes: [numericInput],
  stepTypes: [operationStep, multipleChoiceStep],

  filters: [
    { id: 'flowRate', label: 'IV Flow Rate', tag: 'flowRate' },
    { id: 'admixture', label: 'IV Admixture', tag: 'admixture' },
  ],

  categories: [
    { tag: 'flowRate', title: 'IV Flow Rate', cssClass: 'flowRate' },
    { tag: 'admixture', title: 'IV Admixture', cssClass: 'admixture' },
  ],

  // Wire the collapsible reference cards on the practice page.
  onReady() {
    reference.init();
  },
};

export default config;

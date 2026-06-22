// modules/general-dose-calculation/config.js
// Manifest for the general-dose-calculation module. Numeric questions whose
// step-by-step guide mixes three step types:
//   - OPERATION     : shared step (renders the multi-line operands1/operators1,
//                     operands2/... equations these questions use).
//   - INFORMATION   : the SHARED hotspot/highlight step (shared with
//                     prescription-interpretation) — click regions on a
//                     prescription image in sequence (the tablet-splitting
//                     questions). Overrides the shared bullet-list INFORMATION.
//   - INTERPRETATION: the SHARED short-answer + fill-in-the-blank step.
// Three practice filters / history groups, color-coded with the filter palette.

import numericInput from '../../question-types/numeric-input.js';
import operationStep from '../../step-types/operation-step.js';
import informationStep from '../../step-types/hotspot-step.js';
import interpretationStep from '../../step-types/interpretation.js';
import reference from './reference.js';

const config = {
  storageKey: 'general_dose_calculation_progress',
  title: 'General Dose Calculations',

  // The tablet-splitting questions carry a `path` to a prescription image; show
  // it in the question area (the hotspot step renders its own copy too).
  showQuestionImage: true,
  // In the read-only solution/review view, swap the hotspot image for its
  // annotated answer version (splitting/q1.png -> splitting/q1-history.png).
  hotspotAnswerImage: true,

  questionTypes: [numericInput],
  stepTypes: [operationStep, informationStep, interpretationStep],

  filters: [
    { id: 'general', label: 'General Dose Calculations', tag: 'general' },
    { id: 'weight', label: 'Dose Based on Body Weight', tag: 'weight' },
    { id: 'splitting', label: 'Calculation with Tablet Splitting', tag: 'splitting' },
  ],

  categories: [
    { tag: 'general', title: 'General Dose Calculations', cssClass: 'general' },
    { tag: 'weight', title: 'Dose Based on Body Weight', cssClass: 'weight' },
    { tag: 'splitting', title: 'Calculation with Tablet Splitting', cssClass: 'splitting' },
  ],

  onReady() {
    reference.init();
  },
};

export default config;

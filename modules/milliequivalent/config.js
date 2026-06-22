// modules/milliequivalent/config.js
// Manifest for the milliequivalent module. Plain numeric questions whose
// step-by-step guide is built only from the shared multi-line OPERATION step
// (mEq <-> mg conversions via the "1 mEq = MW / valence" formula and ratio /
// proportion). The questions carry no tags, so there are no practice filters
// and no history categories — a single ungrouped set (like dilution).

import numericInput from '../../question-types/numeric-input.js';
import operationStep from '../../step-types/operation-step.js';
import reference from './reference.js';

const config = {
  storageKey: 'milliequivalent_progress',
  title: 'Milliequivalent',

  questionTypes: [numericInput],
  stepTypes: [operationStep],

  // Wire the collapsible reference cards on the practice page.
  onReady() {
    reference.init();
  },
};

export default config;

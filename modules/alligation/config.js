// modules/alligation/config.js
// Manifest for the alligation module. Numeric questions in two flavors:
//   - medial    : find the final concentration of a mixture. Step guide uses
//                 only the shared multi-line OPERATION step.
//   - alternate : find how much of each stock to mix. Step guide mixes the
//                 shared OPERATION step with a module-local TIC_TAC_TOE step
//                 (the alligation-alternate scheme grid).
// Two practice filters / history groups, color-coded with the filter palette.

import numericInput from '../../question-types/numeric-input.js';
import operationStep from '../../step-types/operation-step.js';
import ticTacToeStep from './tic-tac-toe-step.js';
import reference from './reference.js';

const config = {
  storageKey: 'alligation_progress',
  title: 'Alligation',

  questionTypes: [numericInput],
  stepTypes: [operationStep, ticTacToeStep],

  filters: [
    { id: 'medial', label: 'Alligation Medial', tag: 'medial' },
    { id: 'alternate', label: 'Alligation Alternate', tag: 'alternate' },
  ],

  categories: [
    { tag: 'medial', title: 'Alligation Medial', cssClass: 'medial' },
    { tag: 'alternate', title: 'Alligation Alternate', cssClass: 'alternate' },
  ],

  // Wire the collapsible reference cards on the practice page.
  onReady() {
    reference.init();
  },
};

export default config;

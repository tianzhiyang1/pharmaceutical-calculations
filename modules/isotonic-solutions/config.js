// modules/isotonic-solutions/config.js
// Manifest for the isotonic-solutions module. Plain numeric questions in two
// flavors, each with a step guide built only from the shared multi-line
// OPERATION step:
//   - evalue : calculate a drug's sodium chloride equivalent (E value).
//   - nacl   : the NaCl-equivalent method (how much NaCl / other agent to add).
// Per-question `rounding` is handled by core/grading.js. Some OPERATION steps
// use `hybrid` fraction parts (text + input, e.g. "58.5 × [ ]"), which the
// shared operation-step plugin renders. Two practice filters / history groups.

import numericInput from '../../question-types/numeric-input.js';
import operationStep from '../../step-types/operation-step.js';
import reference from './reference.js';

const config = {
  storageKey: 'isotonic_solutions_progress',
  title: 'Isotonic Solutions',

  questionTypes: [numericInput],
  stepTypes: [operationStep],

  filters: [
    { id: 'evalue', label: 'E-Value Calculations', tag: 'evalue' },
    { id: 'nacl', label: 'NaCl Equivalent Method', tag: 'nacl' },
  ],

  categories: [
    { tag: 'evalue', title: 'E-Value Calculations', cssClass: 'evalue' },
    { tag: 'nacl', title: 'NaCl Equivalent Method', cssClass: 'nacl' },
  ],

  // Wire the collapsible reference cards on the practice page.
  onReady() {
    reference.init();
  },
};

export default config;

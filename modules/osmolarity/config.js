// modules/osmolarity/config.js
// Manifest for the osmolarity module (mOsmolarity + mOsmole). Numeric questions
// whose step guides mix three step types:
//   - DRAG_DROP_FORMULA : module-local — drag/tap the tiles into the osmolarity
//                         formula skeleton (the only unique interaction).
//   - OPERATION         : shared multi-line equation step.
//   - PROPORTION        : structurally identical to OPERATION (same
//                         operands1/operators1... + fractions/inputs), so it just
//                         reuses the shared operation plugin under a second key.
// Two practice filters / history groups, color-coded with the filter palette.

import numericInput from '../../question-types/numeric-input.js';
import operationStep from '../../step-types/operation-step.js';
import dragDropFormulaStep from './drag-drop-formula-step.js';
import reference from './reference.js';

const config = {
  storageKey: 'osmolarity_progress',
  title: 'mOsmolarity and mOsmole',

  questionTypes: [numericInput],
  // PROPORTION renders exactly like OPERATION; register the same shared plugin
  // under that key too (a fresh object so the registry keys it separately).
  stepTypes: [operationStep, { ...operationStep, key: 'PROPORTION' }, dragDropFormulaStep],

  filters: [
    { id: 'osmolarity', label: 'mOsmolarity', tag: 'mosmolarity' },
    { id: 'osmole', label: 'mOsmole', tag: 'mosmole' },
  ],

  categories: [
    { tag: 'mosmolarity', title: 'mOsmolarity', cssClass: 'mosmolarity' },
    { tag: 'mosmole', title: 'mOsmole', cssClass: 'mosmole' },
  ],

  // Wire the collapsible reference cards on the practice page.
  onReady() {
    reference.init();
  },
};

export default config;

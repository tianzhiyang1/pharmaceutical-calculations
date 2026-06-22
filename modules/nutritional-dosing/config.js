// modules/nutritional-dosing/config.js
// Manifest for the nutritional-dosing module. Plain numeric questions whose step
// guide is built only from the shared multi-line OPERATION step (BEE/TDE energy
// calculations, caloric conversions, and related). No module-local plugins.
// Per-question `rounding` is handled by core/grading.js. A couple of questions
// are multi-answer. Three practice filters / history groups, color-coded with
// the filter palette.

import numericInput from '../../question-types/numeric-input.js';
import operationStep from '../../step-types/operation-step.js';
import reference from './reference.js';

const config = {
  storageKey: 'nutritional_dosing_progress',
  title: 'Nutritional Dosing',

  questionTypes: [numericInput],
  stepTypes: [operationStep],

  filters: [
    { id: 'bee', label: 'BEE and TDE Calculations', tag: 'bee' },
    { id: 'caloric', label: 'Caloric Conversion Questions', tag: 'caloric' },
    { id: 'additional', label: 'Additional Questions', tag: 'additional' },
  ],

  categories: [
    { tag: 'bee', title: 'BEE and TDE Calculations', cssClass: 'bee' },
    { tag: 'caloric', title: 'Caloric Conversion Questions', cssClass: 'caloric' },
    { tag: 'additional', title: 'Additional Questions', cssClass: 'additional' },
  ],

  // Wire the collapsible reference cards on the practice page.
  onReady() {
    reference.init();
  },
};

export default config;

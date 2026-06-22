// modules/basic-methods/config.js
// The entire definition of the basic-methods module — everything that is NOT
// shared lives here (plus questions.json and the two module-local files this
// imports). Adding another numeric module later means copying this file and
// changing the values; the engine and plugins stay untouched.

import numericInput from '../../question-types/numeric-input.js';
import informationStep from '../../step-types/information-step.js';
import multipleChoiceStep from '../../step-types/multiple-choice-step.js';
import unitCancellationStep from './unit-cancellation-step.js';
import reference from './reference.js';

const config = {
  storageKey: 'basic_methods_progress',
  title: 'Basic Methods',

  // Which shared plugins this module draws from.
  questionTypes: [numericInput],
  // unitCancellationStep registers under key "OPERATION" and therefore OVERRIDES
  // the shared operation step for this module only.
  stepTypes: [informationStep, multipleChoiceStep, unitCancellationStep],

  // Practice filters (drive the checkboxes, the navigator, and applyFilters).
  filters: [
    { id: 'dimensionalAnalysis', label: 'Dimensional Analysis', tag: 'dimensional-analysis' },
    { id: 'ratioAndProportion', label: 'Ratio and Proportion', tag: 'ratio-and-proportion' },
  ],

  // History-grid sections.
  categories: [
    { tag: 'dimensional-analysis', title: 'Dimensional Analysis' },
    { tag: 'ratio-and-proportion', title: 'Ratio and Proportion', cssClass: 'ratio-and-proportion' },
  ],

  // Module-local wiring that core doesn't know about: install the one global
  // unit-cancel click listener and initialize the reference cards.
  onReady(ctx) {
    unitCancellationStep.install(ctx);
    reference.init();
  },
};

export default config;
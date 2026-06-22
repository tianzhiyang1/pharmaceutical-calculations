// modules/expressions-of-concentrations/config.js
// Manifest for the expressions-of-concentrations module. Plain numeric
// questions (some answered as ratio strings like "1:1000", which core/grading
// already handles) with two step types:
//   - MULTIPLE_CHOICE : shared plugin.
//   - OPERATION       : the shared operation step (it renders multi-line
//                       equations — operands1/operators1, operands2/... — as
//                       well as single-line ones).
// Two practice filters / history groups: percentage strength and ratio strength.

import numericInput from '../../question-types/numeric-input.js';
import multipleChoiceStep from '../../step-types/multiple-choice-step.js';
import operationStep from '../../step-types/operation-step.js';
import reference from './reference.js';

const config = {
  storageKey: 'expressions_of_concentrations_progress',
  title: 'Expressions of Concentrations',

  questionTypes: [numericInput],
  // operationStep registers under key "OPERATION" and overrides the shared one.
  stepTypes: [operationStep, multipleChoiceStep],

  filters: [
    { id: 'percentage', label: 'Percentage Strength', tag: 'percentage' },
    { id: 'ratio', label: 'Ratio Strength', tag: 'ratio' },
  ],

  categories: [
    { tag: 'percentage', title: 'Percentage Strength', cssClass: 'percentage' },
    { tag: 'ratio', title: 'Ratio Strength', cssClass: 'ratio' },
  ],

  // Wire the collapsible reference cards on the practice page.
  onReady() {
    reference.init();
  },
};

export default config;

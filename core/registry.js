// core/registry.js
// Shared plugin registry. One copy for every module.
// Maps a step/question "type" key to the plugin object that renders & grades it.
// A module can OVERRIDE a shared plugin by registering one with the same key
// (this is how basic-methods replaces the generic OPERATION step with its
// unit-cancellation variant without touching core).

export function createRegistry(stepTypes = [], questionTypes = []) {
  const steps = new Map();
  const questions = new Map();

  stepTypes.forEach((p) => steps.set(p.key, p));
  questionTypes.forEach((p) => questions.set(p.key, p));

  return {
    stepType(key) {
      return steps.get(key) || steps.get('OPERATION'); // OPERATION is the default
    },
    questionType(key) {
      return questions.get(key) || questions.get('numeric');
    },
    registerStepType(plugin) {
      steps.set(plugin.key, plugin);
    },
    registerQuestionType(plugin) {
      questions.set(plugin.key, plugin);
    },
  };
}
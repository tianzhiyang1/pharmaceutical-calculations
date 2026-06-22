// core/state.js
// Shared mutable run-state. One copy for every module.
// createState(config) builds the same object the old basic-methods state.js had,
// except `activeFilters` is now derived from config.filters instead of being
// hardcoded to { dimensionalAnalysis, ratioAndProportion }. A module with no
// filters simply gets an empty activeFilters object and the filter code no-ops.

export function createState(config) {
  const defaultFilters = () => {
    const f = {};
    (config.filters || []).forEach((filter) => {
      f[filter.id] = true;
    });
    return f;
  };

  const state = {
    index: 0,
    questions: [],
    quizQuestions: [],
    currentAnswerCorrect: false,
    answered: false,
    stepsShown: false,
    history: [],
    completedSteps: [],
    completedQuestions: [],
    questionMap: {},
    questionIndices: [],
    completedQuestionNumbers: [],
    remainingQuestionNumbers: [],
    missedQuestions: [],
    filteredQuestions: [],
    activeFilters: defaultFilters(),
    currentQuestionAttempts: 0,
    // One-shot: set by the resume path so loadQuestion reopens the step guide
    // where the user left off, then immediately cleared.
    pendingStepResume: false,

    reset() {
      this.index = 0;
      this.quizQuestions = [];
      this.currentAnswerCorrect = false;
      this.answered = false;
      this.stepsShown = false;
      this.completedSteps = [];
      this.completedQuestions = [];
      this.completedQuestionNumbers = [];
      this.remainingQuestionNumbers = [];
      this.missedQuestions = [];
      this.filteredQuestions = [];
      this.activeFilters = defaultFilters();
      this.currentQuestionAttempts = 0;
      this.pendingStepResume = false;
    },

    addToHistory(question, userAnswer, userUnit, isCorrect, steps = null) {
      const historyItem = {
        index: this.history.length + 1,
        question: question.question,
        tag: question.tag,
        userAnswer,
        userUnit,
        correctAnswer: question.answerValue,
        answerUnit: question.answerUnit || [],
        isCorrect,
        steps: steps || question.steps,
      };
      const existing = this.history.findIndex((i) => i.question === question.question);
      if (existing !== -1) {
        historyItem.index = this.history[existing].index;
        this.history[existing] = historyItem;
      } else {
        this.history.push(historyItem);
      }
    },
  };

  return state;
}
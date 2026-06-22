// core/storage.js
// Shared localStorage persistence. One copy for every module.
// createStorage(ctx) closes over ctx.state and ctx.config.storageKey, so the
// per-module KEY is now data, not a forked file. 7-day expiry + try/catch kept.

export function createStorage(ctx) {
  const KEY = ctx.config.storageKey;

  return {
    KEY,

    saveState() {
      const s = ctx.state;
      const dataToSave = {
        index: s.index,
        currentAnswerCorrect: s.currentAnswerCorrect,
        quizQuestions: s.quizQuestions,
        history: s.history,
        completedQuestions: s.completedQuestions,
        // Step-by-step progress on the CURRENT (in-progress) question, so a
        // reload can reopen the guide where the user left off rather than at
        // step 1. (Steps of already-finished questions are reconstructed from
        // history instead.)
        completedSteps: s.completedSteps,
        questionMap: s.questionMap,
        questionIndices: s.questionIndices,
        completedQuestionNumbers: s.completedQuestionNumbers,
        remainingQuestionNumbers: s.remainingQuestionNumbers,
        missedQuestions: s.missedQuestions,
        filteredQuestions: s.filteredQuestions,
        activeFilters: s.activeFilters,
        timestamp: Date.now(),
      };
      try {
        localStorage.setItem(KEY, JSON.stringify(dataToSave));
      } catch (error) {
        console.error('Error saving progress to localStorage:', error);
      }
    },

    loadState() {
      try {
        const saved = localStorage.getItem(KEY);
        if (!saved) return null;
        const parsed = JSON.parse(saved);
        const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;
        if (parsed.timestamp && Date.now() - parsed.timestamp > ONE_WEEK) {
          this.clearState();
          return null;
        }
        // Offer to resume when there's anything worth resuming: a finished
        // question, OR in-progress steps on the current question (so a refresh
        // mid-question isn't silently discarded).
        const hasCompletedQuestions = parsed.completedQuestions && parsed.completedQuestions.length > 0;
        const hasCompletedSteps = parsed.completedSteps && parsed.completedSteps.length > 0;
        if (!hasCompletedQuestions && !hasCompletedSteps) {
          return null;
        }
        return parsed;
      } catch (error) {
        console.error('Error loading progress from localStorage:', error);
        return null;
      }
    },

    clearState() {
      try {
        localStorage.removeItem(KEY);
      } catch (error) {
        console.error('Error clearing progress from localStorage:', error);
      }
    },
  };
}
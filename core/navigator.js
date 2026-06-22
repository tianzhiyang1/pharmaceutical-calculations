// core/navigator.js
// Shared question navigator (the "Question: 1 2 3 ..." jump links). One copy
// for every module. Filter-visibility is now config-driven: a link is shown
// when its question.tag maps to an active filter. The old hardcoded switch on
// "dimensional-analysis" / "ratio-and-proportion" is replaced by a lookup
// against config.filters[].tag.

export function createNavigator(ctx) {
  const { state, config } = ctx;

  // tag -> filter id (built from config so any module works)
  const tagToFilterId = {};
  (config.filters || []).forEach((f) => {
    if (f.tag) tagToFilterId[f.tag] = f.id;
  });

  const nav = {
    init() {
      const container = document.getElementById('questionNavigator');
      if (!container) return;
      if (!state.questions || state.questions.length === 0) {
        setTimeout(() => this.createNavigator(container), 500);
      } else {
        this.createNavigator(container);
      }
    },

    createNavigator(container) {
      container.innerHTML = 'Question: ';
      state.questions.forEach((question) => {
        const link = document.createElement('a');
        link.href = '#';
        link.textContent = question.number;
        link.style.margin = '0 5px';
        link.dataset.questionIndex = state.questionIndices[question.number];
        link.dataset.questionTag = question.tag || '';
        link.addEventListener('click', (e) => {
          e.preventDefault();
          const target = parseInt(e.target.dataset.questionIndex, 10);
          if (!Number.isNaN(target) && target >= 0 && target < state.quizQuestions.length) {
            state.index = target;
            ctx.ui.loadQuestion();
            this.updateActiveLinkStyle();
          }
        });
        container.appendChild(link);
      });
      this.updateNavigatorVisibility();
      this.updateActiveLinkStyle();
    },

    shouldShowQuestion(tag) {
      const filterId = tagToFilterId[tag];
      if (!filterId) return true; // no filter governs this tag → always show
      return state.activeFilters[filterId] === true;
    },

    updateNavigatorVisibility() {
      const container = document.getElementById('questionNavigator');
      if (!container) return;
      for (const link of container.getElementsByTagName('a')) {
        link.style.display = this.shouldShowQuestion(link.dataset.questionTag) ? '' : 'none';
      }
    },

    updateActiveLinkStyle() {
      const container = document.getElementById('questionNavigator');
      if (!container) return;
      const current = state.index.toString();
      for (const link of container.getElementsByTagName('a')) {
        const active = link.dataset.questionIndex === current;
        link.style.textDecoration = active ? 'none' : 'underline';
        link.style.fontWeight = active ? 'bold' : 'normal';
      }
    },

    refreshNavigator() {
      this.updateNavigatorVisibility();
      this.updateActiveLinkStyle();
    },
  };

  return nav;
}
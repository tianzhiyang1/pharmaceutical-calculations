// core/engine.js
// Shared bootstrap. One copy for every module. createQuiz(config) builds the
// runtime context, wires the singletons together via `ctx` (replacing the old
// setUI/setQuiz/setStorage/setUtils injection dance), and starts the app on
// DOMContentLoaded. A module's main.js just calls createQuiz({ ...config, questions }).
//
// config shape:
//   { storageKey, title, questions,
//     questionTypes: [pluginObjects], stepTypes: [pluginObjects],
//     filters:    [{ id, label, tag }],
//     categories: [{ tag, title, cssClass? }],
//     onReady(ctx)  // optional: module installs its own bespoke bits here
//   }

import dom from './dom.js';
import * as grading from './grading.js';
import { createState } from './state.js';
import { createStorage } from './storage.js';
import { createRegistry } from './registry.js';
import { createNavigator } from './navigator.js';
import { createHistory } from './history.js';
import { createShellUI } from './shell-ui.js';
import { createQuizController } from './quiz-controller.js';
import { showResumeDialog } from './resume-dialog.js';

export function createQuiz(config) {
  const ctx = { config, dom, grading, showResumeDialog };

  ctx.state = createState(config);
  ctx.registry = createRegistry(config.stepTypes || [], config.questionTypes || []);
  ctx.storage = createStorage(ctx);
  ctx.ui = createShellUI(ctx);
  ctx.quiz = createQuizController(ctx);
  ctx.navigator = createNavigator(ctx);
  ctx.history = createHistory(ctx);

  const start = () => {
    ctx.ui.init();
    try {
      ctx.quiz.init();
      ctx.history.init();
      ctx.navigator.init();
      if (config.onReady) config.onReady(ctx);
    } catch (error) {
      console.error('Error initializing app:', error);
    }

    // Generic UX: stop number inputs from changing on scroll.
    document.addEventListener(
      'wheel',
      (event) => {
        if (event.target.type === 'number') {
          event.preventDefault();
          event.stopPropagation();
          return false;
        }
      },
      { passive: false }
    );
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

  return ctx;
}
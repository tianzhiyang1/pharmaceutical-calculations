// modules/dose-calculation/main.js
// Entry point for practice.html — fetch the question bank and start the engine.
// answerValue is already a single-element array everywhere; a few questions omit
// answerUnit, so default it to an empty array for the shared readers.

import { createQuiz } from '../../core/engine.js';
import config from './config.js';

async function boot() {
  let questions = [];
  try {
    const res = await fetch('questions.json');
    const raw = (await res.json()).questions || [];
    questions = raw.map((q) => ({
      ...q,
      answerUnit: Array.isArray(q.answerUnit) ? q.answerUnit : [],
    }));
  } catch (error) {
    console.error('Could not load questions.json:', error);
  }
  createQuiz({ ...config, questions });
}

boot();

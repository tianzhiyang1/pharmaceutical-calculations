// modules/osmolarity/main.js
// Entry point for practice.html — fetch the question bank and start the engine.
// Normalize here: a few questions store answerValue/answerUnit as a scalar
// rather than the canonical single-element array (the engine + numeric-input
// expect arrays), so wrap any scalars.

import { createQuiz } from '../../core/engine.js';
import config from './config.js';

async function boot() {
  let questions = [];
  try {
    const res = await fetch('questions.json');
    const raw = (await res.json()).questions || [];
    questions = raw.map((q) => ({
      ...q,
      answerValue: Array.isArray(q.answerValue) ? q.answerValue : [q.answerValue],
      answerUnit: Array.isArray(q.answerUnit) ? q.answerUnit : [q.answerUnit],
    }));
  } catch (error) {
    console.error('Could not load questions.json:', error);
  }
  createQuiz({ ...config, questions });
}

boot();

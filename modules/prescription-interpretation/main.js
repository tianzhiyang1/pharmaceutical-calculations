// modules/prescription-interpretation/main.js
// Entry point for both index.html and practice.html. Identical shape to
// basic-methods/main.js — only the imports differ.

import { createQuiz } from '../../core/engine.js';
import config from './config.js';

async function boot() {
  let questions = [];
  try {
    const res = await fetch('interpretation.json');
    // interpretation.json is a bare array, not { questions: [...] } like
    // basic-methods. Accept either shape so this works in both cases.
    const data = await res.json();
    questions = Array.isArray(data) ? data : (data.questions || []);
  } catch (error) {
    console.error('Could not load interpretation.json:', error);
  }
  createQuiz({ ...config, questions });
}

boot();
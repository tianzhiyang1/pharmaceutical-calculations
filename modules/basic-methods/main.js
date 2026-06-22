// modules/basic-methods/main.js
// Entry point for BOTH index.html and practice.html. Fetches the question bank
// (kept as-is from the old basic-methods/questions.json) and hands the merged
// config to the shared engine. This three-line shape is identical for every
// module — only the import paths differ. (Replaces basic-methods/script.js.)

import { createQuiz } from '../../core/engine.js';
import config from './config.js';

async function boot() {
  let questions = [];
  try {
    const res = await fetch('questions.json');
    questions = (await res.json()).questions;
  } catch (error) {
    console.error('Could not load questions.json:', error);
  }
  createQuiz({ ...config, questions });
}

boot();
// modules/expressions-of-concentrations/main.js
// Entry point for practice.html. Same three-line shape as every other module:
// fetch the question bank and hand the merged config to the shared engine.

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

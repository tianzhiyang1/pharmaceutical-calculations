// modules/dilution/main.js
// Entry point for practice.html — fetch the question bank and start the engine.

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

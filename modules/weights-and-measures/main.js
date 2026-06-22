// modules/weights-and-measures/main.js
// Entry point for practice.html. Fetches the two question banks, normalizes
// them into the engine's canonical shape, and hands the merged config to the
// shared engine. (Replaces the old unit-conversion-p1.js orchestrator, whose
// quiz/state/history/navigator logic all now live in core/.)

import { createQuiz } from '../../core/engine.js';
import config from './config.js';

// Merge the drag + calc banks (drag first, matching the original ordering) and
// adapt each source shape to what the shared plugins expect:
//   - `number` comes from the source `id` (drag ids 1–23, calc ids 24–37 are
//     already sequential and contiguous, so this preserves the question
//     numbering students saw before).
//   - `tag` drives the grouped history sections.
//   - drag answers are a single string; we mirror correctAnswer/unit into
//     answerValue/answerUnit so the shared solution modal can show the answer.
//   - calc answers are scalars; the shared numeric-input plugin + grading work
//     on arrays, so we wrap them.
function normalizeQuestions(dragQuestions, calcQuestions) {
  const drag = dragQuestions.map((q) => ({
    ...q,
    number: q.id,
    tag: 'conversion',
    answerValue: q.correctAnswer,
    answerUnit: q.unit,
  }));

  const calc = calcQuestions.map((q) => ({
    ...q,
    number: q.id,
    tag: 'calculation',
    answerValue: Array.isArray(q.answerValue) ? q.answerValue : [q.answerValue],
    answerUnit: Array.isArray(q.answerUnit) ? q.answerUnit : [q.answerUnit],
  }));

  return [...drag, ...calc];
}

async function boot() {
  let questions = [];
  try {
    const [dragRes, calcRes] = await Promise.all([
      fetch('questions-drag.json'),
      fetch('questions-calc.json'),
    ]);
    if (!dragRes.ok) throw new Error(`questions-drag.json: ${dragRes.status}`);
    if (!calcRes.ok) throw new Error(`questions-calc.json: ${calcRes.status}`);
    questions = normalizeQuestions(await dragRes.json(), await calcRes.json());
  } catch (error) {
    console.error('Could not load question banks:', error);
  }
  createQuiz({ ...config, questions });
}

boot();

// core/grading.js
// THE single source of truth for answer validation. One copy for every module.
// This kills the per-module drift you spotted (some used Math.abs, some used
// bounds, some gated on `rounding`, some on Number.isInteger).
//
// Behavior here is basic-methods' validateAnswer, made canonical:
//   - ratio answers ("1:1000") compared as strings, with a format hint
//   - if question.rounding === true: tolerance ±1 for integers, ±0.01 for decimals
//   - otherwise: strict equality
//
// `feedbackMessage` is optional and only set for invalid input / wrong format.

// Should an answer be treated as a number? Only if it's a number or a string of
// purely numeric characters (digits, decimal point, sign). A string like "5'5\""
// or "Male" is NOT numeric — it's graded as text and rendered in a text input.
// (Matches the old per-module createInput regex; intentionally stricter than
// parseFloat, which would accept the leading digits of "5'5\"".)
export function isNumericAnswer(answer) {
  if (typeof answer === 'number') return true;
  if (typeof answer !== 'string') return false;
  return answer.trim() !== '' && !/[^0-9.\-]/.test(answer);
}

export function validateAnswer(userAnswerString, correctAnswer, question = {}) {
  if (typeof correctAnswer === 'string' && correctAnswer.includes(':')) {
    const isCorrect = userAnswerString === correctAnswer;
    if (!isCorrect && !userAnswerString.includes(':')) {
      return {
        isCorrect: false,
        feedbackMessage: 'Your answer should be in a ratio format (e.g., 1:1000).',
      };
    }
    return { isCorrect };
  }

  // Non-numeric text answers (e.g. "Male"/"Female", "5'5\"") are compared as
  // case-insensitive, trimmed strings.
  if (typeof correctAnswer === 'string' && !isNumericAnswer(correctAnswer)) {
    const isCorrect = userAnswerString.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
    return { isCorrect };
  }

  const userAnswerFloat = parseFloat(userAnswerString);
  if (Number.isNaN(userAnswerFloat)) {
    return { isCorrect: false, feedbackMessage: 'Please enter a valid number.' };
  }

  let isCorrect;
  if (question.rounding === true) {
    const correctAnswerFloat = parseFloat(correctAnswer);
    const tolerance = Number.isInteger(correctAnswerFloat) ? 1 : 0.01;
    isCorrect =
      userAnswerFloat >= correctAnswerFloat - tolerance &&
      userAnswerFloat <= correctAnswerFloat + tolerance;
  } else {
    // Strict — but float-safe instead of the old raw === comparison.
    isCorrect = Math.abs(userAnswerFloat - parseFloat(correctAnswer)) < 1e-9;
  }
  return { isCorrect };
}
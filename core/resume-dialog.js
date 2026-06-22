// core/resume-dialog.js
// Shared "resume your progress?" modal. One copy for every module.
// (Was: the showResumeDialog2 function inside basic-methods/script.js.)

export function showResumeDialog(savedData, onStartFresh, onResume) {
  const overlay = document.createElement('div');
  overlay.className = 'resume-overlay';

  const dialog = document.createElement('div');
  dialog.className = 'resume-dialog';

  const heading = document.createElement('h2');
  heading.textContent = 'Resume Your Progress?';

  const message = document.createElement('p');
  const completed = savedData.completedQuestions.length;
  const total = savedData.quizQuestions.length;
  const percent = Math.round((completed / total) * 100);
  const date = new Date(savedData.timestamp);
  const formatted = `${date.toLocaleDateString()} at ${date.toLocaleTimeString()}`;
  const stepCount = (savedData.completedSteps && savedData.completedSteps.length) || 0;
  const stepNote = stepCount > 0
    ? `<br>You also have <strong>${stepCount} step${stepCount === 1 ? '' : 's'}</strong> completed in your current question.`
    : '';
  message.innerHTML = `
    You have a previous session where you completed <strong>${completed} of ${total} questions</strong> (${percent}%).${stepNote}<br>
    Session from: ${formatted}<br><br>
    Would you like to resume where you left off or start a new session?
  `;

  const buttons = document.createElement('div');
  buttons.className = 'resume-button-container';

  const resumeBtn = document.createElement('button');
  resumeBtn.className = 'button-accent';
  resumeBtn.textContent = 'Resume Progress';
  resumeBtn.addEventListener('click', () => {
    document.body.removeChild(overlay);
    if (onResume) onResume();
  });

  const newBtn = document.createElement('button');
  newBtn.className = 'button-secondary';
  newBtn.textContent = 'Start New Session';
  newBtn.addEventListener('click', () => {
    document.body.removeChild(overlay);
    if (onStartFresh) onStartFresh();
  });

  buttons.appendChild(resumeBtn);
  buttons.appendChild(newBtn);
  dialog.appendChild(heading);
  dialog.appendChild(message);
  dialog.appendChild(buttons);
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);
}
document.addEventListener('DOMContentLoaded', function() {
    // Hide game over and start screens initially
    document.getElementById('game-over').style.display = 'none';
    document.getElementById('start-game').style.display = 'none';
    
    // Game configuration
    const config = {
      initialLives: 5,
      initialRisingSpeed: 1.2,
      speedIncreasePerLevel: 0.3,
      levelUpScore: 5,
      optionsPerQuestion: 4,
      optionWidth: 120,
      risingInterval: 16, // ~60fps
      newOptionInterval: 1800, // ms between new rising options
      questionChangeDelay: 1000, // ms to wait before changing question
      balloonColors: [
        '#FF5252', '#FF4081', '#E040FB', '#CCCCFF', 
        '#536DFE', '#448AFF', '#40C4FF', '#93FFE8', 
        '#F433FF', '#69F0AE', '#FA8072', '#FDD7E4',
        '#FFFF00', '#FFD740', '#FFAB40', '#FF6E40'
      ]
    };
    
    // Game state
    let score = 0;
    let lives = config.initialLives;
    let level = 1;
    let risingSpeed = config.initialRisingSpeed;
    let risingOptions = [];
    let activeQuestion = null;
    let isGameOver = false;
    let risingIntervalId = null;
    let newOptionIntervalId = null;
    let questionsCompleted = 0;
    let questionsRemaining = 0;
    let containerHeight, containerWidth, questionHeight;
    let optionsSinceLastCorrect = 0; // Track options since last correct answer
    let usedQuestions = []; // Track which questions have been used
    let selectedDifficulty = 47; // Default to full list
    
    // Update dimensions
    function updateDimensions() {
      containerHeight = document.getElementById('game-card').clientHeight;
      containerWidth = document.getElementById('game-card').clientWidth;
      questionHeight = document.getElementById('question-container').offsetHeight;
    }
    
    // Call once to initialize
    updateDimensions();
    
    // Load questions from JSON file
    let questions = [];
    
    fetch('abbreviation.json')
      .then(response => response.json())
      .then(data => {
        questions = data;
        // Get the difficulty selector element
        const difficultySelector = document.getElementById('difficulty');
        
        // Set initial value based on number of questions
        if (questions.length <= 20) {
          difficultySelector.value = questions.length;
          difficultySelector.disabled = true;
          selectedDifficulty = questions.length;
        }
        
        // Set initial display value
        questionsRemaining = selectedDifficulty;
        questionsRemainingElement.textContent = questionsRemaining;
        
        // Add change event listener
        difficultySelector.addEventListener('change', function() {
          selectedDifficulty = parseInt(this.value);
          // Update the questions remaining display
          questionsRemaining = selectedDifficulty;
          questionsRemainingElement.textContent = questionsRemaining;
          // Reset progress bar
          questionsCompleted = 0;
          questionsCompletedElement.textContent = questionsCompleted;
          updateProgressBar();
        });
        
        // Make start screen visible once questions are loaded
        document.getElementById('start-game').style.display = 'flex';
        // Ensure game over screen is hidden
        document.getElementById('game-over').style.display = 'none';
      })
      .catch(error => {
        console.error('Error loading questions:', error);
        // Display error message to user
        document.getElementById('question-text').textContent = 'Error loading questions. Please refresh the page.';
      });
    
    // Game UI elements
    const scoreElement = document.getElementById('score');
    const heartsDisplay = document.getElementById('hearts-display');
    const levelElement = document.getElementById('level');
    const questionText = document.getElementById('question-text');
    const gameOverScreen = document.getElementById('game-over');
    const startGameScreen = document.getElementById('start-game');
    const victoryScreen = document.getElementById('victory-screen');
    const finalScoreElement = document.getElementById('final-score');
    const victoryScoreElement = document.getElementById('victory-score');
    const victoryQuestionsElement = document.getElementById('victory-questions-count');
    const lastCorrectAnswerElement = document.getElementById('last-correct-answer');
    const restartButton = document.getElementById('restart-button');
    const victoryRestartButton = document.getElementById('victory-restart-button');
    const startButton = document.getElementById('start-button');
    const progressBar = document.getElementById('progressBar');
    const questionsCompletedElement = document.getElementById('questionsCompleted');
    const questionsRemainingElement = document.getElementById('questionsRemaining');
    
    // Hide game elements initially
    document.getElementById('question-container').style.opacity = '0';
    document.getElementById('score-container').style.opacity = '0';
    document.getElementById('level-indicator').style.opacity = '0';
    document.getElementById('lives-container').style.opacity = '0';
    
    // Create decorative clouds
    function createClouds() {
      const cloudCount = 5;
      for (let i = 0; i < cloudCount; i++) {
        createCloud();
      }
    }
    
    function createCloud() {
      const cloud = document.createElement('div');
      cloud.className = 'cloud';
      
      // Random size
      const size = 40 + Math.random() * 80;
      cloud.style.width = size + 'px';
      cloud.style.height = size/2 + 'px';
      
      // Random position
      const posX = Math.random() * containerWidth;
      const posY = Math.random() * containerHeight * 0.6 + questionHeight;
      cloud.style.left = posX + 'px';
      cloud.style.top = posY + 'px';
      
      // Set animation
      const duration = 60 + Math.random() * 120;
      cloud.style.animationDuration = duration + 's';
      
      // Random starting position for animation
      const startPos = Math.random() * 100;
      cloud.style.animationDelay = -startPos + 's';
      
      document.getElementById('game-card').appendChild(cloud);
    }
    
    // Define cloud animation
    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
      @keyframes floatCloud {
        0% { left: -150px; }
        100% { left: ${containerWidth + 150}px; }
      }
    `;
    document.head.appendChild(styleSheet);
    
    // Update hearts display
    function updateHeartsDisplay() {
      heartsDisplay.innerHTML = '❤️'.repeat(lives);
    }
    
    // Initialize the game
    function initGame() {
      // Hide start screen and other screens
      startGameScreen.style.display = 'none';
      gameOverScreen.style.display = 'none';
      victoryScreen.style.display = 'none';
      
      // Show game elements
      document.getElementById('question-container').style.opacity = '1';
      document.getElementById('score-container').style.opacity = '1';
      document.getElementById('level-indicator').style.opacity = '1';
      document.getElementById('lives-container').style.opacity = '1';
      
      score = 0;
      lives = config.initialLives;
      level = 1;
      risingSpeed = config.initialRisingSpeed;
      risingOptions = [];
      isGameOver = false;
      questionsCompleted = 0;
      questionsRemaining = selectedDifficulty;
      usedQuestions = []; // Reset used questions array
      
      // Update UI
      scoreElement.textContent = score;
      updateHeartsDisplay();
      levelElement.textContent = level;
      gameOverScreen.style.display = 'none';
      questionsCompletedElement.textContent = questionsCompleted;
      questionsRemainingElement.textContent = questionsRemaining;
      updateProgressBar();
      
      // Clear any existing options
      const existingOptions = document.querySelectorAll('.balloon');
      existingOptions.forEach(option => option.remove());
      
      // Clear any existing clouds
      const existingClouds = document.querySelectorAll('.cloud');
      existingClouds.forEach(cloud => cloud.remove());
      
      // Select first question
      selectRandomQuestion();
      
      // Create decorative clouds
      updateDimensions();
      createClouds();
      
      // Start the game loops
      risingIntervalId = setInterval(updateRisingOptions, config.risingInterval);
      newOptionIntervalId = setInterval(createNewOption, config.newOptionInterval);
    }
    
    // Select a random question from the database
    function selectRandomQuestion() {
      // If we've used all questions, reset the used questions array
      if (usedQuestions.length >= questions.length) {
        usedQuestions = [];
      }
      
      // Get available questions (ones that haven't been used)
      const availableQuestions = questions.filter((_, index) => !usedQuestions.includes(index));
      
      // Select a random question from available ones
      const randomIndex = Math.floor(Math.random() * availableQuestions.length);
      const selectedQuestionIndex = questions.indexOf(availableQuestions[randomIndex]);
      
      // Mark this question as used
      usedQuestions.push(selectedQuestionIndex);
      
      // Set the active question
      activeQuestion = questions[selectedQuestionIndex];
      questionText.textContent = activeQuestion.text;
    }

    // Update progress bar
    function updateProgressBar() {
      const progressPercentage = (questionsCompleted / selectedDifficulty) * 100;
      progressBar.style.width = progressPercentage + '%';
    }
    
    // Create a new rising balloon option
    function createNewOption() {
      if (isGameOver) return;
      
      let optionText;
      
      // Force correct answer if we've had 4 incorrect options
      if (optionsSinceLastCorrect >= 4) {
        optionText = activeQuestion.correctAnswer;
        optionsSinceLastCorrect = 0;
      } else {
        // Choose a random option from the active question
        const randomIndex = Math.floor(Math.random() * activeQuestion.options.length);
        optionText = activeQuestion.options[randomIndex];
        
        // If we got the correct answer by chance, reset the counter
        if (optionText === activeQuestion.correctAnswer) {
          optionsSinceLastCorrect = 0;
        } else {
          optionsSinceLastCorrect++;
        }
      }
      
      // Create balloon element
      const balloon = document.createElement('div');
      balloon.className = 'balloon';
      
      // Create balloon parts
      const balloonBody = document.createElement('div');
      balloonBody.className = 'balloon-body';
      balloonBody.textContent = optionText;
      
      // Choose random balloon color
      const colorIndex = Math.floor(Math.random() * config.balloonColors.length);
      balloonBody.style.backgroundColor = config.balloonColors[colorIndex];
      
      // Create balloon string
      const balloonString = document.createElement('div');
      balloonString.className = 'balloon-string';
      const stringHeight = 30 + Math.floor(Math.random() * 20);
      balloonString.style.height = stringHeight + 'px';
      
      // Assemble balloon
      balloon.appendChild(balloonBody);
      balloon.appendChild(balloonString);
      
      // Set initial position (random x position from bottom of screen)
      const maxX = containerWidth - config.optionWidth;
      const randomX = Math.random() * maxX;
      balloon.style.left = randomX + 'px';
      balloon.style.bottom = '-150px'; // Start below the screen
      
      // Add to game container
      document.getElementById('game-card').appendChild(balloon);
      
      // Add click handler
      balloon.addEventListener('click', function() {
        handleOptionClick(this);
      });
      
      // Add to tracking array
      risingOptions.push({
        element: balloon,
        y: -150, // Starting y position (relative to bottom)
        x: randomX,
        text: optionText,
        stringHeight: stringHeight
      });
    }
    
    // Update positions of all rising options
    function updateRisingOptions() {
      if (isGameOver) return;
      
      // Update dimension in case of resize
      updateDimensions();
      
      // Update position of each option
      for (let i = risingOptions.length - 1; i >= 0; i--) {
        const option = risingOptions[i];
        option.y += risingSpeed;
        option.element.style.bottom = option.y + 'px';
        
        // Check if option has risen to the top
        if (option.y > containerHeight - questionHeight) {
          // Check if missed the correct answer
          if (option.text === activeQuestion.correctAnswer) {
            loseLife();
            markOption(option.element, false);
          }
          
          // Remove option
          setTimeout(() => {
            if (option.element && option.element.parentNode) {
              option.element.parentNode.removeChild(option.element);
            }
          }, 300);
          
          risingOptions.splice(i, 1);
        }
      }
    }
    
    // Handle option click
    function handleOptionClick(element) {
      if (isGameOver) return;
      
      // Find which option was clicked
      const clickedIndex = risingOptions.findIndex(option => option.element === element);
      if (clickedIndex === -1) return;
      
      const clickedOption = risingOptions[clickedIndex];
      const clickedText = clickedOption.text;
      const isCorrect = clickedText === activeQuestion.correctAnswer;
      
      if (isCorrect) {
        increaseScore();
        markOption(element, true);
        
        // Update progress tracking
        questionsCompleted++;
        questionsRemaining--;
        questionsCompletedElement.textContent = questionsCompleted;
        questionsRemainingElement.textContent = questionsRemaining;
        updateProgressBar();
        
        // Remove from rising options array
        risingOptions.splice(clickedIndex, 1);
        
        // Check if all questions are completed
        if (questionsCompleted >= selectedDifficulty) {
          showVictoryScreen();
          return;
        }
        
        // Change question after delay
        setTimeout(selectRandomQuestion, config.questionChangeDelay);
        
      } else {
        loseLife();
        markOption(element, false);
        
        // Remove from rising options array
        risingOptions.splice(clickedIndex, 1);
      }
    }
    
    // Apply visual effect to an option after it's clicked
    function markOption(element, isCorrect) {
      if (isCorrect) {
        element.classList.add('correct-animation');
      } else {
        element.classList.add('incorrect-animation');
      }
      
      // Remove after animation
      setTimeout(() => {
        if (element && element.parentNode) {
          element.parentNode.removeChild(element);
        }
      }, 500);
    }
    
    // Increase score and check for level up
    function increaseScore() {
      score++;
      scoreElement.textContent = score;
      
      // Check for level up
      if (score % config.levelUpScore === 0) {
        levelUp();
      }
    }
    
    // Level up increases speed
    function levelUp() {
      level++;
      levelElement.textContent = level;
      risingSpeed += config.speedIncreasePerLevel;
      
      // Visual indicator for level up
      levelElement.parentElement.classList.add('level-up');
      setTimeout(() => {
        levelElement.parentElement.classList.remove('level-up');
      }, 1000);
    }
    
    // Lose a life and check for game over
    function loseLife() {
      lives--;
      updateHeartsDisplay();
      
      if (lives <= 0) {
        gameOver();
      }
    }
    
    // End the game due to losing all lives
    function gameOver() {
      isGameOver = true;
      clearInterval(risingIntervalId);
      clearInterval(newOptionIntervalId);
      
      finalScoreElement.textContent = score;
      lastCorrectAnswerElement.textContent = activeQuestion.correctAnswer;
      gameOverScreen.style.display = 'flex';
    }
    
    // Show victory screen when all questions are completed
    function showVictoryScreen() {
      isGameOver = true;
      clearInterval(risingIntervalId);
      clearInterval(newOptionIntervalId);
      
      victoryScoreElement.textContent = score;
      victoryQuestionsElement.textContent = selectedDifficulty;
      victoryScreen.style.display = 'flex';
    }
    
    // Event listener for restart button (game over)
    restartButton.addEventListener('click', initGame);
    
    // Event listener for restart button (victory)
    victoryRestartButton.addEventListener('click', initGame);
    
    // Event listener for start button
    startButton.addEventListener('click', initGame);
    
    // Adjust container size on window resize
    window.addEventListener('resize', function() {
      updateDimensions();
      
      // Update cloud animation
      document.head.removeChild(styleSheet);
      const newStyleSheet = document.createElement('style');
      newStyleSheet.textContent = `
        @keyframes floatCloud {
          0% { left: -150px; }
          100% { left: ${containerWidth + 150}px; }
        }
      `;
      document.head.appendChild(newStyleSheet);
    });
});
document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const movesElement = document.getElementById('moves');
    const progressBar = document.getElementById('progressBar');
    const questionsCompletedElement = document.getElementById('questionsCompleted');
    const questionsRemainingElement = document.getElementById('questionsRemaining');
    const startGameScreen = document.getElementById('start-game');
    const gameOverScreen = document.getElementById('game-over');
    const startButton = document.getElementById('start-button');
    const restartButton = document.getElementById('restart-button');
    const finalMovesElement = document.getElementById('final-moves');

    // Game configuration
    const GRID_COLS = 5;
    const GRID_ROWS = 4;
    const TOTAL_PAIRS = (GRID_COLS * GRID_ROWS) / 2;
    const CARD_WIDTH = 120;
    const CARD_HEIGHT = 80;
    const CARD_MARGIN = 15;
    const WRONG_DISPLAY_DELAY = 500;

    // Adjust canvas size
    const startYValue = CARD_MARGIN * 3;
    canvas.width = GRID_COLS * (CARD_WIDTH + CARD_MARGIN) + CARD_MARGIN;
    canvas.height = startYValue + (GRID_ROWS * (CARD_HEIGHT + CARD_MARGIN)) + CARD_MARGIN;

    // Game state variables
    let moves = 0;
    let cards = [];
    let selectedCards = [];
    let matchedPairs = 0;
    let gameStarted = false;

    // Predefined list of allowed numbers
    const allowedNumbers = [
        // Numbers 1-10
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
        // Multiples of 5 from 15 to 100
        15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100
    ];

    // Colors
    const COLORS = {
        cardDefaultBg: '#FFFFFF',
        cardDefaultText: '#333333',
        cardSelectedBg: '#345A80',
        cardSelectedText: 'white',
        cardWrongBg: '#f8d7da',
        cardWrongText: '#DC3545',
        cardBorder: '#CCCCCC',
        cardMatchedFlashBg: '#28a745'
    };

    // Card drawing properties
    const CARD_BORDER_RADIUS = 8;
    const FLASH_DURATION = 400;

    // --- Utilities ---
    function generateRandomNumber() {
        // Pick a random number from the allowed list
        const randomIndex = Math.floor(Math.random() * allowedNumbers.length);
        return allowedNumbers[randomIndex];
    }

    function toRoman(num) {
        const romanMap = [
            [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'],
            [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'],
            [4, 'IV'], [1, 'I']
        ];
        let result = '';
        for (const [value, roman] of romanMap) {
            while (num >= value) {
                result += roman;
                num -= value;
            }
        }
        return result;
    }

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    function isPointInCard(x, y, card) {
        return x >= card.x && x <= card.x + CARD_WIDTH &&
               y >= card.y && y <= card.y + CARD_HEIGHT;
    }

    // --- Game Setup & State ---
    function setupGame() {
        const numbers = new Set();
        while (numbers.size < TOTAL_PAIRS) {
            const num = generateRandomNumber();
            // No need to check if num <= 100 anymore, as generator only produces valid numbers
            numbers.add(num);
        }

        cards = [];
        let idCounter = 0;
        numbers.forEach(number => {
            cards.push({ number, value: number.toString(), isNumber: true, x: 0, y: 0, matched: false, wrong: false, id: idCounter++ });
            cards.push({ number, value: toRoman(number), isNumber: false, x: 0, y: 0, matched: false, wrong: false, id: idCounter++ });
        });
        shuffleArray(cards);
        positionCards();
    }

    function positionCards() {
        const startX = CARD_MARGIN;
        const startY = startYValue; // Use calculated value
        cards.forEach((card, index) => {
            const row = Math.floor(index / GRID_COLS);
            const col = index % GRID_COLS;
            card.x = startX + col * (CARD_WIDTH + CARD_MARGIN);
            card.y = startY + row * (CARD_HEIGHT + CARD_MARGIN);
        });
    }
    
    function startGame() {
        resetUI();
        setupGame();
        selectedCards = [];
        gameStarted = true;
        startGameScreen.style.display = 'none';
        gameOverScreen.style.display = 'none';
        drawBoard();
    }

    function endGame() {
        gameStarted = false;
        finalMovesElement.textContent = moves;
        gameOverScreen.style.display = 'flex';
    }

    // --- Drawing ---
    function drawCard(card) {
        if (card.isFading) {
            return;
        }
        
        let bgColor = COLORS.cardDefaultBg;
        let textColor = COLORS.cardDefaultText;

        if (card.isFlashing) {
            bgColor = COLORS.cardMatchedFlashBg;
            textColor = 'white';
        } else if (card.wrong) {
            bgColor = COLORS.cardWrongBg;
            textColor = COLORS.cardWrongText;
        } else if (selectedCards.includes(card)) {
            bgColor = COLORS.cardSelectedBg;
            textColor = COLORS.cardSelectedText;
        }

        ctx.beginPath();
        ctx.fillStyle = bgColor;
        ctx.roundRect(card.x, card.y, CARD_WIDTH, CARD_HEIGHT, CARD_BORDER_RADIUS);
        ctx.fill();

        ctx.fillStyle = textColor;
        const fontSize = card.isNumber ? 24 : 20;
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(card.value, card.x + CARD_WIDTH / 2, card.y + CARD_HEIGHT / 2);
    }

    function drawBoard() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        cards.forEach(drawCard);
    }

    // --- Interaction & Logic ---
    function handleCanvasClick(event) {
        if (!gameStarted || selectedCards.length === 2) return;

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = (event.clientX - rect.left) * scaleX;
        const y = (event.clientY - rect.top) * scaleY;

        const clickedCard = cards.find(card => !card.matched && isPointInCard(x, y, card));

        if (clickedCard) {
            if (selectedCards.length === 1 && selectedCards[0].id === clickedCard.id) {
                return; // Prevent selecting the same card twice
            }

            selectedCards.push(clickedCard);

            if (selectedCards.length === 2) {
                incrementMoves();
                checkForMatch();
            }
            drawBoard();
        }
    }

    function checkForMatch() {
        const [card1, card2] = selectedCards;
        const isMatch = card1.number === card2.number && card1.isNumber !== card2.isNumber;

        if (isMatch) {
            card1.isFlashing = true;
            card2.isFlashing = true;
            drawBoard();
            selectedCards = [];

            setTimeout(() => {
                card1.isFading = true;
                card2.isFading = true;
                drawBoard();
                
                setTimeout(() => {
                    cards = cards.filter(card => card.id !== card1.id && card.id !== card2.id);
                    matchedPairs++;
                    updateProgress();
                    if (matchedPairs === TOTAL_PAIRS) {
                        setTimeout(endGame, 500);
                    }
                }, 50);

            }, FLASH_DURATION);

        } else {
            card1.wrong = true;
            card2.wrong = true;
            drawBoard();
            setTimeout(() => {
                const stillSelectedCard1 = cards.find(c => c.id === card1.id);
                const stillSelectedCard2 = cards.find(c => c.id === card2.id);
                if (stillSelectedCard1 && !stillSelectedCard1.isFlashing) stillSelectedCard1.wrong = false;
                if (stillSelectedCard2 && !stillSelectedCard2.isFlashing) stillSelectedCard2.wrong = false;
                selectedCards = [];
                drawBoard();
            }, WRONG_DISPLAY_DELAY);
        }
    }

    // --- UI Updates ---
    function incrementMoves() {
        moves++;
        movesElement.textContent = moves;
    }

    function updateProgress() {
        const progressPercentage = (matchedPairs / TOTAL_PAIRS) * 100;
        progressBar.style.width = `${progressPercentage}%`;
        questionsCompletedElement.textContent = matchedPairs;
        questionsRemainingElement.textContent = TOTAL_PAIRS - matchedPairs;
    }

    function resetUI() {
        moves = 0;
        matchedPairs = 0;
        movesElement.textContent = moves;
        questionsCompletedElement.textContent = '0';
        questionsRemainingElement.textContent = TOTAL_PAIRS;
        progressBar.style.width = '0%';
    }

    // --- Event Listeners ---
    startButton.addEventListener('click', startGame);
    restartButton.addEventListener('click', startGame);
    canvas.addEventListener('click', handleCanvasClick);

    // --- Initial Setup ---
    questionsRemainingElement.textContent = TOTAL_PAIRS;
}); 
// Game constants and state
const ROWS = 6;
const COLS = 7;
const TIME_LIMIT = 30;
const POWER_UP_COUNT = 2;


let board = Array(ROWS).fill().map(() => Array(COLS).fill(null)); //2d array with each rep. the game board.
let currentPlayer = "Red";
let blockedColumn = null;
let gameOver = false;

let scores = { Red: 0, Yellow: 0 };
let timer = null;
let audioContextInitialized = false;  //ensure audio context is initialized only once.

let timeLeft = TIME_LIMIT;
let level2Enabled = false;
let soundEnabled = true; // Flag to toggle sound effects.
let powerUps = {  // object that tracks the count of each power-up for each player.
    Red: {
        "extra-time": POWER_UP_COUNT,
        "block-column": POWER_UP_COUNT,
        "remove-block": POWER_UP_COUNT
    },
    Yellow: {
        "extra-time": POWER_UP_COUNT,
        "block-column": POWER_UP_COUNT,
        "remove-block": POWER_UP_COUNT
    }
};
let leaderboard = JSON.parse(localStorage.getItem('discBattleLeaderboard')) || [];
let isBlockingPhase = false;

// *DOM Element References
const boardElement = document.getElementById("board");
const messageElement = document.getElementById("message");
const resetButton = document.getElementById("reset");

const redScoreElement = document.getElementById("score-red");
const yellowScoreElement = document.getElementById("score-yellow");
const timerElement = document.getElementById("timer");
const level2Toggle = document.getElementById("level2-toggle");

const powerUpsContainer = document.getElementById("power-ups");
const extraTimeBtn = document.getElementById("extra-time");

const blockColumnBtn = document.getElementById("block-column");
const removeBlockBtn = document.getElementById("remove-block");

const soundToggle = document.getElementById("sound-toggle");

const themeToggle = document.getElementById("theme-toggle");
const leaderboardModal = document.getElementById("leaderboard-modal");

const gameResultMessage = document.getElementById("game-result-message");
const leaderboardList = document.getElementById("leaderboard-list");

const closeModalBtn = document.getElementById("close-modal");
const dropSound = document.getElementById("drop-sound");

const winSound = document.getElementById("win-sound");
const powerupSound = document.getElementById("powerup-sound");

const blockingPhaseElement = document.getElementById("blocking-phase");

//const redPlayer = { name: "Red", score: 0 }; // Player 1 
const blockMessageElement = document.getElementById("block-message");
const columnSelectorsElement = document.querySelector(".column-selectors"); //selecting class



function initGame() 
{
    board = Array(ROWS).fill().map(() => Array(COLS).fill(null));
    currentPlayer = "Red";
    blockedColumn = null;
    gameOver = false;
    timeLeft = TIME_LIMIT;
    isBlockingPhase = false;
    blockingPhaseElement.style.display = "none";
    
    if (level2Enabled) {
        powerUps = {
            Red: {
                "extra-time": POWER_UP_COUNT,
                "block-column": POWER_UP_COUNT,
                "remove-block": POWER_UP_COUNT
            },
            Yellow: {
                "extra-time": POWER_UP_COUNT,
                "block-column": POWER_UP_COUNT,
                "remove-block": POWER_UP_COUNT
            }
        };
    }
    // functions called at start of game.
    updateMessage();
    renderBoard();
    updateScores();
    startTimer();
    updatePowerUpButtons();
}

//function updateMessage()

// Audio initialization for browser
function initAudioContext() {
    if (audioContextInitialized) return;
    
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const buffer = ctx.createBuffer(1, 1, 22050);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
        audioContextInitialized = true;
    } catch (e) {
        console.error("Audio init failed:", e);
    }
}

// Play sound with safety checks
// initializes the audio context if needed, resets the sound to the start, and plays it.
// Catches and logs any errors.
function playSound(soundElement) {
    if (!soundEnabled) return;
    
try {
        initAudioContext();
        soundElement.currentTime = 0;
        soundElement.play().catch(e => console.log("Audio error:", e));
    } catch (e) {
        console.error("Playback failed:", e);
    }
}``



function updateScores() {
    redScoreElement.textContent = scores.Red;
    yellowScoreElement.textContent = scores.Yellow;
}

//function updateMessage() 
//    messageElement.textContent = message;
function updateMessage() {
    const playerNum = currentPlayer === "Red" ? "1" : "2";
    let message = `Player ${playerNum}'s Turn (${currentPlayer})`;
    if (blockedColumn !== null) message += ` | Column ${blockedColumn + 1} blocked`; // if blocked col. is not null
    messageElement.textContent = message;
}

// Handels all board work, resets it 
function renderBoard() {
    boardElement.innerHTML = "";
    
    // Column headers
    for (let col = 0; col < COLS; col++) {
        const header = document.createElement("div");
        header.className = "column-header";
        header.textContent = col + 1;
        
        header.style.gridColumn = col + 1;
        header.style.gridRow = 1;
        boardElement.appendChild(header);
    }
    
    // Game cells
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            const cell = document.createElement("div");
            cell.classList.add("cell"); // adds cell class to each div
            if (board[row][col]) cell.classList.add(board[row][col].toLowerCase());
            if (col === blockedColumn) cell.classList.add("blocked");
            cell.dataset.row = row;
            cell.dataset.col = col;
            cell.addEventListener("click", () => handleCellClick(col)); // add click event
            boardElement.appendChild(cell);
        }
    }
}


// Game logic
function handleCellClick(col) {
    if (gameOver || isBlockingPhase || col === blockedColumn) return;
    
    const row = getLowestEmptyRow(col); //gets the lowest row, defined later
    if (row === -1) return;
    
    playSound(dropSound);
    board[row][col] = currentPlayer;
    
    if (checkWin(row, col)) 
        {
        endGame(`Player ${currentPlayer === "Red" ? "1" : "2"} wins! 🎉`, currentPlayer);
        scores[currentPlayer]++;
        return;
    }
    
    if (checkDraw()) 
        {
        endGame("It's a draw!", "Draw");
        return;
    }
    
    switchPlayer(); //If win or draw, ends the game. Otherwise, switches players.
    renderBoard();
}

// to find lowest row.
function getLowestEmptyRow(col) {
    for (let row = ROWS - 1; row >= 0; row--) { //  Iterates from the bottom of the column upwards and returns the first empty row
        if (!board[row][col]) return row;
    }
    return -1; //Returns -1 if the column is full.
}

//checking win aftre the move prev i made
function checkWin(row, col) {
    const directions = [
        [0, 1], [1, 0], [1, 1], [1, -1]// hori,verti, two diagonal
    ];

    for (const [dr, dc] of directions) {
        let count = 1;
        count += countDirection(row, col, dr, dc);// decleared later
        count += countDirection(row, col, -dr, -dc);
        if (count >= 4) return true;
    }
    return false;
}
 //  Counts consecutive discs in one direction.
function countDirection(row, col, dr, dc) {
    let count = 0;
    let r = row + dr;
    let c = col + dc;
    
    while (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r][c] === currentPlayer) {
        count++;
        r += dr;
        c += dc;
    }
    return count;
}

function checkDraw() {
    return board.every(row => row.every(cell => cell !== null));
}

function switchPlayer() {
    clearInterval(timer);
    timeLeft = TIME_LIMIT;// resets the timer
    timerElement.textContent = `${timeLeft}s`;
    timerElement.classList.remove("warning"); //remove warning class from css
    currentPlayer = currentPlayer === "Red" ? "Yellow" : "Red";//  Changes `currentPlayer` to the opponent.
    startBlockingPhase();
}


function startBlockingPhase() // allows the current player to block oppo.
{
    isBlockingPhase = true;
    // currentPlayer is getting blocked
    const blockingPlayer = currentPlayer === "Red" ? "Yellow" : "Red";
    const playerNum = blockingPlayer === "Red" ? "1" : "2"; // player who selects block col.
    
    blockMessageElement.textContent = `Player ${playerNum}, select column to block for Player ${currentPlayer === "Red" ? "1" : "2"}`;
    blockingPhaseElement.style.display = "block";
    columnSelectorsElement.innerHTML = "";
    
    for (let col = 0; col < COLS; col++) {
        const button = document.createElement("button");
        button.className = "column-btn";
        if (board[0][col] !== null) {
            button.classList.add("blocked");
            button.disabled = true;
        }

        button.textContent = col + 1;
        button.dataset.col = col;
        button.addEventListener("click", () => selectBlockColumn(col));
        columnSelectorsElement.appendChild(button);
    }
}

function selectBlockColumn(col) { // Sets the blocked column and exits the blocking phase.
    blockedColumn = col;
    isBlockingPhase = false;
    blockingPhaseElement.style.display = "none";
    startTimer();
    updateMessage();
    renderBoard();
}


function startTimer() 

{
    clearInterval(timer);
    timeLeft = TIME_LIMIT;
    timerElement.textContent = `${timeLeft}s`;
    timerElement.classList.remove("warning");
    
    timer = setInterval(() => {
        timeLeft--;
        timerElement.textContent = `${timeLeft}s`;
        
        if (timeLeft <= 10) timerElement.classList.add("warning"); //blinking starts for timwer less than 10
        if (timeLeft <= 0) {
            clearInterval(timer);
            const opponent = currentPlayer === "Red" ? "Yellow" : "Red";
            endGame(`Time's up! Player ${opponent === "Red" ? "1" : "2"} wins!🥇`, opponent); // selects the opponent's opponent menas player who plyed just before
            scores[opponent]++;
        }
    }, 1000); // 1sec interval
}



function endGame(message, winner) { // Ends the game and updates the leaderboard.
    gameOver = true;

    clearInterval(timer);
    messageElement.textContent = message;
    
    if (soundEnabled && message.includes("wins")) {
        playSound(winSound);
    }
    
    leaderboard.push({
        winner: winner,
        date: new Date().toLocaleString(),
        player1Score: scores.Red,
        player2Score: scores.Yellow
    });
    
    if (leaderboard.length > 10) {
        leaderboard = leaderboard.slice(leaderboard.length - 10);
    }
    
    localStorage.setItem('discBattleLeaderboard', JSON.stringify(leaderboard));
    setTimeout(showLeaderboard, 1000);
}

function showLeaderboard()
 {
    gameResultMessage.textContent = messageElement.textContent;
    leaderboardList.innerHTML = "";
    
    leaderboard.slice().reverse().forEach(result => {
        const li = document.createElement("li");
        const winnerText = result.winner === "Draw" ? "Draw" : 
                         result.winner === "Red" ? "Player 1 (Red)" : "Player 2 (Yellow)";
        li.innerHTML = `<span>${result.date}</span><span>${winnerText}</span>`;
        leaderboardList.appendChild(li); // Add this list in the leaderboard
    });
    
    leaderboardModal.style.display = "flex";
}

function updatePowerUpButtons() {
    if (!level2Enabled) return;
    
    const playerPowerUps = powerUps[currentPlayer];
    extraTimeBtn.disabled = playerPowerUps["extra-time"] <= 0;
    blockColumnBtn.disabled = playerPowerUps["block-column"] <= 0;
    removeBlockBtn.disabled = playerPowerUps["remove-block"] <= 0 || blockedColumn === null;
    
    extraTimeBtn.textContent = `Extra Time (${playerPowerUps["extra-time"]})`;
    blockColumnBtn.textContent = `Block Column (${playerPowerUps["block-column"]})`;
    removeBlockBtn.textContent = `Remove Block (${playerPowerUps["remove-block"]})`;
}



function usePowerUp(type) {
    if (gameOver || isBlockingPhase) return;
    
    const playerPowerUps = powerUps[currentPlayer];
    if (playerPowerUps[type] <= 0) return;
    
    switch (type) {
        case "extra-time":
            timeLeft += 10;
            timerElement.textContent = `${timeLeft}s`;
            break;
        case "block-column":
            const availableColumns = [];
            for (let col = 0; col < COLS; col++) {
                if (col !== blockedColumn && board[0][col] === null) {
                    availableColumns.push(col);
                }
            }
            if (availableColumns.length > 0) {
                blockedColumn = availableColumns[Math.floor(Math.random() * availableColumns.length)];
            }
            break;
        case "remove-block":
            blockedColumn = null;
            break;
    }
    
    playerPowerUps[type]--;
    updateMessage();
    updatePowerUpButtons();

    renderBoard();
    playSound(powerupSound);
}

// UI Controls
function toggleLevel2Features() {
    level2Enabled = !level2Enabled;
    level2Toggle.textContent = level2Enabled ? 
        "Disable Level 2 Features" : "Enable Level 2 Features";
    powerUpsContainer.style.display = level2Enabled ? "block" : "none";
    
    if (level2Enabled) {
        powerUps = {
            Red: {
                "extra-time": POWER_UP_COUNT,
                "block-column": POWER_UP_COUNT,
                "remove-block": POWER_UP_COUNT
            },
            Yellow: {
                "extra-time": POWER_UP_COUNT,
                "block-column": POWER_UP_COUNT,
                "remove-block": POWER_UP_COUNT
            }
        };
        updatePowerUpButtons();
    }
}


function toggleSound() {
    soundEnabled = !soundEnabled;
    soundToggle.textContent = soundEnabled ? "🔊 Sound On" : "🔇 Sound Off";
}


function toggleTheme() {
    document.body.classList.toggle("dark-theme");
    themeToggle.textContent = document.body.classList.contains("dark-theme") ? 
        "☀️ Light Theme" : "🌙 Dark Theme";
}

// Event listeners
resetButton.addEventListener("click", initGame);
level2Toggle.addEventListener("click", toggleLevel2Features);
extraTimeBtn.addEventListener("click", () => usePowerUp("extra-time"));
//blockColumnBtn.addEventListener("click", () =>
blockColumnBtn.addEventListener("click", () => usePowerUp("block-column"));
removeBlockBtn.addEventListener("click", () => usePowerUp("remove-block"));
soundToggle.addEventListener("click", toggleSound);

themeToggle.addEventListener("click", toggleTheme);
closeModalBtn.addEventListener("click", () => {
    leaderboardModal.style.display = "none";
    //leaderboardModal.classList.remove("show");
    initGame();
});

initGame();

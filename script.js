let score = 0;
let lives = 3;
let time = 60;
let currentAnswer = 0;
let timerInterval = null;
// Elements, connecting script.js to index.html
const questionElement = document.getElementById("question");
const answerInput = document.getElementById("answer");
const scoreEl = document.getElementById("score");
const livesEl = document.getElementById("lives");
const timerEl = document.getElementById("timer");
const feedbackEl = document.getElementById("feedback");
const startBtn = document.getElementById("start-btn");
const passBtn = document.getElementById("pass-btn");

function updateHearts() {
    livesEl.textContent = "♥".repeat(lives);
}

// Generate a random math question
function generateQuestion() {
    const operations = ["+", "-", "*", "/"];
    //Select two numbers ranging from 1 to 20
    const num1 = Math.floor(Math.random() * 20) + 1;
    const num2 = Math.floor(Math.random() * 20) + 1;
    const op = operations[Math.floor(Math.random() * operations.length)];

    if(op === "+") {
        currentAnswer = Math.floor(num1 + num2);
        questionElement.textContent = `${num1} + ${num2}`;
    } else if(op === "-") {
        currentAnswer = num1 - num2;
        questionElement.textContent = `${num1} - ${num2}`;
    } else if(op === "*") {
        currentAnswer = num1 * num2;
        questionElement.textContent = `${num1} x ${num2}`;
    } else {
        const rawAnswer = num1 / num2;
        currentAnswer = Math.round(rawAnswer * 10) / 10;
        questionElement.textContent = `${num1} / ${num2}`;
    }
}

// Check the answer
function checkAnswer() {
    //Reads the player's input
    const userAnswer = parseFloat(answerInput.value);
    //Rounds the player's input to the tenth decimal for division questions
    const roundedUser = Math.round(userAnswer * 10) / 10;

    if(roundedUser === currentAnswer) {
        score++;
        scoreEl.textContent = `Score: ${score}`;
        feedbackEl.textContent = "✓";
        feedbackEl.className = "correct";
    } else {
        lives--;
        updateHearts();
        feedbackEl.textContent = `✗ ${currentAnswer}`;
        feedbackEl.className = "wrong";
    }
    //Reset player input field
    answerInput.value = "";

    //Next question or end game?
    if(lives <= 0) {
        endGame();
    } else {
        generateQuestion();
    }
}

// Timer mode
function startGame() {
    score = 0;
    lives = 3;
    time = 60;
    scoreEl.textContent = `Score: ${score}`;
    updateHearts();
    timerEl.textContent = `Time: ${time}`;
    timerEl.classList.remove("urgent");
    feedbackEl.textContent = "";
    feedbackEl.className = "";
    generateQuestion();
    answerInput.disabled = false;
    passBtn.disabled = false;
    answerInput.focus();

    //Prevents timer from a previous game, overlapping into a new game
    if(timerInterval) clearInterval(timerInterval);
    //Starts a new timer
    timerInterval = setInterval(() => {
        time--;
        timerEl.textContent = `Time: ${time}`;
        if(time <= 10) {
            timerEl.classList.add("urgent");
        }
        if(time <= 0) {
            endGame();
        }
        //1000 = 1000 millisecond or 1 second
    }, 1000);
}

// End the game
function endGame() {
    //Resets the timer
    clearInterval(timerInterval);
    questionElement.textContent = `Game Over! Final Score: ${score}`;
    //Resets player text field
    feedbackEl.textContent = "";
    feedbackEl.className = "";
    answerInput.disabled = true;
    passBtn.disabled = true;
}

//If player presses Enter, check answer
answerInput.addEventListener("keydown", (e) => {
    if(e.key === "Enter") {
        checkAnswer();
    }
});

//Pass skips to next question and costs a life
passBtn.addEventListener("click", () => {
    lives--;
    updateHearts();
    feedbackEl.textContent = `✗ ${currentAnswer}`;
    feedbackEl.className = "wrong";
    answerInput.value = "";
    if(lives <= 0) {
        endGame();
    } else {
        generateQuestion();
    }
});


//Start game on button click
startBtn.addEventListener("click", startGame);

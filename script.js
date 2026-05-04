// difficulty presets
const DIFF = {
    easy:   { time: 60, lives: 3, range: 25 },
    normal: { time: 60, lives: 3, range: 50 },
    hard:   { time: 60, lives: 3, range: 100 }
};

// game variables
let score = 0;
let lives = 3;
let timeLeft = 60;
let currentAnswer = 0;
let timerInterval = null;

let settings = {
    difficulty: 'normal',
    customTime: 60,
    customLives: 3,
    ops: { add: true, sub: true, mul: true, div: true }
};

let scoreHistory = [];
let highScore = 0;

// page elements
const homeScreen = document.getElementById('home-screen');
const settingsScreen = document.getElementById('settings-screen');
const gameScreen = document.getElementById('game-screen');
const endScreen = document.getElementById('end-screen');

const homeHighScore = document.getElementById('home-high-score');
const scoreHistoryEl = document.getElementById('score-history');
const playBtn = document.getElementById('play-btn');
const settingsBtn = document.getElementById('settings-btn');

const diffGroup = document.getElementById('diff-group');
const customFields = document.getElementById('custom-fields');
const customTimeIn = document.getElementById('custom-time');
const customLivesIn = document.getElementById('custom-lives');
const opAdd = document.getElementById('op-add');
const opSub = document.getElementById('op-sub');
const opMul = document.getElementById('op-mul');
const opDiv = document.getElementById('op-div');
const lblAdd = document.getElementById('lbl-add');
const lblSub = document.getElementById('lbl-sub');
const lblMul = document.getElementById('lbl-mul');
const lblDiv = document.getElementById('lbl-div');
const backBtn = document.getElementById('back-btn');

const timerEl = document.getElementById('timer');
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const questionEl = document.getElementById('question');
const feedbackEl = document.getElementById('feedback');
const answerInput = document.getElementById('answer');
const submitBtn = document.getElementById('submit-btn');
const passBtn = document.getElementById('pass-btn');
const quitBtn = document.getElementById('quit-btn');

const finalScoreEl = document.getElementById('final-score');
const endHighScoreEl = document.getElementById('end-high-score');
const newRecordEl = document.getElementById('new-record');
const replayBtn = document.getElementById('replay-btn');
const menuBtn = document.getElementById('menu-btn');

// save/load scores
function loadHighScore() {
    try {
        const raw = localStorage.getItem('flashmath_v2');
        if (!raw) return;
        const d = JSON.parse(raw);
        highScore = d.highScore || 0;
        scoreHistory = d.scoreHistory || [];
        if (d.settings) {
            settings = { ...settings, ...d.settings };
            if (d.settings.ops) settings.ops = { ...settings.ops, ...d.settings.ops };
        }
    } catch (e) {}
}

function saveToStorage() {
    try {
        localStorage.setItem('flashmath_v2', JSON.stringify({ highScore, scoreHistory, settings }));
    } catch (e) {}
}

// switch between screens
function show(screen) {
    [homeScreen, settingsScreen, gameScreen, endScreen]
        .forEach(s => s.classList.remove('active'));
    screen.classList.add('active');
}

// home screen
function refreshHome() {
    homeHighScore.textContent = highScore;
    scoreHistoryEl.innerHTML = '';

    if (!scoreHistory.length) {
        scoreHistoryEl.innerHTML = '<span class="no-scores">No games yet — play one!</span>';
        return;
    }

    // only show last 5 games
    const display = scoreHistory.slice(-5).reverse();
    display.forEach(s => {
        const chip = document.createElement('span');
        chip.className = 'score-chip' + (s === highScore ? ' best' : '');
        chip.textContent = s;
        scoreHistoryEl.appendChild(chip);
    });
}

// settings screen
function refreshSettingsUI() {
    diffGroup.querySelectorAll('.pill').forEach(p => {
        p.classList.toggle('pill-active', p.dataset.diff === settings.difficulty);
    });
    customFields.classList.toggle('visible', settings.difficulty === 'custom');
    customTimeIn.value = settings.customTime;
    customLivesIn.value = settings.customLives;
    opAdd.checked = settings.ops.add;
    opSub.checked = settings.ops.sub;
    opMul.checked = settings.ops.mul;
    opDiv.checked = settings.ops.div;
    syncOpLabels();
}

function syncOpLabels() {
    [[opAdd, lblAdd], [opSub, lblSub], [opMul, lblMul], [opDiv, lblDiv]]
        .forEach(([cb, lbl]) => lbl.classList.toggle('checked', cb.checked));
}

function readSettingsForm() {
    settings.customTime = Math.max(10, parseInt(customTimeIn.value) || 60);
    settings.customLives = Math.max(1, parseInt(customLivesIn.value) || 3);
    settings.ops.add = opAdd.checked;
    settings.ops.sub = opSub.checked;
    settings.ops.mul = opMul.checked;
    settings.ops.div = opDiv.checked;
    if (!Object.values(settings.ops).some(Boolean)) {
        settings.ops.add = true;
        opAdd.checked = true;
        syncOpLabels();
    }
    saveToStorage();
}

// sound effects
let audioCtx = null;

function playBeep(type) {
    try {
        if (!audioCtx) audioCtx = new AudioContext();
        var osc = audioCtx.createOscillator();
        var gainNode = audioCtx.createGain();
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        if (type === 'correct') osc.frequency.value = 600;
        else if (type === 'wrong') osc.frequency.value = 200;
        else if (type === 'over') osc.frequency.value = 150;
        else osc.frequency.value = 440;

        gainNode.gain.value = 0.2;
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
    } catch(e) {}
}

// animations
function animate(el, cls) {
    el.classList.remove('anim-pop', 'anim-shake');
    setTimeout(function() {
        el.classList.add(cls);
    }, 10);
}

function triggerFeedbackAnim(correct) {
    var cls = correct ? 'pop-anim' : 'shake-anim';
    feedbackEl.classList.remove('pop-anim', 'shake-anim');
    setTimeout(function() {
        feedbackEl.classList.add(cls);
    }, 10);
}

// question generation
function getParams() {
    if (settings.difficulty === 'custom') {
        return { time: settings.customTime, lives: settings.customLives, range: 20 };
    }
    return DIFF[settings.difficulty] || DIFF.normal;
}

function getActiveOps() {
    const ops = [];
    if (settings.ops.add) ops.push('+');
    if (settings.ops.sub) ops.push('-');
    if (settings.ops.mul) ops.push('*');
    if (settings.ops.div) ops.push('/');
    return ops.length ? ops : ['+'];
}

function nextQuestion() {
    const { range } = getParams();
    const ops = getActiveOps();
    const op = ops[Math.floor(Math.random() * ops.length)];

    let a = Math.floor(Math.random() * range) + 1;
    let b = Math.floor(Math.random() * range) + 1;

    if (op === '+') {
        currentAnswer = a + b;
        questionEl.textContent = `${a} + ${b}`;
    } else if (op === '-') {
        if (a < b) [a, b] = [b, a];
        currentAnswer = a - b;
        questionEl.textContent = `${a} − ${b}`;
    } else if (op === '*') {
        const cap = Math.min(range, 12);
        a = Math.floor(Math.random() * cap) + 1;
        b = Math.floor(Math.random() * cap) + 1;
        currentAnswer = a * b;
        questionEl.textContent = `${a} × ${b}`;
    } else {
        b = Math.floor(Math.random() * Math.min(range, 12)) + 1;
        const q = Math.floor(Math.random() * Math.min(range, 12)) + 1;
        a = b * q;
        currentAnswer = q;
        questionEl.textContent = `${a} ÷ ${b}`;
    }

    animate(questionEl, 'anim-pop');
}

function formatTime(t) {
    const m = Math.floor(t / 60);
    const s = t % 60;
    return `⏱ ${m}:${String(s).padStart(2, '0')}`;
}

// game functions
function startGame() {
    const p = getParams();
    score = 0;
    lives = p.lives;
    timeLeft = p.time;

    scoreEl.textContent = `Score: ${score}`;
    livesEl.textContent = '♥'.repeat(lives);
    timerEl.textContent = formatTime(timeLeft);
    timerEl.classList.remove('urgent');
    feedbackEl.textContent = '';
    feedbackEl.className = 'feedback';

    answerInput.disabled = false;
    submitBtn.disabled = false;
    passBtn.disabled = false;

    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(tick, 1000);

    show(gameScreen);
    quitBtn.style.display = 'block';
    nextQuestion();
    setTimeout(() => answerInput.focus(), 80);
    playBeep('start');
}

function tick() {
    timeLeft--;
    timerEl.textContent = formatTime(timeLeft);
    if (timeLeft <= 10) timerEl.classList.add('urgent');
    if (timeLeft <= 0) endGame();
}

function checkAnswer() {
    const val = parseFloat(answerInput.value);
    if (isNaN(val)) return;

    const rounded = Math.round(val * 10) / 10;
    answerInput.value = '';

    if (rounded === currentAnswer) {
        score++;
        scoreEl.textContent = `Score: ${score}`;
        feedbackEl.textContent = '✓ Correct!';
        feedbackEl.className = 'feedback correct';
        animate(questionEl, 'anim-pop');
        playBeep('correct');
        triggerFeedbackAnim(true);
    } else {
        lives--;
        livesEl.textContent = '♥'.repeat(Math.max(0, lives));
        feedbackEl.textContent = `✗ ${currentAnswer}`;
        feedbackEl.className = 'feedback wrong';
        animate(questionEl, 'anim-shake');
        playBeep('wrong');
        triggerFeedbackAnim(false);
    }

    if (lives <= 0) endGame();
    else nextQuestion();
}

function endGame() {
    clearInterval(timerInterval);
    answerInput.disabled = true;
    submitBtn.disabled = true;
    passBtn.disabled = true;
    quitBtn.style.display = 'none';

    const isNew = score > highScore;
    if (isNew) highScore = score;

    scoreHistory.push(score);
    if (scoreHistory.length > 20) scoreHistory.shift();
    saveToStorage();

    finalScoreEl.textContent = score;
    endHighScoreEl.textContent = highScore;
    newRecordEl.style.display = isNew ? 'block' : 'none';

    show(endScreen);
    playBeep('over');
}

// button listeners
playBtn.addEventListener('click', startGame);

quitBtn.addEventListener('click', () => {
    endGame();
});

settingsBtn.addEventListener('click', () => {
    refreshSettingsUI();
    show(settingsScreen);
});

diffGroup.addEventListener('click', e => {
    const btn = e.target.closest('.pill');
    if (!btn) return;
    diffGroup.querySelectorAll('.pill').forEach(p => p.classList.remove('pill-active'));
    btn.classList.add('pill-active');
    settings.difficulty = btn.dataset.diff;
    customFields.classList.toggle('visible', settings.difficulty === 'custom');
});

[opAdd, opSub, opMul, opDiv].forEach(cb => cb.addEventListener('change', syncOpLabels));

backBtn.addEventListener('click', () => {
    readSettingsForm();
    refreshHome();
    show(homeScreen);
});

answerInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') checkAnswer();
});

submitBtn.addEventListener('click', checkAnswer);

passBtn.addEventListener('click', () => {
    lives--;
    livesEl.textContent = '♥'.repeat(Math.max(0, lives));
    feedbackEl.textContent = `✗ ${currentAnswer}`;
    feedbackEl.className = 'feedback wrong';
    answerInput.value = '';
    playBeep('wrong');
    if (lives <= 0) endGame();
    else nextQuestion();
});

replayBtn.addEventListener('click', startGame);

menuBtn.addEventListener('click', () => {
    refreshHome();
    show(homeScreen);
});

// start screen
loadHighScore();
refreshHome();
show(homeScreen);

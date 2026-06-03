const video = document.getElementById("video");
const gameText = document.getElementById("gameText");
const statusBox = document.getElementById("statusBox");

let target = 0;
let gameStarted = false;

let lastValue = null;
let lastTime = 0;

// =========================
// START GAME
// =========================

function startGame() {
    gameStarted = true;
    newRound();
}

function newRound() {
    target = Math.floor(Math.random() * 6);

    gameText.innerText = `👉 Faz ${target} dedos`;
    statusBox.innerText = "Mostra a mão";
    statusBox.style.color = "yellow";
}

// =========================
// CAMERA
// =========================

async function startCamera() {

    const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
    });

    video.srcObject = stream;

    return new Promise((resolve) => {
        video.onloadedmetadata = () => {
            video.play();
            resolve();
        };
    });
}

// =========================
// CONTAR DEDOS
// =========================

function countFingers(lm, hand) {

    let count = 0;

    // Polegar
    if (hand === "Right") {
        if (lm[4].x < lm[3].x) count++;
    } else {
        if (lm[4].x > lm[3].x) count++;
    }

    // Indicador
    if (lm[8].y < lm[6].y) count++;

    // Médio
    if (lm[12].y < lm[10].y) count++;

    // Anelar
    if (lm[16].y < lm[14].y) count++;

    // Mindinho
    if (lm[20].y < lm[18].y) count++;

    return count;
}

// =========================
// MEDIAPIPE
// =========================

const hands = new Hands({
    locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});

hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.7
});

// =========================
// RESULTADOS
// =========================

hands.onResults((results) => {

    if (!gameStarted) return;

    if (
        !results.multiHandLandmarks ||
        results.multiHandLandmarks.length === 0
    ) {
        statusBox.innerText = "Mostra a mão";
        statusBox.style.color = "yellow";
        return;
    }

    const lm = results.multiHandLandmarks[0];
    const hand = results.multiHandedness[0].label;

    const fingers = countFingers(lm, hand);

    console.log("Dedos:", fingers);

    const now = Date.now();

    if (fingers === lastValue && now - lastTime < 500) {
        return;
    }

    lastValue = fingers;
    lastTime = now;

    if (fingers === target) {

        statusBox.innerText = "✅ CORRETO";
        statusBox.style.color = "lime";

        gameStarted = false;

        setTimeout(() => {
            gameStarted = true;
            newRound();
        }, 1000);

    } else {

        statusBox.innerText = `❌ ERRADO (${fingers})`;
        statusBox.style.color = "red";
    }
});

// =========================
// LOOP
// =========================

async function loop() {

    if (video.readyState >= 2) {
        await hands.send({
            image: video
        });
    }

    requestAnimationFrame(loop);
}

// =========================
// INIT
// =========================

async function init() {

    await startCamera();

    startGame();

    loop();
}

init();
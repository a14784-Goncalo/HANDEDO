const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const result = document.getElementById("result");

let videoWidth, videoHeight;

// ======================
// CAMERA
// ======================

async function startCamera() {

    const stream = await navigator.mediaDevices.getUserMedia({
        video: {
            facingMode: "user"
        },
        audio: false
    });

    video.srcObject = stream;

    await video.play();
}

// ======================
// AJUSTAR CANVAS
// ======================

function resizeCanvas() {

    videoWidth = video.videoWidth;
    videoHeight = video.videoHeight;

    canvas.width = videoWidth;
    canvas.height = videoHeight;
}

// ======================
// CONTAR DEDOS
// ======================

function countFingers(lm, hand) {

    let c = 0;

    if (hand === "Right") {
        if (lm[4].x < lm[3].x) c++;
    } else {
        if (lm[4].x > lm[3].x) c++;
    }

    if (lm[8].y < lm[6].y) c++;
    if (lm[12].y < lm[10].y) c++;
    if (lm[16].y < lm[14].y) c++;
    if (lm[20].y < lm[18].y) c++;

    return c;
}

// ======================
// MEDIAPIPE
// ======================

const hands = new Hands({
    locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});

hands.setOptions({
    maxNumHands: 2,
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.7
});

// ======================
// RESULTADOS
// ======================

hands.onResults((results) => {

    if (!videoWidth || !videoHeight) {
        resizeCanvas();
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

    let total = 0;

    if (results.multiHandLandmarks) {

        for (let i = 0; i < results.multiHandLandmarks.length; i++) {

            const lm = results.multiHandLandmarks[i];
            const hand = results.multiHandedness[i].label;

            drawConnectors(ctx, lm, HAND_CONNECTIONS, {
                color: "lime",
                lineWidth: 2
            });

            drawLandmarks(ctx, lm, {
                color: "red",
                radius: 3
            });

            const fingers = countFingers(lm, hand);

            total += fingers;

            ctx.fillStyle = "yellow";
            ctx.font = "18px Arial";

            ctx.fillText(
                `${hand}: ${fingers}`,
                lm[0].x * canvas.width,
                lm[0].y * canvas.height
            );
        }
    }

    result.innerText = `Dedos: ${total}`;
});

// ======================
// LOOP
// ======================

async function loop() {

    await hands.send({ image: video });

    requestAnimationFrame(loop);
}

// ======================
// START
// ======================

async function init() {

    await startCamera();

    setTimeout(() => {
        loop();
    }, 500);
}

init();
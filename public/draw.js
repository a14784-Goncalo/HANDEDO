const video = document.getElementById("video");
const canvas = document.getElementById("canvas");         // câmara + landmarks
const drawCanvas = document.getElementById("draw-canvas"); // desenho persistente
const ctx = canvas.getContext("2d");
const dCtx = drawCanvas.getContext("2d");
const modeIndicator = document.getElementById("mode-indicator");

// ======================
// COR
// ======================

const COLORS = [
    { hex: "#00ff88", label: "Verde" },
    { hex: "#ff4444", label: "Vermelho" },
    { hex: "#4488ff", label: "Azul" },
    { hex: "#ffdd00", label: "Amarelo" },
    { hex: "#ff88ff", label: "Rosa" },
    { hex: "#ffffff", label: "Branco" },
];

let currentColor = COLORS[0].hex;
let lineWidth = 5;

// Gerar botões de cor
const picker = document.getElementById("colorPicker");
COLORS.forEach((c, i) => {
    const btn = document.createElement("div");
    btn.className = "color-btn" + (i === 0 ? " active" : "");
    btn.style.background = c.hex;
    btn.title = c.label;
    btn.onclick = () => {
        document.querySelectorAll(".color-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        currentColor = c.hex;
    };
    picker.appendChild(btn);
});

// ======================
// LIMPAR
// ======================

function clearDrawing() {
    dCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
}

// ======================
// CÂMARA
// ======================

async function startCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false
    });
    video.srcObject = stream;
    await video.play();
}

// ======================
// AJUSTAR CANVAS
// ======================

let videoWidth = 0, videoHeight = 0;

function resizeCanvas() {
    videoWidth = video.videoWidth;
    videoHeight = video.videoHeight;

    canvas.width = videoWidth;
    canvas.height = videoHeight;

    drawCanvas.width = videoWidth;
    drawCanvas.height = videoHeight;
}

// ======================
// CONTAR DEDOS
// ======================

function countFingers(lm, hand) {
    let c = 0;

    // Polegar (compara X porque está ao lado)
    if (hand === "Right") {
        if (lm[4].x < lm[3].x) c++;
    } else {
        if (lm[4].x > lm[3].x) c++;
    }

    // Restantes dedos (compara Y: tip vs pip)
    if (lm[8].y < lm[6].y) c++;
    if (lm[12].y < lm[10].y) c++;
    if (lm[16].y < lm[14].y) c++;
    if (lm[20].y < lm[18].y) c++;

    return c;
}

// ======================
// ESTADO DO DESENHO
// ======================

let lastX = null;
let lastY = null;

// Detectar mão fechada:
// todos os 4 dedos (sem polegar) com tip ABAIXO do pip
function isHandClosed(lm) {
    const allDown =
        lm[8].y > lm[6].y &&
        lm[12].y > lm[10].y &&
        lm[16].y > lm[14].y &&
        lm[20].y > lm[18].y;
    return allDown;
}

// ======================
// MEDIAPIPE
// ======================

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

// ======================
// RESULTADOS
// ======================

hands.onResults((results) => {

    if (!videoWidth || !videoHeight) resizeCanvas();

    // Desenhar câmara (espelhada para parecer mais natural)
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
        // Nenhuma mão detetada
        modeIndicator.className = "";
        modeIndicator.innerText = "✋ Nenhuma mão";
        lastX = null;
        lastY = null;
        return;
    }

    const lm = results.multiHandLandmarks[0];
    const hand = results.multiHandedness[0].label;

    // Desenhar landmarks (ténue, para não distrair)
    drawConnectors(ctx, lm, HAND_CONNECTIONS, { color: "rgba(0,255,136,0.4)", lineWidth: 1 });
    drawLandmarks(ctx, lm, { color: "rgba(255,0,0,0.5)", radius: 2 });

    const fingers = countFingers(lm, hand);
    const closed = isHandClosed(lm);

    // Ponto de controlo: ponta do indicador (landmark 8)
    // As coordenadas do MediaPipe são 0..1 e já espelhadas internamente,
    // mas como espelhamos o canvas no draw, temos de inverter X
    const tipX = (1 - lm[8].x) * drawCanvas.width;
    const tipY = lm[8].y * drawCanvas.height;

    if (closed) {
        // ✊ MAO FECHADA → APAGA
        modeIndicator.className = "erasing";
        modeIndicator.innerText = "✊ A apagar...";

        const radius = 30;
        dCtx.save();
        dCtx.globalCompositeOperation = "destination-out";
        dCtx.beginPath();
        dCtx.arc(tipX, tipY, radius, 0, Math.PI * 2);
        dCtx.fill();
        dCtx.restore();

        // Mostrar círculo de apagar no canvas da câmara
        ctx.strokeStyle = "rgba(255,68,68,0.8)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(tipX, tipY, radius, 0, Math.PI * 2);
        ctx.stroke();

        lastX = null;
        lastY = null;

    } else if (fingers === 1) {
        // ☝️ 1 DEDO → DESENHA
        modeIndicator.className = "drawing";
        modeIndicator.innerText = "☝️ A desenhar...";

        if (lastX !== null && lastY !== null) {
            dCtx.strokeStyle = currentColor;
            dCtx.lineWidth = lineWidth;
            dCtx.lineCap = "round";
            dCtx.lineJoin = "round";
            dCtx.beginPath();
            dCtx.moveTo(lastX, lastY);
            dCtx.lineTo(tipX, tipY);
            dCtx.stroke();
        }

        // Ponto guia na ponta do dedo
        ctx.fillStyle = currentColor;
        ctx.beginPath();
        ctx.arc(tipX, tipY, 8, 0, Math.PI * 2);
        ctx.fill();

        lastX = tipX;
        lastY = tipY;

    } else {
        // Outro gesto → pausa no desenho
        modeIndicator.className = "";
        modeIndicator.innerText = `${fingers} dedos — pausa`;
        lastX = null;
        lastY = null;
    }
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
    setTimeout(() => loop(), 500);
}

init();
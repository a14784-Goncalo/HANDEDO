const video = document.getElementById("video");
const result = document.getElementById("result");
const captureBtn = document.getElementById("captureBtn");

// ======================
// INICIAR CÂMARA
// ======================

async function startCamera() {

    try {

        const stream =
            await navigator.mediaDevices.getUserMedia({
                video: true
            });

        video.srcObject = stream;

        console.log("Câmara iniciada");

    }

    catch (error) {

        console.error("Erro ao abrir câmara:", error);

        result.textContent =
            "Erro ao abrir a câmara";

    }

}

// ======================
// CAPTURAR FOTO
// ======================

captureBtn.addEventListener("click", () => {

    const canvas =
        document.createElement("canvas");

    canvas.width =
        video.videoWidth;

    canvas.height =
        video.videoHeight;

    const ctx =
        canvas.getContext("2d");

    ctx.drawImage(
        video,
        0,
        0,
        canvas.width,
        canvas.height
    );

    const image =
        canvas.toDataURL("image/png");

    console.log("Foto capturada");
    console.log(image);

    result.textContent =
        "Foto capturada com sucesso!";

});

// ======================
// ARRANCAR
// ======================

startCamera();
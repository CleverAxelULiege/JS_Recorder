//https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Manipulating_video_using_canvas
//https://stackoverflow.com/questions/4429440/html5-display-video-inside-canvas
const AUDIO = document.querySelector("audio");
const CANVAS = document.querySelector("canvas");
const CANVAS_CONTAINER = document.querySelector(".canvas_container");

CANVAS.width = CANVAS_CONTAINER.getBoundingClientRect().width;
CANVAS.height = CANVAS_CONTAINER.getBoundingClientRect().height;

window.addEventListener("resize", () => {
    
    CANVAS.width = CANVAS_CONTAINER.getBoundingClientRect().width;
    CANVAS.height = CANVAS_CONTAINER.getBoundingClientRect().height;
})

AUDIO.addEventListener("play", () => {

    const AUDIO_CTX = new AudioContext();
    const analyser = AUDIO_CTX.createAnalyser();
    analyser.fftSize = 2048/2;
    const SOURCE = AUDIO_CTX.createMediaElementSource(AUDIO);
    SOURCE.connect(analyser);
    SOURCE.connect(AUDIO_CTX.destination);

    const canvasCtx = CANVAS.getContext("2d");
    // canvasCtx.clearRect(0, 0, CANVAS.width, CANVAS.height);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    draw();
    function draw() {
        requestAnimationFrame(draw);
        analyser.getByteTimeDomainData(dataArray);
        canvasCtx.fillStyle = "rgb(200 200 200)";
        canvasCtx.fillRect(0, 0, CANVAS.width, CANVAS.height);

        canvasCtx.lineWidth = 1;
        canvasCtx.strokeStyle = "rgb(0 0 0)";
        canvasCtx.beginPath();

        const sliceWidth = CANVAS.width / bufferLength;
        let x = 0;
        console.log(dataArray);
        // console.log(bufferLength);
        for (let i = 0; i < bufferLength; i++) {
            const v = dataArray[i] / 128.0; //128 == no sound detected
            const y = v * (CANVAS.height / 2);
          
            if (i === 0) {
              canvasCtx.moveTo(x, y);
            } else {
              canvasCtx.lineTo(x, y);
            }

          
            x += sliceWidth;
          }
          // canvasCtx.lineTo(CANVAS.width, CANVAS.height / 2);
          canvasCtx.stroke();

    }

})


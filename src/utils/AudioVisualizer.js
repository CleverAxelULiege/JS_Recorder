export class AudioVisualizer {
    /**
     * @private
     * @type {HTMLCanvasElement}
     */
    canvas = document.querySelector(".audio_visualizer");

    /**@private */
    idRequestFrame = null;

    /**
     * @private
     * @type {AudioContext|null}
     */
    audioCtx = null

    /** @type {MediaStreamTrack|null}*/
    mediaStreamTrack = null

    /**
     * @private
     * @type {AnalyserNode}
     */
    analyser = null;

    /**@private */
    bufferLength = 0;

    /**
     * @private
     * @type {Uint8Array}
     */
    dataArray = null;

    /**
     * @private
     * @type {MediaStreamAudioSourceNode|null}
     */
    source = null

    /**@private */
    isActive = false;


    constructor() {
        /**@private */
        this.canvasCtx = this.canvas.getContext("2d");

        this.resizeCanvas();
        this.initEventListeners();
    }

    /**
     * @param {MediaStream} mediaStream 
     */
    init(mediaStream){
        this.audioCtx = new AudioContext();

        this.analyser = this.audioCtx.createAnalyser();
        this.analyser.fftSize = 2048;

        this.source = this.audioCtx.createMediaStreamSource(mediaStream);
        this.source.connect(this.analyser);
        
        this.bufferLength = this.analyser.frequencyBinCount;
        this.dataArray = new Uint8Array(this.bufferLength);
        
        this.mediaStreamTrack = this.canvas.captureStream().getVideoTracks()[0];
    }

    /**
     * @param {MediaStream} mediaStream 
     */
    setAndConnectSourceMediaStream(mediaStream) {
        this.source = this.audioCtx.createMediaStreamSource(mediaStream);
        this.source.connect(this.analyser);
        return this;
    }

    /**@private */
    resizeCanvas() {
        this.canvas.width = this.canvas.parentElement.getBoundingClientRect().width;
        this.canvas.height = this.canvas.parentElement.getBoundingClientRect().height;
    }

    /**@private */
    initEventListeners() {
        window.addEventListener("resize", this.resizeCanvas.bind(this));
    }

    hide() {
        this.canvasCtx.canvas.hidden = true;
        return this;
    }
    
    show() {
        this.canvasCtx.canvas.hidden = false;
        return this;
    }

    start() {
        if (this.isActive) {
            console.warn("Audio visualizer is already active");
            return;
        }

        this.isActive = true;
        this.enableRequestFrame(0);
        return this;
    }

    stop() {
        cancelAnimationFrame(this.idRequestFrame);
        this.isActive = false;
        this.idRequestFrame = null;
        this.canvasCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        return this;
    }


    /**
     * @private
     * @param {FrameRequestCallback} time 
     * @returns 
     */
    enableRequestFrame(time) {
        if (this.source == null) {
            console.warn("No source set, did you give any mediastream ?");
            return;
        }

        this.idRequestFrame = requestAnimationFrame(this.enableRequestFrame.bind(this));

        this.analyser.getByteTimeDomainData(this.dataArray);
        this.canvasCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if(this.canvasCtx.canvas.hidden){
            return;
        }

        this.canvasCtx.lineWidth = 3;
        this.canvasCtx.strokeStyle = "rgb(255 255 255)";
        this.canvasCtx.beginPath();

        const sliceWidth = this.canvas.width / this.bufferLength;

        let x = 0;
        for (let i = 0; i < this.bufferLength; i++) {
            const v = this.dataArray[i] / 128.0; //128 == no sound detected
            const y = v * (this.canvas.height / 2);

            if (i === 0) {
                this.canvasCtx.moveTo(x, y);
            } else {
                this.canvasCtx.lineTo(x, y);
            }
            x += sliceWidth;
        }
        // canvasCtx.lineTo(CANVAS.width, CANVAS.height / 2);
        this.canvasCtx.stroke();
    }
}
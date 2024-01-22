import { AudioVisualizer } from "./AudioVisualizer.js";
import "./typedefs.js";
const VIDEO_MIME_TYPE = "video/webm";
const AUDIO_MIME_TYPE = "audio/webm";

/**Gap entre les boutons de la preview video */
const GAP = 5;

/**temps en milliseconde */
const TIME_SLICE_MEDIA_RECORDER = 1000;

/**
 * @type {number|null}
 * Temps en millisecondes, la limite d'un temps d'enregistrement mettre à null pour temps ILLIMITÉ
 * Vu que je me sers de setTimeOut ainsi que de setInterval, le temps peut varier de quelques secondes plus l'enregistrement est long.
 */
const STOP_RECORDING_TIMEOUT = 1000 * 30

/**@type {MediaTrackConstraintSet} */
const VIDEO_CONSTRAINT = {
    width: { ideal: 1280 },//{ min: 854, max: 1280 }, //854
    height: { ideal: 720 },//{ min: 480, max: 720 }, //480
    // frameRate: { min: 24, ideal: 30 },
    facingMode: "user",
    aspectRatio: { exact: 16 / 9 },
    deviceId: undefined,
};
/**@type {MediaTrackConstraintSet} */
const AUDIO_CONSTRAINT = {
    deviceId: undefined
}

export class Recorder {
    /**
     * @private
     * @type {IDOMElementRecorder}
     */
    element;

    /**
     * @private
     * @type {MediaStreamConstraints|null}
     */
    mediaStreamConstraint = null;

    /** @private*/
    isRecorderContainerUp = false;

    /**
     * @private
     * @type {MediaRecorder|null}
     */
    mediaRecorder = null;

    /**
     * @private
     * @type {MediaStream|null}
     */
    mediaStream = null;

    /**
     * @private
     * @type {MediaStreamTrack|null}
     */
    mediaStreamTrackVideo = null;

    /**
     * @private
     * @type {Blob[]}
     */
    recordedChunks = [];

    /** @private*/
    timeElapsedInSeconds = 0;

    /** @private*/
    idInterval = null;

    /** @private*/
    idRecordingTimeout = null;

    /** @private*/
    isRecording = false;

    /**@private */
    isPaused = false;

    /**@private */
    isFullscreen = false;

    /**@private */
    mimeType = VIDEO_MIME_TYPE;

    /**
     * @private
     * @type {ITraductionRecorder}
     */
    tradRecorder

    /**
     * @private
     * @type {AudioVisualizer|null}
     */
    audioVisualizer = null

    /**
     * @param {ITraductionRecorder} tradRecorder 
     * @param {AudioVisualizer} audioVisualizer 
     */
    constructor(tradRecorder, audioVisualizer) {
        this.tradRecorder = tradRecorder;
        this.audioVisualizer = audioVisualizer;

        this.element = {
            VIDEO_DEVICE_DISABLED_H3: document.querySelector(".recorder_video_device_disabled"),
            RECORDER_CONTAINER_DIV: document.querySelector(".recorder_container"),
            RECORDER_DIV: document.querySelector(".recorder"),
            CLOSE_RECORDER_BUTTON: document.querySelector(".close_recorder_button"),
            OPEN_RECORDER_BUTTON: document.querySelector("#display_recorder_button"),
            START_RECORDING_BUTTON: document.querySelector("#start_recording_button"),
            STOP_RECORDING_BUTTON: document.querySelector("#stop_recording_button"),
            RECORDER_ACTION_BUTTONS_CONTAINER_DIV: document.querySelector(".recorder_action_buttons_container"),
            PAUSE_RESUME_BUTTON: document.querySelector("#pause_resume_recording_button"),
            TOGGLE_VIDEO_DEVICE_BUTTON: document.querySelector("#toggle_video_device_button"),
            TOGGLE_VIDEO_FULLSCREEN_BUTTON_CONTAINER_DIV: document.querySelector(".recorder_action_fs_tv_buttons_container"),
            PREVIEW_VIDEO: document.querySelector("#preview_video"),
            RECORDED_ELEMENT: document.querySelector("#recorded_video"),
            TIME_ELAPSED_SINCE_RECORD_STARTED_SPAN: document.querySelector(".time_elapsed"),
            REQUEST_FULL_SCREEN_BUTTON: document.querySelector("#request_fullscreen_button"),
            PREVIEW_VIDEO_CONTAINER_DIV: document.querySelector(".video_container"),
            RECORDED_ELEMENT_CONTAINER_DIV: document.querySelector(".recorded_element_container"),
            LOADER_CONTAINER_DIV: document.querySelector(".loader_container"),
        };
    }

    /**
     * @param {MediaStreamConstraints} mediaStreamConstraint 
     * @param {string|undefined} audioDeviceId 
     * @param {string|undefined} videoDeviceId 
     */
    setDeviceConstraint(mediaStreamConstraint, audioDeviceId, videoDeviceId) {

        this.mediaStreamConstraint = mediaStreamConstraint;
        if (this.mediaStreamConstraint.audio) {
            this.mediaStreamConstraint.audio = { ...AUDIO_CONSTRAINT };
            this.mediaStreamConstraint.audio.deviceId = audioDeviceId;
        }

        if (this.mediaStreamConstraint.video) {
            this.mediaStreamConstraint.video = { ...VIDEO_CONSTRAINT };
            this.mediaStreamConstraint.video.deviceId = videoDeviceId;
        } else {
            this.element.TOGGLE_VIDEO_DEVICE_BUTTON.disabled = true;
            //pas de périphérique vidéo donc je désactive le bouton
        }

        return this;
    }

    /**
     * 
     * @returns {(audioDeviceId:string|null, videoDeviceId:string|null) => void}
     */
    updateDevice() {
        return (audioDeviceId, videoDeviceId) => {
            if (this.mediaStream == null || this.mediaStreamConstraint == null) {
                console.warn("Media stream or constraints not set");
                return;
            }

            if (audioDeviceId != null) {
                this.mediaStreamConstraint.audio.deviceId = audioDeviceId;
            }

            if (videoDeviceId != null) {
                this.mediaStreamConstraint.audio.deviceId = audioDeviceId;
            }

            if(this.mediaStreamConstraint.video){
                this.toggleVideoDevice();
            }

            //obligé de redemander de lancer un stream pour prendre en compte le changement de périphérique
            //car il se peut que le navigateur n'ait pas la permission d'utiliser le nouveau périphérique choisi.
            this.startStreamingToPreviewVideo().then(() => {
                console.info("Changed device");
            })
        }
    }

    initEventListeners() {
        if (this.mediaStreamConstraint == null) {
            console.error("No constraint passed");
            return null;
        }

        this.element.OPEN_RECORDER_BUTTON.addEventListener("click", this.openRecorder.bind(this));
        this.element.CLOSE_RECORDER_BUTTON.addEventListener("click", this.closeRecorder.bind(this));
        window.addEventListener("click", this.closerecorderIfClickOutsideOfIt.bind(this));

        this.element.START_RECORDING_BUTTON.addEventListener("click", this.startRecording.bind(this));
        window.addEventListener("resize", () => {
            if (!this.isRecording) return;
            this.translateRecButtonToTheRight();
        });

        this.element.TOGGLE_VIDEO_DEVICE_BUTTON.addEventListener("click", this.toggleVideoDevice.bind(this))

        this.element.PAUSE_RESUME_BUTTON.addEventListener("click", this.pauseOrResumeVideo.bind(this));
        this.element.STOP_RECORDING_BUTTON.addEventListener("click", () => this.stopRecording(false));

        this.element.REQUEST_FULL_SCREEN_BUTTON.addEventListener("click", this.toggleFullScreen.bind(this));

        return this;
    }

    /**@private */
    toggleFullScreen() {
        if (this.isFullscreen) {
            document.exitFullscreen();
        } else {
            this.element.PREVIEW_VIDEO_CONTAINER_DIV.requestFullscreen();
        }

        this.isFullscreen = !this.isFullscreen;
    }

    /**
     * @returns {Promise<void> | null}
     */
    startStreamingToPreviewVideo() {
        if (this.mediaStreamConstraint == null) {
            console.error("No constraint passed");
            return null;
        }
        return new Promise((resolve) => {
            navigator.mediaDevices.getUserMedia(this.mediaStreamConstraint)
                .then((stream) => {
                    this.mediaStream = stream;

                    this.audioVisualizer
                        .setAndConnectSourceMediaStream(this.mediaStream);
                        

                    if (this.mediaStreamConstraint.video) {
                        this.mediaStreamTrackVideo = this.mediaStream.getVideoTracks()[0];
                    } else {
                        this.audioVisualizer.show();
                        this.audioVisualizer.start();
                        this.mediaStream = new MediaStream([this.audioVisualizer.mediaStreamTrack, this.mediaStream.getAudioTracks()[0]])
                    }

                    this.element.PREVIEW_VIDEO.srcObject = this.mediaStream
                    console.info("Started streaming to the preview video.");
                    resolve();
                });
        })
    }

    openRecorder() {
        if (this.mediaStream == null) {
            window.alert("No media stream available, the record will fail.");
            return;
        }

        this.element.RECORDER_CONTAINER_DIV.classList.remove("hidden");
        document.body.style.overflowY = "hidden";

        this.audioVisualizer.resizeCanvas();

        setTimeout(() => {
            this.isRecorderContainerUp = true;
            this.element.RECORDER_DIV.classList.remove("animation_enter_recorder");
        });
    }

    /**
     * @private
     */
    toggleVideoDevice() {
        if (!this.mediaStreamConstraint?.video) {
            window.alert("Didn't get the permission to use the video device or it doesn't exist.");
            return;
        }

        if (this.mediaStream == null) {
            console.warn("Media stream not set");
            return;
        }
        this.element.VIDEO_DEVICE_DISABLED_H3.innerText = this.tradRecorder.video.disable;
        this.element.VIDEO_DEVICE_DISABLED_H3.classList.toggle("hidden");
        this.mediaStreamTrackVideo.enabled = !this.mediaStreamTrackVideo.enabled;
        this.element.TOGGLE_VIDEO_DEVICE_BUTTON.classList.toggle("disabled_by_user");

        if (this.mediaStreamTrackVideo.enabled) {
            this.audioVisualizer.hide();
            this.audioVisualizer.stop();
            this.mediaStream = new MediaStream([this.mediaStreamTrackVideo, this.mediaStream.getAudioTracks()[0]]);
            
        } else {
            this.audioVisualizer.show();
            this.audioVisualizer.start();
            this.mediaStream = new MediaStream([this.audioVisualizer.mediaStreamTrack, this.mediaStream.getAudioTracks()[0]]);
        }
    }

    /**
     * @private
     */
    async closeRecorder() {
        if (this.isRecording) {
            if (window.confirm(this.tradRecorder.leaveWhileRecording)) {
                await this.stopRecording(true);
                return;
            } else {
                return;
            }
        }

        if (this.isFullscreen) {
            document.exitFullscreen();
            this.isFullscreen = false;
        }

        this.element.RECORDER_CONTAINER_DIV.classList.add("hidden");
        document.body.style.overflowY = "";
        this.isRecorderContainerUp = false;
        this.element.RECORDER_DIV.classList.add("animation_enter_recorder");
    }

    /**
     * @private
     * @param {Event} e 
     */
    closerecorderIfClickOutsideOfIt(e) {
        if (!this.isRecorderContainerUp) {
            return;
        }

        /**@type {Element} */
        let element = e.target;
        if (element.closest(".recorder") == null) {
            this.closeRecorder();
        }
    }

    /**
     * @private
     */
    pauseOrResumeVideo() {
        if (!this.isRecording) {
            console.warn("No recording started or no recorder set.")
            return;
        }

        if (this.isPaused) {
            this.resumeRecording();
        } else {
            this.pauseRecording();
        }

        this.isPaused = !this.isPaused;
    }

    /**
     * @private
     */
    pauseRecording() {
        this.mediaRecorder.pause();
        clearInterval(this.idInterval);
        this.element.PAUSE_RESUME_BUTTON.querySelector(".pause_icon")?.classList.add("hidden");
        this.element.PAUSE_RESUME_BUTTON.querySelector(".resume_icon")?.classList.remove("hidden");
        this.element.PAUSE_RESUME_BUTTON.title = this.tradRecorder.video.button.resume;
        this.element.START_RECORDING_BUTTON.classList.add("paused");

    }

    /**
     * @private
     */
    resumeRecording() {
        this.mediaRecorder.resume();
        this.startInterval();
        this.element.PAUSE_RESUME_BUTTON.querySelector(".pause_icon")?.classList.remove("hidden");
        this.element.PAUSE_RESUME_BUTTON.querySelector(".resume_icon")?.classList.add("hidden");
        this.element.PAUSE_RESUME_BUTTON.title = this.tradRecorder.video.button.pause;
        this.element.START_RECORDING_BUTTON.classList.remove("paused");
    }

    /**
     * @private
     */
    startRecording() {
        if (this.mediaStream == null) {
            console.warn("No media stream available");
            return;
        }

        if (this.isRecording) {
            console.warn("Recording already started");
            return;
        }

        if(this.element.RECORDED_ELEMENT.src != ""){
            if(!window.confirm(this.tradRecorder.overwritePreviousRecording)){
                return;
            }
        }

        this.isRecording = true;
        this.recordedChunks = [];

        if(STOP_RECORDING_TIMEOUT != null){
            this.startRecordingTimeOut();
        }

        this.animateButtonsIn();
        this.startCounterTimeElapsed();
        this.mediaRecorder = new MediaRecorder(this.mediaStream);
        //video/webm; codecs="vp8, vorbis"
        this.initEventListenersOnMediaRecorder();
        this.mediaRecorder.start(TIME_SLICE_MEDIA_RECORDER);
        console.info("started the recording");
    }

    /**
     * @private 
     * Arrêtera automatiquement l'enregistrement après le TIMEOUT
     */
    startRecordingTimeOut(){
        this.idRecordingTimeout = setTimeout(() => {
            this.stopRecording(false);
        }, STOP_RECORDING_TIMEOUT);
    }

    /**
     * @private
     */
    initEventListenersOnMediaRecorder() {
        if (this.mediaRecorder == null) {
            console.warn("No media recorder set");
            return;
        }

        this.mediaRecorder.ondataavailable = (blobEvent) => {
            this.recordedChunks.push(blobEvent.data);
        }

        this.mediaRecorder.onstop = () => {
            console.info("Stopped the recording");
            let recordedBlob = new Blob(this.recordedChunks, { type: this.mimeType });

            URL.revokeObjectURL(this.element.RECORDED_ELEMENT.src);
            this.element.RECORDED_ELEMENT.src = URL.createObjectURL(recordedBlob);
            // this.downloadButton.href = this.recordedVideo.src;
            // this.downloadButton.download = "RecordedVideo.webm";
        }
    }

    /**
     * @private
     */
    async stopRecording(closeRecorderOnStop = false) {
        if (!this.isRecording) {
            console.warn("Not recording");
            return;
        }

        this.isRecording = false;
        this.mediaRecorder?.stop();
        clearInterval(this.idInterval);
        clearTimeout(this.idRecordingTimeout);
        await this.animateButtonsOut();

        if (this.isPaused) {
            this.element.PAUSE_RESUME_BUTTON.querySelector(".pause_icon")?.classList.remove("hidden");
            this.element.PAUSE_RESUME_BUTTON.querySelector(".resume_icon")?.classList.add("hidden");
            this.element.PAUSE_RESUME_BUTTON.title = this.tradRecorder.video.button.pause;
            this.element.START_RECORDING_BUTTON.classList.remove("paused");
            this.isPaused = false;
        }

        if (this.isFullscreen) {
            this.isFullscreen = false;
            document.exitFullscreen();
        }

        this.element.RECORDED_ELEMENT_CONTAINER_DIV.classList.remove("hidden");

        if (closeRecorderOnStop) {
            this.closeRecorder();
        }
    }

    /**
     * @private
     */
    animateButtonsIn() {
        this.element.START_RECORDING_BUTTON.classList.add("active");
        this.element.START_RECORDING_BUTTON.querySelector(".popup").classList.add("hidden");
        this.translateRecButtonToTheRight();

        this.element.START_RECORDING_BUTTON.addEventListener("transitionend", () => {
            this.element.RECORDER_ACTION_BUTTONS_CONTAINER_DIV.classList.remove("off_screen");
            this.element.START_RECORDING_BUTTON.style.transition = "none";
        }, { once: true });
    }

    /**@private */
    translateRecButtonToTheRight() {
        let offsetLeft = this.element.START_RECORDING_BUTTON.offsetLeft - GAP * 13;
        this.element.START_RECORDING_BUTTON.style.transform = `translateX(${offsetLeft}px)`;
    }

    /**
     * @private
     * @returns {Promise<void>}
     */
    animateButtonsOut() {
        return new Promise((resolve) => {
            this.element.RECORDER_ACTION_BUTTONS_CONTAINER_DIV.classList.add("off_screen");
            this.element.RECORDER_ACTION_BUTTONS_CONTAINER_DIV.addEventListener("transitionend", () => {
                this.element.START_RECORDING_BUTTON.classList.remove("active");
                this.element.START_RECORDING_BUTTON.style.transform = "";
                this.element.START_RECORDING_BUTTON.style.transition = "";
                resolve();
            }, { once: true });
        })
    }

    /**
     * @private
     */
    startCounterTimeElapsed() {
        this.timeElapsedInSeconds = 0;
        this.formaTimeInCounter();
        this.startInterval();
    }

    /**
     * @private
     */
    startInterval() {
        this.idInterval = setInterval(() => {
            this.timeElapsedInSeconds++;
            this.formaTimeInCounter();
        }, 1000);
    }

    /**
     * @private
     */
    formaTimeInCounter() {
        let minute = Math.floor(this.timeElapsedInSeconds / 60);
        let second = this.timeElapsedInSeconds % 60;

        let minuteFormat = minute < 10 ? `0${minute}` : minute;
        let secondFormat = second < 10 ? `0${second}` : second;

        this.element.TIME_ELAPSED_SINCE_RECORD_STARTED_SPAN.innerText = `${minuteFormat}:${secondFormat}`;
    }

}
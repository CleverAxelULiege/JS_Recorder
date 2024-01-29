import { SUPPORT_FULLSCREEN } from "../main.js";
import { AudioVisualizer } from "./AudioVisualizer.js";
import "./typedefs.js";
import { VideoPlayer } from "./video_player/VideoPlayer.js";
const VIDEO_MIME_TYPE = "video/webm";
const AUDIO_MIME_TYPE = "audio/webm";

/**Gap entre les boutons de la preview video */
const GAP = 5;

/**temps en milliseconde */
const TIME_SLICE_MEDIA_RECORDER = 500;

/**
 * @type {number|null}
 * Temps en millisecondes, la limite d'un temps d'enregistrement mettre à null pour temps ILLIMITÉ
 * Vu que je me sers de setTimeOut ainsi que de setInterval, le temps peut varier de quelques petites secondes plus l'enregistrement est long.
 */
const STOP_RECORDING_TIMEOUT = 1000 * 60;

/**
 * @type {number|null}
 * Taille en byte, la limite de la taille de l'enregistrement. Si cette limite est atteinte l'enregistrement s'arrêtera
 * mettre à null pour ne pas en tenir compte
 */
const MAX_BYTES_SIZE_RECORDING = 1000 * 1000 * 100;

/**
 * Temps en millisecondes où la notif s'affiche pour dire que le temps donné par STOP_RECORDING_TIMEOUT a été écoulé
 * ou que la taille max a été atteinte
 */
const NOTIFICATION_TIMEOUT = 1000 * 12;

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

    /**@private */
    currentByteSizeRecording = 0;

    /** @private*/
    timeElapsedInSeconds = 0;

    /** @private*/
    idInterval = null;

    /** @private*/
    idRecordingTimeout = null;

    /** @private*/
    idNotificationTimeout = null;

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
     * @type {ITraductionTime}
     */
    tradRecorder

    /**
     * @private
     * @type {AudioVisualizer|null}
     */
    audioVisualizer = null

    /**
     * @private
     * @type {VideoPlayer|null}
     */
    videoPlayer = null

    /**
     * @param {ITraductionRecorder} tradRecorder
     * @param {ITraductionTime} tradTime
     * @param {AudioVisualizer} audioVisualizer
     * @param {VideoPlayer} videoPlayer
     */
    constructor(tradRecorder, tradTime, audioVisualizer, videoPlayer) {
        this.tradRecorder = tradRecorder;
        this.tradTime = tradTime;
        this.audioVisualizer = audioVisualizer;
        this.videoPlayer = videoPlayer;

        this.element = {
            VIDEO_DEVICE_DISABLED_H3: document.querySelector(".recorder .recorder_video_device_disabled"),
            RECORDER_CONTAINER_DIV: document.querySelector(".recorder_container"),
            RECORDER_DIV: document.querySelector(".recorder"),
            CLOSE_RECORDER_BUTTON: document.querySelector(".recorder .close_recorder_button"),
            OPEN_RECORDER_BUTTON: document.querySelector("#display_recorder_button"),
            START_RECORDING_BUTTON: document.querySelector(".recorder #start_recording_button"),
            STOP_RECORDING_BUTTON: document.querySelector(".recorder #stop_recording_button"),

            /**
             * container qui a les bouton pause et stop du recorder
             */
            RECORDER_ACTION_BUTTONS_CONTAINER_DIV: document.querySelector(".recorder .recorder_action_buttons_container"),
            PAUSE_RESUME_BUTTON: document.querySelector(".recorder #pause_resume_recording_button"),
            TOGGLE_VIDEO_DEVICE_BUTTON: document.querySelector(".recorder #toggle_video_device_button"),

            /**
             * container qui a le bouton pour activer/désactiver la caméra et la requête du plein écran
             */
            TOGGLE_VIDEO_FULLSCREEN_BUTTON_CONTAINER_DIV: document.querySelector(".recorder .recorder_action_fs_tv_buttons_container"),
            PREVIEW_VIDEO: document.querySelector(".recorder #preview_video"),
            RECORDED_ELEMENT: document.querySelector(".recorded_element_container #recorded_video"),
            TIME_ELAPSED_SINCE_RECORD_STARTED_SPAN: document.querySelector(".recorder .time_elapsed"),
            TOGGLE_FULLSCREEN_BUTTON: document.querySelector("#request_fullscreen_button"),
            PREVIEW_VIDEO_CONTAINER_DIV: document.querySelector(".recorder .video_container"),
            RECORDED_ELEMENT_CONTAINER_DIV: document.querySelector(".recorded_element_container"),
            NOTIFICATION_LIMIT_REACHED_BUTTON: document.querySelector(".recorder .notification_limit_reached"),
            DOWNLOAD_RECORDED_VIDEO_BUTTON: document.querySelector(".download_recorded_video_button"),
            DOWNLOAD_RECORDING_AT_END_SWITCH: document.querySelector(".options_recorder #download_on_stop_recording"),
            DONT_RECORD_OSCILLOSCOPE_SWITCH: document.querySelector(".options_recorder #dont_record_oscilloscope")
        };

        this.JSsupportAspectRatio();
        this.getPreference();
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
            this.element.TOGGLE_VIDEO_DEVICE_BUTTON.style.display = "none";
            //pas de périphérique vidéo donc je désactive le bouton
        }

        if (!SUPPORT_FULLSCREEN) {
            this.element.TOGGLE_FULLSCREEN_BUTTON.style.display = "none";
        }

        return this;
    }

    /**
     * Est uniquement utilisé par les SELECT pour changer de périphérique
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

            //si je détecte un changement de périph et que un périph vidéo existe et qu'il été désactivé je le réactive
            //pour éviter des complications d'affichage.
            if (this.mediaStreamConstraint.video && !this.mediaStreamTrackVideo.enabled) {
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

        this.element.DOWNLOAD_RECORDING_AT_END_SWITCH.addEventListener("change", this.savePreference.bind(this));

        this.element.OPEN_RECORDER_BUTTON.addEventListener("click", this.openRecorder.bind(this));
        this.element.CLOSE_RECORDER_BUTTON.addEventListener("click", this.closeRecorder.bind(this));
        window.addEventListener("click", this.closeRecorderIfClickOutsideOfIt.bind(this));

        this.element.START_RECORDING_BUTTON.addEventListener("click", this.startRecording.bind(this));
        window.addEventListener("resize", () => {
            if (!this.isRecording) return;
            this.translateRecButtonToTheRight();
        });

        this.element.TOGGLE_VIDEO_DEVICE_BUTTON.addEventListener("click", this.toggleVideoDevice.bind(this))

        this.element.PAUSE_RESUME_BUTTON.addEventListener("click", this.pauseOrResumeRecording.bind(this));
        this.element.STOP_RECORDING_BUTTON.addEventListener("click", () => this.stopRecording(false));

        this.element.TOGGLE_FULLSCREEN_BUTTON.addEventListener("click", this.toggleFullScreen.bind(this));
        this.element.NOTIFICATION_LIMIT_REACHED_BUTTON.addEventListener("click", this.closeNotificationTimeout.bind(this));

        return this;
    }

    /**@private */
    savePreference(){
        localStorage.setItem("recorder_preference", JSON.stringify({
            downloadRecordAtEnd: this.element.DOWNLOAD_RECORDING_AT_END_SWITCH.checked
        }));
    }

    /**@private */
    getPreference(){
        let recorderPreference = localStorage.getItem("recorder_preference");

        if(recorderPreference == null){
            return;
        }

        recorderPreference = JSON.parse(recorderPreference);

        this.element.DOWNLOAD_RECORDING_AT_END_SWITCH.checked = recorderPreference.downloadRecordAtEnd ?? false;
    }

    /**@private */
    toggleFullScreen() {
        if (this.isFullscreen) {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
        } else {
            if (this.element.PREVIEW_VIDEO_CONTAINER_DIV.requestFullscreen) {
                this.element.PREVIEW_VIDEO_CONTAINER_DIV.requestFullscreen();
            } else if (this.element.PREVIEW_VIDEO_CONTAINER_DIV.mozRequestFullScreen) {
                this.element.PREVIEW_VIDEO_CONTAINER_DIV.mozRequestFullScreen();
            } else if (this.element.PREVIEW_VIDEO_CONTAINER_DIV.webkitRequestFullscreen) {
                this.element.PREVIEW_VIDEO_CONTAINER_DIV.webkitRequestFullscreen();
            } else if (this.element.PREVIEW_VIDEO_CONTAINER_DIV.msRequestFullscreen) {
                this.element.PREVIEW_VIDEO_CONTAINER_DIV.msRequestFullscreen();
            }
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

                    this.audioVisualizer.init(this.mediaStream);

                    if (this.mediaStreamConstraint.video) {
                        this.mediaStreamTrackVideo = this.mediaStream.getVideoTracks()[0];
                    } else {
                        this.audioVisualizer
                            .show()
                            .start();

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

        if (!this.videoPlayer.isPaused()) {
            this.videoPlayer.pause(true);
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
            this.audioVisualizer
                .hide()
                .stop();

            this.mediaStream = new MediaStream([this.mediaStreamTrackVideo, this.mediaStream.getAudioTracks()[0]]);

        } else {
            this.audioVisualizer
                .show()
                .start();

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
    closeRecorderIfClickOutsideOfIt(e) {
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
    pauseOrResumeRecording() {
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

        if (this.element.RECORDED_ELEMENT.src != "") {
            if (!window.confirm(this.tradRecorder.overwritePreviousRecording)) {
                return;
            }
        }

        this.closeNotificationTimeout();
        this.isRecording = true;
        this.recordedChunks = [];
        this.currentByteSizeRecording = 0;

        if (STOP_RECORDING_TIMEOUT != null) {
            this.startRecordingTimeOut();
        }

        this.animateButtonsIn();
        this.startCounterTimeElapsed();

        if(this.element.DONT_RECORD_OSCILLOSCOPE_SWITCH.checked){
            let newMediaStream = null;

            if(!this.mediaStreamConstraint.video || (this.mediaStreamConstraint.video && !this.mediaStreamTrackVideo.enabled)){
                newMediaStream = new MediaStream([this.mediaStream.getAudioTracks()[0]]);
            }

            // if(this.mediaStreamConstraint.video && this.mediaStreamTrackVideo.enabled){
            //     newMediaStream = new MediaStream([this.mediaStreamTrackVideo, this.mediaStream.getAudioTracks()[0]]);
            // }else {
            //     newMediaStream = new MediaStream([this.mediaStream.getAudioTracks()[0]]);
            // }
            this.mediaRecorder = new MediaRecorder(newMediaStream);
        } else {
            this.mediaRecorder = new MediaRecorder(this.mediaStream);
        }

        //video/webm; codecs="vp8, vorbis"
        this.initEventListenersOnMediaRecorder();
        this.mediaRecorder.start(TIME_SLICE_MEDIA_RECORDER);
        console.info("started the recording");
    }

    /**
     * @private 
     * Arrêtera automatiquement l'enregistrement après le STOP_RECORDING_TIMEOUT et affichera une notification en haut de la preview video
     */
    startRecordingTimeOut() {
        this.idRecordingTimeout = setTimeout(() => {
            this.stopRecording(false);
            this.element.NOTIFICATION_LIMIT_REACHED_BUTTON.classList.add("enter_in");
            this.element.NOTIFICATION_LIMIT_REACHED_BUTTON.setAttribute("aria-hidden", "false");

            let secondTimeOut = STOP_RECORDING_TIMEOUT / 1000;
            let minute = Math.floor(secondTimeOut / 60);
            let second = secondTimeOut % 60;

            let minuteName = minute > 1 ? this.tradTime.minutePlural : this.tradTime.minute;
            let secondName = second > 1 ? this.tradTime.secondPlural : this.tradTime.second;

            let msg = this.tradTime.placeholder
                .replace(":MINUTE_NUMBER", minute > 0 ? minute.toString() : "")
                .replace(":MINUTE_NAME", minute > 0 ? minuteName : "")
                .replace(":SEPARATOR", second > 0 && minute > 0 ? this.tradTime.separator : "")
                .replace(":SECOND_NUMBER", second > 0 ? second.toString() : "")
                .replace(":SECOND_NAME", second > 0 ? secondName : "");

            let timeOutMsg = this.tradRecorder.notificationTimeoutRecording + " : " + msg;

            this.element.NOTIFICATION_LIMIT_REACHED_BUTTON.querySelector("span").innerText = `${timeOutMsg}`;

            this.idNotificationTimeout = setTimeout(() => {
                this.closeNotificationTimeout();
            }, NOTIFICATION_TIMEOUT);

        }, STOP_RECORDING_TIMEOUT);
    }

    /**
     * @private 
     * Arrêtera automatiquement l'enregistrement si la taille de l'enregistrement dépasse MAX_BYTES_SIZE_RECORDING
     */
    maxSizeRecordingReached() {
        this.stopRecording(false);
        this.element.NOTIFICATION_LIMIT_REACHED_BUTTON.classList.add("enter_in");
        this.element.NOTIFICATION_LIMIT_REACHED_BUTTON.setAttribute("aria-hidden", "false");

        let convertedToMegabytes = MAX_BYTES_SIZE_RECORDING / 1000 / 1000;
        let sizeInMegabytes = "";

        try {
            sizeInMegabytes = new Intl.NumberFormat(document.documentElement.lang, { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(convertedToMegabytes);
        } catch {
            sizeInMegabytes = Math.round(convertedToMegabytes).toFixed(2).toString();
        }

        this.element.NOTIFICATION_LIMIT_REACHED_BUTTON.querySelector("span").innerText = `${this.tradRecorder.notificationLimitSizeReachedRecording} : ${sizeInMegabytes} megabytes`;
        this.idNotificationTimeout = setTimeout(() => {
            this.closeNotificationTimeout();
        }, NOTIFICATION_TIMEOUT);
    }

    /**
     * @private 
     * Permet de fermer la notification qui dit que le temps ou la taille de l'enregistrement a été atteinte.
     * Elle peut être activé par soit un setTimeout ou alors le clique d'un bouton
     */
    closeNotificationTimeout() {
        this.element.NOTIFICATION_LIMIT_REACHED_BUTTON.setAttribute("aria-hidden", "true");
        clearTimeout(this.idNotificationTimeout);
        this.element.NOTIFICATION_LIMIT_REACHED_BUTTON.classList.remove("enter_in");
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
            this.currentByteSizeRecording += blobEvent.data.size;
            this.recordedChunks.push(blobEvent.data);

            if (MAX_BYTES_SIZE_RECORDING != null && this.currentByteSizeRecording > MAX_BYTES_SIZE_RECORDING) {
                this.maxSizeRecordingReached();
            }
        }

        this.mediaRecorder.onstop = () => {
            console.info("Stopped the recording");
            let recordedBlob = new Blob(this.recordedChunks, { type: this.mimeType + "; codecs=vp8, vorbis" });

            URL.revokeObjectURL(this.element.RECORDED_ELEMENT.src);
            URL.revokeObjectURL(this.element.DOWNLOAD_RECORDED_VIDEO_BUTTON.href);

            this.element.RECORDED_ELEMENT.src = URL.createObjectURL(recordedBlob);

            this.element.DOWNLOAD_RECORDED_VIDEO_BUTTON.href = this.element.RECORDED_ELEMENT.src;
            this.element.DOWNLOAD_RECORDED_VIDEO_BUTTON.download = `${Date.now()}_my_recorded_message.webm`;

            if(this.element.DOWNLOAD_RECORDING_AT_END_SWITCH.checked){
                this.element.DOWNLOAD_RECORDED_VIDEO_BUTTON.click();
            }

            //affiche ce qui a été record si ce n'est pas déjà affiché
            this.element.RECORDED_ELEMENT_CONTAINER_DIV.classList.remove("hidden");
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
        this.mediaRecorder.stop();
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

        //si en fullscreen et que j'arrête l'enregistrement sors moi de ce mode
        if (this.isFullscreen) {
            this.toggleFullScreen();
        }

        if (closeRecorderOnStop) {
            this.closeRecorder();
        }
    }

    /**
     * @private
     */
    animateButtonsIn() {
        this.element.START_RECORDING_BUTTON.classList.add("active");
        this.element.START_RECORDING_BUTTON.querySelector(".popup_start_recording").classList.add("hidden");
        this.translateRecButtonToTheRight();

        this.element.START_RECORDING_BUTTON.addEventListener("transitionend", () => {
            this.element.RECORDER_ACTION_BUTTONS_CONTAINER_DIV.classList.remove("off_screen");
            this.element.RECORDER_ACTION_BUTTONS_CONTAINER_DIV.setAttribute("aria-hidden", "false");
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
            this.element.RECORDER_ACTION_BUTTONS_CONTAINER_DIV.setAttribute("aria-hidden", "true");
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

    /**
     * @private 
     * Donnera un support aspect-ratio de 16/9 via javascript
     */
    JSsupportAspectRatio() {
        if (!CSS.supports("aspect-ratio", "16/9")) {
            console.info("Aspect-ratio support via JS");
            this.element.PREVIEW_VIDEO_CONTAINER_DIV.style.height = (this.element.PREVIEW_VIDEO_CONTAINER_DIV.getBoundingClientRect().width / 16) * 9;
            window.addEventListener("resize", () => {
                this.element.PREVIEW_VIDEO_CONTAINER_DIV.style.height = (this.element.PREVIEW_VIDEO_CONTAINER_DIV.getBoundingClientRect().width / 16) * 9;
            });
        }
    }

}
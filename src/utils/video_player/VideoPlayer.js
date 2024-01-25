import { ProgressionSlider } from "./ProgressionSlider.js";
import { VolumeSlider } from "./VolumeSlider.js";

//TODO FIX THE BUFFER ~ not a priority
//TODO IMPLEMENTS canplay event
//TODO IMPLEMENTS waiting event

/**
 * Temps en millisecondes où les controls peuvent être affichés.
 * - Soit lorsqu'on clique dessus sur écran tactile
 * - Soit lorsque la souris est sur la vidéo après un temps d'inactivité
 */
const TIME_CONTROLS_ARE_UP = 3500;

export class VideoPlayer {

    isVideoOver = false;

    /**@private */
    areControlsUp = false;

    idTimeoutControls = null;

    /**
     * @param {HTMLDivElement} videoContainer
     */
    constructor(videoContainer) {

        /**
         * @type {HTMLDivElement}
         */
        this.videoContainer = videoContainer;

        /**
         * @private
         * @type {HTMLVideoElement}
         */
        this.video = videoContainer.querySelector("video");

        //Si ne supporte pas l'API fullscreen fallback sur le video player de base.
        if (!this.supportFullscreen()) {
            this.JSsupportAspectRatio();
            this.video.setAttribute("controls", "");
            return;
        }

        this.buildVideoPlayer();

        /**
         * @private
         * @type {HTMLSpanElement}
         */
        this.timestamp = videoContainer.querySelector(".timestamp");

        /**
         * @private
         * @type {HTMLDivElement}
         */
        this.controls = videoContainer.querySelector(".controls");

        /**
         * @private
         * @type {HTMLButtonElement}
         */
        this.playPauseButton = videoContainer.querySelector(".controls .play_button");

        /**
         * @private
         * @type {HTMLButtonElement}
         */
        this.requestFullScreenButton = videoContainer.querySelector(".controls .full_screen_button");

        /**
         * @private
         * @type {HTMLButtonElement}
         */
        this.volumeButton = this.videoContainer.querySelector(".volume_button");

        /**
         * @private
         * @type {ProgressionSlider}
         */
        this.progressionSlider = new ProgressionSlider(videoContainer.querySelector(".progress_bar"), this);
        this.progressionSlider.setThumbPosition(0);

        /**
         * @private
         * @type {VolumeSlider}
         */
        this.volumeSlider = new VolumeSlider(videoContainer.querySelector(".progress_volume"), this);


        this.retrieveVideoPlayerPreference();
        this.initEventListeners();
    }

    /**@private */
    initEventListeners() {
        this.video.addEventListener("timeupdate", this.timeUpdate.bind(this));
        this.playPauseButton.addEventListener("click", this.playOrPause.bind(this));
        this.video.addEventListener("ended", this.endVideo.bind(this));
        this.requestFullScreenButton.addEventListener("click", this.toggleFullScreen.bind(this));
        this.volumeButton.addEventListener("click", this.toggleMute.bind(this));

        /**Simple function pour set les ARIA */
        this.videoContainer.addEventListener("mouseenter", () => {
            this.controls.setAttribute("aria-hidden", "false");
        });

        /**Simple function pour set les ARIA */
        this.videoContainer.addEventListener("mouseleave", () => {
            this.controls.setAttribute("aria-hidden", "true");
            this.controls.classList.remove("active");
            this.areControlsUp = false;
        });

        this.videoContainer.addEventListener("mousemove", this.hideCursorAndControlsAfterInactivity.bind(this));
        this.videoContainer.addEventListener("click", this.toggleControlsTouchScreen.bind(this));
        this.videoContainer.addEventListener("click", this.playOrPauseViaScreen.bind(this));

        this.video.addEventListener("loadedmetadata", () => {
            this.updateDisplayTimeStamp();
        });

        this.JSsupportAspectRatio();


        //obligé de faire une boucle car même avec l'event loaded il ne me retourne rien même pas le DOM Element pour afficher le temps écoulé à côté du volume
        while (this.timestamp.innerHTML == "") {
            this.updateDisplayTimeStamp();
        }
    }

    /**
     * Peut être également utilisé par ProgressionSlider pour cacher les controls après avoir utilisé le "thumb" pour se déplacer dans la barre du temps
     * UNIQUEMENT POUR LES ECRANS TACTILE */
    startTimeoutCloseControlsTouchScreen() {
        //si la vidéo est en pause ne ferme pas automatiquement les controls
        if (this.isPaused()) {
            return;
        }
        this.idTimeoutControls = setTimeout(() => {
            this.closeControlsTouchScreen();
        }, TIME_CONTROLS_ARE_UP);
    }

    /**@private */
    openControlsTouchScreen() {
        this.controls.classList.add("active");
        this.controls.setAttribute("aria-hidden", "false");
        this.areControlsUp = true;
    }

    /**@private */
    closeControlsTouchScreen() {
        this.controls.classList.remove("active");
        this.controls.setAttribute("aria-hidden", "true");
        this.areControlsUp = false;
    }

    /**
     * @private
     * @param {Event} e 
     */
    toggleControlsTouchScreen(e) {
        if (!this.isTouchScreen()) {
            return;
        }

        clearTimeout(this.idTimeoutControls);

        if (!this.areControlsUp) {
            this.openControlsTouchScreen();
            this.startTimeoutCloseControlsTouchScreen();
        }
        else if (this.areControlsUp && e.target == this.video) {
            this.closeControlsTouchScreen();
        }
    }

    /**
     * @private
     * @param {Event} e 
     * Uniquement sur appareil non tactile, si on clique directement sur la vidéo cela la mettra en pause ou reprendra la lecture
     */
    playOrPauseViaScreen(e) {
        if (e.target != this.video || this.isTouchScreen()) {
            return;
        }

        let pulsePlay = this.videoContainer.querySelector(".pulse_play");
        let pulsePause = this.videoContainer.querySelector(".pulse_pause");

        if (this.isPaused()) {
            pulsePlay.classList.remove("hidden");
            pulsePlay.classList.add("animate");
            pulsePlay.addEventListener("animationend", () => {
                pulsePlay.classList.add("hidden");
                pulsePlay.classList.remove("animate");
            }, { once: true });
        } else {
            pulsePause.classList.remove("hidden");
            pulsePause.classList.add("animate");
            pulsePause.addEventListener("animationend", () => {
                pulsePause.classList.add("hidden");
                pulsePause.classList.remove("animate");
            }, { once: true });
        }
        this.playOrPause();

    }

    /**
     * @private
     * après un temps d'inactivité le curseur et les controls seront cachés MARCHE UNIQUEMENT SUR DES APPAREILS NON TACTILES
     * @see toggleControlsTouchScreen -> pour voir comment cacher les controls sur les appareils tactiles
     */
    hideCursorAndControlsAfterInactivity() {
        if (this.isTouchScreen()) {
            return;
        }
        clearTimeout(this.idTimeoutControls);
        this.videoContainer.style.cursor = "";
        this.controls.classList.remove("hide");
        this.controls.setAttribute("aria-hidden", "false");

        this.idTimeoutControls = setTimeout(() => {
            this.videoContainer.style.cursor = "none";
            this.controls.classList.add("hide");
            this.controls.setAttribute("aria-hidden", "true");
        }, TIME_CONTROLS_ARE_UP)
    }

    /**@private */
    endVideo() {
        //video done
        if (this.progressionSlider.getProgression() == 100) {
            this.isVideoOver = true;

            if(this.isTouchScreen()){
                this.openControlsTouchScreen();
            }
            
            this.playPauseButton.querySelector(".play_icon").classList.add("hidden");
            this.playPauseButton.querySelector(".pause_icon").classList.add("hidden");
            this.playPauseButton.querySelector(".replay_icon").classList.remove("hidden");
        } else {
            console.info("waiting for more data;");
        }
    }

    /**@private */
    playOrPause() {
        if (this.isVideoOver) {
            this.restartVideo();
            return;
        }

        if (this.isPaused()) {
            this.resume();
        } else {
            this.pause();
        }
    }

    /**@private */
    retrieveVideoPlayerPreference() {
        let videoPlayerPreference = JSON.parse(localStorage.getItem("video_player_preference"));

        if (!videoPlayerPreference) {
            this.volumeSlider.setThumbPosition(100);
            return;
        }

        if (videoPlayerPreference.isMuted) {
            this.toggleMute();
        }

        if (this.isTouchScreen()) {
            this.volumeSlider.setThumbPosition(100);
        } else {
            this.volumeSlider.setThumbPosition(videoPlayerPreference.volume ?? 100);
        }
    }

    saveVideoPlayerPreference() {
        let preference = {
            isMuted: this.video.muted,
            volume: this.volumeSlider.getVolume()
        }

        localStorage.setItem("video_player_preference", JSON.stringify(preference));
    }

    /**
     * @private
     * Ajoute un support en JS si la propriété aspect-ratio en CSS n'existe pas
     */
    JSsupportAspectRatio() {
        if (!CSS.supports("aspect-ratio", "16/9")) {
            console.info("Aspect-ratio support via JS");
            this.videoContainer.style.height = (this.videoContainer.getBoundingClientRect().width / 16) * 9;
            window.addEventListener("resize", () => {
                this.videoContainer.style.height = (this.videoContainer.getBoundingClientRect().width / 16) * 9;
            });
        }
    }

    /**
     * peut-être aussi utilisé par ProgressionSlider au cas où remonterait la ligne du temps alors que la vidéo est finie à partir du "thumb"
     */
    restartVideo() {
        this.isVideoOver = false;
        this.resume(false);
        this.playPauseButton.querySelector(".play_icon").classList.add("hidden");
        this.playPauseButton.querySelector(".pause_icon").classList.remove("hidden");
        this.playPauseButton.querySelector(".replay_icon").classList.add("hidden");
    }

    /**
     * @private 
     * Si je suis en train de toucher à la ligne du temps mets juste à jour le timestamp
     * Sinon mets à jour le timestamp ainsi que le "thumb" dans la ligne du temps
     */
    timeUpdate() {
        this.updateDisplayTimeStamp();
        if (this.progressionSlider.isPointerDown) {
            return;
        }

        if (this.video.buffered.length != 0) {
            this.progressionSlider.setBufferedLength((this.video.buffered.end(0) / this.getDuration()) * 100);
        }

        this.progressionSlider.setThumbPosition((this.getCurrentTime() / this.getDuration()) * 100);

    }

    /**
     * @private 
     * Affiche la durée de la vidéo ainsi que le temps écoulé à côté du volume
     */
    updateDisplayTimeStamp() {
        try {
            this.timestamp.innerHTML = `${this.formatTime(Math.round(this.getCurrentTime()))} / ${this.formatTime(Math.round(this.getDuration()))}`;
        } catch (e) {
            this.timestamp.innerHTML = "error";
        }
    }

    /**
     * @private
     * @param {number} second 
     */
    formatTime(second) {
        let minute = Math.floor(second / 60);
        second = second % 60;

        return `${(minute < 10 ? "0" + minute.toString() : minute.toString())}:${(second < 10 ? "0" + second.toString() : second.toString())}`;
    }

    /**@private */
    toggleFullScreen() {
        if (!document.fullscreenElement && !document.mozFullScreen && !document.webkitIsFullScreen && !document.msFullscreenElement) {
            if (this.videoContainer.requestFullscreen) {
                this.videoContainer.requestFullscreen();
            } else if (this.videoContainer.mozRequestFullScreen) {
                this.videoContainer.mozRequestFullScreen();
            } else if (this.videoContainer.webkitRequestFullscreen) {
                this.videoContainer.webkitRequestFullscreen();
            } else if (this.videoContainer.msRequestFullscreen) {
                this.videoContainer.msRequestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
        }

        //tous les requestFullScreen ne peuvent pas renvoyer une promesse, donc on va essayer de "race"
        setTimeout(() => {
            this.ifTouchScreenStartTimeout();
        });
    }

    /**@private */
    supportFullscreen() {
        if (this.videoContainer.requestFullscreen) {
            return true;
        } else if (this.videoContainer.mozRequestFullScreen) {
            return true;
        } else if (this.videoContainer.webkitRequestFullscreen) {
            return true;
        } else if (this.videoContainer.msRequestFullscreen) {
            return true;
        }

        return false;
    }

    pause(shouldToggleIcons = true) {
        this.video.pause();

        if (shouldToggleIcons) {
            this.togglePlayPauseIcons();
        }
    }

    resume(shouldToggleIcons = true) {
        this.video.play()
            .then(() => {
                if (shouldToggleIcons) {
                    this.togglePlayPauseIcons();
                }
                //si la vidéo joue cache les controls
                this.ifTouchScreenStartTimeout();
            });

    }

    stop() {
        this.pause(false);
    }

    /**@private */
    togglePlayPauseIcons() {
        this.playPauseButton.querySelector(".play_icon").classList.toggle("hidden");
        this.playPauseButton.querySelector(".pause_icon").classList.toggle("hidden");
    }

    getDuration() {
        if (this.video.duration == Infinity) {
            window.alert("The video duration is set to INFINITY, this isn't normal, please contact the responsible person.");
            throw new Error("Video duration set to infinity");
        }
        return this.video.duration;
    }

    getCurrentTime() {
        return this.video.currentTime;
    }

    isPaused() {
        return this.video.paused;
    }

    getVolume() {
        return this.video.volume;
    }

    /**
     * @param {number} volume 
     */
    setVolume(volume) {
        this.video.volume = volume;
    }

    toggleMute() {
        this.volumeButton.classList.toggle("muted");
        this.video.muted = !this.video.muted;
        this.saveVideoPlayerPreference();
    }

    /**
     * @param {number} timeInSeconds
     * peut être appelé par ProgressionSlider
     */
    setVideoCurrentTime(timeInSeconds) {
        this.video.currentTime = timeInSeconds;
    }

    isTouchScreen() {
        return matchMedia('(hover: none)').matches
        // return (('ontouchstart' in window) ||
        //     (navigator.maxTouchPoints > 0));
    }

    /**@private */
    ifTouchScreenStartTimeout() {
        if (this.isTouchScreen()) {
            clearTimeout(this.idTimeoutControls);
            this.startTimeoutCloseControlsTouchScreen();
        }
    }

    /**@private */
    buildVideoPlayer() {
        // console.warn("not building the player");
        // return;

        let pulseContainer = document.createElement("div");
        pulseContainer.classList.add("pulse_container");
        pulseContainer.innerHTML =
            `
        <div class="pulse_play hidden">
            <svg width="75" class="play_icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512"><!--!Font Awesome Free 6.5.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><path d="M73 39c-14.8-9.1-33.4-9.4-48.5-.9S0 62.6 0 80V432c0 17.4 9.4 33.4 24.5 41.9s33.7 8.1 48.5-.9L361 297c14.3-8.7 23-24.2 23-41s-8.7-32.2-23-41L73 39z"/></svg>
        </div>
        <div class="pulse_pause hidden">
            <svg width="75" class="pause_icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512"><!--!Font Awesome Free 6.5.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><path d="M48 64C21.5 64 0 85.5 0 112V400c0 26.5 21.5 48 48 48H80c26.5 0 48-21.5 48-48V112c0-26.5-21.5-48-48-48H48zm192 0c-26.5 0-48 21.5-48 48V400c0 26.5 21.5 48 48 48h32c26.5 0 48-21.5 48-48V112c0-26.5-21.5-48-48-48H240z"/></svg>
        </div>
        `

        this.videoContainer.appendChild(pulseContainer);

        let controls = document.createElement("div");
        controls.setAttribute("aria-hidden", "true");
        controls.classList.add("controls");
        controls.innerHTML +=
            `
            <div class="progress_bar" role="slider" aria-valuemin="0%" aria-valuemax="100%"></div>

            <div class="buttons_container">
                <button class="play_button">
                    <svg width="18" class="play_icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512"><!--!Font Awesome Free 6.5.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><path d="M73 39c-14.8-9.1-33.4-9.4-48.5-.9S0 62.6 0 80V432c0 17.4 9.4 33.4 24.5 41.9s33.7 8.1 48.5-.9L361 297c14.3-8.7 23-24.2 23-41s-8.7-32.2-23-41L73 39z"/></svg>
                    <svg width="18" class="pause_icon hidden" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512"><!--!Font Awesome Free 6.5.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><path d="M48 64C21.5 64 0 85.5 0 112V400c0 26.5 21.5 48 48 48H80c26.5 0 48-21.5 48-48V112c0-26.5-21.5-48-48-48H48zm192 0c-26.5 0-48 21.5-48 48V400c0 26.5 21.5 48 48 48h32c26.5 0 48-21.5 48-48V112c0-26.5-21.5-48-48-48H240z"/></svg>
                    <svg width="28" class="replay_icon hidden" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--!Font Awesome Free 6.5.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><path d="M125.7 160H176c17.7 0 32 14.3 32 32s-14.3 32-32 32H48c-17.7 0-32-14.3-32-32V64c0-17.7 14.3-32 32-32s32 14.3 32 32v51.2L97.6 97.6c87.5-87.5 229.3-87.5 316.8 0s87.5 229.3 0 316.8s-229.3 87.5-316.8 0c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0c62.5 62.5 163.8 62.5 226.3 0s62.5-163.8 0-226.3s-163.8-62.5-226.3 0L125.7 160z"/></svg>
                </button>

                <button class="volume_button">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" class="high" viewBox="0 0 640 512"><!--!Font Awesome Free 6.5.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><path d="M533.6 32.5C598.5 85.2 640 165.8 640 256s-41.5 170.7-106.4 223.5c-10.3 8.4-25.4 6.8-33.8-3.5s-6.8-25.4 3.5-33.8C557.5 398.2 592 331.2 592 256s-34.5-142.2-88.7-186.3c-10.3-8.4-11.8-23.5-3.5-33.8s23.5-11.8 33.8-3.5zM473.1 107c43.2 35.2 70.9 88.9 70.9 149s-27.7 113.8-70.9 149c-10.3 8.4-25.4 6.8-33.8-3.5s-6.8-25.4 3.5-33.8C475.3 341.3 496 301.1 496 256s-20.7-85.3-53.2-111.8c-10.3-8.4-11.8-23.5-3.5-33.8s23.5-11.8 33.8-3.5zm-60.5 74.5C434.1 199.1 448 225.9 448 256s-13.9 56.9-35.4 74.5c-10.3 8.4-25.4 6.8-33.8-3.5s-6.8-25.4 3.5-33.8C393.1 284.4 400 271 400 256s-6.9-28.4-17.7-37.3c-10.3-8.4-11.8-23.5-3.5-33.8s23.5-11.8 33.8-3.5zM301.1 34.8C312.6 40 320 51.4 320 64V448c0 12.6-7.4 24-18.9 29.2s-25 3.1-34.4-5.3L131.8 352H64c-35.3 0-64-28.7-64-64V224c0-35.3 28.7-64 64-64h67.8L266.7 40.1c9.4-8.4 22.9-10.4 34.4-5.3z"/></svg>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" class="low hidden" viewBox="0 0 448 512"><!--!Font Awesome Free 6.5.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><path d="M301.1 34.8C312.6 40 320 51.4 320 64V448c0 12.6-7.4 24-18.9 29.2s-25 3.1-34.4-5.3L131.8 352H64c-35.3 0-64-28.7-64-64V224c0-35.3 28.7-64 64-64h67.8L266.7 40.1c9.4-8.4 22.9-10.4 34.4-5.3zM412.6 181.5C434.1 199.1 448 225.9 448 256s-13.9 56.9-35.4 74.5c-10.3 8.4-25.4 6.8-33.8-3.5s-6.8-25.4 3.5-33.8C393.1 284.4 400 271 400 256s-6.9-28.4-17.7-37.3c-10.3-8.4-11.8-23.5-3.5-33.8s23.5-11.8 33.8-3.5z"/></svg>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" class="none hidden" viewBox="0 0 320 512"><!--!Font Awesome Free 6.5.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><path d="M320 64c0-12.6-7.4-24-18.9-29.2s-25-3.1-34.4 5.3L131.8 160H64c-35.3 0-64 28.7-64 64v64c0 35.3 28.7 64 64 64h67.8L266.7 471.9c9.4 8.4 22.9 10.4 34.4 5.3S320 460.6 320 448V64z"/></svg>
                </button>
                <div class="volume_container">
                    <div class="progress_volume" aria-valuemin="0%" aria-valuemax="100%" role="slider"></div>
                </div>
                <span class="timestamp"></span>
                <button class="full_screen_button">
                    <svg width="22" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><!--!Font Awesome Free 6.5.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><path d="M32 32C14.3 32 0 46.3 0 64v96c0 17.7 14.3 32 32 32s32-14.3 32-32V96h64c17.7 0 32-14.3 32-32s-14.3-32-32-32H32zM64 352c0-17.7-14.3-32-32-32s-32 14.3-32 32v96c0 17.7 14.3 32 32 32h96c17.7 0 32-14.3 32-32s-14.3-32-32-32H64V352zM320 32c-17.7 0-32 14.3-32 32s14.3 32 32 32h64v64c0 17.7 14.3 32 32 32s32-14.3 32-32V64c0-17.7-14.3-32-32-32H320zM448 352c0-17.7-14.3-32-32-32s-32 14.3-32 32v64H320c-17.7 0-32 14.3-32 32s14.3 32 32 32h96c17.7 0 32-14.3 32-32V352z"/></svg>
                </button>
            </div>
        `;
        this.videoContainer.appendChild(controls);
    }
}
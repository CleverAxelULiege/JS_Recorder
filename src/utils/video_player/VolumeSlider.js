import { VideoPlayer } from "./VideoPlayer.js";

export class VolumeSlider {

    /**@private */
    percentPosition = 0;

    /**
     * @param {HTMLDivElement} rangeSlider 
     * @param {VideoPlayer} videoPlayer
     */
    constructor(rangeSlider, videoPlayer) {
        /**@type {HTMLDivElement} */
        this.rangeSlider = rangeSlider;
        this.buildRangeSlider();

        this.thumbButton = rangeSlider.querySelector(".thumb");
        this.thumbSize = this.thumbButton.getBoundingClientRect().width; 

        if(this.thumbSize == 0){
            console.warn("Thumb size to 0, will set to 10 by default");
            this.thumbSize = 10;
        }

        /**
         * @private
         * @type {VideoPlayer}
        */
        this.videoPlayer = videoPlayer;


        /**
         * @private
         * @type {HTMLButtonElement} 
         */
        this.thumbButton = rangeSlider.querySelector(".thumb");
        // this.thumbSize = this.thumbButton.getBoundingClientRect().width;
        
        this.thumbButton.style.left = `calc(${this.percentPosition}% - ${this.thumbSize / 2}px)`;

        /**@type {HTMLDivElement} */
        this.progressDone = rangeSlider.querySelector(".done");

        /**
         * @private
         * @type {HTMLButtonElement}
         */
        this.volumeButton = videoPlayer.videoContainer.querySelector(".volume_button");

        this.eventPointerMove = this.windowMove.bind(this);
        this.eventPointerUp = this.windowUp.bind(this);

        this.initEventListeners();
    }

    /**@private */
    buildRangeSlider() {
        this.rangeSlider.innerHTML =
            `
            <div class="custom_range_slider">
                <div class="rail"></div>
                <div class="done"></div>
                <button class="thumb"></button>
            </div>
        `;
    }

    /**@private */
    initEventListeners() {
        this.rangeSlider.querySelector(".custom_range_slider").addEventListener("mousedown", (e) => {
            this.isPointerDown = true;
            this.calculateAndSetPercentPosition(e);
            window.addEventListener("mousemove", this.eventPointerMove);
            window.addEventListener("mouseup", this.eventPointerUp);
        });
    }

    /**
     * @param {number} percent
     */
    setThumbPosition(percent) {
        this.percentPosition = percent;

        if (this.percentPosition >= 50) {
            this.setHighVolumeIcon();
        }
        else if (this.percentPosition <= 50 && this.percentPosition > 0) {
            this.setLowVolumeIcon();
        } else {
            this.setNoVolumeIcon();
        }

        this.rangeSlider.setAttribute("aria-valuenow", `${Math.ceil(this.percentPosition)}%`);
        this.thumbButton.style.left = `calc(${this.percentPosition}% - ${this.thumbSize / 2}px)`;
        this.progressDone.style.width = `calc(${this.percentPosition}% + ${this.thumbSize / 2}px)`;
        this.videoPlayer.setVolume(this.percentPosition / 100);
    }


    /**
     * @private
     * @param {Event} e 
     */
    calculateAndSetPercentPosition(e) {
        let relativePositionOnSlider = e.clientX - this.rangeSlider.querySelector(".custom_range_slider").getBoundingClientRect().left;
        this.percentPosition = (relativePositionOnSlider / this.rangeSlider.querySelector(".custom_range_slider").getBoundingClientRect().width) * 100;

        if (this.percentPosition < 0) {
            this.percentPosition = 0;
        }
        else if (this.percentPosition > 100) {
            this.percentPosition = 100;
        }

        this.setThumbPosition(this.percentPosition);

        this.progressDone.style.width = `${this.percentPosition}%`;
        this.videoPlayer.saveVideoPlayerPreference();

    }

    getVolume(){
        return this.percentPosition;
    }

    /**
     * @private
     * @param {Event} e 
     */
    windowMove(e) {
        if (!this.isPointerDown) {
            return;
        }

        this.calculateAndSetPercentPosition(e);
    }

    /**@private */
    windowUp() {
        this.isPointerDown = false;
        window.removeEventListener("mousemove", this.eventPointerMove);
        window.removeEventListener("mouseup", this.eventPointerUp);
    }

    /**@private */
    setHighVolumeIcon() {
        this.volumeButton.querySelector(".high").classList.remove("hidden");
        this.volumeButton.querySelector(".low").classList.add("hidden");
        this.volumeButton.querySelector(".none").classList.add("hidden");
    }

    /**@private */
    setLowVolumeIcon() {
        this.volumeButton.querySelector(".high").classList.add("hidden");
        this.volumeButton.querySelector(".low").classList.remove("hidden");
        this.volumeButton.querySelector(".none").classList.add("hidden");
    }

    /**@private */
    setNoVolumeIcon() {
        this.volumeButton.querySelector(".high").classList.add("hidden");
        this.volumeButton.querySelector(".low").classList.add("hidden");
        this.volumeButton.querySelector(".none").classList.remove("hidden");
    }
}
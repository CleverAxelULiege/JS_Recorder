import { AudioVisualizer } from "./utils/AudioVisualizer.js";
import { Device } from "./utils/Device.js";
import { Page } from "./utils/Page.js";
import { Recorder } from "./utils/Recorder.js";
import "./utils/typedefs.js"
import { VideoPlayer } from "./utils/video_player/VideoPlayer.js";

/**@type {MediaStreamConstraints} */
let mediaStreamConstraint;

let page = new Page(document.documentElement.lang);
let device = new Device();

/**@type {Recorder|null} */
let recorder = null;

/**@type {VideoPlayer|null} */
let videoPlayer = null;

export const IS_MOBILE = device.checkIfMobile();
export const IS_MOBILE_OR_TABLET = device.checkIfMobileOrTablet();
export const IS_TOUCH_SCREEN = device.checkIfTouchScreen();
export const SUPPORT_FULLSCREEN = device.supportFullscreen();

init();

async function init() {
    (await page.fetchTraductionAndBuildPage()).retrieveDOMElements();
    try {
        videoPlayer = new VideoPlayer(document.querySelector(".video_player"));
        // console.log("audio/webm:"+MediaRecorder.isTypeSupported('audio/webm;codecs=opus'));
        //askPermissions peut rater et nous envoyer dans le CATCH
        let deviceDetails = await device.askPermissions();

        mediaStreamConstraint = {
            audio: deviceDetails.audio.hasPermission && deviceDetails.audio.exists,
            video: deviceDetails.video.hasPermission && deviceDetails.video.exists
        }

        page
        .removeUnavailableDeviceFromSelectableDevice(mediaStreamConstraint)
        .enumerateDevicesInSelect(deviceDetails.audio.deviceId, deviceDetails.video.deviceId, mediaStreamConstraint)
        .displayPossibilityToRecord();

        if(!mediaStreamConstraint.video){
            page.displayVideoDeviceUnavailable();
        }
        
        let audioVisualizer = new AudioVisualizer();

        recorder = new Recorder(page.traduction.recorder,page.traduction.time, audioVisualizer, videoPlayer);
        recorder
        .setDeviceConstraint(mediaStreamConstraint, deviceDetails.audio.deviceId, deviceDetails.video.deviceId)
        .initEventListeners()
        .startStreamingToPreviewVideo()
        .then(() => {
            // recorder.openRecorder();
        });

        page.updateDeviceToMediaConstraint(recorder.updateDevice());
    } catch (status) {
        page
        .displayErrorsFromDevice(status, page.traduction.errorMessages.device)
        .removePossibilityToRecord();
    } finally{
        page.removeLoader();
    }
}
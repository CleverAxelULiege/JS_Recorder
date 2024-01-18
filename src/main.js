import { Device } from "./utils/Device.js";
import { Page } from "./utils/Page.js";
import { Recorder } from "./utils/Recorder.js";
import "./utils/typedefs.js"

/**@type {MediaStreamConstraints} */
let mediaStreamConstraint;

let page = new Page(document.documentElement.lang);
let device = new Device();

/**@type {Recorder|null} */
let recorder = null;

export const IS_MOBILE = device.checkIfMobile();
export const IS_MOBILE_OR_TABLET = device.checkIfMobileOrTablet();

init();

async function init() {
    (await page.fetchTraductionAndBuildPage()).retrieveDOMElements();
    try {
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
        

        recorder = new Recorder(page.traduction.recorder);
        recorder
        .setDeviceConstraint(mediaStreamConstraint, deviceDetails.audio.deviceId, deviceDetails.video.deviceId)
        .initEventListeners()
        .startStreamingToPreviewVideo()
        .then(() => {
            recorder.openRecorder();
        });

        page.updateDeviceToMediaConstraint(recorder.updateDevice());

    } catch (status) {
        page
        .displayErrorsFromDevice(status, page.traduction.errorMessages.device)
        .removePossibilityToRecord();
    }
}
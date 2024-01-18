/**
  @typedef IDeviceDetails
  @property {boolean} exists
  @property {boolean} hasPermission
  @property {string|undefined} deviceId
*/

//#region DOM_ELEMENT
/**
 * @typedef IDOMElement
 * @property {HTMLDivElement}  SELECTABLE_DEVICES_CONTAINER_DIV
 * @property {HTMLElement} MAIN
 * @property {HTMLDivElement} RECORD_FROM_SITE_DIV
 * @property {HTMLSelectElement} VIDEO_DEVICE_SELECT
 * @property {HTMLSelectElement} AUDIO_DEVICE_SELECT
 * @property {HTMLDivElement} ERROR_BOX_DEVICE_DIV
 */

/**
 * @typedef IDOMElementRecorder
 * @property {HTMLButtonElement} OPEN_RECORDER_BUTTON
 * @property {HTMLDivElement} CLOSE_RECORDER_BUTTON
 * @property {HTMLDivElement} RECORDER_CONTAINER_DIV
 * @property {HTMLDivElement} RECORDER_DIV
 * @property {HTMLTitleElement} VIDEO_DEVICE_DISABLED_H3
 * @property {HTMLButtonElement} START_RECORDING_BUTTON
 * @property {HTMLButtonElement} STOP_RECORDING_BUTTON
 * @property {HTMLButtonElement} PAUSE_RESUME_BUTTON
 * @property {HTMLDivElement} RECORDER_ACTION_BUTTONS_CONTAINER_DIV
 * @property {HTMLButtonElement} TOGGLE_VIDEO_DEVICE_BUTTON
 * @property {HTMLVideoElement} PREVIEW_VIDEO
 * @property {HTMLVideoElement} RECORDED_VIDEO
 * @property {HTMLVideoElement} PREVIEW_VIDEO_CONTAINER_DIV
 * @property {HTMLButtonElement} REQUEST_FULL_SCREEN_BUTTON
 * @property {HTMLSpanElement} TIME_ELAPSED_SINCE_RECORD_STARTED_SPAN
 */
//#endregion

//#region TRADUCTION
/**
 * @typedef ITraduction
 * @property {{audio:string, video:string}} device
 * @property {ITraductionRecorder} recorder
 * @property {{
 *  device:ITraductionErrorDevice
 * }} errorMessages
 */

/**
 * @typedef ITraductionErrorDevice
 * @property {string} default
 * @property {string} unavailableAudioDeviceVideoDevice
 * @property {string} unavailablePermissionToUseDevices
 * @property {string} unavailablePermissionToUseAudioDeviceWithVideoDevice
 * @property {string} unknownError
 */

/**
 * @typedef ITraductionRecorder
 * @property {string} main
 * @property {string} leaveWhileRecording
 * @property {{
        * disable:string,
        * button:{
            * stop:string,
            * resume:string,
            * start:string,
            * toggleVideoDevice:string,
            * requestFullScreen:string
        * }
 *  }
 * } video
 */
//#endregion
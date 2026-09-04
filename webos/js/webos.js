/**
 * StreamGlass TV - webOS Bridge & Remote Navigation Handler
 * Safe integration with LG webOS Luna services and standard TV Remote keys.
 * Runs completely safe in both LG TV webOS and Desktop browser simulation.
 */

(function (global) {
  'use strict';

  var RemoteKeys = {
    // Spatial navigation
    UP: 38,
    DOWN: 40,
    LEFT: 37,
    RIGHT: 39,
    ENTER: 13,
    OK: 13,

    // WebOS and standard Return/Back
    BACK: 461,
    ESC: 27,
    BACKSPACE: 8,

    // Playback media keys
    PLAY: 415,
    PAUSE: 19,
    PLAY_PAUSE: 179,
    STOP: 413,
    FAST_FWD: 417,
    REWIND: 412,

    // Color buttons
    RED: 403,
    GREEN: 404,
    YELLOW: 405,
    BLUE: 406,

    // Info & Menu
    INFO: 457,
    MENU: 458,
    GUIDE: 459,

    // Volume
    VOLUME_UP: 447,
    VOLUME_DOWN: 448
  };

  var WebOSBridge = {
    RemoteKeys: RemoteKeys,
    isWebOS: false,
    deviceInfo: {
      isWebOS: false,
      modelName: 'Browser Simulation',
      version: 'Web Standard',
      sdkVersion: 'N/A',
      screenResolution: '1920x1080',
      uhd: true,
      oled: false,
      audioCodecSupport: ['AAC', 'MP3', 'Opus', 'FLAC', 'PCM'],
      videoCodecSupport: ['H.264 / AVC', 'VP9', 'AV1', 'HEVC / H.265 (TV dependent)']
    },

    init: function () {
      var self = this;
      self.isWebOS = (typeof window.webOS !== 'undefined') || /Web0S|webOS/i.test(navigator.userAgent);
      self.deviceInfo.isWebOS = self.isWebOS;

      if (window.screen) {
        self.deviceInfo.screenResolution = window.screen.width + 'x' + window.screen.height;
      }

      if (self.isWebOS && window.webOS && typeof window.webOS.deviceInfo === 'function') {
        try {
          window.webOS.deviceInfo(function (info) {
            if (info) {
              self.deviceInfo.modelName = info.modelName || 'LG webOS TV';
              self.deviceInfo.version = info.version || info.sdkVersion || 'webOS';
              self.deviceInfo.sdkVersion = info.sdkVersion || 'webOS SDK';
              self.deviceInfo.uhd = !!info.uhd;
              self.deviceInfo.oled = !!info.oled;
              self.deviceInfo.screenResolution = (info.screenWidth || 1920) + 'x' + (info.screenHeight || 1080);
              self.deviceInfo.audioCodecSupport = ['AAC', 'AC3', 'E-AC3', 'Dolby Digital', 'PCM', 'MP3'];
              self.deviceInfo.videoCodecSupport = ['H.264 / AVC', 'HEVC / H.265', 'VP9', 'AV1', 'MPEG-4'];
            }
          });
        } catch (e) {
          // Graceful fallback
        }
      } else if (self.isWebOS) {
        var match = navigator.userAgent.match(/webOS[./](\d+(\.\d+)?)/i);
        self.deviceInfo.modelName = 'LG Smart TV';
        self.deviceInfo.version = match ? 'webOS ' + match[1] : 'webOS TV';
        self.deviceInfo.uhd = true;
      }
    },

    getDeviceInfo: function () {
      return this.deviceInfo;
    },

    /**
     * Maps any incoming KeyboardEvent to a normalized action name.
     */
    mapKeyEventToAction: function (event) {
      var code = event.keyCode || event.which;

      if (code === RemoteKeys.UP || event.key === 'ArrowUp') return 'UP';
      if (code === RemoteKeys.DOWN || event.key === 'ArrowDown') return 'DOWN';
      if (code === RemoteKeys.LEFT || event.key === 'ArrowLeft') return 'LEFT';
      if (code === RemoteKeys.RIGHT || event.key === 'ArrowRight') return 'RIGHT';
      if (code === RemoteKeys.ENTER || code === RemoteKeys.OK || event.key === 'Enter') return 'OK';

      if (code === RemoteKeys.BACK || code === RemoteKeys.ESC || code === RemoteKeys.BACKSPACE || event.key === 'Escape' || event.key === 'Backspace') {
        return 'BACK';
      }

      if (code === RemoteKeys.PLAY || code === RemoteKeys.PLAY_PAUSE || event.key === 'MediaPlayPause' || event.key === ' ') {
        return 'PLAY_PAUSE';
      }
      if (code === RemoteKeys.PAUSE) return 'PAUSE';
      if (code === RemoteKeys.STOP) return 'STOP';
      if (code === RemoteKeys.FAST_FWD || event.key === 'MediaFastForward' || event.key === 'f') return 'FAST_FORWARD';
      if (code === RemoteKeys.REWIND || event.key === 'MediaRewind' || event.key === 'r') return 'REWIND';

      if (code === RemoteKeys.INFO || event.key === 'i' || event.key === 'I') return 'INFO';
      if (code === RemoteKeys.RED || event.key === 'a' || event.key === 'A') return 'AUDIO_MENU';
      if (code === RemoteKeys.GREEN || event.key === 's' || event.key === 'S') return 'SUBTITLE_MENU';
      if (code === RemoteKeys.YELLOW || event.key === 'd' || event.key === 'D') return 'DIAGNOSTICS';

      return null;
    }
  };

  WebOSBridge.init();

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = WebOSBridge;
  } else {
    global.WebOSBridge = WebOSBridge;
  }
})(typeof window !== 'undefined' ? window : this);

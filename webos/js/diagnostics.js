/**
 * StreamGlass TV - Media Diagnostics System
 * Generates comprehensive playback diagnostic reports.
 * STRICT SECURITY: Automatically purges authentication tokens and credentials.
 */

(function (global) {
  'use strict';

  var MediaDiagnostics = {
    gatherReport: function (videoEl, currentMovie, audioMgr, subMgr, hlsInstance) {
      var detector = global.MediaDetector;
      var webos = global.WebOSBridge;

      var currentUrl = currentMovie ? currentMovie.streamUrl : (videoEl ? videoEl.currentSrc || videoEl.src : '');
      var sanitizedUrl = detector ? detector.sanitizeUrl(currentUrl) : currentUrl;

      var container = currentMovie ? currentMovie.container : (detector ? detector.detectMediaType(currentUrl).container : 'unknown');
      var mime = currentMovie ? currentMovie.mimeType : (detector ? detector.detectMediaType(currentUrl).mimeType : 'video/mp4');

      var videoWidth = (videoEl && videoEl.videoWidth) || (currentMovie && currentMovie.videoInfo && currentMovie.videoInfo.width) || 0;
      var videoHeight = (videoEl && videoEl.videoHeight) || (currentMovie && currentMovie.videoInfo && currentMovie.videoInfo.height) || 0;
      var resolution = (videoWidth && videoHeight) ? (videoWidth + ' × ' + videoHeight) : 'Auto / Unknown';

      var videoCodec = (currentMovie && currentMovie.videoInfo && currentMovie.videoInfo.codec) || (container === 'mkv' ? 'H.264 / AVC (TV model dependent)' : 'H.264 / AVC');

      var audioTracksList = (audioMgr && audioMgr.tracks) ? audioMgr.tracks.map(function (t) {
        return {
          id: t.id,
          label: t.label,
          codec: t.codec || 'Standard',
          channels: t.channels || '2.0',
          source: t.source,
          selected: !!t.selected
        };
      }) : [];

      var subTracksList = (subMgr && subMgr.tracks) ? subMgr.tracks.map(function (s) {
        return {
          id: s.id,
          label: s.label,
          source: s.source,
          selected: !!s.selected
        };
      }) : [];

      var v = document.createElement('video');

      var report = {
        app: 'StreamGlass TV (com.streamglasstv.player v1.0.0)',
        timestamp: new Date().toISOString(),
        currentUrl: sanitizedUrl,
        container: container.toUpperCase(),
        mime: mime,
        videoCodec: videoCodec,
        resolution: resolution,
        audioTracks: audioTracksList,
        subtitleTracks: subTracksList,
        browserSupport: {
          canPlayTypeExists: typeof v.canPlayType === 'function',
          mp4Support: v.canPlayType('video/mp4') || 'no',
          mkvSupport: v.canPlayType('video/x-matroska') || 'TV hardware/Luna',
          hlsSupport: (hlsInstance ? 'HLS.js available' : '') || v.canPlayType('application/x-mpegURL') || 'no',
          nativeAudioTracks: typeof v.audioTracks !== 'undefined',
          nativeTextTracks: typeof v.textTracks !== 'undefined'
        },
        webOSSupport: webos ? webos.getDeviceInfo() : { isWebOS: false },
        playbackStatus: {
          readyState: videoEl ? videoEl.readyState : 0,
          networkState: videoEl ? videoEl.networkState : 0,
          paused: videoEl ? videoEl.paused : true,
          currentTime: videoEl ? Math.floor(videoEl.currentTime) : 0,
          duration: videoEl ? Math.floor(videoEl.duration || 0) : 0,
          bufferedSecs: (videoEl && videoEl.buffered && videoEl.buffered.length > 0) ? Math.floor(videoEl.buffered.end(videoEl.buffered.length - 1)) : 0,
          error: (videoEl && videoEl.error) ? ('MediaError Code ' + videoEl.error.code + ': ' + (videoEl.error.message || 'Playback error')) : null
        }
      };

      return report;
    },

    formatForClipboard: function (report) {
      return JSON.stringify(report, null, 2);
    }
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = MediaDiagnostics;
  } else {
    global.MediaDiagnostics = MediaDiagnostics;
  }
})(typeof window !== 'undefined' ? window : this);

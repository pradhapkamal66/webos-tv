/**
 * StreamGlass TV - Media Capability Manager
 * Target: LG webOS TV (WebOS 4.x - 24+) and Desktop Browser Fallback
 */

(function (global) {
  'use strict';

  function detectBrowserSupport() {
    var v = document.createElement('video');
    var canPlayTypeExists = typeof v.canPlayType === 'function';
    var mediaSourceSupported = typeof window.MediaSource !== 'undefined';
    var audioTracksSupported = typeof v.audioTracks !== 'undefined';
    var textTracksSupported = typeof v.textTracks !== 'undefined';

    return {
      canPlayTypeExists: canPlayTypeExists,
      mediaSourceSupported: mediaSourceSupported,
      audioTracksSupported: audioTracksSupported,
      textTracksSupported: textTracksSupported,
      userAgent: navigator.userAgent
    };
  }

  function detectWebOSSupport() {
    var isWebOS = (typeof window.webOS !== 'undefined') || /Web0S|webOS/i.test(navigator.userAgent);
    var webosVersion = 'Desktop Simulation / Browser';
    var model = 'Generic Web Client';
    var uhd = false;
    var oled = false;

    if (isWebOS && window.webOS && window.webOS.deviceInfo) {
      try {
        window.webOS.deviceInfo(function (info) {
          if (info) {
            webosVersion = info.version || info.sdkVersion || 'webOS';
            model = info.modelName || 'LG Smart TV';
            uhd = !!info.uhd;
            oled = !!info.oled;
          }
        });
      } catch (e) {
        // Safe catch
      }
    } else if (isWebOS) {
      var match = navigator.userAgent.match(/webOS[./](\d+(\.\d+)?)/i);
      webosVersion = match ? 'webOS ' + match[1] : 'webOS Smart TV';
      model = 'LG Smart TV';
    }

    return {
      isWebOS: isWebOS,
      webosVersion: webosVersion,
      model: model,
      uhd: uhd,
      oled: oled,
      screenResolution: window.screen ? window.screen.width + 'x' + window.screen.height : '1920x1080'
    };
  }

  function detectContainerSupport(container) {
    var v = document.createElement('video');
    var normalized = (container || '').toLowerCase().trim();

    switch (normalized) {
      case 'mp4':
        return v.canPlayType('video/mp4; codecs="avc1.42E01E, mp4a.40.2"') || 'maybe';
      case 'm3u8':
        return v.canPlayType('application/x-mpegURL') || v.canPlayType('application/vnd.apple.mpegurl') || '';
      case 'webm':
        return v.canPlayType('video/webm; codecs="vp8, vorbis"') || 'maybe';
      case 'mkv':
        // WebOS natively supports MKV container with H.264/HEVC/VP9/AV1
        // Most desktop Chromium browsers return "" for video/x-matroska directly,
        // but LG webOS TV HTML5 media player implements MKV decoding.
        var directMime = v.canPlayType('video/x-matroska') || v.canPlayType('video/mkv');
        if (directMime) return directMime;
        if (/Web0S|webOS/i.test(navigator.userAgent)) {
          return 'probably'; // LG webOS officially supports MKV
        }
        return 'maybe';
      case 'ts':
        return v.canPlayType('video/mp2t') || '';
      case 'mov':
        return v.canPlayType('video/quicktime') || '';
      default:
        return '';
    }
  }

  function detectCodecSupport(codec) {
    var v = document.createElement('video');
    var c = (codec || '').toLowerCase();

    if (c.indexOf('h264') !== -1 || c.indexOf('avc') !== -1) {
      return v.canPlayType('video/mp4; codecs="avc1.640028"');
    }
    if (c.indexOf('hevc') !== -1 || c.indexOf('h265') !== -1) {
      return v.canPlayType('video/mp4; codecs="hvc1.1.6.L93.B0"') || v.canPlayType('video/mp4; codecs="hev1.1.6.L93.B0"');
    }
    if (c.indexOf('vp9') !== -1) {
      return v.canPlayType('video/webm; codecs="vp9"');
    }
    if (c.indexOf('av1') !== -1) {
      return v.canPlayType('video/mp4; codecs="av01.0.08M.08"');
    }
    return '';
  }

  /**
   * Scans actual native HTML5 audio tracks on a video element.
   * NEVER returns synthetic or assumed tracks.
   */
  function getAvailableAudioTracks(videoEl) {
    if (!videoEl) return [];
    var list = [];

    if (videoEl.audioTracks && videoEl.audioTracks.length > 0) {
      for (var i = 0; i < videoEl.audioTracks.length; i++) {
        var t = videoEl.audioTracks[i];
        list.push({
          id: t.id || i,
          index: i,
          language: t.language || 'und',
          label: t.label || (t.language ? t.language.toUpperCase() : 'Audio Track ' + (i + 1)),
          enabled: !!t.enabled,
          source: 'native'
        });
      }
    }
    return list;
  }

  /**
   * Scans actual native HTML5 text tracks (subtitles).
   */
  function getAvailableSubtitleTracks(videoEl) {
    if (!videoEl) return [];
    var list = [];

    if (videoEl.textTracks && videoEl.textTracks.length > 0) {
      for (var i = 0; i < videoEl.textTracks.length; i++) {
        var t = videoEl.textTracks[i];
        if (t.kind === 'subtitles' || t.kind === 'captions') {
          list.push({
            id: t.id || i,
            index: i,
            language: t.language || 'und',
            label: t.label || (t.language ? t.language.toUpperCase() : 'Subtitle Track ' + (i + 1)),
            mode: t.mode,
            source: 'native',
            embedded: true
          });
        }
      }
    }
    return list;
  }

  /**
   * Evaluates playback capability for a media item.
   * Returns:
   * {
   *   playable: true,
   *   container: "mkv",
   *   audioTrackSelection: true,
   *   subtitleSelection: false,
   *   reason: ""
   * }
   */
  function evaluatePlaybackCapabilities(url, mediaInfo) {
    var container = (mediaInfo && mediaInfo.container) || 'mkv';
    var isWebOS = /Web0S|webOS/i.test(navigator.userAgent);
    var v = document.createElement('video');
    var nativeAudioTrackApi = typeof v.audioTracks !== 'undefined';
    var nativeTextTrackApi = typeof v.textTracks !== 'undefined';

    var playable = true;
    var reason = '';
    var audioTrackSelection = false;
    var subtitleSelection = false;

    if (container === 'mkv') {
      // MKV playback evaluation
      if (isWebOS) {
        playable = true;
        // On webOS TV, basic MKV container plays via webOS media pipeline,
        // but audioTrack selection in HTML5 video element for embedded MKV tracks
        // is typically not exposed by standard video.audioTracks unless using webOS Luna Media APIs
        audioTrackSelection = false;
        subtitleSelection = false;
        reason = 'MKV container supported on webOS TV. Embedded track switching depends on TV model codecs.';
      } else {
        playable = true;
        audioTrackSelection = nativeAudioTrackApi;
        subtitleSelection = nativeTextTrackApi;
        reason = 'Standard web playback. Direct MKV embedded track selection depends on browser container demuxer.';
      }
    } else if (container === 'm3u8') {
      playable = true;
      audioTrackSelection = true; // Handled via HLS.js or native Safari HLS
      subtitleSelection = true;
      reason = 'HLS adaptive stream with alternate audio renditions support.';
    } else if (container === 'mp4') {
      playable = true;
      audioTrackSelection = nativeAudioTrackApi;
      subtitleSelection = nativeTextTrackApi;
      reason = 'Universal MP4 container format.';
    }

    return {
      playable: playable,
      container: container,
      audioTrackSelection: audioTrackSelection,
      subtitleSelection: subtitleSelection,
      reason: reason
    };
  }

  var MediaCapability = {
    detectBrowserSupport: detectBrowserSupport,
    detectWebOSSupport: detectWebOSSupport,
    detectContainerSupport: detectContainerSupport,
    detectCodecSupport: detectCodecSupport,
    getAvailableAudioTracks: getAvailableAudioTracks,
    getAvailableSubtitleTracks: getAvailableSubtitleTracks,
    evaluatePlaybackCapabilities: evaluatePlaybackCapabilities
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = MediaCapability;
  } else {
    global.MediaCapability = MediaCapability;
  }
})(typeof window !== 'undefined' ? window : this);

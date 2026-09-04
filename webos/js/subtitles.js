/**
 * StreamGlass TV - Subtitle Track Manager
 * Manages Native TextTracks, External WebVTT, and HLS subtitles on webOS TV.
 */

(function (global) {
  'use strict';

  function SubtitleManager(videoElement, hlsInstance) {
    this.video = videoElement;
    this.hls = hlsInstance || null;
    this.tracks = []; // Actual selectable tracks
    this.activeTrackId = 'off';
    this.statusMessage = '';
    this.listeners = [];
  }

  SubtitleManager.prototype.setHls = function (hlsInstance) {
    this.hls = hlsInstance;
  };

  /**
   * Discovers and refreshes available subtitle tracks.
   * Never fakes embedded tracks.
   */
  SubtitleManager.prototype.refreshTracks = function (movieRecord) {
    var self = this;
    var detected = [];
    self.statusMessage = '';

    // Always include 'Off' option
    detected.push({
      id: 'off',
      language: 'off',
      label: 'Off',
      source: 'native',
      embedded: false,
      selected: self.activeTrackId === 'off'
    });

    // 1. External WebVTT tracks from movie record
    if (movieRecord && Array.isArray(movieRecord.subtitleTracks)) {
      movieRecord.subtitleTracks.forEach(function (sub, idx) {
        if (sub.url && sub.url.indexOf('.vtt') !== -1) {
          detected.push({
            id: sub.id || ('ext_' + idx),
            language: sub.language || 'en',
            label: sub.label || mapLangToLabel(sub.language) || 'External Subtitle',
            url: sub.url,
            source: 'external',
            embedded: false,
            selected: self.activeTrackId === (sub.id || ('ext_' + idx))
          });
        }
      });
    }

    // 2. Native exposed text tracks on <video>
    if (self.video && self.video.textTracks && self.video.textTracks.length > 0) {
      for (var i = 0; i < self.video.textTracks.length; i++) {
        var tt = self.video.textTracks[i];
        if (tt.kind === 'subtitles' || tt.kind === 'captions') {
          // Avoid duplicate external tracks already listed
          var existing = detected.some(function (d) { return d.nativeIndex === i; });
          if (!existing) {
            detected.push({
              id: 'native_' + i,
              nativeIndex: i,
              language: tt.language || 'und',
              label: tt.label || mapLangToLabel(tt.language) || ('Subtitles ' + (i + 1)),
              source: 'native',
              embedded: true,
              selected: tt.mode === 'showing'
            });
          }
        }
      }
    }

    // 3. HLS subtitle tracks
    if (self.hls && self.hls.subtitleTracks && self.hls.subtitleTracks.length > 0) {
      self.hls.subtitleTracks.forEach(function (st, idx) {
        detected.push({
          id: 'hls_sub_' + idx,
          hlsIndex: idx,
          language: st.lang || 'und',
          label: st.name || mapLangToLabel(st.lang) || ('HLS Sub ' + (idx + 1)),
          source: 'hls',
          embedded: true,
          selected: self.hls.subtitleTrack === idx
        });
      });
    }

    // MKV metadata notice check:
    if (movieRecord && movieRecord.container === 'mkv') {
      var hasExposedSubs = detected.some(function (t) { return t.id !== 'off'; });
      if (!hasExposedSubs && movieRecord.subtitleTracks && movieRecord.subtitleTracks.length > 0) {
        self.statusMessage = 'Embedded subtitles detected by metadata, but this TV player does not expose them for direct selection.';
      }
    }

    self.tracks = detected;
    self.notify();
    return detected;
  };

  /**
   * Adds an external WebVTT track dynamically to the HTML5 video element.
   */
  SubtitleManager.prototype.addExternalWebVTT = function (vttUrl, langCode, label) {
    var self = this;
    if (!self.video || !vttUrl) return null;

    var cleanLang = (langCode || 'en').toLowerCase();
    var cleanLabel = label || mapLangToLabel(cleanLang) || 'English';
    var trackId = 'ext_' + Date.now();

    var trackEl = document.createElement('track');
    trackEl.id = trackId;
    trackEl.kind = 'subtitles';
    trackEl.src = vttUrl;
    trackEl.srclang = cleanLang;
    trackEl.label = cleanLabel;
    trackEl.default = false;

    self.video.appendChild(trackEl);

    var item = {
      id: trackId,
      language: cleanLang,
      label: cleanLabel,
      url: vttUrl,
      source: 'external',
      embedded: false,
      selected: false
    };

    self.tracks.push(item);
    self.notify();
    return item;
  };

  /**
   * selectSubtitleTrack(trackId)
   */
  SubtitleManager.prototype.selectSubtitleTrack = function (trackId) {
    var self = this;

    if (trackId === 'off') {
      // Disable all native tracks
      if (self.video && self.video.textTracks) {
        for (var i = 0; i < self.video.textTracks.length; i++) {
          self.video.textTracks[i].mode = 'disabled';
        }
      }
      if (self.hls) {
        self.hls.subtitleTrack = -1;
      }
      self.activeTrackId = 'off';
      self.updateSelectionState('off');
      return { success: true, message: 'Subtitles turned off.' };
    }

    var target = null;
    for (var j = 0; j < self.tracks.length; j++) {
      if (String(self.tracks[j].id) === String(trackId)) {
        target = self.tracks[j];
        break;
      }
    }

    if (!target) {
      return { success: false, message: 'Subtitle track not found.' };
    }

    // Disable all other tracks first
    if (self.video && self.video.textTracks) {
      for (var k = 0; k < self.video.textTracks.length; k++) {
        self.video.textTracks[k].mode = 'disabled';
      }
    }

    if (target.source === 'external') {
      // Ensure <track> element is active
      var trackNodes = self.video ? self.video.querySelectorAll('track') : [];
      var foundNode = false;
      for (var n = 0; n < trackNodes.length; n++) {
        if (trackNodes[n].id === target.id || trackNodes[n].src === target.url) {
          if (self.video.textTracks && self.video.textTracks[n]) {
            self.video.textTracks[n].mode = 'showing';
            foundNode = true;
          }
        }
      }
      if (!foundNode && target.url) {
        self.addExternalWebVTT(target.url, target.language, target.label);
        // Turn on last textTrack
        if (self.video.textTracks && self.video.textTracks.length > 0) {
          self.video.textTracks[self.video.textTracks.length - 1].mode = 'showing';
        }
      }
      self.activeTrackId = target.id;
      self.updateSelectionState(target.id);
      return { success: true, message: 'Enabled ' + target.label + ' (External WebVTT).' };
    }

    if (target.source === 'native' && target.nativeIndex !== undefined) {
      if (self.video && self.video.textTracks && self.video.textTracks[target.nativeIndex]) {
        self.video.textTracks[target.nativeIndex].mode = 'showing';
        self.activeTrackId = target.id;
        self.updateSelectionState(target.id);
        return { success: true, message: 'Enabled ' + target.label + ' (Embedded).' };
      }
    }

    if (target.source === 'hls' && self.hls && target.hlsIndex !== undefined) {
      self.hls.subtitleTrack = target.hlsIndex;
      self.activeTrackId = target.id;
      self.updateSelectionState(target.id);
      return { success: true, message: 'Enabled ' + target.label + ' (HLS).' };
    }

    return {
      success: false,
      message: 'Embedded subtitles detected by metadata, but this TV player does not expose them for direct selection.'
    };
  };

  SubtitleManager.prototype.updateSelectionState = function (selectedId) {
    this.tracks.forEach(function (t) {
      t.selected = (String(t.id) === String(selectedId));
    });
    this.notify();
  };

  SubtitleManager.prototype.onChange = function (fn) {
    this.listeners.push(fn);
  };

  SubtitleManager.prototype.notify = function () {
    var self = this;
    this.listeners.forEach(function (fn) {
      try { fn(self.tracks, self.statusMessage); } catch (e) {}
    });
  };

  function mapLangToLabel(code) {
    if (!code) return '';
    var map = {
      en: 'English', eng: 'English',
      ta: 'Tamil', tam: 'Tamil',
      te: 'Telugu', tel: 'Telugu',
      hi: 'Hindi', hin: 'Hindi',
      ml: 'Malayalam', mal: 'Malayalam',
      kn: 'Kannada', kan: 'Kannada'
    };
    return map[code.toLowerCase()] || code.toUpperCase();
  }

  var Subtitles = {
    SubtitleManager: SubtitleManager,
    mapLangToLabel: mapLangToLabel
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Subtitles;
  } else {
    global.Subtitles = Subtitles;
  }
})(typeof window !== 'undefined' ? window : this);

/**
 * StreamGlass TV - Audio Track Manager
 * Strict rule: NEVER fake audio tracks.
 * Handles Native HTML5, HLS alternate renditions, and MKV limitations.
 */

(function (global) {
  'use strict';

  function AudioTrackManager(videoElement, hlsInstance) {
    this.video = videoElement;
    this.hls = hlsInstance || null;
    this.tracks = [];
    this.selectedTrackId = null;
    this.statusMessage = '';
    this.listeners = [];
  }

  AudioTrackManager.prototype.setHls = function (hlsInstance) {
    this.hls = hlsInstance;
  };

  /**
   * Discovers real tracks available on the current media.
   * Priority:
   * 1. HLS manifest alternate audio renditions
   * 2. Native video.audioTracks (if populated by browser/webOS)
   * 3. Verified metadata service tracks
   * If none exposed, presents single Default Audio track.
   */
  AudioTrackManager.prototype.refreshTracks = function (movieRecord) {
    var self = this;
    var detectedTracks = [];
    self.statusMessage = '';

    // Layer 2: Check HLS audio tracks
    if (self.hls && self.hls.audioTracks && self.hls.audioTracks.length > 0) {
      detectedTracks = self.hls.audioTracks.map(function (t, idx) {
        return {
          id: 'hls_' + idx,
          hlsIndex: idx,
          language: t.lang || t.language || 'und',
          label: t.name || mapLangToLabel(t.lang) || ('Audio ' + (idx + 1)),
          codec: 'AAC',
          channels: 2,
          default: !!t.default,
          selected: self.hls.audioTrack === idx,
          source: 'hls',
          isHintOnly: false
        };
      });
    }
    // Layer 1: Check native video.audioTracks
    else if (self.video && self.video.audioTracks && self.video.audioTracks.length > 0) {
      for (var i = 0; i < self.video.audioTracks.length; i++) {
        var nativeTrack = self.video.audioTracks[i];
        detectedTracks.push({
          id: 'native_' + i,
          nativeIndex: i,
          language: nativeTrack.language || 'und',
          label: nativeTrack.label || mapLangToLabel(nativeTrack.language) || ('Track ' + (i + 1)),
          codec: 'Native',
          channels: 2,
          default: i === 0,
          selected: !!nativeTrack.enabled,
          source: 'native',
          isHintOnly: false
        });
      }
    }
    // Layer 3: If movie record has verified metadata tracks (from /api/media-info)
    else if (movieRecord && Array.isArray(movieRecord.audioTracks) && movieRecord.audioTracks.length > 0) {
      detectedTracks = movieRecord.audioTracks.filter(function (t) {
        return !t.isHintOnly;
      });
    }

    // If still no multi-tracks detected:
    if (detectedTracks.length === 0) {
      detectedTracks = [
        {
          id: 'default',
          language: 'und',
          label: 'Default Audio',
          codec: (movieRecord && movieRecord.container === 'mkv') ? 'MKV Embedded Audio' : 'Stereo Audio',
          channels: '2.0',
          default: true,
          selected: true,
          source: 'native',
          isHintOnly: false
        }
      ];

      if (movieRecord && movieRecord.container === 'mkv') {
        self.statusMessage = 'This TV/player does not expose embedded MKV audio tracks for direct selection. Playback is continuing using the default audio stream.';
      } else {
        self.statusMessage = 'Only one selectable audio track is available.';
      }
    }

    self.tracks = detectedTracks;
    self.notify();
    return detectedTracks;
  };

  /**
   * selectAudioTrack(trackId)
   * Switches audio track safely.
   */
  AudioTrackManager.prototype.selectAudioTrack = function (trackId) {
    var self = this;
    var target = null;

    for (var i = 0; i < self.tracks.length; i++) {
      if (String(self.tracks[i].id) === String(trackId)) {
        target = self.tracks[i];
        break;
      }
    }

    if (!target) {
      return { success: false, message: 'Audio track not found.' };
    }

    if (target.isHintOnly) {
      return {
        success: false,
        message: 'This language was detected only as a filename hint and is not selectable in the playback stream.'
      };
    }

    if (target.source === 'external') {
      return {
        success: false,
        message: 'External audio switching is unavailable on this TV.'
      };
    }

    // Switch HLS rendition
    if (target.source === 'hls' && self.hls) {
      if (target.hlsIndex !== undefined) {
        self.hls.audioTrack = target.hlsIndex;
        self.selectedTrackId = target.id;
        self.updateSelectionState(target.id);
        return { success: true, message: 'Switched to ' + target.label + ' audio rendition.' };
      }
    }

    // Switch native video.audioTracks
    if (target.source === 'native' && self.video && self.video.audioTracks && self.video.audioTracks.length > 0) {
      if (target.nativeIndex !== undefined) {
        for (var n = 0; n < self.video.audioTracks.length; n++) {
          self.video.audioTracks[n].enabled = (n === target.nativeIndex);
        }
        self.selectedTrackId = target.id;
        self.updateSelectionState(target.id);
        return { success: true, message: 'Switched to ' + target.label + ' track.' };
      }
    }

    // MKV without exposed native interface
    if (target.id === 'default') {
      self.selectedTrackId = target.id;
      self.updateSelectionState(target.id);
      return { success: true, message: 'Default audio active.' };
    }

    // If metadata listed it but TV player cannot switch it:
    return {
      success: false,
      message: 'This TV/player does not expose embedded MKV audio tracks for direct selection.'
    };
  };

  AudioTrackManager.prototype.updateSelectionState = function (selectedId) {
    this.tracks.forEach(function (t) {
      t.selected = (String(t.id) === String(selectedId));
    });
    this.notify();
  };

  AudioTrackManager.prototype.matchPreferredLanguage = function (preferredLang) {
    if (!preferredLang || this.tracks.length === 0) return null;
    var norm = preferredLang.toLowerCase().trim();

    for (var i = 0; i < this.tracks.length; i++) {
      var t = this.tracks[i];
      if (t.isHintOnly) continue;
      var lang = (t.language || '').toLowerCase();
      var label = (t.label || '').toLowerCase();

      if (lang === norm || label === norm) return t.id;
      if (norm === 'tamil' && (lang === 'ta' || lang === 'tam' || label.indexOf('tamil') !== -1)) return t.id;
      if (norm === 'telugu' && (lang === 'te' || lang === 'tel' || label.indexOf('telugu') !== -1)) return t.id;
      if (norm === 'hindi' && (lang === 'hi' || lang === 'hin' || label.indexOf('hindi') !== -1)) return t.id;
      if (norm === 'english' && (lang === 'en' || lang === 'eng' || label.indexOf('english') !== -1)) return t.id;
      if (norm === 'malayalam' && (lang === 'ml' || lang === 'mal' || label.indexOf('malayalam') !== -1)) return t.id;
      if (norm === 'kannada' && (lang === 'kn' || lang === 'kan' || label.indexOf('kannada') !== -1)) return t.id;
    }
    return null;
  };

  AudioTrackManager.prototype.onChange = function (fn) {
    this.listeners.push(fn);
  };

  AudioTrackManager.prototype.notify = function () {
    var self = this;
    this.listeners.forEach(function (fn) {
      try { fn(self.tracks, self.statusMessage); } catch (e) {}
    });
  };

  function mapLangToLabel(code) {
    if (!code) return '';
    var map = {
      ta: 'Tamil', tam: 'Tamil',
      te: 'Telugu', tel: 'Telugu',
      hi: 'Hindi', hin: 'Hindi',
      en: 'English', eng: 'English',
      ml: 'Malayalam', mal: 'Malayalam',
      kn: 'Kannada', kan: 'Kannada'
    };
    return map[code.toLowerCase()] || code;
  }

  var AudioTracks = {
    AudioTrackManager: AudioTrackManager,
    mapLangToLabel: mapLangToLabel
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = AudioTracks;
  } else {
    global.AudioTracks = AudioTracks;
  }
})(typeof window !== 'undefined' ? window : this);

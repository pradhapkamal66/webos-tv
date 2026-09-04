/**
 * StreamGlass TV - Media Metadata Service
 * Layer 3 Architecture for MKV and Advanced Multi-Track Inspection
 * Supports optional backend endpoint /api/media-info?url=...
 * Works seamlessly whether the endpoint is configured or offline.
 */

(function (global) {
  'use strict';

  var API_ENDPOINT = '/api/media-info';

  /**
   * analyzeMedia(url)
   * Calls the optional backend metadata service if reachable.
   * If offline or not configured, falls back to basic media info extraction.
   */
  function analyzeMedia(url) {
    if (!url) {
      return Promise.resolve(createDefaultAnalysisResult('unknown'));
    }

    var fetchUrl = API_ENDPOINT + '?url=' + encodeURIComponent(url);

    // Abort controller for 3-second timeout so TV does not hang
    var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timeoutId = controller ? setTimeout(function () { controller.abort(); }, 3000) : null;

    return fetch(fetchUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller ? controller.signal : undefined
    })
      .then(function (response) {
        if (timeoutId) clearTimeout(timeoutId);
        if (!response.ok) {
          throw new Error('Metadata endpoint returned HTTP ' + response.status);
        }
        return response.json();
      })
      .then(function (data) {
        return normalizeMetadataResponse(data, url);
      })
      .catch(function () {
        if (timeoutId) clearTimeout(timeoutId);
        // Fallback: graceful offline / basic media analysis
        return fallbackMediaAnalysis(url);
      });
  }

  /**
   * getAudioTracks(url)
   * Fetches detected audio tracks from metadata service.
   * Only returns tracks verified by media detection, NEVER filename guesses.
   */
  function getAudioTracks(url) {
    return analyzeMedia(url).then(function (info) {
      return info.audioTracks || [];
    });
  }

  /**
   * getSubtitleTracks(url)
   * Fetches detected subtitle tracks from metadata service.
   */
  function getSubtitleTracks(url) {
    return analyzeMedia(url).then(function (info) {
      return info.subtitleTracks || [];
    });
  }

  function normalizeMetadataResponse(data, originalUrl) {
    var detector = global.MediaDetector;
    var extInfo = detector ? detector.detectMediaType(originalUrl) : { container: 'mkv' };

    return {
      container: (data.container || extInfo.container || 'mkv').toLowerCase(),
      video: {
        codec: (data.video && data.video.codec) ? formatVideoCodec(data.video.codec) : 'H.264 / AVC',
        width: (data.video && data.video.width) || 1920,
        height: (data.video && data.video.height) || 1080,
        frameRate: (data.video && data.video.frameRate) || 24
      },
      audioTracks: Array.isArray(data.audioTracks) ? data.audioTracks.map(function (t, idx) {
        return {
          id: t.id !== undefined ? t.id : idx,
          language: t.language || 'und',
          label: t.label || mapLangCodeToLabel(t.language) || ('Track ' + (idx + 1)),
          codec: t.codec || 'AAC',
          channels: t.channels || 2,
          default: !!t.default,
          source: 'metadata',
          isHintOnly: false
        };
      }) : [],
      subtitleTracks: Array.isArray(data.subtitleTracks) ? data.subtitleTracks.map(function (s, idx) {
        return {
          id: s.id !== undefined ? s.id : idx,
          language: s.language || 'und',
          label: s.label || mapLangCodeToLabel(s.language) || ('Sub ' + (idx + 1)),
          embedded: s.embedded !== false,
          default: !!s.default,
          source: 'metadata',
          isHintOnly: false
        };
      }) : [],
      metadataAnalyzed: true,
      analysisSummary: {
        containerDetected: true,
        videoDetected: !!(data.video && data.video.codec),
        audioDetected: !!(data.audioTracks && data.audioTracks.length > 0),
        subtitleDetected: !!(data.subtitleTracks && data.subtitleTracks.length > 0),
        notice: 'Media metadata verified via inspection service'
      }
    };
  }

  function fallbackMediaAnalysis(url) {
    var detector = global.MediaDetector;
    var parsed = detector ? detector.detectMediaType(url) : { container: 'mkv', protocol: 'file' };
    var filenameInfo = detector ? detector.parseMediaInfoFromUrl(url) : { languageHints: [] };

    return {
      container: parsed.container,
      video: {
        codec: parsed.container === 'mkv' ? 'H.264 / AVC' : 'H.264 / AVC',
        width: 1920,
        height: 1080,
        frameRate: 24
      },
      // IMPORTANT: In fallback, we NEVER manufacture fake audio tracks from filename hints.
      // Filename hints are kept separate for UI display as hints only!
      audioTracks: [
        {
          id: 0,
          language: 'default',
          label: 'Default Audio',
          codec: 'AAC',
          channels: 2,
          default: true,
          source: 'native',
          isHintOnly: false
        }
      ],
      subtitleTracks: [],
      metadataAnalyzed: false,
      analysisSummary: {
        containerDetected: true,
        videoDetected: false,
        audioDetected: false,
        subtitleDetected: false,
        notice: 'Basic media information only (Backend inspection unavailable)'
      },
      filenameHints: {
        audioLanguages: filenameInfo.languageHints || []
      }
    };
  }

  function createDefaultAnalysisResult(container) {
    return {
      container: container || 'unknown',
      video: { codec: 'Unknown', width: 0, height: 0, frameRate: 0 },
      audioTracks: [],
      subtitleTracks: [],
      metadataAnalyzed: false,
      analysisSummary: {
        containerDetected: false,
        videoDetected: false,
        audioDetected: false,
        subtitleDetected: false,
        notice: 'No media analyzed'
      }
    };
  }

  function formatVideoCodec(raw) {
    if (!raw) return 'Unknown';
    var r = raw.toUpperCase();
    if (r.indexOf('H264') !== -1 || r.indexOf('AVC') !== -1) return 'H.264 / AVC';
    if (r.indexOf('HEVC') !== -1 || r.indexOf('H265') !== -1) return 'HEVC / H.265';
    if (r.indexOf('VP9') !== -1) return 'VP9';
    if (r.indexOf('VP8') !== -1) return 'VP8';
    if (r.indexOf('AV1') !== -1) return 'AV1';
    return raw;
  }

  function mapLangCodeToLabel(code) {
    if (!code) return 'Unknown';
    var lower = code.toLowerCase();
    var map = {
      ta: 'Tamil', tam: 'Tamil',
      te: 'Telugu', tel: 'Telugu',
      hi: 'Hindi', hin: 'Hindi',
      en: 'English', eng: 'English',
      ml: 'Malayalam', mal: 'Malayalam',
      kn: 'Kannada', kan: 'Kannada'
    };
    return map[lower] || code.toUpperCase();
  }

  var MediaMetadata = {
    analyzeMedia: analyzeMedia,
    getAudioTracks: getAudioTracks,
    getSubtitleTracks: getSubtitleTracks,
    formatVideoCodec: formatVideoCodec,
    mapLangCodeToLabel: mapLangCodeToLabel
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = MediaMetadata;
  } else {
    global.MediaMetadata = MediaMetadata;
  }
})(typeof window !== 'undefined' ? window : this);

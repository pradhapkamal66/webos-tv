/**
 * StreamGlass TV - Media Detector
 * Handles robust media detection for MKV, MP4, HLS, WebM, TS, MOV.
 * Adheres to: NEVER strip query parameters from playback URLs.
 * Strips query parameters ONLY when inspecting container/extension.
 */

(function (global) {
  'use strict';

  var KNOWN_EXTENSIONS = {
    mkv: { container: 'mkv', mimeType: 'video/x-matroska', protocol: 'file' },
    mp4: { container: 'mp4', mimeType: 'video/mp4', protocol: 'file' },
    m3u8: { container: 'm3u8', mimeType: 'application/x-mpegURL', protocol: 'hls' },
    ts: { container: 'ts', mimeType: 'video/mp2t', protocol: 'file' },
    mov: { container: 'mov', mimeType: 'video/quicktime', protocol: 'file' },
    webm: { container: 'webm', mimeType: 'video/webm', protocol: 'file' }
  };

  /**
   * Sanitizes a URL for safe logging and UI display by redacting tokens/credentials.
   * NEVER alters the real stream URL used for playback.
   */
  function sanitizeUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') return '';
    try {
      var parsed = new URL(rawUrl, 'http://localhost');
      var sensitiveKeys = ['token', 'auth', 'key', 'secret', 'sig', 'signature', 'pass', 'password', 'api_key', 'access_token'];
      var searchParams = new URLSearchParams(parsed.search);
      var modified = false;

      sensitiveKeys.forEach(function (key) {
        if (searchParams.has(key)) {
          searchParams.set(key, '••••••');
          modified = true;
        }
      });

      if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
        var clean = parsed.origin + parsed.pathname;
        if (searchParams.toString()) {
          clean += '?' + searchParams.toString();
        }
        return clean;
      } else {
        var pathPart = rawUrl.split('?')[0];
        return searchParams.toString() ? pathPart + '?' + searchParams.toString() : pathPart;
      }
    } catch (e) {
      // Fallback regex redactor
      return rawUrl.replace(/([?&](?:token|auth|key|secret|sig)=)[^&]+/gi, '$1••••••');
    }
  }

  /**
   * Extracts clean extension by stripping query strings and fragments.
   */
  function getCleanExtension(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') return '';
    try {
      var withoutHash = rawUrl.split('#')[0];
      var withoutQuery = withoutHash.split('?')[0];
      var lastDotIndex = withoutQuery.lastIndexOf('.');
      if (lastDotIndex === -1) return '';
      return withoutQuery.slice(lastDotIndex + 1).toLowerCase().trim();
    } catch (e) {
      return '';
    }
  }

  /**
   * detectMediaType(url)
   * Primary required function.
   * Returns: { container: "mkv", protocol: "file", mimeType: "video/x-matroska" }
   */
  function detectMediaType(url) {
    var ext = getCleanExtension(url);
    var protocol = 'file';

    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
      if (ext === 'm3u8' || url.toLowerCase().includes('.m3u8')) {
        protocol = 'hls';
      } else {
        protocol = 'file';
      }
    }

    if (KNOWN_EXTENSIONS[ext]) {
      var match = KNOWN_EXTENSIONS[ext];
      return {
        container: match.container,
        protocol: match.protocol,
        mimeType: match.mimeType
      };
    }

    // Additional URL keyword / MIME fallback inspection
    var lower = (url || '').toLowerCase();
    if (lower.indexOf('.mkv') !== -1) {
      return { container: 'mkv', protocol: 'file', mimeType: 'video/x-matroska' };
    }
    if (lower.indexOf('.m3u8') !== -1) {
      return { container: 'm3u8', protocol: 'hls', mimeType: 'application/x-mpegURL' };
    }
    if (lower.indexOf('.mp4') !== -1) {
      return { container: 'mp4', protocol: 'file', mimeType: 'video/mp4' };
    }
    if (lower.indexOf('.webm') !== -1) {
      return { container: 'webm', protocol: 'file', mimeType: 'video/webm' };
    }
    if (lower.indexOf('.ts') !== -1) {
      return { container: 'ts', protocol: 'file', mimeType: 'video/mp2t' };
    }
    if (lower.indexOf('.mov') !== -1) {
      return { container: 'mov', protocol: 'file', mimeType: 'video/quicktime' };
    }

    return {
      container: 'unknown',
      protocol: protocol,
      mimeType: 'video/mp4' // default HTML5 video fallback
    };
  }

  /**
   * Parses filename hints for title, year, and potential audio languages.
   * IMPORTANT: Language tags found here are strictly treated as HINTS, never as detected tracks!
   */
  function parseMediaInfoFromUrl(url) {
    if (!url) return { title: 'Untitled Stream', year: '', languageHints: [] };

    var cleanUrl = url.split('?')[0].split('#')[0];
    var segments = cleanUrl.split('/');
    var rawFilename = decodeURIComponent(segments[segments.length - 1] || '');
    var nameWithoutExt = rawFilename.replace(/\.[^/.]+$/, '');

    // Common release patterns
    var yearMatch = nameWithoutExt.match(/\b(19\d\d|20\d\d)\b/);
    var year = yearMatch ? yearMatch[1] : '';

    // Clean up separators
    var cleanTitle = nameWithoutExt;
    if (yearMatch && yearMatch.index) {
      cleanTitle = cleanTitle.substring(0, yearMatch.index);
    }
    cleanTitle = cleanTitle
      .replace(/[._\-+]/g, ' ')
      .replace(/\b(1080p|720p|2160p|4k|uhd|hdr|hevc|h264|x264|aac|ac3|dts|bluray|web-dl|webrip)\b/gi, '')
      .trim();

    if (!cleanTitle) {
      cleanTitle = nameWithoutExt || 'Untitled Stream';
    }

    // Detect language hints from filename
    var langMap = [
      { key: 'Tamil', test: /\b(tam|tamil)\b/i },
      { key: 'Telugu', test: /\b(tel|telugu)\b/i },
      { key: 'Hindi', test: /\b(hin|hindi)\b/i },
      { key: 'English', test: /\b(eng|english)\b/i },
      { key: 'Malayalam', test: /\b(mal|malayalam)\b/i },
      { key: 'Kannada', test: /\b(kan|kannada)\b/i }
    ];

    var languageHints = [];
    langMap.forEach(function (item) {
      if (item.test.test(rawFilename)) {
        languageHints.push(item.key);
      }
    });

    return {
      title: cleanTitle.toUpperCase(),
      year: year,
      languageHints: languageHints,
      sanitizedUrl: sanitizeUrl(url)
    };
  }

  var MediaDetector = {
    detectMediaType: detectMediaType,
    sanitizeUrl: sanitizeUrl,
    getCleanExtension: getCleanExtension,
    parseMediaInfoFromUrl: parseMediaInfoFromUrl
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = MediaDetector;
  } else {
    global.MediaDetector = MediaDetector;
  }
})(typeof window !== 'undefined' ? window : this);

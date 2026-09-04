/**
 * StreamGlass TV - Media Service
 * Handles media detection, metadata analysis, URL sanitization, and local persistence.
 */

import {
  MovieRecord,
  MediaDetectionResult,
  PlaybackCapabilityResult,
  DeviceInfoState,
  AppSettings,
  DiagnosticData,
  AudioTrackItem,
  SubtitleTrackItem,
} from '../types/media';

const STORAGE_KEY_LIBRARY = 'streamglass_tv_library_v1';
const STORAGE_KEY_SETTINGS = 'streamglass_tv_settings_v1';
const STORAGE_KEY_PROGRESS = 'streamglass_tv_playback_progress_v1';

export const KNOWN_CONTAINERS = {
  mkv: { container: 'mkv' as const, mimeType: 'video/x-matroska', protocol: 'file' as const },
  mp4: { container: 'mp4' as const, mimeType: 'video/mp4', protocol: 'file' as const },
  m3u8: { container: 'm3u8' as const, mimeType: 'application/x-mpegURL', protocol: 'hls' as const },
  ts: { container: 'ts' as const, mimeType: 'video/mp2t', protocol: 'file' as const },
  mov: { container: 'mov' as const, mimeType: 'video/quicktime', protocol: 'file' as const },
  webm: { container: 'webm' as const, mimeType: 'video/webm', protocol: 'file' as const },
};

/**
 * Sanitizes URLs to prevent exposing tokens/secrets in UI, logs, and diagnostic exports.
 * NEVER changes the actual playback URL.
 */
export function sanitizeUrl(rawUrl: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  try {
    const parsed = new URL(rawUrl, 'http://localhost');
    const sensitiveKeys = ['token', 'auth', 'key', 'secret', 'sig', 'signature', 'pass', 'password', 'api_key', 'access_token', 'exp'];
    const searchParams = new URLSearchParams(parsed.search);

    sensitiveKeys.forEach((key) => {
      if (searchParams.has(key)) {
        searchParams.set(key, '••••••');
      }
    });

    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
      const clean = parsed.origin + parsed.pathname;
      return searchParams.toString() ? `${clean}?${searchParams.toString()}` : clean;
    } else {
      const pathPart = rawUrl.split('?')[0];
      return searchParams.toString() ? `${pathPart}?${searchParams.toString()}` : pathPart;
    }
  } catch {
    return rawUrl.replace(/([?&](?:token|auth|key|secret|sig)=)[^&]+/gi, '$1••••••');
  }
}

/**
 * detectMediaType(url)
 * Strips query parameters ONLY when determining file extension.
 * Do NOT modify the actual playback URL.
 */
export function detectMediaType(url: string): MediaDetectionResult {
  if (!url) {
    return {
      container: 'unknown',
      protocol: 'file',
      mimeType: 'video/mp4',
      sanitizedUrl: '',
      extractedTitle: 'Untitled Media',
      extractedLanguages: [],
    };
  }

  // 1. Strip query parameters only for extension inspection
  const withoutHash = url.split('#')[0];
  const withoutQuery = withoutHash.split('?')[0];
  const lastDotIndex = withoutQuery.lastIndexOf('.');
  const ext = lastDotIndex !== -1 ? withoutQuery.slice(lastDotIndex + 1).toLowerCase().trim() : '';

  let container: MediaDetectionResult['container'] = 'unknown';
  let mimeType = 'video/mp4';
  let protocol: MediaDetectionResult['protocol'] = 'file';

  if (url.toLowerCase().includes('.m3u8') || ext === 'm3u8') {
    container = 'm3u8';
    mimeType = 'application/x-mpegURL';
    protocol = 'hls';
  } else if (ext === 'mkv' || url.toLowerCase().includes('.mkv')) {
    container = 'mkv';
    mimeType = 'video/x-matroska';
    protocol = 'file';
  } else if (ext === 'mp4' || url.toLowerCase().includes('.mp4')) {
    container = 'mp4';
    mimeType = 'video/mp4';
    protocol = 'file';
  } else if (ext === 'webm' || url.toLowerCase().includes('.webm')) {
    container = 'webm';
    mimeType = 'video/webm';
    protocol = 'file';
  } else if (ext === 'ts' || url.toLowerCase().includes('.ts')) {
    container = 'ts';
    mimeType = 'video/mp2t';
    protocol = 'file';
  } else if (ext === 'mov' || url.toLowerCase().includes('.mov')) {
    container = 'mov';
    mimeType = 'video/quicktime';
    protocol = 'file';
  }

  const filenameInfo = parseMediaInfoFromUrl(url);

  return {
    container,
    protocol,
    mimeType,
    sanitizedUrl: sanitizeUrl(url),
    extractedTitle: filenameInfo.title,
    extractedYear: filenameInfo.year,
    extractedLanguages: filenameInfo.languageHints,
  };
}

export function parseMediaInfoFromUrl(url: string): {
  title: string;
  year?: string;
  languageHints: string[];
} {
  if (!url) return { title: 'Untitled', languageHints: [] };
  const cleanUrl = url.split('?')[0].split('#')[0];
  const segments = cleanUrl.split('/');
  const rawFilename = decodeURIComponent(segments[segments.length - 1] || '');
  const nameWithoutExt = rawFilename.replace(/\.[^/.]+$/, '');

  const yearMatch = nameWithoutExt.match(/\b(19\d\d|20\d\d)\b/);
  const year = yearMatch ? yearMatch[1] : undefined;

  let cleanTitle = nameWithoutExt;
  if (yearMatch && yearMatch.index) {
    cleanTitle = cleanTitle.substring(0, yearMatch.index);
  }
  cleanTitle = cleanTitle
    .replace(/[._\-+]/g, ' ')
    .replace(/\b(1080p|720p|2160p|4k|uhd|hdr|hevc|h264|x264|aac|ac3|dts|bluray|web-dl|webrip)\b/gi, '')
    .trim();

  if (!cleanTitle) cleanTitle = nameWithoutExt || 'Untitled Stream';

  const langPatterns = [
    { key: 'Tamil', regex: /\b(tam|tamil)\b/i },
    { key: 'Telugu', regex: /\b(tel|telugu)\b/i },
    { key: 'Hindi', regex: /\b(hin|hindi)\b/i },
    { key: 'English', regex: /\b(eng|english)\b/i },
    { key: 'Malayalam', regex: /\b(mal|malayalam)\b/i },
    { key: 'Kannada', regex: /\b(kan|kannada)\b/i },
  ];

  const languageHints: string[] = [];
  langPatterns.forEach((p) => {
    if (p.regex.test(rawFilename)) {
      languageHints.push(p.key);
    }
  });

  return {
    title: cleanTitle.toUpperCase(),
    year,
    languageHints,
  };
}

/**
 * Metadata inspection service client
 * Supports /api/media-info?url=... with automatic fallback.
 */
export async function analyzeMedia(url: string): Promise<{
  container: string;
  video: { codec: string; width: number; height: number; frameRate: number };
  audioTracks: AudioTrackItem[];
  subtitleTracks: SubtitleTrackItem[];
  metadataAnalyzed: boolean;
  analysisSummary: {
    containerDetected: boolean;
    videoDetected: boolean;
    audioDetected: boolean;
    subtitleDetected: boolean;
    notice?: string;
  };
  filenameHints?: {
    audioLanguages?: string[];
  };
}> {
  const detected = detectMediaType(url);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`/api/media-info?url=${encodeURIComponent(url)}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      return {
        container: data.container || detected.container,
        video: {
          codec: formatVideoCodec(data.video?.codec || 'H264'),
          width: data.video?.width || 1920,
          height: data.video?.height || 1080,
          frameRate: data.video?.frameRate || 24,
        },
        audioTracks: Array.isArray(data.audioTracks)
          ? data.audioTracks.map((t: any, idx: number) => ({
              id: t.id !== undefined ? t.id : idx,
              language: t.language || 'und',
              label: t.label || mapLangToLabel(t.language) || `Track ${idx + 1}`,
              codec: t.codec || 'AAC',
              channels: t.channels || 2,
              default: !!t.default,
              source: 'metadata',
              isHintOnly: false,
            }))
          : [],
        subtitleTracks: Array.isArray(data.subtitleTracks)
          ? data.subtitleTracks.map((s: any, idx: number) => ({
              id: s.id !== undefined ? s.id : idx,
              language: s.language || 'und',
              label: s.label || mapLangToLabel(s.language) || `Sub ${idx + 1}`,
              embedded: s.embedded !== false,
              default: !!s.default,
              source: 'metadata',
              isHintOnly: false,
            }))
          : [],
        metadataAnalyzed: true,
        analysisSummary: {
          containerDetected: true,
          videoDetected: !!data.video?.codec,
          audioDetected: !!(data.audioTracks && data.audioTracks.length > 0),
          subtitleDetected: !!(data.subtitleTracks && data.subtitleTracks.length > 0),
          notice: 'Metadata verified via inspection service',
        },
      };
    }
  } catch {
    // Graceful offline fallback
  }

  // Fallback: Never fake selectable tracks!
  return {
    container: detected.container,
    video: {
      codec: 'H.264 / AVC',
      width: 1920,
      height: 1080,
      frameRate: 24,
    },
    audioTracks: [
      {
        id: 'default',
        language: 'und',
        label: 'Default Audio',
        codec: detected.container === 'mkv' ? 'MKV Embedded Audio' : 'AAC',
        channels: '2.0',
        default: true,
        source: 'native',
        isHintOnly: false,
      },
    ],
    subtitleTracks: [],
    metadataAnalyzed: false,
    analysisSummary: {
      containerDetected: true,
      videoDetected: false,
      audioDetected: false,
      subtitleDetected: false,
      notice: 'Basic media information only (Backend inspection unavailable)',
    },
    filenameHints: {
      audioLanguages: detected.extractedLanguages,
    },
  };
}

export function evaluateCapabilities(url: string, movie?: MovieRecord): PlaybackCapabilityResult {
  const container = movie?.container || detectMediaType(url).container;
  const isWebOS = typeof (window as any).webOS !== 'undefined' || /Web0S|webOS/i.test(navigator.userAgent);
  const v = document.createElement('video');
  const nativeAudioTracks = typeof (v as any).audioTracks !== 'undefined';
  const nativeTextTracks = typeof v.textTracks !== 'undefined';

  let playable = true;
  let audioTrackSelection = false;
  let subtitleSelection = false;
  let reason = '';

  if (container === 'mkv') {
    if (isWebOS) {
      playable = true;
      audioTrackSelection = false;
      subtitleSelection = false;
      reason = 'MKV container supported on webOS TV. Embedded track switching depends on TV model codecs.';
    } else {
      playable = true;
      audioTrackSelection = nativeAudioTracks;
      subtitleSelection = nativeTextTracks;
      reason = 'Direct MKV playback supported. Embedded track selection depends on browser demuxer.';
    }
  } else if (container === 'm3u8') {
    playable = true;
    audioTrackSelection = true;
    subtitleSelection = true;
    reason = 'HLS adaptive stream with alternate audio renditions.';
  } else {
    playable = true;
    audioTrackSelection = nativeAudioTracks;
    subtitleSelection = nativeTextTracks;
    reason = 'Standard media container supported.';
  }

  return {
    playable,
    container,
    audioTrackSelection,
    subtitleSelection,
    reason,
    codecNotice: 'TV compatibility may vary depending on model codec licensing.',
    nativeAudioTrackCount: (v as any).audioTracks ? (v as any).audioTracks.length : 0,
    nativeTextTrackCount: v.textTracks ? v.textTracks.length : 0,
  };
}

export function formatVideoCodec(codec: string): string {
  if (!codec) return 'Unknown';
  const c = codec.toUpperCase();
  if (c.includes('H264') || c.includes('AVC')) return 'H.264 / AVC';
  if (c.includes('HEVC') || c.includes('H265')) return 'HEVC / H.265';
  if (c.includes('VP9')) return 'VP9';
  if (c.includes('VP8')) return 'VP8';
  if (c.includes('AV1')) return 'AV1';
  if (c.includes('MPEG2')) return 'MPEG-2';
  if (c.includes('MPEG4')) return 'MPEG-4';
  return codec;
}

export function mapLangToLabel(code?: string): string {
  if (!code) return '';
  const map: Record<string, string> = {
    ta: 'Tamil', tam: 'Tamil',
    te: 'Telugu', tel: 'Telugu',
    hi: 'Hindi', hin: 'Hindi',
    en: 'English', eng: 'English',
    ml: 'Malayalam', mal: 'Malayalam',
    kn: 'Kannada', kan: 'Kannada',
  };
  return map[code.toLowerCase()] || code.toUpperCase();
}

/**
 * Helper to identify default/demo test videos so they can be removed
 */
export function isDemoVideo(video?: Partial<MovieRecord> | null): boolean {
  if (!video) return false;
  if (video.id && (video.id.startsWith('test-') || video.id.startsWith('demo-'))) return true;
  if (video.category === 'Acceptance Tests' || video.category === 'Demo') return true;
  const name = (video.name || '').toLowerCase();
  if (
    name.includes('(mp4 test)') ||
    name.includes('(mkv playback test)') ||
    name.includes('(external webvtt test)') ||
    name.includes('(hls multi-audio test)') ||
    name.includes('(secure token') ||
    name.includes('(av1/dts error)') ||
    name.includes('big buck bunny') ||
    name.includes('elephants dream') ||
    name.includes('sintel') ||
    name.includes('tears of steel')
  ) {
    return true;
  }
  return false;
}

/**
 * Built-in presets are completely removed per user instruction.
 */
export const ACCEPTANCE_TEST_PRESETS: MovieRecord[] = [];

export function getStoredLibrary(): MovieRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LIBRARY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const userVideos = parsed.filter((v: MovieRecord) => !isDemoVideo(v));
        saveStoredLibrary(userVideos);
        return userVideos;
      }
    }
  } catch {}
  return [];
}

export function saveStoredLibrary(movies: MovieRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_LIBRARY, JSON.stringify(movies));
  } catch {}
}

export function getStoredSettings(): AppSettings {
  const defaults: AppSettings = {
    playback: {
      autoPlayNext: true,
      resumePlayback: true,
      seekStep: 10,
    },
    audio: {
      preferredAudioLanguage: 'Tamil',
      autoSelectAudio: true,
    },
    subtitles: {
      preferredSubtitleLanguage: 'English',
      autoEnableSubtitles: true,
      fontSize: 'medium',
    },
    network: {
      bufferStrategy: 'default',
    },
    interface: {
      glassIntensity: 'standard',
      tvSafeMargins: true,
      showClock: true,
      remoteSimulator: true,
    },
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (raw) return { ...defaults, ...JSON.parse(raw) };
  } catch {}
  return defaults;
}

export function saveStoredSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  } catch {}
}

export function getStoredPlaybackTime(movieId: string): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROGRESS);
    if (raw) {
      const map = JSON.parse(raw);
      return map[movieId] || 0;
    }
  } catch {}
  return 0;
}

export function saveStoredPlaybackTime(movieId: string, time: number): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROGRESS);
    const map = raw ? JSON.parse(raw) : {};
    map[movieId] = time;
    localStorage.setItem(STORAGE_KEY_PROGRESS, JSON.stringify(map));
  } catch {}
}

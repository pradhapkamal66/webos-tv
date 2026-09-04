/**
 * StreamGlass TV - Media and Playback Types
 * Target: LG webOS TV (1920x1080)
 */

export type AudioSourceType = 'native' | 'hls' | 'metadata' | 'external';
export type SubtitleSourceType = 'native' | 'hls' | 'metadata' | 'external';

export interface AudioTrackItem {
  id: string | number;
  language: string; // e.g. 'ta', 'te', 'hi', 'en'
  label: string;    // e.g. 'Tamil', 'Telugu', 'Hindi', 'English'
  codec?: string;   // e.g. 'AAC', 'AC3', 'E-AC3', 'DTS'
  channels?: number | string; // e.g. 2, 6, '5.1', '2.0'
  default?: boolean;
  selected?: boolean;
  source: AudioSourceType;
  url?: string;     // For external audio
  isHintOnly?: boolean; // If only extracted from filename, NOT selectable
}

export interface SubtitleTrackItem {
  id: string | number;
  language: string; // e.g. 'en', 'ta', 'te', 'hi'
  label: string;    // e.g. 'English', 'Tamil'
  url?: string;     // For external WebVTT
  embedded: boolean;
  default?: boolean;
  selected?: boolean;
  source: SubtitleSourceType;
  isHintOnly?: boolean;
}

export interface VideoInfo {
  codec: string;
  width: number;
  height: number;
  frameRate: number;
}

export interface MovieRecord {
  id: string;
  name: string;
  type: 'movie' | 'stream' | 'clip';
  category: string;
  year?: string | number;
  poster?: string;
  backdrop?: string;
  description?: string;

  streamUrl: string;

  container: string;
  mimeType: string;

  videoInfo: VideoInfo;

  audioTracks: AudioTrackItem[];
  subtitleTracks: SubtitleTrackItem[];

  currentTime: number;
  duration: number;
  progress: number;

  favorite: boolean;
  completed: boolean;

  preferredAudioLanguage?: string;
  preferredSubtitleLanguage?: string;

  createdAt: string;
  updatedAt: string;

  // Firebase user association
  userId?: string;
  userEmail?: string;

  // Metadata analysis status
  metadataAnalyzed?: boolean;
  analysisSummary?: {
    containerDetected: boolean;
    videoDetected: boolean;
    audioDetected: boolean;
    subtitleDetected: boolean;
    notice?: string;
  };
  filenameHints?: {
    audioLanguages?: string[];
    resolution?: string;
    codec?: string;
  };
}

export interface MediaDetectionResult {
  container: 'mkv' | 'mp4' | 'm3u8' | 'ts' | 'mov' | 'webm' | 'unknown';
  protocol: 'file' | 'hls' | 'http' | 'https';
  mimeType: string;
  sanitizedUrl: string;
  extractedTitle: string;
  extractedYear?: string;
  extractedLanguages: string[];
}

export interface PlaybackCapabilityResult {
  playable: boolean;
  container: string;
  audioTrackSelection: boolean;
  subtitleSelection: boolean;
  reason: string;
  codecNotice?: string;
  nativeAudioTrackCount: number;
  nativeTextTrackCount: number;
}

export interface DeviceInfoState {
  isWebOS: boolean;
  modelName: string;
  version: string;
  sdkVersion: string;
  screenResolution: string;
  uhd: boolean;
  oled: boolean;
  audioCodecSupport: string[];
  videoCodecSupport: string[];
}

export interface AppSettings {
  playback: {
    autoPlayNext: boolean;
    resumePlayback: boolean;
    seekStep: 5 | 10 | 30 | 60;
  };
  audio: {
    preferredAudioLanguage: string;
    autoSelectAudio: boolean;
  };
  subtitles: {
    preferredSubtitleLanguage: string;
    autoEnableSubtitles: boolean;
    fontSize: 'small' | 'medium' | 'large';
  };
  network: {
    bufferStrategy: 'default' | 'fast-start' | 'large-buffer';
  };
  interface: {
    glassIntensity: 'subtle' | 'standard' | 'deep';
    tvSafeMargins: boolean;
    showClock: boolean;
    remoteSimulator: boolean;
  };
}

export interface DiagnosticData {
  timestamp: string;
  currentUrl: string; // Sanitized (no tokens)
  container: string;
  mime: string;
  videoCodec: string;
  resolution: string;
  audioTracks: {
    id: string | number;
    label: string;
    codec?: string;
    channels?: string | number;
    source: string;
    selected: boolean;
  }[];
  subtitleTracks: {
    id: string | number;
    label: string;
    source: string;
    selected: boolean;
  }[];
  browserSupport: {
    canPlayType: string;
    mediaSourceSupported: boolean;
    audioTracksSupported: boolean;
    textTracksSupported: boolean;
  };
  webOSSupport: {
    isWebOS: boolean;
    model: string;
    version: string;
  };
  playbackStatus: {
    readyState: number;
    networkState: number;
    paused: boolean;
    currentTime: number;
    duration: number;
    bufferedEnd: number;
    error: string | null;
  };
}

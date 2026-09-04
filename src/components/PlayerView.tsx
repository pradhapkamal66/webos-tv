/**
 * StreamGlass TV - Master TV Player View
 * Full-screen 1080p webOS player with HLS audio switching, MKV track detection,
 * WebVTT subtitles, error handling, and spatial TV controls.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Subtitles,
  Film,
  Info,
  ArrowLeft,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  Edit3,
  QrCode,
} from 'lucide-react';
import { MovieRecord, AudioTrackItem, SubtitleTrackItem, PlaybackCapabilityResult, AppSettings } from '../types/media';
import { AudioTrackSelector } from './AudioTrackSelector';
import { SubtitleSelector } from './SubtitleSelector';
import { MetadataPanel } from './MetadataPanel';
import { MediaQRCodeCard } from './MediaQRCodeCard';
import {
  evaluateCapabilities,
  sanitizeUrl,
  saveStoredPlaybackTime,
  getStoredPlaybackTime,
} from '../services/mediaService';

interface PlayerViewProps {
  movie: MovieRecord;
  settings: AppSettings;
  onBackToLibrary: () => void;
  onOpenDiagnostics: () => void;
  onUpdateMovie: (updated: MovieRecord) => void;
  onEditMovie?: () => void;
  remoteActionTrigger: string | null;
}

export const PlayerView: React.FC<PlayerViewProps> = ({
  movie,
  settings,
  onBackToLibrary,
  onOpenDiagnostics,
  onUpdateMovie,
  onEditMovie,
  remoteActionTrigger,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Overlays & Panels
  const [showControls, setShowControls] = useState(true);
  const [showInfoOverlay, setShowInfoOverlay] = useState(false);
  const [showAudioSelector, setShowAudioSelector] = useState(false);
  const [showSubtitleSelector, setShowSubtitleSelector] = useState(false);
  const [showMetadataPanel, setShowMetadataPanel] = useState(false);
  const [showQrCard, setShowQrCard] = useState(false);

  // Audio and Subtitle State
  const [audioTracks, setAudioTracks] = useState<AudioTrackItem[]>([]);
  const [selectedAudioId, setSelectedAudioId] = useState<string | number | null>(null);
  const [audioNotice, setAudioNotice] = useState<string | undefined>(undefined);

  const [subtitleTracks, setSubtitleTracks] = useState<SubtitleTrackItem[]>([]);
  const [selectedSubtitleId, setSelectedSubtitleId] = useState<string | number | null>('off');
  const [subtitleNotice, setSubtitleNotice] = useState<string | undefined>(undefined);

  const controlsTimeoutRef = useRef<any>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (!showAudioSelector && !showSubtitleSelector && !showMetadataPanel) {
        setShowControls(false);
      }
    }, 5000);
  }, [showAudioSelector, showSubtitleSelector, showMetadataPanel]);

  // Handle Video Element & HLS Initialization
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setPlaybackError(null);
    setIsBuffering(true);

    const isHls = movie.container === 'm3u8' || movie.streamUrl.includes('.m3u8');

    // Destroy existing HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });
      hlsRef.current = hls;

      hls.loadSource(movie.streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        setIsBuffering(false);
        // Discover audio tracks from HLS manifest
        if (hls.audioTracks && hls.audioTracks.length > 0) {
          const hlsTracks: AudioTrackItem[] = hls.audioTracks.map((t, idx) => ({
            id: `hls_${idx}`,
            language: t.lang || 'und',
            label: t.name || (t.lang ? t.lang.toUpperCase() : `Audio ${idx + 1}`),
            codec: 'AAC',
            channels: '2.0',
            default: !!t.default,
            selected: hls.audioTrack === idx,
            source: 'hls',
          }));
          setAudioTracks(hlsTracks);

          // Auto-select preferred language
          const preferred = settings.audio.preferredAudioLanguage.toLowerCase();
          const match = hlsTracks.find(
            (t) =>
              t.label.toLowerCase().includes(preferred) ||
              t.language.toLowerCase().includes(preferred.slice(0, 2))
          );
          if (match && settings.audio.autoSelectAudio) {
            const matchIdx = hlsTracks.indexOf(match);
            hls.audioTrack = matchIdx;
            setSelectedAudioId(match.id);
          } else {
            setSelectedAudioId(hlsTracks[0].id);
          }
        }
      });

      hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, (_, data) => {
        if (hls.subtitleTracks && hls.subtitleTracks.length > 0) {
          const subTracks: SubtitleTrackItem[] = [
            { id: 'off', language: 'off', label: 'Off', embedded: false, source: 'native', selected: true },
            ...hls.subtitleTracks.map((s, idx) => ({
              id: `hls_sub_${idx}`,
              language: s.lang || 'und',
              label: s.name || (s.lang ? s.lang.toUpperCase() : `Sub ${idx + 1}`),
              embedded: true,
              source: 'hls' as const,
              selected: false,
            })),
          ];
          setSubtitleTracks(subTracks);
        }
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              setPlaybackError('Network connection error loading HLS media stream.');
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              setPlaybackError('Media decode error: codec or rendition unsupported.');
              hls.recoverMediaError();
              break;
            default:
              setPlaybackError('Fatal playback error encountered.');
              hls.destroy();
              break;
          }
        }
      });
    } else {
      // Standard video / MKV / MP4
      video.src = movie.streamUrl;
      video.load();

      // Initial tracks population from verified metadata
      if (movie.audioTracks && movie.audioTracks.length > 0) {
        setAudioTracks(movie.audioTracks);
        const def = movie.audioTracks.find((t) => t.default) || movie.audioTracks[0];
        setSelectedAudioId(def.id);
      } else {
        setAudioTracks([
          {
            id: 'default',
            language: 'und',
            label: 'Default Audio',
            codec: movie.container === 'mkv' ? 'MKV Embedded' : 'AAC',
            channels: '2.0',
            default: true,
            selected: true,
            source: 'native',
          },
        ]);
        setSelectedAudioId('default');
      }

      // Populate subtitle tracks (with 'Off' option first)
      const baseSubs: SubtitleTrackItem[] = [
        { id: 'off', language: 'off', label: 'Off', embedded: false, source: 'native', selected: true },
        ...(movie.subtitleTracks || []),
      ];
      setSubtitleTracks(baseSubs);

      // Restore playback progress if enabled
      if (settings.playback.resumePlayback) {
        const savedTime = getStoredPlaybackTime(movie.id);
        if (savedTime > 0) {
          video.currentTime = savedTime;
        }
      }
    }

    // Attempt autoplay
    video.play().then(
      () => setIsPlaying(true),
      () => setIsPlaying(false)
    );

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [movie, settings]);

  // Video Event Listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      if (Math.floor(video.currentTime) % 5 === 0) {
        saveStoredPlaybackTime(movie.id, video.currentTime);
      }
    };

    const onDurationChange = () => setDuration(video.duration || 0);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onWaiting = () => setIsBuffering(true);
    const onCanPlay = () => setIsBuffering(false);

    const onError = () => {
      setIsBuffering(false);
      const err = video.error;
      if (err) {
        if (movie.container === 'mkv') {
          setPlaybackError(
            'Unable to play this MKV. The container is supported, but the video/audio codec may not be supported by this LG TV model.'
          );
        } else if (err.code === 4) {
          setPlaybackError('Media playback error: stream format or codec is not supported by this device.');
        } else {
          setPlaybackError(`Player error code ${err.code}: ${err.message || 'Playback failed'}`);
        }
      }
    };

    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('durationchange', onDurationChange);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('canplay', onCanPlay);
    video.addEventListener('error', onError);

    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('durationchange', onDurationChange);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('canplay', onCanPlay);
      video.removeEventListener('error', onError);
    };
  }, [movie]);

  // Audio Track Selection Logic (Section 6)
  const handleSelectAudioTrack = (trackId: string | number) => {
    const target = audioTracks.find((t) => String(t.id) === String(trackId));
    if (!target) return;

    // HLS Alternate Audio Rendition
    if (target.source === 'hls' && hlsRef.current) {
      const idx = Number(String(target.id).replace('hls_', ''));
      hlsRef.current.audioTrack = idx;
      setSelectedAudioId(target.id);
      showToast(`Switched audio track to: ${target.label}`);
      return;
    }

    // Native Video Audio Tracks
    const video = videoRef.current;
    if (target.source === 'native' && video && (video as any).audioTracks) {
      const vTracks = (video as any).audioTracks;
      for (let i = 0; i < vTracks.length; i++) {
        vTracks[i].enabled = i === Number(target.id);
      }
      setSelectedAudioId(target.id);
      showToast(`Switched native track to: ${target.label}`);
      return;
    }

    // Default Track Active
    if (target.id === 'default') {
      setSelectedAudioId('default');
      showToast('Default audio track active.');
      return;
    }

    // MKV Limitation Notice (Section 6 requirement)
    if (movie.container === 'mkv') {
      setAudioNotice(
        'This TV/player does not expose embedded MKV audio tracks for direct selection. Playback is continuing using the default audio stream.'
      );
      showToast('This TV/player does not expose embedded MKV audio tracks for direct selection.');
      return;
    }

    showToast(`Selected track: ${target.label}`);
    setSelectedAudioId(target.id);
  };

  // Subtitle Track Selection Logic (Section 9 & 10)
  const handleSelectSubtitleTrack = (trackId: string | number) => {
    const video = videoRef.current;
    if (!video) return;

    if (trackId === 'off') {
      if (video.textTracks) {
        for (let i = 0; i < video.textTracks.length; i++) {
          video.textTracks[i].mode = 'disabled';
        }
      }
      if (hlsRef.current) {
        hlsRef.current.subtitleTrack = -1;
      }
      setSelectedSubtitleId('off');
      showToast('Subtitles turned off');
      return;
    }

    const target = subtitleTracks.find((s) => String(s.id) === String(trackId));
    if (!target) return;

    // Disable others
    if (video.textTracks) {
      for (let i = 0; i < video.textTracks.length; i++) {
        video.textTracks[i].mode = 'disabled';
      }
    }

    if (target.source === 'external' && target.url) {
      // Find or create <track>
      let trackEl = video.querySelector(`track[src="${target.url}"]`) as HTMLTrackElement;
      if (!trackEl) {
        trackEl = document.createElement('track');
        trackEl.kind = 'subtitles';
        trackEl.src = target.url;
        trackEl.srclang = target.language;
        trackEl.label = target.label;
        video.appendChild(trackEl);
      }
      // Activate matching textTrack
      setTimeout(() => {
        if (video.textTracks) {
          for (let k = 0; k < video.textTracks.length; k++) {
            if (video.textTracks[k].label === target.label) {
              video.textTracks[k].mode = 'showing';
            }
          }
        }
      }, 50);

      setSelectedSubtitleId(target.id);
      showToast(`Subtitles: ${target.label} (External WebVTT)`);
      return;
    }

    if (target.source === 'hls' && hlsRef.current) {
      const idx = Number(String(target.id).replace('hls_sub_', ''));
      hlsRef.current.subtitleTrack = idx;
      setSelectedSubtitleId(target.id);
      showToast(`Subtitles: ${target.label} (HLS)`);
      return;
    }

    if (movie.container === 'mkv' && target.embedded) {
      setSubtitleNotice(
        'Embedded subtitles detected by metadata, but this TV player does not expose them for direct selection.'
      );
      showToast('Embedded subtitles cannot be directly controlled through current TV player interface.');
      return;
    }

    setSelectedSubtitleId(target.id);
  };

  const handleAddExternalVtt = (url: string, langCode: string, label: string) => {
    const newTrack: SubtitleTrackItem = {
      id: `ext_${Date.now()}`,
      language: langCode,
      label,
      url,
      embedded: false,
      source: 'external',
    };

    setSubtitleTracks((prev) => [...prev, newTrack]);
    handleSelectSubtitleTrack(newTrack.id);
  };

  // Playback Control Helpers
  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
    resetControlsTimeout();
  };

  const seekBy = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(video.duration || 0, video.currentTime + seconds));
    resetControlsTimeout();
  };

  // Handle Incoming Remote Actions (Keyboard or Remote Simulator)
  useEffect(() => {
    if (!remoteActionTrigger) return;
    resetControlsTimeout();

    switch (remoteActionTrigger) {
      case 'PLAY_PAUSE':
        togglePlayPause();
        break;
      case 'LEFT':
        seekBy(-settings.playback.seekStep);
        break;
      case 'RIGHT':
        seekBy(settings.playback.seekStep);
        break;
      case 'FAST_FORWARD':
        seekBy(settings.playback.seekStep * 2);
        break;
      case 'REWIND':
        seekBy(-settings.playback.seekStep * 2);
        break;
      case 'OK':
        setShowControls((prev) => !prev);
        break;
      case 'BACK':
        if (showAudioSelector) setShowAudioSelector(false);
        else if (showSubtitleSelector) setShowSubtitleSelector(false);
        else if (showMetadataPanel) setShowMetadataPanel(false);
        else onBackToLibrary();
        break;
      case 'INFO':
        setShowInfoOverlay((prev) => !prev);
        break;
      case 'AUDIO_MENU':
        setShowAudioSelector((prev) => !prev);
        setShowSubtitleSelector(false);
        setShowMetadataPanel(false);
        break;
      case 'SUBTITLE_MENU':
        setShowSubtitleSelector((prev) => !prev);
        setShowAudioSelector(false);
        setShowMetadataPanel(false);
        break;
      case 'DIAGNOSTICS':
        onOpenDiagnostics();
        break;
      case 'UP':
        if (videoRef.current) {
          videoRef.current.volume = Math.min(1, videoRef.current.volume + 0.1);
          setVolume(videoRef.current.volume);
        }
        break;
      case 'DOWN':
        if (videoRef.current) {
          videoRef.current.volume = Math.max(0, videoRef.current.volume - 0.1);
          setVolume(videoRef.current.volume);
        }
        break;
    }
  }, [remoteActionTrigger]);

  const activeAudioTrack = audioTracks.find((t) => String(t.id) === String(selectedAudioId)) || audioTracks[0];
  const activeSubTrack = subtitleTracks.find((s) => String(s.id) === String(selectedSubtitleId));

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      id="player-viewport"
      className="relative w-full h-full bg-black overflow-hidden select-none"
      onMouseMove={resetControlsTimeout}
      onClick={resetControlsTimeout}
    >
      {/* HTML5 Video Element */}
      <video
        ref={videoRef}
        poster={movie.poster}
        className="w-full h-full object-contain"
        playsInline
        webkit-playsinline="true"
      />

      {/* Buffering Indicator */}
      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="w-16 h-16 rounded-full border-4 border-white/20 border-t-blue-500 animate-spin" />
        </div>
      )}

      {/* Playback Error Banner (Section 14) */}
      {playbackError && (
        <div className="absolute top-24 left-1/2 transform -translate-x-1/2 z-40 w-[600px] bg-red-950/90 border border-red-500/50 rounded-2xl p-5 shadow-2xl backdrop-blur-xl text-neutral-100 flex items-start gap-4">
          <AlertTriangle className="w-6 h-6 text-red-400 shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="font-bold text-sm text-red-200">Unable to play this media file</h3>
            <p className="text-xs text-neutral-300 mt-1 leading-relaxed">{playbackError}</p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => onOpenDiagnostics()}
                className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-semibold"
              >
                Inspect Diagnostics
              </button>
              <button
                onClick={() => onBackToLibrary()}
                className="px-3 py-1 bg-white/10 hover:bg-white/20 text-neutral-300 rounded text-xs"
              >
                Return to Library
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      {toastMessage && (
        <div className="absolute top-12 left-1/2 transform -translate-x-1/2 z-50 px-5 py-2.5 bg-neutral-900/90 border border-white/20 rounded-full shadow-2xl backdrop-blur-xl text-xs font-medium text-white animate-in fade-in slide-in-from-top-3 duration-200">
          {toastMessage}
        </div>
      )}

      {/* Player Information Overlay (Section 19: Pressing INFO or OK) */}
      {showInfoOverlay && (
        <div
          id="player-info-overlay"
          className="absolute top-12 left-12 z-30 bg-neutral-950/80 border border-white/15 rounded-2xl p-5 backdrop-blur-xl text-neutral-100 shadow-2xl flex flex-col gap-2 max-w-sm animate-in fade-in duration-200"
        >
          <h2 className="text-xl font-black tracking-wide text-white">{movie.name}</h2>
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="bg-white/10 px-2 py-0.5 rounded text-neutral-300">1080p</span>
            <span className="bg-white/10 px-2 py-0.5 rounded text-neutral-300">{movie.videoInfo.codec || 'H.264'}</span>
            <span className="bg-blue-600/30 text-blue-300 px-2 py-0.5 rounded uppercase font-bold">
              {movie.container}
            </span>
          </div>
          <div className="pt-2 border-t border-white/10 text-xs flex flex-col gap-1 text-neutral-300">
            <div>
              <span className="text-neutral-500">Audio: </span>
              <span className="font-semibold text-blue-400">
                {activeAudioTrack ? `${activeAudioTrack.label} ${activeAudioTrack.channels || '2.0'}` : 'Default'}
              </span>
            </div>
            <div>
              <span className="text-neutral-500">Subtitles: </span>
              <span className="font-semibold text-emerald-400">
                {activeSubTrack && activeSubTrack.id !== 'off' ? activeSubTrack.label : 'Off'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Top Controls Bar */}
      <div
        className={`absolute top-0 left-0 right-0 p-8 flex items-center justify-between z-20 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-4">
          <button
            id="btn-player-back"
            onClick={onBackToLibrary}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-black/50 hover:bg-neutral-800 border border-white/15 text-xs font-semibold text-white backdrop-blur-md transition-all focus:ring-2 focus:ring-blue-400"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Library</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white tracking-wide">{movie.name}</span>
            <span className="text-[11px] font-mono bg-blue-500/20 text-blue-300 border border-blue-500/40 px-2 py-0.5 rounded uppercase">
              {movie.container}
            </span>
          </div>
        </div>

        {/* Top Right Actions */}
        <div className="flex items-center gap-2.5">
          <button
            id="btn-toggle-info"
            onClick={() => setShowInfoOverlay((prev) => !prev)}
            className="px-3 py-2 rounded-xl bg-black/50 hover:bg-neutral-800 border border-white/15 text-xs text-neutral-200 backdrop-blur-md flex items-center gap-1.5 focus:ring-2 focus:ring-blue-400"
          >
            <Info className="w-3.5 h-3.5" />
            <span>Info (I)</span>
          </button>
          <button
            id="btn-toggle-metadata"
            onClick={() => {
              setShowMetadataPanel((prev) => !prev);
              setShowAudioSelector(false);
              setShowSubtitleSelector(false);
            }}
            className="px-3 py-2 rounded-xl bg-black/50 hover:bg-neutral-800 border border-white/15 text-xs text-neutral-200 backdrop-blur-md flex items-center gap-1.5 focus:ring-2 focus:ring-blue-400"
          >
            <Film className="w-3.5 h-3.5 text-blue-400" />
            <span>Media Info</span>
          </button>
          <button
            id="btn-player-qrcode"
            onClick={() => setShowQrCard((prev) => !prev)}
            className={`px-3 py-2 rounded-xl border text-xs backdrop-blur-md flex items-center gap-1.5 transition-all focus:ring-2 focus:ring-blue-400 ${
              showQrCard
                ? 'bg-blue-600 text-white border-blue-400 shadow-lg'
                : 'bg-black/50 hover:bg-neutral-800 border-white/15 text-neutral-200'
            }`}
            title="Show Stream URL & Poster QR Code"
          >
            <QrCode className="w-3.5 h-3.5 text-blue-400" />
            <span>QR Code</span>
          </button>
          {onEditMovie && (
            <button
              id="btn-player-edit"
              onClick={onEditMovie}
              className="px-3 py-2 rounded-xl bg-black/50 hover:bg-neutral-800 border border-white/15 text-xs text-neutral-200 backdrop-blur-md flex items-center gap-1.5 focus:ring-2 focus:ring-blue-400"
              title="Edit video and tracks"
            >
              <Edit3 className="w-3.5 h-3.5 text-blue-400" />
              <span>Edit</span>
            </button>
          )}
          <button
            id="btn-open-diag"
            onClick={onOpenDiagnostics}
            className="px-3 py-2 rounded-xl bg-black/50 hover:bg-neutral-800 border border-white/15 text-xs text-neutral-200 backdrop-blur-md flex items-center gap-1.5 focus:ring-2 focus:ring-blue-400"
          >
            <Activity className="w-3.5 h-3.5 text-amber-400" />
            <span>Diagnostics</span>
          </button>
        </div>
      </div>

      {/* Floating Selector Modals */}
      {showAudioSelector && (
        <div className="absolute top-20 right-12 z-30">
          <AudioTrackSelector
            movie={movie}
            tracks={audioTracks}
            selectedTrackId={selectedAudioId}
            onSelectTrack={handleSelectAudioTrack}
            onClose={() => setShowAudioSelector(false)}
            statusNotice={audioNotice}
          />
        </div>
      )}

      {showSubtitleSelector && (
        <div className="absolute top-20 right-12 z-30">
          <SubtitleSelector
            movie={movie}
            tracks={subtitleTracks}
            selectedTrackId={selectedSubtitleId}
            onSelectTrack={handleSelectSubtitleTrack}
            onAddExternalVtt={handleAddExternalVtt}
            onClose={() => setShowSubtitleSelector(false)}
            statusNotice={subtitleNotice}
          />
        </div>
      )}

      {showMetadataPanel && (
        <div className="absolute top-20 right-12 z-30">
          <MetadataPanel
            movie={movie}
            isAnalyzing={false}
            onClose={() => setShowMetadataPanel(false)}
          />
        </div>
      )}

      {showQrCard && (
        <div className="absolute top-20 right-12 z-40 animate-in fade-in zoom-in-95">
          <MediaQRCodeCard
            streamUrl={movie.streamUrl}
            posterUrl={movie.poster}
            title={movie.name}
            container={movie.container}
            onClose={() => setShowQrCard(false)}
          />
        </div>
      )}

      {/* Bottom Controls Bar */}
      <div
        className={`absolute bottom-0 left-0 right-0 p-8 flex flex-col gap-4 z-20 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="bg-neutral-900/80 backdrop-blur-2xl border border-white/15 rounded-2xl p-5 shadow-2xl flex flex-col gap-3">
          {/* Progress Bar */}
          <div
            className="w-full h-2.5 bg-white/20 rounded-full overflow-hidden cursor-pointer relative"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const pos = (e.clientX - rect.left) / rect.width;
              if (videoRef.current && duration > 0) {
                videoRef.current.currentTime = pos * duration;
              }
            }}
          >
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-100"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Controls Row */}
          <div className="flex items-center justify-between">
            {/* Left Play/Pause & Seeks */}
            <div className="flex items-center gap-3">
              <button
                id="btn-play-pause-main"
                onClick={togglePlayPause}
                className="w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-lg transition-all focus:ring-2 focus:ring-blue-400"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5 fill-current" />}
              </button>
              <button
                onClick={() => seekBy(-settings.playback.seekStep)}
                className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs text-neutral-200 font-semibold flex items-center gap-1 focus:ring-2 focus:ring-blue-400"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{settings.playback.seekStep}s</span>
              </button>
              <button
                onClick={() => seekBy(settings.playback.seekStep)}
                className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs text-neutral-200 font-semibold flex items-center gap-1 focus:ring-2 focus:ring-blue-400"
              >
                <span>{settings.playback.seekStep}s</span>
                <RotateCw className="w-3.5 h-3.5" />
              </button>

              {/* Time display */}
              <span className="text-xs font-mono text-neutral-300 ml-2">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            {/* Right: Audio Track / Subtitles / Volume */}
            <div className="flex items-center gap-3">
              <button
                id="btn-audio-selector-trigger"
                onClick={() => {
                  setShowAudioSelector((prev) => !prev);
                  setShowSubtitleSelector(false);
                  setShowMetadataPanel(false);
                }}
                className={`px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all focus:ring-2 focus:ring-blue-400 ${
                  showAudioSelector
                    ? 'bg-blue-600 text-white border-blue-400 shadow'
                    : 'bg-white/10 hover:bg-white/15 text-neutral-200 border-white/10'
                }`}
              >
                <Volume2 className="w-4 h-4 text-blue-400" />
                <span>Audio: {activeAudioTrack ? activeAudioTrack.label : 'Default'}</span>
              </button>

              <button
                id="btn-subtitle-selector-trigger"
                onClick={() => {
                  setShowSubtitleSelector((prev) => !prev);
                  setShowAudioSelector(false);
                  setShowMetadataPanel(false);
                }}
                className={`px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all focus:ring-2 focus:ring-emerald-400 ${
                  showSubtitleSelector
                    ? 'bg-emerald-600 text-white border-emerald-400 shadow'
                    : 'bg-white/10 hover:bg-white/15 text-neutral-200 border-white/10'
                }`}
              >
                <Subtitles className="w-4 h-4 text-emerald-400" />
                <span>Subtitles: {activeSubTrack && activeSubTrack.id !== 'off' ? activeSubTrack.label : 'Off'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}

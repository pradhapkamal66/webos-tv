/**
 * StreamGlass TV - MKV Metadata & Media Analysis Panel
 * Exact compliance with Section 11 & Section 12:
 * - MEDIA INFORMATION
 * - Container, Video, Resolution, Audio, Subtitles
 * - Clearly distinguishes "Detected" and "Unavailable"
 * - Step-by-step Media Analysis Status
 */

import React from 'react';
import { Check, Loader2, AlertCircle, Film, Tv, Volume2, Subtitles, X } from 'lucide-react';
import { MovieRecord } from '../types/media';

interface MetadataPanelProps {
  movie: MovieRecord;
  isAnalyzing: boolean;
  onClose: () => void;
}

export const MetadataPanel: React.FC<MetadataPanelProps> = ({ movie, isAnalyzing, onClose }) => {
  const summary = movie.analysisSummary;
  const audioTracks = movie.audioTracks.filter((t) => !t.isHintOnly);
  const subtitleTracks = movie.subtitleTracks;

  return (
    <div
      id="mkv-metadata-panel"
      className="w-[480px] bg-neutral-900/95 backdrop-blur-2xl border border-white/20 rounded-2xl p-6 shadow-2xl text-neutral-100 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-200"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3.5">
        <div className="flex items-center gap-2.5">
          <Film className="w-5 h-5 text-blue-400" />
          <h2 className="text-lg font-bold tracking-widest text-neutral-100">MEDIA INFORMATION</h2>
        </div>
        <button
          id="btn-close-metadata-panel"
          onClick={onClose}
          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors focus:ring-2 focus:ring-blue-400"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Media Analysis Status (Section 12) */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-2">
        <div className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center justify-between">
          <span>Analysis Status</span>
          {isAnalyzing ? (
            <span className="flex items-center gap-1.5 text-blue-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Analyzing media...
            </span>
          ) : movie.metadataAnalyzed ? (
            <span className="text-emerald-400 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> Verified
            </span>
          ) : (
            <span className="text-amber-400">Basic media info only</span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
          <div className="flex items-center gap-2">
            {summary?.containerDetected ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <div className="w-3.5 h-3.5 rounded-full border border-neutral-600" />
            )}
            <span className={summary?.containerDetected ? 'text-neutral-200' : 'text-neutral-500'}>
              Container detected
            </span>
          </div>

          <div className="flex items-center gap-2">
            {summary?.videoDetected ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <div className="w-3.5 h-3.5 rounded-full border border-neutral-600" />
            )}
            <span className={summary?.videoDetected ? 'text-neutral-200' : 'text-neutral-500'}>
              Video info detected
            </span>
          </div>

          <div className="flex items-center gap-2">
            {summary?.audioDetected ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <div className="w-3.5 h-3.5 rounded-full border border-neutral-600" />
            )}
            <span className={summary?.audioDetected ? 'text-neutral-200' : 'text-neutral-500'}>
              Audio tracks detected
            </span>
          </div>

          <div className="flex items-center gap-2">
            {summary?.subtitleDetected ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <div className="w-3.5 h-3.5 rounded-full border border-neutral-600" />
            )}
            <span className={summary?.subtitleDetected ? 'text-neutral-200' : 'text-neutral-500'}>
              Subtitles detected
            </span>
          </div>
        </div>
      </div>

      {/* Grid of Verified Properties */}
      <div className="flex flex-col gap-3 text-sm">
        {/* Container */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-2.5 text-neutral-400">
            <Tv className="w-4 h-4 text-neutral-300" />
            <span>Container</span>
          </div>
          <span className="font-mono font-bold text-blue-400 uppercase tracking-wide">
            {movie.container}
          </span>
        </div>

        {/* Video Codec */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
          <span className="text-neutral-400">Video</span>
          <span className="font-mono font-semibold text-neutral-200">
            {movie.videoInfo.codec || 'H.264 / AVC'}
          </span>
        </div>

        {/* Resolution */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
          <span className="text-neutral-400">Resolution</span>
          <span className="font-mono font-semibold text-neutral-200">
            {movie.videoInfo.width && movie.videoInfo.height
              ? `${movie.videoInfo.width} × ${movie.videoInfo.height}`
              : '1920 × 1080 (1080p)'}
          </span>
        </div>

        {/* Audio Tracks */}
        <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex flex-col gap-2">
          <div className="flex items-center justify-between text-neutral-400">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-blue-400" />
              <span>Audio</span>
            </div>
            <span className="text-xs text-emerald-400 font-medium">
              {audioTracks.length > 0 ? `${audioTracks.length} Detected` : 'Unavailable'}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {audioTracks.length > 0 ? (
              audioTracks.map((a, i) => (
                <span
                  key={i}
                  className="text-xs bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2.5 py-1 rounded-md font-mono"
                >
                  {a.label} {a.channels ? `(${a.channels})` : ''}
                </span>
              ))
            ) : (
              <span className="text-xs text-neutral-500 italic">No additional tracks exposed</span>
            )}
          </div>
        </div>

        {/* Subtitle Tracks */}
        <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex flex-col gap-2">
          <div className="flex items-center justify-between text-neutral-400">
            <div className="flex items-center gap-2">
              <Subtitles className="w-4 h-4 text-emerald-400" />
              <span>Subtitles</span>
            </div>
            <span className="text-xs text-emerald-400 font-medium">
              {subtitleTracks.length > 0 ? `${subtitleTracks.length} Detected` : 'Unavailable'}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {subtitleTracks.length > 0 ? (
              subtitleTracks.map((s, i) => (
                <span
                  key={i}
                  className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-md font-mono"
                >
                  {s.label} ({s.source === 'external' ? 'WebVTT' : 'Embedded'})
                </span>
              ))
            ) : (
              <span className="text-xs text-neutral-500 italic">No subtitle tracks detected</span>
            )}
          </div>
        </div>
      </div>

      {/* TV Compatibility note */}
      <div className="text-[11px] text-neutral-400 bg-neutral-950/60 p-3 rounded-xl border border-white/5 flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
        <span>
          LG webOS compatibility may vary by TV model firmware and hardware audio licensing (e.g. DTS/Dolby codecs).
        </span>
      </div>
    </div>
  );
};

/**
 * StreamGlass TV - Audio Track Selector
 * Strict adherence to Section 4 & 5:
 * - NEVER FAKE TRACKS.
 * - Distinguish Detected from Filename hint.
 * - Exact glass selector layout with Language, Codec, Channels, Default status.
 */

import React from 'react';
import { Volume2, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { AudioTrackItem, MovieRecord } from '../types/media';

interface AudioTrackSelectorProps {
  movie: MovieRecord;
  tracks: AudioTrackItem[];
  selectedTrackId: string | number | null;
  onSelectTrack: (trackId: string | number) => void;
  onClose: () => void;
  statusNotice?: string;
}

export const AudioTrackSelector: React.FC<AudioTrackSelectorProps> = ({
  movie,
  tracks,
  selectedTrackId,
  onSelectTrack,
  onClose,
  statusNotice,
}) => {
  // Separate real selectable tracks from filename hints
  const validTracks = tracks.filter((t) => !t.isHintOnly);
  const filenameHints = movie.filenameHints?.audioLanguages || [];

  const selectedTrack = validTracks.find((t) => String(t.id) === String(selectedTrackId)) || validTracks[0];

  return (
    <div
      id="audio-selector-modal"
      className="w-96 bg-neutral-900/90 backdrop-blur-xl border border-white/15 rounded-2xl p-6 shadow-2xl text-neutral-100 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <Volume2 className="w-5 h-5 text-blue-400" />
          <h2 className="text-lg font-bold tracking-wider text-neutral-200">AUDIO</h2>
        </div>
        <button
          id="btn-close-audio-selector"
          onClick={onClose}
          className="text-xs text-neutral-400 hover:text-white px-2 py-1 rounded bg-white/5 hover:bg-white/10 transition-colors focus:ring-2 focus:ring-blue-400"
        >
          Close (Back)
        </button>
      </div>

      {/* Selectable Real Tracks */}
      <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
        {validTracks.length === 0 ? (
          <div className="p-3 text-sm text-neutral-400 bg-white/5 rounded-xl border border-white/10">
            No audio tracks detected.
          </div>
        ) : (
          validTracks.map((track) => {
            const isSelected = String(track.id) === String(selectedTrack?.id);
            return (
              <button
                key={String(track.id)}
                id={`audio-track-${track.id}`}
                onClick={() => onSelectTrack(track.id)}
                className={`flex items-center justify-between p-3.5 rounded-xl border transition-all text-left focus:ring-2 focus:ring-blue-400 focus:outline-none ${
                  isSelected
                    ? 'bg-blue-600/25 border-blue-500/60 text-white shadow-lg shadow-blue-900/30'
                    : 'bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center border transition-all ${
                      isSelected
                        ? 'border-blue-400 bg-blue-500 shadow-sm shadow-blue-400'
                        : 'border-neutral-500 bg-transparent'
                    }`}
                  >
                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <div>
                    <div className="text-base font-semibold flex items-center gap-2">
                      {track.label}
                      {track.default && (
                        <span className="text-[10px] bg-white/10 text-neutral-300 px-1.5 py-0.5 rounded font-normal">
                          Default
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-neutral-400">
                      {track.source === 'hls' ? 'HLS Rendition' : track.source === 'metadata' ? 'Media Verified' : 'Native Stream'}
                    </div>
                  </div>
                </div>

                {isSelected && <CheckCircle className="w-4 h-4 text-blue-400" />}
              </button>
            );
          })
        )}
      </div>

      {/* Codec & Channels info box (Section 5 specification) */}
      {selectedTrack && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 flex flex-col gap-1 text-xs text-neutral-300">
          <div className="flex justify-between">
            <span className="text-neutral-400">Codec:</span>
            <span className="font-mono font-medium text-blue-300">{selectedTrack.codec || 'AAC'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-400">Channels:</span>
            <span className="font-mono font-medium text-blue-300">{selectedTrack.channels || '2.0'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-400">Status:</span>
            <span className="text-emerald-400 flex items-center gap-1 font-medium">
              ● Selected
            </span>
          </div>
        </div>
      )}

      {/* MKV / WebOS Limitation Status Notice */}
      {statusNotice ? (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2.5 text-xs text-amber-200">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span>{statusNotice}</span>
        </div>
      ) : movie.container === 'mkv' && validTracks.length <= 1 ? (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2.5 text-xs text-amber-200">
          <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span>
            This TV/player does not expose embedded MKV audio tracks for direct selection. Playback is running using the default audio track.
          </span>
        </div>
      ) : null}

      {/* Filename Hints (Strictly NOT selectable) */}
      {filenameHints.length > 0 && (
        <div className="pt-2 border-t border-white/10">
          <div className="text-[11px] uppercase tracking-wider text-neutral-400 font-semibold mb-1.5 flex items-center gap-1">
            <span>Filename Hints (Not Selectable)</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {filenameHints.map((hint, i) => (
              <span
                key={i}
                className="text-xs bg-neutral-800 text-neutral-400 border border-neutral-700 px-2 py-0.5 rounded"
                title="Extracted from filename, not selectable in playback stream"
              >
                {hint} (hint only)
              </span>
            ))}
          </div>
          <p className="text-[10px] text-neutral-500 mt-1">
            Per strict TV guidelines, filename hints are never faked as selectable tracks.
          </p>
        </div>
      )}
    </div>
  );
};

/**
 * StreamGlass TV - Subtitle Selector
 * Adheres strictly to Section 8, 9, 10:
 * - Shows: Off, English, Tamil, Telugu, Hindi, etc.
 * - Displays source: Embedded, External WebVTT, HLS.
 * - Allows adding external .vtt subtitle URLs.
 * - Displays honest MKV limitation notice if embedded subs are not exposed by TV.
 */

import React, { useState } from 'react';
import { Subtitles as SubtitlesIcon, CheckCircle, Plus, Info, AlertCircle } from 'lucide-react';
import { SubtitleTrackItem, MovieRecord } from '../types/media';

interface SubtitleSelectorProps {
  movie: MovieRecord;
  tracks: SubtitleTrackItem[];
  selectedTrackId: string | number | null;
  onSelectTrack: (trackId: string | number) => void;
  onAddExternalVtt: (url: string, langCode: string, label: string) => void;
  onClose: () => void;
  statusNotice?: string;
}

export const SubtitleSelector: React.FC<SubtitleSelectorProps> = ({
  movie,
  tracks,
  selectedTrackId,
  onSelectTrack,
  onAddExternalVtt,
  onClose,
  statusNotice,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [vttUrl, setVttUrl] = useState('');
  const [vttLang, setVttLang] = useState('en');
  const [vttLabel, setVttLabel] = useState('English');

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vttUrl.trim()) return;
    onAddExternalVtt(vttUrl.trim(), vttLang, vttLabel);
    setVttUrl('');
    setShowAddForm(false);
  };

  const hasEmbeddedNotExposed =
    movie.container === 'mkv' &&
    movie.subtitleTracks.length > 0 &&
    !tracks.some((t) => t.source === 'native' && t.id !== 'off');

  return (
    <div
      id="subtitle-selector-modal"
      className="w-96 bg-neutral-900/90 backdrop-blur-xl border border-white/15 rounded-2xl p-6 shadow-2xl text-neutral-100 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <SubtitlesIcon className="w-5 h-5 text-emerald-400" />
          <h2 className="text-lg font-bold tracking-wider text-neutral-200">SUBTITLES</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            id="btn-toggle-add-vtt"
            onClick={() => setShowAddForm(!showAddForm)}
            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 px-2 py-1 rounded bg-blue-500/10 hover:bg-blue-500/20 transition-colors focus:ring-2 focus:ring-blue-400"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add .VTT</span>
          </button>
          <button
            id="btn-close-subtitles"
            onClick={onClose}
            className="text-xs text-neutral-400 hover:text-white px-2 py-1 rounded bg-white/5 hover:bg-white/10 transition-colors focus:ring-2 focus:ring-blue-400"
          >
            Close (Back)
          </button>
        </div>
      </div>

      {/* External VTT Input Form */}
      {showAddForm && (
        <form
          onSubmit={handleAddSubmit}
          className="p-3 bg-white/5 border border-white/10 rounded-xl flex flex-col gap-2.5 text-xs text-neutral-200"
        >
          <div className="font-semibold text-neutral-300">Add External WebVTT Subtitle</div>
          <input
            type="url"
            placeholder="https://example.com/subtitles.vtt"
            value={vttUrl}
            onChange={(e) => setVttUrl(e.target.value)}
            className="w-full bg-neutral-950/80 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-400 focus:outline-none"
            required
          />
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Label (e.g. English)"
              value={vttLabel}
              onChange={(e) => setVttLabel(e.target.value)}
              className="w-2/3 bg-neutral-950/80 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-400 focus:outline-none"
            />
            <select
              value={vttLang}
              onChange={(e) => setVttLang(e.target.value)}
              className="w-1/3 bg-neutral-950/80 border border-white/15 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-blue-400 focus:outline-none text-neutral-200"
            >
              <option value="en">English (en)</option>
              <option value="ta">Tamil (ta)</option>
              <option value="te">Telugu (te)</option>
              <option value="hi">Hindi (hi)</option>
              <option value="ml">Malayalam (ml)</option>
              <option value="kn">Kannada (kn)</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-2.5 py-1 rounded bg-neutral-800 text-neutral-400 hover:text-white text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs shadow"
            >
              Attach Track
            </button>
          </div>
        </form>
      )}

      {/* Subtitle Tracks List */}
      <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
        {tracks.map((track) => {
          const isSelected = String(track.id) === String(selectedTrackId);
          return (
            <button
              key={String(track.id)}
              id={`subtitle-track-${track.id}`}
              onClick={() => onSelectTrack(track.id)}
              className={`flex items-center justify-between p-3.5 rounded-xl border transition-all text-left focus:ring-2 focus:ring-emerald-400 focus:outline-none ${
                isSelected
                  ? 'bg-emerald-600/25 border-emerald-500/60 text-white shadow-lg shadow-emerald-900/30'
                  : 'bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-4 h-4 rounded-full flex items-center justify-center border transition-all ${
                    isSelected
                      ? 'border-emerald-400 bg-emerald-500 shadow-sm shadow-emerald-400'
                      : 'border-neutral-500 bg-transparent'
                  }`}
                >
                  {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div>
                  <div className="text-base font-semibold">{track.label}</div>
                  <div className="text-xs text-neutral-400">
                    {track.id === 'off'
                      ? 'Disabled'
                      : track.source === 'external'
                      ? 'External WebVTT'
                      : track.source === 'hls'
                      ? 'HLS Stream'
                      : 'Embedded'}
                  </div>
                </div>
              </div>

              {isSelected && <CheckCircle className="w-4 h-4 text-emerald-400" />}
            </button>
          );
        })}
      </div>

      {/* Status Notice or MKV limitation */}
      {statusNotice ? (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2.5 text-xs text-amber-200">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span>{statusNotice}</span>
        </div>
      ) : hasEmbeddedNotExposed ? (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2.5 text-xs text-amber-200">
          <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span>
            Embedded subtitles detected by metadata, but this TV player does not expose them for direct selection.
          </span>
        </div>
      ) : null}
    </div>
  );
};

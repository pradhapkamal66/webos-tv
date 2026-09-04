/**
 * StreamGlass TV - Delete Media Confirmation Modal
 * Confirms deletion of a movie or stream record from the TV library.
 */

import React from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';
import { MovieRecord } from '../types/media';
import { sanitizeUrl } from '../services/mediaService';

interface DeleteConfirmModalProps {
  movie: MovieRecord;
  onConfirm: () => void;
  onClose: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  movie,
  onConfirm,
  onClose,
}) => {
  const safeUrl = sanitizeUrl(movie.streamUrl);

  return (
    <div
      id="delete-confirm-modal"
      className="w-[500px] bg-neutral-900/95 backdrop-blur-2xl border border-rose-500/30 rounded-2xl p-6 shadow-2xl text-neutral-100 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-200"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2.5 text-rose-400">
          <div className="p-2 rounded-xl bg-rose-500/15 border border-rose-500/20">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-wide text-white">Delete Video</h2>
            <p className="text-xs text-neutral-400">Remove entry from local TV library</p>
          </div>
        </div>
        <button
          id="btn-close-delete-modal"
          onClick={onClose}
          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Warning Body */}
      <div className="flex flex-col gap-3">
        <div className="bg-rose-950/20 border border-rose-500/20 rounded-xl p-4 flex gap-3 items-start">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="text-xs text-neutral-300 leading-relaxed">
            Are you sure you want to delete{' '}
            <span className="font-bold text-white">"{movie.name}"</span>?
            <p className="mt-1 text-neutral-400">
              This action removes the video, custom audio/subtitle configurations, and saved playback progress from this device.
            </p>
          </div>
        </div>

        {/* Video metadata snapshot */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col gap-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-neutral-400">Container / Format:</span>
            <span className="font-mono uppercase font-bold text-blue-400">{movie.container}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-400">Stream URL:</span>
            <span className="font-mono text-[11px] text-neutral-300 truncate max-w-[280px]">
              {safeUrl}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-400">Tracks Configured:</span>
            <span className="text-neutral-300">
              {movie.audioTracks.length} Audio, {movie.subtitleTracks.length} Subtitles
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/10">
        <button
          id="btn-cancel-delete"
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-medium text-xs transition-colors"
        >
          Cancel
        </button>
        <button
          id="btn-confirm-delete"
          type="button"
          onClick={onConfirm}
          className="flex items-center gap-2 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-lg shadow-rose-950/40 transition-all focus:ring-2 focus:ring-rose-400"
        >
          <Trash2 className="w-4 h-4" />
          <span>Delete Video</span>
        </button>
      </div>
    </div>
  );
};

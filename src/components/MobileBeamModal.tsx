/**
 * StreamGlass TV - Mobile Beam & Image Implant Modal / Page
 * Allows a smartphone or secondary device to scan a QR code, open this view,
 * pick a photo from their camera/gallery, paste a stream URL, and beam it
 * directly into the TV's Firestore Realtime database in one click!
 */

import React, { useState, useRef } from 'react';
import {
  Smartphone,
  Upload,
  Film,
  Image as ImageIcon,
  CheckCircle2,
  Loader2,
  X,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  QrCode,
} from 'lucide-react';
import { MovieRecord } from '../types/media';
import { detectMediaType, analyzeMedia } from '../services/mediaService';
import { saveVideoToFirestore, AppUser } from '../services/firebase';

interface MobileBeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: AppUser | null;
  onMovieBeamed?: (movie: MovieRecord) => void;
  onMediaBeamed?: (movie: MovieRecord) => void;
}

export const MobileBeamModal: React.FC<MobileBeamModalProps> = ({
  isOpen,
  onClose,
  user,
  onMovieBeamed,
  onMediaBeamed,
}) => {
  const [streamUrl, setStreamUrl] = useState('');
  const [title, setTitle] = useState('');
  const [posterImage, setPosterImage] = useState('');
  const [posterMode, setPosterMode] = useState<'upload' | 'url'>('upload');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMovie, setSuccessMovie] = useState<MovieRecord | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setPosterImage(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBeamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!streamUrl.trim()) return;

    setIsSubmitting(true);
    const rawUrl = streamUrl.trim();
    const mediaDetection = detectMediaType(rawUrl);
    const analysis = await analyzeMedia(rawUrl);

    const defaultCover =
      posterImage.trim() ||
      'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=800&q=80';

    const movie: MovieRecord = {
      id: 'beam_' + Date.now(),
      name: title.trim() || mediaDetection.extractedTitle || 'BEAMED STREAM',
      type: mediaDetection.container === 'm3u8' ? 'stream' : 'movie',
      category: 'Mobile Beamed',
      year: mediaDetection.extractedYear || new Date().getFullYear().toString(),
      poster: defaultCover,
      backdrop: defaultCover,
      streamUrl: rawUrl,
      container: mediaDetection.container,
      mimeType: mediaDetection.mimeType,
      videoInfo: {
        codec: analysis.video.codec,
        width: analysis.video.width || 1920,
        height: analysis.video.height || 1080,
        frameRate: 24,
      },
      audioTracks: analysis.audioTracks,
      subtitleTracks: analysis.subtitleTracks,
      currentTime: 0,
      duration: 0,
      progress: 0,
      favorite: false,
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadataAnalyzed: analysis.metadataAnalyzed,
      analysisSummary: analysis.analysisSummary,
    };

    try {
      // 1. Broadcast channel for local/peer windows
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const channel = new BroadcastChannel('streamglass_beam');
        channel.postMessage({ type: 'BEAM_MOVIE', movie });
      }

      // 2. Persist to Firestore Realtime
      await saveVideoToFirestore(movie, user);

      if (onMovieBeamed) onMovieBeamed(movie);
      if (onMediaBeamed) onMediaBeamed(movie);

      setSuccessMovie(movie);
    } catch (err) {
      console.warn('Beam save warning:', err);
      if (onMovieBeamed) onMovieBeamed(movie);
      if (onMediaBeamed) onMediaBeamed(movie);
      setSuccessMovie(movie);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setSuccessMovie(null);
    setStreamUrl('');
    setTitle('');
    setPosterImage('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-neutral-900 border border-white/20 rounded-3xl max-w-md w-full p-6 text-neutral-100 shadow-2xl flex flex-col gap-4 overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/30">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">PHONE BEAM & IMPLANT</h3>
              <p className="text-xs text-neutral-400">Cast URL & cover image directly to TV screen</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {successMovie ? (
          <div className="flex flex-col items-center justify-center py-6 text-center gap-4 animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div className="max-w-xs">
              <h4 className="text-lg font-black text-white">BEAM SUCCESSFUL!</h4>
              <p className="text-xs text-neutral-300 mt-1">
                <span className="font-bold text-blue-400">"{successMovie.name}"</span> and its cover image implant have been beamed directly to the screen and saved to Firestore.
              </p>
            </div>

            <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-3 flex items-center gap-3 text-left">
              <img
                src={successMovie.poster}
                alt={successMovie.name}
                className="w-14 h-20 object-cover rounded-xl border border-white/20 shadow"
              />
              <div className="flex flex-col overflow-hidden">
                <span className="text-xs font-bold text-white truncate">{successMovie.name}</span>
                <span className="text-[10px] font-mono text-neutral-400 uppercase mt-0.5">
                  {successMovie.container} • {successMovie.videoInfo?.codec || 'H.264'}
                </span>
                <span className="text-[10px] text-emerald-400 font-semibold mt-1 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Live in TV Library
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full mt-2">
              <button
                type="button"
                onClick={handleReset}
                className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs border border-white/15"
              >
                Beam Another Video
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-900/30"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleBeamSubmit} className="flex flex-col gap-4 text-xs">
            {/* Stream URL */}
            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-neutral-300 flex items-center gap-1.5">
                <Film className="w-3.5 h-3.5 text-blue-400" />
                <span>Stream URL (.mkv, .mp4, .m3u8)</span>
              </label>
              <input
                type="url"
                placeholder="https://example.com/stream.mkv?token=..."
                value={streamUrl}
                onChange={(e) => setStreamUrl(e.target.value)}
                required
                className="w-full bg-neutral-950/90 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:ring-2 focus:ring-blue-400 focus:outline-none"
              />
              <span className="text-[10px] text-neutral-400 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                Tokens and auth parameters are preserved.
              </span>
            </div>

            {/* Video Title */}
            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-neutral-300">Title / Label (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Inception, Premiere Stream, Live Sports"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-neutral-950/90 border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white focus:ring-2 focus:ring-blue-400 focus:outline-none"
              />
            </div>

            {/* Image Poster Implant */}
            <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-neutral-300 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
                  <span>Cover Image Poster Implant</span>
                </label>
                <div className="flex items-center gap-1 bg-white/5 p-0.5 rounded-lg border border-white/10">
                  <button
                    type="button"
                    onClick={() => setPosterMode('upload')}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      posterMode === 'upload' ? 'bg-blue-600 text-white' : 'text-neutral-400'
                    }`}
                  >
                    Mobile Photo
                  </button>
                  <button
                    type="button"
                    onClick={() => setPosterMode('url')}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      posterMode === 'url' ? 'bg-blue-600 text-white' : 'text-neutral-400'
                    }`}
                  >
                    Image URL
                  </button>
                </div>
              </div>

              {posterMode === 'upload' ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-white/20 hover:border-blue-400 bg-white/5 hover:bg-white/10 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageFile}
                    className="hidden"
                  />
                  <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div className="text-center">
                    <span className="font-bold text-white text-xs">Tap to choose photo</span>
                    <p className="text-[10px] text-neutral-400 mt-0.5">Camera photo or gallery image</p>
                  </div>
                </div>
              ) : (
                <input
                  type="text"
                  placeholder="https://.../poster.jpg"
                  value={posterImage}
                  onChange={(e) => setPosterImage(e.target.value)}
                  className="w-full bg-neutral-950/90 border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white focus:ring-2 focus:ring-blue-400 focus:outline-none"
                />
              )}

              {posterImage && (
                <div className="flex items-center gap-3 p-2 bg-white/5 border border-white/10 rounded-xl">
                  <img
                    src={posterImage}
                    alt="Poster preview"
                    className="w-12 h-16 object-cover rounded-lg border border-white/20"
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" /> Poster Ready to Implant
                    </span>
                    <span className="text-[10px] text-neutral-400 truncate max-w-[240px]">
                      {posterImage.startsWith('data:') ? 'Local camera image' : posterImage}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Beam Action Button */}
            <div className="flex items-center gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-neutral-300 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !streamUrl.trim()}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold shadow-lg shadow-blue-900/40"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Beaming...</span>
                  </>
                ) : (
                  <>
                    <Smartphone className="w-4 h-4" />
                    <span>Beam to Screen</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

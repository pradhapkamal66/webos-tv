/**
 * StreamGlass TV - Library View Dashboard
 * Features:
 * 1. Image Implant: Cinematic cover poster display on all video cards and featured hero spotlight.
 * 2. Firebase Realtime Cloud Synchronization status badge.
 * 3. Google Email ID Authentication profile & 1-click Sign In.
 * 4. 10ft TV UI card grid with spatial navigation, audio/subtitle badges, and quick-action triggers.
 */

import React, { useState } from 'react';
import {
  Play,
  Plus,
  Film,
  Tv,
  Sparkles,
  CheckCircle2,
  Edit3,
  Trash2,
  RotateCcw,
  Volume2,
  Subtitles,
  Clock,
  Radio,
  LogIn,
  LogOut,
  User,
  ShieldCheck,
  Cloud,
  QrCode,
  Smartphone,
} from 'lucide-react';
import { MovieRecord } from '../types/media';
import { sanitizeUrl } from '../services/mediaService';
import { AppUser } from '../services/firebase';
import { MediaQRCodeCard } from './MediaQRCodeCard';

interface LibraryViewProps {
  movies: MovieRecord[];
  activeMovieId: string;
  user: AppUser | null;
  onSelectMovie: (movie: MovieRecord) => void;
  onEditMovie: (movie: MovieRecord) => void;
  onDeleteMovie: (movie: MovieRecord) => void;
  onOpenAddMedia: () => void;
  onOpenMobileBeam?: () => void;
  onOpenSettings: () => void;
  onOpenDiagnostics: () => void;
  onOpenAuth: () => void;
  onLogout: () => void;
  isRealtimeConnected: boolean;
  focusedIndex: number;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  movies,
  activeMovieId,
  user,
  onSelectMovie,
  onEditMovie,
  onDeleteMovie,
  onOpenAddMedia,
  onOpenMobileBeam,
  onOpenSettings,
  onOpenDiagnostics,
  onOpenAuth,
  onLogout,
  isRealtimeConnected,
  focusedIndex,
}) => {
  const [selectedQrMovie, setSelectedQrMovie] = useState<MovieRecord | null>(null);
  const activeMovie = movies.find((m) => m.id === activeMovieId) || movies[0];

  return (
    <div id="library-view" className="w-full h-full flex flex-col p-10 gap-8 overflow-y-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black tracking-wider text-white">StreamGlass TV</h1>
            <span className="text-xs bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2.5 py-1 rounded-md font-mono font-semibold">
              LG webOS 1080p
            </span>
            {isRealtimeConnected ? (
              <span className="text-xs bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-md font-mono flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Firebase Realtime
              </span>
            ) : (
              <span className="text-xs bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-md font-mono flex items-center gap-1.5">
                <Cloud className="w-3 h-3" />
                Local Storage
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Real-time MKV, MP4 & HLS dashboard with Google Email authentication and cover artwork streaming.
          </p>
        </div>

        {/* Header Right Actions & Google Auth */}
        <div className="flex items-center gap-3">
          {/* Google User Profile or Sign-In Trigger */}
          {user ? (
            <div className="flex items-center gap-2.5 bg-white/5 border border-white/15 px-3 py-1.5 rounded-xl">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'Google User'}
                  className="w-7 h-7 rounded-full border border-blue-400 object-cover"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-300">
                  <User className="w-4 h-4" />
                </div>
              )}
              <div className="flex flex-col text-left">
                <span className="text-xs font-bold text-white leading-tight">
                  {user.displayName || 'Signed In'}
                </span>
                <span className="text-[10px] text-neutral-400 leading-tight truncate max-w-[150px]">
                  {user.email}
                </span>
              </div>
              <button
                id="btn-logout-header"
                type="button"
                onClick={onLogout}
                className="ml-1 p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-neutral-400 hover:text-rose-300 transition-colors"
                title="Sign out of Firebase"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              id="btn-open-google-auth"
              onClick={onOpenAuth}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white text-xs font-semibold shadow transition-all hover:scale-105 active:scale-95"
            >
              <LogIn className="w-3.5 h-3.5 text-blue-400" />
              <span>Sign in / Google Email</span>
            </button>
          )}

          {/* Header Actions */}
          {onOpenMobileBeam && (
            <button
              id="btn-open-mobile-beam-header"
              onClick={onOpenMobileBeam}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-200 border border-purple-500/30 font-semibold text-xs transition-all shadow focus:ring-4 focus:ring-purple-400/50"
              title="Scan QR code to beam media or upload images from phone"
            >
              <Smartphone className="w-3.5 h-3.5 text-purple-400" />
              <QrCode className="w-3 h-3 text-purple-300" />
              <span>Beam / Mobile QR</span>
            </button>
          )}

          <button
            id="btn-import-url-top"
            onClick={onOpenAddMedia}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-lg shadow-blue-900/30 transition-all focus:ring-4 focus:ring-blue-400/50"
          >
            <Plus className="w-4 h-4" />
            <span>Add Media URL & Image</span>
          </button>
          <button
            id="btn-open-diagnostics-top"
            onClick={onOpenDiagnostics}
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-neutral-200 font-semibold text-xs border border-white/15 transition-all focus:ring-4 focus:ring-blue-400/50"
          >
            Diagnostics
          </button>
          <button
            id="btn-open-settings-top"
            onClick={onOpenSettings}
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-neutral-200 font-semibold text-xs border border-white/15 transition-all focus:ring-4 focus:ring-blue-400/50"
          >
            Settings
          </button>
        </div>
      </div>

      {/* Featured Spotlight Banner (Hero Showcase with Poster) */}
      {activeMovie && (
        <div
          id="featured-hero-spotlight"
          onClick={() => onSelectMovie(activeMovie)}
          className="relative w-full h-[260px] rounded-3xl overflow-hidden border border-white/20 shadow-2xl cursor-pointer group transition-all"
        >
          {/* Background Backdrop Image */}
          <img
            src={activeMovie.backdrop || activeMovie.poster || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1920&q=80'}
            alt={activeMovie.name}
            className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 brightness-[0.45]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/50 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-neutral-950/90 via-neutral-950/40 to-transparent" />

          {/* Hero Content Overlay */}
          <div className="absolute inset-0 p-8 flex items-center justify-between">
            <div className="flex items-center gap-6 max-w-3xl">
              {/* Poster Thumbnail Implant */}
              <div className="relative shrink-0 w-28 h-40 rounded-xl overflow-hidden shadow-2xl border-2 border-white/20 group-hover:border-blue-400 transition-colors">
                <img
                  src={activeMovie.poster || activeMovie.backdrop || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=600&q=80'}
                  alt={activeMovie.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-1 right-1 bg-black/80 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold text-amber-400">
                  {activeMovie.container.toUpperCase()}
                </div>
              </div>

              {/* Details */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/30 text-blue-300 border border-blue-400/40 font-mono uppercase">
                    FEATURED STREAM
                  </span>
                  <span className="text-xs text-neutral-300 font-semibold">{activeMovie.year || '2024'}</span>
                  <span className="text-neutral-500">•</span>
                  <span className="text-xs text-neutral-300">{activeMovie.category || 'General'}</span>
                  {activeMovie.videoInfo?.codec && (
                    <>
                      <span className="text-neutral-500">•</span>
                      <span className="text-xs text-emerald-400 font-mono">{activeMovie.videoInfo.codec}</span>
                    </>
                  )}
                </div>

                <h2 className="text-2xl font-black text-white group-hover:text-blue-300 transition-colors tracking-wide line-clamp-1">
                  {activeMovie.name}
                </h2>

                <p className="text-xs text-neutral-300 font-mono truncate max-w-[500px]">
                  {sanitizeUrl(activeMovie.streamUrl)}
                </p>

                {/* Track summaries */}
                <div className="flex items-center gap-4 text-xs text-neutral-300 mt-1">
                  <div className="flex items-center gap-1.5 text-blue-300">
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>
                      {activeMovie.audioTracks?.length > 0
                        ? `${activeMovie.audioTracks.length} Audio Stream(s): ${activeMovie.audioTracks.map((a) => a.label).join(', ')}`
                        : 'Default Stream Audio'}
                    </span>
                  </div>
                  {activeMovie.subtitleTracks?.length > 0 && (
                    <div className="flex items-center gap-1.5 text-emerald-300">
                      <Subtitles className="w-3.5 h-3.5" />
                      <span>{activeMovie.subtitleTracks.length} Subtitles</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Play and QR Button Action */}
            <div className="shrink-0 flex items-center gap-2.5">
              <button
                id="btn-hero-qr"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedQrMovie(activeMovie);
                }}
                className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-xs backdrop-blur-md transition-all hover:scale-105"
                title="View Stream URL & Poster Artwork QR Code"
              >
                <QrCode className="w-4 h-4 text-blue-400" />
                <span>QR Code</span>
              </button>
              <button
                id="btn-hero-play"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectMovie(activeMovie);
                }}
                className="flex items-center gap-3 px-6 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-2xl shadow-blue-600/50 group-hover:scale-105 transition-all"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>Play Now</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Realtime Status Banner */}
      <div className="bg-gradient-to-r from-blue-950/40 via-neutral-900/60 to-purple-950/40 border border-white/15 rounded-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
          <div className="text-xs">
            <span className="font-bold text-neutral-100">Live Media Database: </span>
            <span className="text-neutral-300">
              {user
                ? `Logged in as ${user.email}. Videos and custom poster artworks sync in real-time to Google Cloud Firestore.`
                : 'Videos and cover posters are saved in your local storage. Sign in with your Google email to synchronize custom video streams across all screens.'}
            </span>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {movies.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 px-6 bg-white/5 border border-white/10 rounded-3xl text-center gap-5">
          <div className="p-5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <Film className="w-12 h-12" />
          </div>
          <div className="max-w-md">
            <h3 className="text-2xl font-bold text-white">Your Video Library is Empty</h3>
            <p className="text-sm text-neutral-400 mt-2">
              All default and demo videos have been removed. Add your custom MKV, MP4, or HLS stream along with a cover poster image to start watching.
            </p>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <button
              id="btn-empty-import-media"
              onClick={onOpenAddMedia}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-xl shadow-blue-900/40 transition-all hover:scale-105"
            >
              <Plus className="w-4 h-4" />
              <span>Add Media URL & Image</span>
            </button>
          </div>
        </div>
      ) : (
        /* Video Cards Grid with Image Implant */
        <div className="grid grid-cols-3 gap-6 pb-20">
          {movies.map((movie, index) => {
            const isActive = movie.id === activeMovieId;
            const isFocused = index === focusedIndex;
            const safeDisplayUrl = sanitizeUrl(movie.streamUrl);
            const coverImage =
              movie.poster ||
              movie.backdrop ||
              'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=600&q=80';

            return (
              <div
                key={movie.id}
                id={`movie-card-${movie.id}`}
                onClick={() => onSelectMovie(movie)}
                className={`group relative flex flex-col rounded-2xl overflow-hidden border transition-all duration-200 cursor-pointer text-left backdrop-blur-xl ${
                  isFocused
                    ? 'scale-[1.02] border-blue-400 bg-neutral-800/90 shadow-2xl shadow-blue-500/20 ring-4 ring-blue-400/30'
                    : isActive
                    ? 'border-emerald-500/50 bg-emerald-950/20'
                    : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                }`}
              >
                {/* Visual Image Implant Cover Section */}
                <div className="relative w-full aspect-video overflow-hidden bg-neutral-950">
                  <img
                    src={coverImage}
                    alt={movie.name}
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                  />
                  {/* Vignette Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/30 to-transparent" />

                  {/* Badges on Poster */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase tracking-wider backdrop-blur-md ${
                        movie.container === 'mkv'
                          ? 'bg-purple-950/80 text-purple-300 border border-purple-500/40'
                          : movie.container === 'm3u8'
                          ? 'bg-amber-950/80 text-amber-300 border border-amber-500/40'
                          : 'bg-blue-950/80 text-blue-300 border border-blue-500/40'
                      }`}
                    >
                      {movie.container.toUpperCase()}
                    </span>
                    {movie.year && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-black/60 text-white backdrop-blur-md border border-white/10">
                        {movie.year}
                      </span>
                    )}
                  </div>

                  {isActive && (
                    <div className="absolute top-3 right-3 bg-emerald-950/80 border border-emerald-500/40 px-2 py-0.5 rounded text-[10px] text-emerald-400 font-semibold flex items-center gap-1 backdrop-blur-md">
                      <CheckCircle2 className="w-3 h-3" /> Active
                    </div>
                  )}

                  {/* Hover Play Button Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 backdrop-blur-[2px]">
                    <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-2xl scale-90 group-hover:scale-100 transition-transform">
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    </div>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4 flex flex-col justify-between flex-1">
                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-blue-300 transition-colors line-clamp-1">
                      {movie.name}
                    </h3>
                    <p className="text-[11px] text-neutral-400 font-mono mt-0.5 truncate">
                      {safeDisplayUrl}
                    </p>
                  </div>

                  {/* Card Track Details */}
                  <div className="mt-3 flex flex-col gap-1.5 pt-2 border-t border-white/10 text-xs text-neutral-300">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-neutral-500">Video Codec:</span>
                      <span className="font-mono text-neutral-300">{movie.videoInfo?.codec || 'H.264 / AVC'}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-neutral-500">Audio Streams:</span>
                      <span className="font-mono text-blue-300 truncate max-w-[180px] text-right">
                        {movie.audioTracks && movie.audioTracks.length > 0
                          ? movie.audioTracks.map((a) => a.label).join(', ')
                          : 'Default'}
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-neutral-500">Subtitles:</span>
                      <span className="font-mono text-emerald-300 truncate max-w-[180px] text-right">
                        {movie.subtitleTracks && movie.subtitleTracks.length > 0
                          ? movie.subtitleTracks.map((s) => s.label).join(', ')
                          : 'None'}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons: Edit, Delete, QR, Play */}
                  <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <button
                        id={`btn-edit-movie-${movie.id}`}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditMovie(movie);
                        }}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-blue-600/30 text-neutral-300 hover:text-blue-300 border border-white/10 hover:border-blue-500/40 transition-all"
                        title="Edit video metadata, image poster, and tracks"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        id={`btn-qr-movie-${movie.id}`}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedQrMovie(movie);
                        }}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-purple-600/30 text-neutral-300 hover:text-purple-300 border border-white/10 hover:border-purple-500/40 transition-all"
                        title="Show Stream URL & Cover Image QR Code"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                      </button>
                      <button
                        id={`btn-delete-movie-${movie.id}`}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteMovie(movie);
                        }}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-600/30 text-neutral-300 hover:text-rose-300 border border-white/10 hover:border-rose-500/40 transition-all"
                        title="Delete video from library and Firebase"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      id={`btn-play-movie-${movie.id}`}
                      onClick={() => onSelectMovie(movie)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 group-hover:bg-blue-600 text-white text-xs font-semibold transition-all shadow"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>{isActive ? 'Resume' : 'Play'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Standalone QR Code Modal for Movie */}
      {selectedQrMovie && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <MediaQRCodeCard
            streamUrl={selectedQrMovie.streamUrl}
            posterUrl={selectedQrMovie.poster}
            title={selectedQrMovie.name}
            container={selectedQrMovie.container}
            onClose={() => setSelectedQrMovie(null)}
          />
        </div>
      )}
    </div>
  );
};

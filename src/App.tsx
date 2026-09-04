/**
 * StreamGlass TV - Main Application Component
 * LG webOS TV (1920×1080) advanced MKV / multi-audio / subtitle player.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { MovieRecord, AppSettings, DeviceInfoState, DiagnosticData } from './types/media';
import {
  getStoredLibrary,
  saveStoredLibrary,
  getStoredSettings,
  saveStoredSettings,
  sanitizeUrl,
  evaluateCapabilities,
} from './services/mediaService';
import { LibraryView } from './components/LibraryView';
import { PlayerView } from './components/PlayerView';
import { DiagnosticsModal } from './components/DiagnosticsModal';
import { SettingsModal } from './components/SettingsModal';
import { AddMediaModal } from './components/AddMediaModal';
import { EditMediaModal } from './components/EditMediaModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { RemoteControlWidget } from './components/RemoteControlWidget';
import { AuthModal } from './components/AuthModal';
import { MobileBeamModal } from './components/MobileBeamModal';
import {
  auth,
  onAuthStateChanged,
  logoutUser,
  AppUser,
  subscribeToRealtimeVideos,
  saveVideoToFirestore,
  updateVideoInFirestore,
  deleteVideoFromFirestore,
  purgeDemoVideosFromFirestore,
} from './services/firebase';

export default function App() {
  const [movies, setMovies] = useState<MovieRecord[]>(() => getStoredLibrary());
  const [activeMovie, setActiveMovie] = useState<MovieRecord | null>(() => {
    const list = getStoredLibrary();
    return list.length > 0 ? list[0] : null;
  });
  const [viewMode, setViewMode] = useState<'library' | 'player'>('library');
  const [settings, setSettings] = useState<AppSettings>(() => getStoredSettings());

  // Firebase Auth & Realtime Sync States
  const [user, setUser] = useState<AppUser | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);

  // Modal States
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAddMedia, setShowAddMedia] = useState(false);
  const [showMobileBeamModal, setShowMobileBeamModal] = useState(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get('beam') === 'true' || window.location.hash.includes('beam');
    }
    return false;
  });
  const [movieToEdit, setMovieToEdit] = useState<MovieRecord | null>(null);
  const [movieToDelete, setMovieToDelete] = useState<MovieRecord | null>(null);

  // TV Navigation Focus
  const [focusedMovieIndex, setFocusedMovieIndex] = useState(0);

  // Trigger from on-screen remote simulator or hardware remote
  const [remoteAction, setRemoteAction] = useState<string | null>(null);

  // webOS Device Info
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfoState>({
    isWebOS: typeof (window as any).webOS !== 'undefined' || /Web0S|webOS/i.test(navigator.userAgent),
    modelName: 'LG Smart TV (OLED65C3)',
    version: 'webOS 23 (8.3.0)',
    sdkVersion: '8.3.0',
    screenResolution: '1920 × 1080 @ 60Hz',
    uhd: true,
    oled: true,
    audioCodecSupport: ['AAC', 'MP3', 'AC3 (Dolby Digital)', 'EAC3 (Dolby Digital Plus)', 'PCM'],
    videoCodecSupport: ['H.264', 'HEVC / H.265', 'VP9', 'AV1'],
  });

  // Purge any lingering demo videos on startup
  useEffect(() => {
    purgeDemoVideosFromFirestore().catch(() => {});
  }, []);

  // Monitor Google & Firebase Authentication
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          isAnonymous: firebaseUser.isAnonymous,
        });
      } else {
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Monitor Firestore Real-time Videos
  useEffect(() => {
    const unsubscribe = subscribeToRealtimeVideos(
      user,
      (realtimeMovies) => {
        setIsRealtimeConnected(true);
        setMovies(realtimeMovies);
        saveStoredLibrary(realtimeMovies);
        setActiveMovie((current) => {
          if (current && realtimeMovies.some((m) => m.id === current.id)) {
            return realtimeMovies.find((m) => m.id === current.id) || null;
          }
          return realtimeMovies.length > 0 ? realtimeMovies[0] : null;
        });
      },
      (err) => {
        console.warn('Firestore realtime sync inactive, fallback to local storage:', err);
        setIsRealtimeConnected(false);
      }
    );
    return () => unsubscribe();
  }, [user]);

  // Automatically detect and respond to mobile beam QR scans or route parameters
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const checkBeamUrl = () => {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('beam') === 'true' || window.location.hash.includes('beam')) {
        setShowMobileBeamModal(true);
      }
    };
    checkBeamUrl();
    window.addEventListener('hashchange', checkBeamUrl);
    window.addEventListener('popstate', checkBeamUrl);
    return () => {
      window.removeEventListener('hashchange', checkBeamUrl);
      window.removeEventListener('popstate', checkBeamUrl);
    };
  }, []);

  // Global BroadcastChannel receiver for peer/mobile beams
  useEffect(() => {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;
    const channel = new BroadcastChannel('streamglass_beam');
    channel.onmessage = (event) => {
      if (event.data?.type === 'BEAM_MOVIE' && event.data.movie) {
        const beamed = event.data.movie as MovieRecord;
        setMovies((prev) => {
          if (prev.some((m) => m.id === beamed.id)) return prev;
          return [beamed, ...prev];
        });
        setActiveMovie(beamed);
        setViewMode('player');
      }
    };
    return () => {
      channel.close();
    };
  }, []);

  // Keep persistent storage synced
  useEffect(() => {
    saveStoredLibrary(movies);
  }, [movies]);

  useEffect(() => {
    saveStoredSettings(settings);
  }, [settings]);

  // Handle movie selection
  const handleSelectMovie = (movie: MovieRecord) => {
    setActiveMovie(movie);
    setViewMode('player');
  };

  const handleAddMovie = async (newMovie: MovieRecord) => {
    setMovies((prev) => [newMovie, ...prev]);
    setActiveMovie(newMovie);
    setViewMode('player');
    try {
      await saveVideoToFirestore(newMovie, user);
    } catch (err) {
      console.warn('Failed to sync new video to Firestore, saved locally:', err);
    }
  };

  const handleUpdateMovie = async (updated: MovieRecord) => {
    setMovies((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    if (activeMovie?.id === updated.id) {
      setActiveMovie(updated);
    }
    try {
      await updateVideoInFirestore(updated);
    } catch (err) {
      console.warn('Failed to update in Firestore, updated locally:', err);
    }
  };

  const handleDeleteMovie = (movie: MovieRecord) => {
    setMovieToDelete(movie);
  };

  const handleConfirmDelete = async () => {
    if (!movieToDelete) return;
    const targetId = movieToDelete.id;
    const updatedList = movies.filter((m) => m.id !== targetId);
    setMovies(updatedList);
    saveStoredLibrary(updatedList);

    if (activeMovie?.id === targetId) {
      if (updatedList.length > 0) {
        setActiveMovie(updatedList[0]);
      } else {
        setActiveMovie(null);
      }
      if (viewMode === 'player') {
        setViewMode('library');
      }
    }
    setMovieToDelete(null);

    try {
      await deleteVideoFromFirestore(targetId);
    } catch (err) {
      console.warn('Failed to delete from Firestore, deleted locally:', err);
    }
  };

  const handleLogout = async () => {
    await logoutUser();
  };

  const handleOpenEdit = (movie: MovieRecord) => {
    setMovieToEdit(movie);
  };

  // Remote Action Dispatcher
  const dispatchRemoteAction = useCallback((action: string) => {
    setRemoteAction(action);
    setTimeout(() => setRemoteAction(null), 100);

    // Global modal / view management for Back action
    if (action === 'BACK') {
      if (showDiagnostics) setShowDiagnostics(false);
      else if (showSettings) setShowSettings(false);
      else if (showAddMedia) setShowAddMedia(false);
      else if (showMobileBeamModal) setShowMobileBeamModal(false);
      else if (movieToEdit) setMovieToEdit(null);
      else if (movieToDelete) setMovieToDelete(null);
      else if (viewMode === 'player') setViewMode('library');
    } else if (action === 'DIAGNOSTICS') {
      setShowDiagnostics((prev) => !prev);
    } else if (action === 'SETTINGS') {
      setShowSettings((prev) => !prev);
    }

    // D-Pad Library Navigation
    if (
      viewMode === 'library' &&
      !showDiagnostics &&
      !showSettings &&
      !showAddMedia &&
      !movieToEdit &&
      !movieToDelete
    ) {
      if (action === 'LEFT') {
        setFocusedMovieIndex((prev) => Math.max(0, prev - 1));
      } else if (action === 'RIGHT') {
        setFocusedMovieIndex((prev) => Math.min(movies.length - 1, prev + 1));
      } else if (action === 'UP') {
        setFocusedMovieIndex((prev) => Math.max(0, prev - 3));
      } else if (action === 'DOWN') {
        setFocusedMovieIndex((prev) => Math.min(movies.length - 1, prev + 3));
      } else if (action === 'OK') {
        if (movies[focusedMovieIndex]) {
          handleSelectMovie(movies[focusedMovieIndex]);
        }
      }
    }
  }, [
    viewMode,
    showDiagnostics,
    showSettings,
    showAddMedia,
    movieToEdit,
    movieToDelete,
    movies,
    focusedMovieIndex,
  ]);

  // Spatial Keyboard Remote Handler for webOS / Desktop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid hijacking input fields in modals
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'SELECT') {
        if (e.key === 'Escape') {
          (e.target as HTMLElement).blur();
        }
        return;
      }

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          dispatchRemoteAction('UP');
          break;
        case 'ArrowDown':
          e.preventDefault();
          dispatchRemoteAction('DOWN');
          break;
        case 'ArrowLeft':
          e.preventDefault();
          dispatchRemoteAction('LEFT');
          break;
        case 'ArrowRight':
          e.preventDefault();
          dispatchRemoteAction('RIGHT');
          break;
        case 'Enter':
          e.preventDefault();
          dispatchRemoteAction('OK');
          break;
        case 'Escape':
        case 'Backspace':
          e.preventDefault();
          dispatchRemoteAction('BACK');
          break;
        case ' ':
          e.preventDefault();
          dispatchRemoteAction('PLAY_PAUSE');
          break;
        case 'i':
        case 'I':
          e.preventDefault();
          dispatchRemoteAction('INFO');
          break;
        case 'a':
        case 'A':
          e.preventDefault();
          dispatchRemoteAction('AUDIO_MENU');
          break;
        case 's':
        case 'S':
          e.preventDefault();
          dispatchRemoteAction('SUBTITLE_MENU');
          break;
        case 'd':
        case 'D':
          e.preventDefault();
          dispatchRemoteAction('DIAGNOSTICS');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dispatchRemoteAction]);

  // Construct Live Diagnostic Data for Section 27
  const safeActiveMovie = activeMovie || (movies.length > 0 ? movies[0] : null);
  const testVideo = document.createElement('video');
  const currentDiagnostics: DiagnosticData = {
    timestamp: new Date().toISOString(),
    currentUrl: safeActiveMovie ? sanitizeUrl(safeActiveMovie.streamUrl) : 'No video selected',
    container: safeActiveMovie?.container || 'unknown',
    mime: safeActiveMovie?.mimeType || 'video/mp4',
    videoCodec: safeActiveMovie?.videoInfo?.codec || 'None',
    resolution: safeActiveMovie?.videoInfo?.width ? `${safeActiveMovie.videoInfo.width} × ${safeActiveMovie.videoInfo.height}` : 'N/A',
    audioTracks: (safeActiveMovie?.audioTracks || []).map((t) => ({
      id: t.id,
      label: t.label,
      codec: t.codec,
      channels: t.channels,
      source: t.source,
      selected: !!t.default,
    })),
    subtitleTracks: (safeActiveMovie?.subtitleTracks || []).map((s) => ({
      id: s.id,
      label: s.label,
      source: s.source,
      selected: !!s.default,
    })),
    browserSupport: {
      canPlayType: testVideo.canPlayType(safeActiveMovie?.mimeType || 'video/mp4') || 'maybe',
      mediaSourceSupported: typeof window.MediaSource !== 'undefined',
      audioTracksSupported: typeof (testVideo as any).audioTracks !== 'undefined',
      textTracksSupported: typeof testVideo.textTracks !== 'undefined',
    },
    webOSSupport: {
      isWebOS: deviceInfo.isWebOS,
      model: deviceInfo.modelName,
      version: deviceInfo.version,
    },
    playbackStatus: {
      readyState: 4,
      networkState: 1,
      paused: viewMode !== 'player',
      currentTime: safeActiveMovie?.currentTime || 0,
      duration: safeActiveMovie?.duration || 0,
      bufferedEnd: safeActiveMovie?.duration || 0,
      error: null,
    },
  };

  return (
    <div
      id="streamglass-app-root"
      className="relative w-screen h-screen bg-neutral-950 text-neutral-100 overflow-hidden font-sans select-none"
    >
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-950/20 via-neutral-950 to-black pointer-events-none" />

      {/* Main Viewport Router */}
      <div className="relative w-full h-full z-0">
        {viewMode === 'library' || !safeActiveMovie ? (
          <LibraryView
            movies={movies}
            activeMovieId={safeActiveMovie?.id || ''}
            user={user}
            onSelectMovie={handleSelectMovie}
            onEditMovie={handleOpenEdit}
            onDeleteMovie={handleDeleteMovie}
            onOpenAddMedia={() => setShowAddMedia(true)}
            onOpenMobileBeam={() => setShowMobileBeamModal(true)}
            onOpenSettings={() => setShowSettings(true)}
            onOpenDiagnostics={() => setShowDiagnostics(true)}
            onOpenAuth={() => setShowAuthModal(true)}
            onLogout={handleLogout}
            isRealtimeConnected={isRealtimeConnected}
            focusedIndex={focusedMovieIndex}
          />
        ) : (
          <PlayerView
            movie={safeActiveMovie}
            settings={settings}
            onBackToLibrary={() => setViewMode('library')}
            onOpenDiagnostics={() => setShowDiagnostics(true)}
            onUpdateMovie={handleUpdateMovie}
            onEditMovie={() => handleOpenEdit(safeActiveMovie)}
            remoteActionTrigger={remoteAction}
          />
        )}
      </div>

      {/* Modals */}
      {showAuthModal && (
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      )}

      {showMobileBeamModal && (
        <MobileBeamModal
          isOpen={showMobileBeamModal}
          onClose={() => setShowMobileBeamModal(false)}
          onMediaBeamed={(beamedMovie) => {
            handleAddMovie(beamedMovie);
            setShowMobileBeamModal(false);
          }}
        />
      )}

      {showDiagnostics && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
          <DiagnosticsModal diagnostics={currentDiagnostics} onClose={() => setShowDiagnostics(false)} />
        </div>
      )}

      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
          <SettingsModal
            settings={settings}
            deviceInfo={deviceInfo}
            onUpdateSettings={setSettings}
            onClose={() => setShowSettings(false)}
          />
        </div>
      )}

      {showAddMedia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
          <AddMediaModal onAddMovie={handleAddMovie} onClose={() => setShowAddMedia(false)} />
        </div>
      )}

      {movieToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
          <EditMediaModal
            movie={movieToEdit}
            onSave={handleUpdateMovie}
            onClose={() => setMovieToEdit(null)}
          />
        </div>
      )}

      {movieToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
          <DeleteConfirmModal
            movie={movieToDelete}
            onConfirm={handleConfirmDelete}
            onClose={() => setMovieToDelete(null)}
          />
        </div>
      )}

      {/* On-Screen LG TV Remote Simulator */}
      {settings.interface.remoteSimulator && (
        <RemoteControlWidget
          onAction={dispatchRemoteAction}
          isPlaying={viewMode === 'player'}
        />
      )}
    </div>
  );
}

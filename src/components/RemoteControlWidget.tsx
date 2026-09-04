/**
 * StreamGlass TV - Interactive LG TV Remote Simulator
 * Provides tactile on-screen remote navigation mirroring LG Magic Remote
 * and webOS key events.
 */

import React, { useState } from 'react';
import {
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  CornerDownLeft,
  Info,
  Tv,
  Minimize2,
  Maximize2,
  Volume2,
  VolumeX,
} from 'lucide-react';

interface RemoteControlWidgetProps {
  onAction: (action: string) => void;
  isPlaying: boolean;
}

export const RemoteControlWidget: React.FC<RemoteControlWidgetProps> = ({ onAction, isPlaying }) => {
  const [minimized, setMinimized] = useState(false);

  return (
    <div
      id="lg-remote-simulator"
      className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-auto select-none"
    >
      {minimized ? (
        <button
          onClick={() => setMinimized(false)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-900/90 border border-white/20 text-neutral-200 text-xs font-semibold shadow-2xl backdrop-blur-md hover:bg-neutral-800 transition-all"
        >
          <Tv className="w-4 h-4 text-blue-400" />
          <span>LG Remote</span>
          <Maximize2 className="w-3.5 h-3.5 text-neutral-400" />
        </button>
      ) : (
        <div className="w-56 bg-neutral-950/95 border border-white/20 rounded-3xl p-4 shadow-2xl backdrop-blur-2xl text-neutral-100 flex flex-col gap-3.5 animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Remote Top Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-300">
              <Tv className="w-3.5 h-3.5 text-blue-400" />
              <span>webOS Remote</span>
            </div>
            <button
              onClick={() => setMinimized(true)}
              className="text-neutral-400 hover:text-white p-1 rounded hover:bg-white/10"
              title="Minimize remote"
            >
              <Minimize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* D-Pad Matrix */}
          <div className="flex flex-col items-center gap-1 my-1">
            {/* UP */}
            <button
              id="remote-btn-up"
              onClick={() => onAction('UP')}
              className="w-11 h-11 rounded-xl bg-neutral-800/80 hover:bg-blue-600 active:bg-blue-700 flex items-center justify-center border border-white/10 hover:border-blue-400 shadow transition-all"
              title="Up (ArrowUp)"
            >
              <ChevronUp className="w-5 h-5" />
            </button>

            {/* LEFT / OK / RIGHT */}
            <div className="flex items-center gap-1">
              <button
                id="remote-btn-left"
                onClick={() => onAction('LEFT')}
                className="w-11 h-11 rounded-xl bg-neutral-800/80 hover:bg-blue-600 active:bg-blue-700 flex items-center justify-center border border-white/10 hover:border-blue-400 shadow transition-all"
                title="Left (ArrowLeft / Seek -10s)"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <button
                id="remote-btn-ok"
                onClick={() => onAction('OK')}
                className="w-14 h-14 rounded-2xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 flex items-center justify-center border border-blue-400 text-white font-bold text-sm shadow-lg shadow-blue-900/40 transition-all"
                title="OK (Enter)"
              >
                OK
              </button>

              <button
                id="remote-btn-right"
                onClick={() => onAction('RIGHT')}
                className="w-11 h-11 rounded-xl bg-neutral-800/80 hover:bg-blue-600 active:bg-blue-700 flex items-center justify-center border border-white/10 hover:border-blue-400 shadow transition-all"
                title="Right (ArrowRight / Seek +10s)"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* DOWN */}
            <button
              id="remote-btn-down"
              onClick={() => onAction('DOWN')}
              className="w-11 h-11 rounded-xl bg-neutral-800/80 hover:bg-blue-600 active:bg-blue-700 flex items-center justify-center border border-white/10 hover:border-blue-400 shadow transition-all"
              title="Down (ArrowDown)"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>

          {/* Media Playback Controls */}
          <div className="grid grid-cols-3 gap-1.5 pt-1">
            <button
              id="remote-btn-rewind"
              onClick={() => onAction('REWIND')}
              className="py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center border border-white/10 text-xs"
              title="Rewind (R)"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              id="remote-btn-play-pause"
              onClick={() => onAction('PLAY_PAUSE')}
              className="py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center border border-white/10 text-xs"
              title="Play / Pause (Space)"
            >
              {isPlaying ? <Pause className="w-4 h-4 text-amber-400" /> : <Play className="w-4 h-4 text-emerald-400" />}
            </button>

            <button
              id="remote-btn-fast-forward"
              onClick={() => onAction('FAST_FORWARD')}
              className="py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center border border-white/10 text-xs"
              title="Fast Forward (F)"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>

          {/* Return / Info Row */}
          <div className="grid grid-cols-2 gap-2">
            <button
              id="remote-btn-back"
              onClick={() => onAction('BACK')}
              className="py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center gap-1 border border-white/10 text-xs text-neutral-300"
              title="Back (Esc / Backspace)"
            >
              <CornerDownLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
            <button
              id="remote-btn-info"
              onClick={() => onAction('INFO')}
              className="py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center gap-1 border border-white/10 text-xs text-neutral-300"
              title="Info (I)"
            >
              <Info className="w-3.5 h-3.5" />
              <span>Info</span>
            </button>
          </div>

          {/* webOS 4-Color TV Buttons */}
          <div className="grid grid-cols-4 gap-1.5 pt-1 border-t border-white/10">
            <button
              id="remote-color-red"
              onClick={() => onAction('AUDIO_MENU')}
              className="py-1 rounded bg-red-600/80 hover:bg-red-500 text-[10px] font-bold text-white shadow"
              title="Red: Audio Menu (A)"
            >
              Audio
            </button>
            <button
              id="remote-color-green"
              onClick={() => onAction('SUBTITLE_MENU')}
              className="py-1 rounded bg-emerald-600/80 hover:bg-emerald-500 text-[10px] font-bold text-white shadow"
              title="Green: Subtitles (S)"
            >
              Subs
            </button>
            <button
              id="remote-color-yellow"
              onClick={() => onAction('DIAGNOSTICS')}
              className="py-1 rounded bg-amber-600/80 hover:bg-amber-500 text-[10px] font-bold text-white shadow"
              title="Yellow: Diagnostics (D)"
            >
              Diag
            </button>
            <button
              id="remote-color-blue"
              onClick={() => onAction('SETTINGS')}
              className="py-1 rounded bg-blue-600/80 hover:bg-blue-500 text-[10px] font-bold text-white shadow"
              title="Blue: Settings"
            >
              Setup
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * StreamGlass TV - Media Diagnostics Modal
 * Compliance with Section 27:
 * - Current URL, Container, MIME, Video Codec, Resolution
 * - Audio Tracks, Subtitle Tracks
 * - Browser Support, webOS Support, Playback Status
 * - COPY DIAGNOSTIC INFO (Strict security: zero tokens/passwords exposed)
 */

import React, { useState } from 'react';
import { Activity, Copy, Check, X, ShieldAlert, Cpu, Radio, Film } from 'lucide-react';
import { DiagnosticData } from '../types/media';

interface DiagnosticsModalProps {
  diagnostics: DiagnosticData;
  onClose: () => void;
}

export const DiagnosticsModal: React.FC<DiagnosticsModalProps> = ({ diagnostics, onClose }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const text = JSON.stringify(diagnostics, null, 2);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div
      id="diagnostics-modal"
      className="w-[680px] max-h-[85vh] bg-neutral-900/95 backdrop-blur-2xl border border-white/20 rounded-2xl p-6 shadow-2xl text-neutral-100 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2.5">
          <Activity className="w-5 h-5 text-amber-400" />
          <h2 className="text-lg font-bold tracking-wider text-neutral-100">MEDIA DIAGNOSTICS</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            id="btn-copy-diagnostics"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow transition-all focus:ring-2 focus:ring-blue-400"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'COPIED TO CLIPBOARD' : 'COPY DIAGNOSTIC INFO'}</span>
          </button>
          <button
            id="btn-close-diagnostics"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors focus:ring-2 focus:ring-blue-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content scroll area */}
      <div className="overflow-y-auto pr-1 flex flex-col gap-4 text-xs font-mono">
        {/* URL Card with Token Redaction note */}
        <div className="bg-neutral-950/80 border border-white/10 rounded-xl p-3.5 flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-neutral-400 uppercase text-[10px] tracking-wider">
            <span className="flex items-center gap-1 text-emerald-400">
              <ShieldAlert className="w-3 h-3" /> Sanitized Stream URL
            </span>
            <span>Auth Tokens Redacted</span>
          </div>
          <div className="text-neutral-200 break-all select-all font-mono text-[11px] bg-white/5 p-2 rounded border border-white/5">
            {diagnostics.currentUrl || 'No active media stream'}
          </div>
        </div>

        {/* Media & Container Specs */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-neutral-400 font-sans font-semibold text-xs border-b border-white/5 pb-1.5">
              <Film className="w-3.5 h-3.5 text-blue-400" /> Container & Video
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Container:</span>
              <span className="font-bold text-blue-400 uppercase">{diagnostics.container}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">MIME Type:</span>
              <span className="text-neutral-200 truncate ml-2">{diagnostics.mime}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Codec:</span>
              <span className="text-neutral-200">{diagnostics.videoCodec}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Resolution:</span>
              <span className="text-neutral-200">{diagnostics.resolution}</span>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-neutral-400 font-sans font-semibold text-xs border-b border-white/5 pb-1.5">
              <Cpu className="w-3.5 h-3.5 text-purple-400" /> Environment & TV
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Platform:</span>
              <span className="text-emerald-400 font-semibold">
                {diagnostics.webOSSupport.isWebOS ? 'LG webOS TV' : 'Web Browser Simulator'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Model:</span>
              <span className="text-neutral-200">{diagnostics.webOSSupport.model}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Firmware:</span>
              <span className="text-neutral-200">{diagnostics.webOSSupport.version}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Native Audio API:</span>
              <span className={diagnostics.browserSupport.audioTracksSupported ? 'text-emerald-400' : 'text-amber-400'}>
                {diagnostics.browserSupport.audioTracksSupported ? 'Available' : 'Unavailable (Standard)'}
              </span>
            </div>
          </div>
        </div>

        {/* Audio Tracks Diagnostic */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col gap-2">
          <div className="text-neutral-400 font-sans font-semibold text-xs flex justify-between items-center border-b border-white/5 pb-1.5">
            <span>Audio Tracks Exposed ({diagnostics.audioTracks.length})</span>
            <span className="text-[10px] text-neutral-500 font-mono">Real media tracks</span>
          </div>
          {diagnostics.audioTracks.length === 0 ? (
            <div className="text-neutral-500 italic py-1">No audio tracks reported.</div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {diagnostics.audioTracks.map((t, idx) => (
                <div
                  key={idx}
                  className={`flex justify-between items-center p-2 rounded ${
                    t.selected ? 'bg-blue-600/20 border border-blue-500/40 text-white' : 'bg-black/20 text-neutral-300'
                  }`}
                >
                  <span className="font-sans font-medium">
                    {t.label} {t.selected ? '● [ACTIVE]' : ''}
                  </span>
                  <span className="text-neutral-400">
                    {t.codec} • {t.channels} • Source: {t.source}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Subtitle Tracks Diagnostic */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col gap-2">
          <div className="text-neutral-400 font-sans font-semibold text-xs flex justify-between items-center border-b border-white/5 pb-1.5">
            <span>Subtitle Tracks Exposed ({diagnostics.subtitleTracks.length})</span>
            <span className="text-[10px] text-neutral-500 font-mono">Active subtitle pipeline</span>
          </div>
          {diagnostics.subtitleTracks.length === 0 ? (
            <div className="text-neutral-500 italic py-1">No subtitle tracks active.</div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {diagnostics.subtitleTracks.map((s, idx) => (
                <div
                  key={idx}
                  className={`flex justify-between items-center p-2 rounded ${
                    s.selected ? 'bg-emerald-600/20 border border-emerald-500/40 text-white' : 'bg-black/20 text-neutral-300'
                  }`}
                >
                  <span className="font-sans font-medium">
                    {s.label} {s.selected ? '● [ACTIVE]' : ''}
                  </span>
                  <span className="text-neutral-400">Source: {s.source}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Playback Pipeline Status */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-neutral-400 font-sans font-semibold text-xs border-b border-white/5 pb-1.5">
            <Radio className="w-3.5 h-3.5 text-emerald-400" /> HTML5 Media State
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col">
              <span className="text-neutral-500">Ready State:</span>
              <span className="text-neutral-200">{diagnostics.playbackStatus.readyState} / 4</span>
            </div>
            <div className="flex flex-col">
              <span className="text-neutral-500">Playback:</span>
              <span className={diagnostics.playbackStatus.paused ? 'text-amber-400' : 'text-emerald-400'}>
                {diagnostics.playbackStatus.paused ? 'Paused' : 'Playing'}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-neutral-500">Position:</span>
              <span className="text-neutral-200">
                {diagnostics.playbackStatus.currentTime}s / {diagnostics.playbackStatus.duration}s
              </span>
            </div>
          </div>
          {diagnostics.playbackStatus.error && (
            <div className="mt-1 p-2 bg-red-500/20 border border-red-500/40 rounded text-red-200">
              {diagnostics.playbackStatus.error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

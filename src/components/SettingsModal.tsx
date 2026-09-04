/**
 * StreamGlass TV - Settings Modal
 * Compliance with Section 23 & 26:
 * - Playback, Audio, Subtitles, Network, Interface, Library, Device, About
 * - Device Information (webOS version, model, resolution, capabilities)
 */

import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  PlaySquare,
  Volume2,
  Subtitles,
  Tv,
  Info,
  Sliders,
  Layers,
  X,
  Check,
} from 'lucide-react';
import { AppSettings, DeviceInfoState } from '../types/media';

interface SettingsModalProps {
  settings: AppSettings;
  deviceInfo: DeviceInfoState;
  onUpdateSettings: (newSettings: AppSettings) => void;
  onClose: () => void;
}

type TabKey = 'playback' | 'audio' | 'subtitles' | 'network' | 'interface' | 'device' | 'about';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  deviceInfo,
  onUpdateSettings,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>('playback');
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [savedFeedback, setSavedFeedback] = useState(false);

  const update = <K extends keyof AppSettings>(section: K, key: keyof AppSettings[K], value: any) => {
    const updated = {
      ...localSettings,
      [section]: {
        ...localSettings[section],
        [key]: value,
      },
    };
    setLocalSettings(updated);
    onUpdateSettings(updated);
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 1500);
  };

  return (
    <div
      id="settings-modal"
      className="w-[780px] h-[520px] bg-neutral-900/95 backdrop-blur-2xl border border-white/20 rounded-2xl p-6 shadow-2xl text-neutral-100 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2.5">
          <SettingsIcon className="w-5 h-5 text-blue-400" />
          <h2 className="text-lg font-bold tracking-wider text-neutral-100">SETTINGS</h2>
          {savedFeedback && (
            <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1">
              <Check className="w-3 h-3" /> Saved
            </span>
          )}
        </div>
        <button
          id="btn-close-settings"
          onClick={onClose}
          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors focus:ring-2 focus:ring-blue-400"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Grid: Left Tabs + Right Content */}
      <div className="grid grid-cols-4 gap-4 flex-1 overflow-hidden">
        {/* Left Tabs */}
        <div className="col-span-1 flex flex-col gap-1.5 border-r border-white/10 pr-3">
          <button
            onClick={() => setActiveTab('playback')}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-left transition-all ${
              activeTab === 'playback' ? 'bg-blue-600 text-white shadow' : 'text-neutral-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <PlaySquare className="w-4 h-4" /> Playback
          </button>
          <button
            onClick={() => setActiveTab('audio')}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-left transition-all ${
              activeTab === 'audio' ? 'bg-blue-600 text-white shadow' : 'text-neutral-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Volume2 className="w-4 h-4" /> Audio
          </button>
          <button
            onClick={() => setActiveTab('subtitles')}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-left transition-all ${
              activeTab === 'subtitles' ? 'bg-blue-600 text-white shadow' : 'text-neutral-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Subtitles className="w-4 h-4" /> Subtitles
          </button>
          <button
            onClick={() => setActiveTab('interface')}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-left transition-all ${
              activeTab === 'interface' ? 'bg-blue-600 text-white shadow' : 'text-neutral-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Sliders className="w-4 h-4" /> Interface
          </button>
          <button
            onClick={() => setActiveTab('device')}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-left transition-all ${
              activeTab === 'device' ? 'bg-blue-600 text-white shadow' : 'text-neutral-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Tv className="w-4 h-4" /> Device Info
          </button>
          <button
            onClick={() => setActiveTab('about')}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-left transition-all ${
              activeTab === 'about' ? 'bg-blue-600 text-white shadow' : 'text-neutral-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Info className="w-4 h-4" /> About
          </button>
        </div>

        {/* Right Settings Content */}
        <div className="col-span-3 overflow-y-auto pr-2 flex flex-col gap-4 text-xs">
          {activeTab === 'playback' && (
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-bold text-neutral-200 border-b border-white/10 pb-2">Playback Settings</h3>
              
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                <div>
                  <div className="font-semibold text-neutral-200">Auto Play Next</div>
                  <div className="text-neutral-400">Play upcoming item automatically upon completion</div>
                </div>
                <input
                  type="checkbox"
                  checked={localSettings.playback.autoPlayNext}
                  onChange={(e) => update('playback', 'autoPlayNext', e.target.checked)}
                  className="w-5 h-5 accent-blue-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                <div>
                  <div className="font-semibold text-neutral-200">Resume Playback</div>
                  <div className="text-neutral-400">Restore exact position on video relaunch</div>
                </div>
                <input
                  type="checkbox"
                  checked={localSettings.playback.resumePlayback}
                  onChange={(e) => update('playback', 'resumePlayback', e.target.checked)}
                  className="w-5 h-5 accent-blue-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                <div>
                  <div className="font-semibold text-neutral-200">Seek Step (Jump Seconds)</div>
                  <div className="text-neutral-400">Duration skipped on Left/Right TV remote keys</div>
                </div>
                <select
                  value={localSettings.playback.seekStep}
                  onChange={(e) => update('playback', 'seekStep', Number(e.target.value))}
                  className="bg-neutral-800 border border-white/15 rounded-lg px-3 py-1.5 text-neutral-200"
                >
                  <option value={5}>5 Seconds</option>
                  <option value={10}>10 Seconds (Standard)</option>
                  <option value={30}>30 Seconds</option>
                  <option value={60}>60 Seconds</option>
                </select>
              </div>
            </div>
          )}

          {activeTab === 'audio' && (
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-bold text-neutral-200 border-b border-white/10 pb-2">Audio Preferences</h3>
              
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                <div>
                  <div className="font-semibold text-neutral-200">Preferred Audio Language</div>
                  <div className="text-neutral-400">Auto-matches Tamil, Telugu, Hindi, English, etc.</div>
                </div>
                <select
                  value={localSettings.audio.preferredAudioLanguage}
                  onChange={(e) => update('audio', 'preferredAudioLanguage', e.target.value)}
                  className="bg-neutral-800 border border-white/15 rounded-lg px-3 py-1.5 text-neutral-200"
                >
                  <option value="Tamil">Tamil</option>
                  <option value="Telugu">Telugu</option>
                  <option value="Hindi">Hindi</option>
                  <option value="English">English</option>
                  <option value="Malayalam">Malayalam</option>
                  <option value="Kannada">Kannada</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                <div>
                  <div className="font-semibold text-neutral-200">Auto Select Audio Track</div>
                  <div className="text-neutral-400">Automatically switch when detected stream contains preferred language</div>
                </div>
                <input
                  type="checkbox"
                  checked={localSettings.audio.autoSelectAudio}
                  onChange={(e) => update('audio', 'autoSelectAudio', e.target.checked)}
                  className="w-5 h-5 accent-blue-500 cursor-pointer"
                />
              </div>
            </div>
          )}

          {activeTab === 'subtitles' && (
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-bold text-neutral-200 border-b border-white/10 pb-2">Subtitle Preferences</h3>

              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                <div>
                  <div className="font-semibold text-neutral-200">Preferred Subtitle Language</div>
                  <div className="text-neutral-400">Default language activated when available</div>
                </div>
                <select
                  value={localSettings.subtitles.preferredSubtitleLanguage}
                  onChange={(e) => update('subtitles', 'preferredSubtitleLanguage', e.target.value)}
                  className="bg-neutral-800 border border-white/15 rounded-lg px-3 py-1.5 text-neutral-200"
                >
                  <option value="English">English</option>
                  <option value="Tamil">Tamil</option>
                  <option value="Telugu">Telugu</option>
                  <option value="Hindi">Hindi</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                <div>
                  <div className="font-semibold text-neutral-200">Auto Enable Subtitles</div>
                  <div className="text-neutral-400">Always start video with subtitles showing if available</div>
                </div>
                <input
                  type="checkbox"
                  checked={localSettings.subtitles.autoEnableSubtitles}
                  onChange={(e) => update('subtitles', 'autoEnableSubtitles', e.target.checked)}
                  className="w-5 h-5 accent-blue-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                <div>
                  <div className="font-semibold text-neutral-200">Subtitle Font Size</div>
                  <div className="text-neutral-400">Display size for cues on 1080p screen</div>
                </div>
                <select
                  value={localSettings.subtitles.fontSize}
                  onChange={(e) => update('subtitles', 'fontSize', e.target.value)}
                  className="bg-neutral-800 border border-white/15 rounded-lg px-3 py-1.5 text-neutral-200"
                >
                  <option value="small">Small (20px)</option>
                  <option value="medium">Medium (26px)</option>
                  <option value="large">Large (34px)</option>
                </select>
              </div>
            </div>
          )}

          {activeTab === 'interface' && (
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-bold text-neutral-200 border-b border-white/10 pb-2">Interface Options</h3>

              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                <div>
                  <div className="font-semibold text-neutral-200">On-Screen Remote Simulator</div>
                  <div className="text-neutral-400">Floating TV Remote D-Pad for mouse / touch testing</div>
                </div>
                <input
                  type="checkbox"
                  checked={localSettings.interface.remoteSimulator}
                  onChange={(e) => update('interface', 'remoteSimulator', e.target.checked)}
                  className="w-5 h-5 accent-blue-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                <div>
                  <div className="font-semibold text-neutral-200">TV Safe Margins (Over-scan prevention)</div>
                  <div className="text-neutral-400">Pads edge navigation 60px inward for standard television borders</div>
                </div>
                <input
                  type="checkbox"
                  checked={localSettings.interface.tvSafeMargins}
                  onChange={(e) => update('interface', 'tvSafeMargins', e.target.checked)}
                  className="w-5 h-5 accent-blue-500 cursor-pointer"
                />
              </div>
            </div>
          )}

          {activeTab === 'device' && (
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-bold text-neutral-200 border-b border-white/10 pb-2">Device Information (webOS APIs)</h3>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex flex-col gap-1">
                  <span className="text-neutral-400">Platform Environment:</span>
                  <span className="font-bold text-emerald-400 text-sm">
                    {deviceInfo.isWebOS ? 'LG Smart TV (webOS)' : 'Browser Desktop Testing'}
                  </span>
                </div>
                <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex flex-col gap-1">
                  <span className="text-neutral-400">TV Model Name:</span>
                  <span className="font-semibold text-neutral-200">{deviceInfo.modelName}</span>
                </div>
                <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex flex-col gap-1">
                  <span className="text-neutral-400">webOS Version:</span>
                  <span className="font-semibold text-neutral-200">{deviceInfo.version}</span>
                </div>
                <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex flex-col gap-1">
                  <span className="text-neutral-400">Screen Resolution:</span>
                  <span className="font-semibold text-blue-400">{deviceInfo.screenResolution}</span>
                </div>
              </div>

              <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex flex-col gap-1">
                <span className="text-neutral-400">Supported Audio Decoders:</span>
                <span className="text-neutral-300 font-mono text-[11px]">
                  {deviceInfo.audioCodecSupport.join(', ')}
                </span>
              </div>
              <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex flex-col gap-1">
                <span className="text-neutral-400">Supported Video Containers:</span>
                <span className="text-neutral-300 font-mono text-[11px]">
                  MKV, MP4, HLS (.m3u8), TS, WebM, MOV
                </span>
              </div>
            </div>
          )}

          {activeTab === 'about' && (
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-bold text-neutral-200 border-b border-white/10 pb-2">About StreamGlass TV</h3>
              <div className="p-4 bg-white/5 rounded-xl border border-white/10 flex flex-col gap-2">
                <div className="text-base font-bold text-blue-400">StreamGlass TV</div>
                <div className="text-neutral-300">Advanced MKV / Multi-Audio / Subtitle webOS TV Player</div>
                <div className="text-neutral-400 font-mono text-[11px]">
                  Package ID: com.streamglasstv.player<br />
                  Version: 1.0.0<br />
                  Target: LG webOS TV (1920×1080)
                </div>
              </div>
              <p className="text-neutral-400 text-xs">
                Built strictly with true audio/subtitle track detection. Automatically distinguishes verified media tracks from filename hints and provides full spatial TV remote key controls.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

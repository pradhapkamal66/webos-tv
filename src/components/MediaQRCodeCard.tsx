/**
 * StreamGlass TV - Media & Poster Implant QR Code Component
 * Renders high-contrast, scalable SVG QR codes for:
 * 1. Stream URL (direct playback / sharing on mobile / VLC)
 * 2. Cover Poster Image Implant (preview & download artwork)
 * 3. Mobile Beam Pairing (scan to upload video & image from phone)
 */

import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  QrCode,
  Film,
  Image as ImageIcon,
  Smartphone,
  Copy,
  Check,
  ExternalLink,
  X,
  Sparkles,
} from 'lucide-react';

interface MediaQRCodeCardProps {
  streamUrl?: string;
  posterUrl?: string;
  title?: string;
  container?: string;
  onClose?: () => void;
  showTabs?: boolean;
}

export const MediaQRCodeCard: React.FC<MediaQRCodeCardProps> = ({
  streamUrl,
  posterUrl,
  title,
  container,
  onClose,
  showTabs = true,
}) => {
  // Available QR tabs: 'stream' | 'poster' | 'beam'
  const [activeTab, setActiveTab] = useState<'stream' | 'poster' | 'beam'>(() => {
    if (streamUrl) return 'stream';
    if (posterUrl) return 'poster';
    return 'beam';
  });
  const [copied, setCopied] = useState(false);

  // Generate mobile beam URL that opens the app in phone upload mode
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
  const beamUrl = `${currentOrigin}${currentPath}?beam=true#beam-upload`;

  let qrValue = '';
  let qrLabel = '';
  let qrSubtitle = '';

  if (activeTab === 'stream') {
    qrValue = streamUrl || '';
    qrLabel = 'Stream URL QR Code';
    qrSubtitle = 'Scan with your phone to test stream in mobile browser or VLC';
  } else if (activeTab === 'poster') {
    qrValue = posterUrl || '';
    qrLabel = 'Poster Image Implant QR Code';
    qrSubtitle = 'Scan to preview, download, or share this cover poster artwork';
  } else {
    qrValue = beamUrl;
    qrLabel = 'Phone-to-Screen Beam QR Code';
    qrSubtitle = 'Scan with your phone camera to upload media URL & image from mobile';
  }

  const handleCopy = () => {
    if (!qrValue) return;
    navigator.clipboard.writeText(qrValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-neutral-900 border border-white/20 rounded-2xl p-5 text-neutral-100 shadow-2xl flex flex-col gap-4 max-w-sm w-full mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
            <QrCode className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white tracking-wide">
              {title ? `${title.slice(0, 24)}...` : 'MEDIA QR CODE'}
            </h4>
            <p className="text-[10px] text-neutral-400">{qrLabel}</p>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Tabs */}
      {showTabs && (
        <div className="grid grid-cols-3 gap-1 bg-black/40 p-1 rounded-xl border border-white/10 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('stream')}
            disabled={!streamUrl}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg font-semibold text-[11px] transition-all ${
              activeTab === 'stream'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-neutral-400 hover:text-neutral-200 disabled:opacity-40'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>Stream</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('poster')}
            disabled={!posterUrl}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg font-semibold text-[11px] transition-all ${
              activeTab === 'poster'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-neutral-400 hover:text-neutral-200 disabled:opacity-40'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Poster</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('beam')}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg font-semibold text-[11px] transition-all ${
              activeTab === 'beam'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Beam</span>
          </button>
        </div>
      )}

      {/* QR Display Canvas Box */}
      <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl shadow-inner border border-neutral-200">
        {qrValue ? (
          <QRCodeSVG
            value={qrValue}
            size={180}
            level="M"
            includeMargin={true}
            className="w-full h-auto max-w-[180px]"
          />
        ) : (
          <div className="w-[180px] h-[180px] flex flex-col items-center justify-center text-neutral-400 text-center gap-2">
            <QrCode className="w-10 h-10 opacity-30 text-neutral-600" />
            <span className="text-xs text-neutral-500 font-medium">No URL entered yet</span>
          </div>
        )}
      </div>

      {/* Subtitle & Value Preview */}
      <div className="flex flex-col gap-1.5 text-center">
        <p className="text-[11px] text-neutral-300 font-medium">{qrSubtitle}</p>
        {qrValue && (
          <div className="flex items-center justify-between gap-2 bg-black/50 border border-white/10 rounded-xl px-3 py-1.5 text-left">
            <span className="text-[10px] font-mono text-neutral-300 truncate max-w-[230px]">
              {qrValue}
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="p-1 rounded bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white transition-colors shrink-0"
              title="Copy URL"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
        )}
      </div>

      {activeTab === 'beam' && (
        <div className="flex items-center gap-2 p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-300">
          <Sparkles className="w-4 h-4 shrink-0 text-amber-400" />
          <span>Point your phone camera here to upload photo & stream URL from mobile!</span>
        </div>
      )}
    </div>
  );
};

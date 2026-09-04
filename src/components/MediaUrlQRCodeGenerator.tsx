/**
 * StreamGlass TV - Scannable Media URL QR Code Generator & Mobile Beam
 * Integrates qrcode.js (qrcode) to render real-time, scannable QR codes onto HTML5 Canvas.
 * Supports:
 * 1. Scannable QR code of the current Media Stream URL (with Copy, Download PNG, Test Stream)
 * 2. Mobile Beam Pairing QR code (scan with phone to beam URLs and photos directly to the TV)
 */

import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  QrCode,
  Smartphone,
  Film,
  Copy,
  Check,
  Download,
  ExternalLink,
  Sparkles,
  Radio,
  X,
  Share2,
} from 'lucide-react';

interface MediaUrlQRCodeGeneratorProps {
  mediaUrl: string;
  onBeamedMediaUrl?: (url: string, title?: string, poster?: string) => void;
  title?: string;
  onClose?: () => void;
  defaultMode?: 'url' | 'beam';
}

export const MediaUrlQRCodeGenerator: React.FC<MediaUrlQRCodeGeneratorProps> = ({
  mediaUrl,
  onBeamedMediaUrl,
  title,
  onClose,
  defaultMode = 'url',
}) => {
  const [activeTab, setActiveTab] = useState<'url' | 'beam'>(defaultMode);
  const [copied, setCopied] = useState(false);
  const [beamedReceived, setBeamedReceived] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Determine current origin for mobile beaming
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
  const beamPortalUrl = `${currentOrigin}${currentPath}?beam=true#beam-upload`;

  const activeContent = activeTab === 'url' ? (mediaUrl.trim() || 'https://') : beamPortalUrl;

  // Render QR code to canvas using qrcode.js library
  useEffect(() => {
    if (!canvasRef.current || !activeContent) return;

    QRCode.toCanvas(
      canvasRef.current,
      activeContent,
      {
        width: 190,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'M',
      },
      (error) => {
        if (error) {
          console.error('Failed to generate scannable QR code with qrcode.js:', error);
        }
      }
    );
  }, [activeContent, activeTab]);

  // Real-time listener for incoming mobile beams via BroadcastChannel
  useEffect(() => {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;
    const channel = new BroadcastChannel('streamglass_beam');

    channel.onmessage = (event) => {
      if (event.data?.type === 'BEAM_MOVIE' && event.data.movie) {
        const beamed = event.data.movie;
        setBeamedReceived(true);
        if (onBeamedMediaUrl && beamed.streamUrl) {
          onBeamedMediaUrl(beamed.streamUrl, beamed.name, beamed.poster);
        }
        setTimeout(() => setBeamedReceived(false), 4000);
      }
    };

    return () => {
      channel.close();
    };
  }, [onBeamedMediaUrl]);

  const handleCopy = () => {
    if (!activeContent) return;
    navigator.clipboard.writeText(activeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQR = () => {
    if (!canvasRef.current) return;
    const imageUri = canvasRef.current.toDataURL('image/png');
    const downloadLink = document.createElement('a');
    downloadLink.download = `streamglass-${activeTab === 'url' ? 'media-url' : 'beam-pairing'}-qr.png`;
    downloadLink.href = imageUri;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  return (
    <div
      id="media-url-qr-generator"
      className="bg-neutral-900 border border-white/20 rounded-2xl p-4 text-neutral-100 shadow-2xl flex flex-col gap-3.5 max-w-sm w-full mx-auto animate-in fade-in zoom-in-95"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
            <QrCode className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white tracking-wide uppercase">
              {activeTab === 'url' ? 'Media URL QR Code' : 'Beam from Smartphone'}
            </h4>
            <p className="text-[10px] text-neutral-400">
              {activeTab === 'url' ? 'Generated via qrcode.js' : 'Direct Phone-to-TV Pairing'}
            </p>
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
      <div className="grid grid-cols-2 gap-1 bg-black/40 p-1 rounded-xl border border-white/10 text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('url')}
          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg font-semibold text-[11px] transition-all ${
            activeTab === 'url'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Film className="w-3.5 h-3.5" />
          <span>Media Stream URL</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('beam')}
          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg font-semibold text-[11px] transition-all ${
            activeTab === 'beam'
              ? 'bg-purple-600 text-white shadow-md'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Beam from Phone</span>
        </button>
      </div>

      {/* QR Code Canvas Box */}
      <div className="flex flex-col items-center justify-center p-3.5 bg-white rounded-2xl shadow-inner border border-neutral-300">
        <canvas
          id="media-url-qrcode-canvas"
          ref={canvasRef}
          className="rounded-lg max-w-[190px] w-full h-auto"
        />
      </div>

      {/* Beamed Incoming Notification */}
      {beamedReceived && (
        <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 flex items-center gap-2 text-[11px] font-semibold animate-pulse">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>✨ Stream Beamed from Mobile! Fields updated automatically.</span>
        </div>
      )}

      {/* Helper text based on tab */}
      <div className="flex flex-col gap-1 text-center">
        {activeTab === 'url' ? (
          <>
            <p className="text-[11px] text-neutral-300 font-medium">
              {mediaUrl.trim()
                ? 'Scan with your mobile camera to test stream in mobile browser or VLC'
                : 'Enter a stream URL above to generate its scannable QR code'}
            </p>
            {mediaUrl.trim() && (
              <span className="text-[10px] text-neutral-400">
                Length: {mediaUrl.length} characters • Tokens & parameters preserved
              </span>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-1 text-purple-300 text-[11px] font-semibold">
              <Radio className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
              <span>Ready for Mobile Beam</span>
            </div>
            <p className="text-[11px] text-neutral-300">
              Point your smartphone camera at this QR code to paste stream URLs or snap cover photos directly from your phone!
            </p>
          </div>
        )}
      </div>

      {/* Target Content & Action Buttons */}
      <div className="flex flex-col gap-2 pt-1 border-t border-white/10">
        <div className="flex items-center justify-between gap-2 bg-black/50 border border-white/10 rounded-xl px-2.5 py-1.5 text-left">
          <span className="text-[10px] font-mono text-neutral-300 truncate max-w-[200px]">
            {activeContent}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleCopy}
              className="p-1 rounded bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white transition-colors"
              title="Copy URL to clipboard"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </button>
            <button
              type="button"
              onClick={handleDownloadQR}
              className="p-1 rounded bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white transition-colors"
              title="Download QR code as PNG image"
            >
              <Download className="w-3 h-3" />
            </button>
            {activeTab === 'url' && mediaUrl.trim() && (
              <a
                href={mediaUrl}
                target="_blank"
                rel="noreferrer"
                className="p-1 rounded bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white transition-colors"
                title="Open stream URL in new tab"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

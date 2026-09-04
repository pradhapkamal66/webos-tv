/**
 * StreamGlass TV - Smart Media URL Import Modal with Image / Poster Upload
 * 1. Stream URL with format & query parameter preservation.
 * 2. Media Image Upload: File upload (drag & drop / file picker) or Poster URL.
 * 3. Fast cinematic poster presets for quick visual selection.
 * 4. Automatic container and track analysis.
 * 5. Saves directly to Firebase Realtime Firestore & local cache.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  PlusCircle,
  Loader2,
  Film,
  ShieldCheck,
  X,
  Sparkles,
  Upload,
  Image as ImageIcon,
  Check,
  Trash2,
  QrCode,
  Smartphone,
  Eye,
  Radio,
} from 'lucide-react';
import { MovieRecord } from '../types/media';
import {
  detectMediaType,
  analyzeMedia,
  evaluateCapabilities,
} from '../services/mediaService';
import { MediaQRCodeCard } from './MediaQRCodeCard';
import { MediaUrlQRCodeGenerator } from './MediaUrlQRCodeGenerator';

interface AddMediaModalProps {
  onAddMovie: (movie: MovieRecord) => void;
  onClose: () => void;
}

const CINEMATIC_POSTER_PRESETS = [
  {
    name: 'Sci-Fi Action',
    url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Cinema Classic',
    url: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Fantasy Epic',
    url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Cyberpunk',
    url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Futuristic',
    url: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Drama',
    url: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=800&q=80',
  },
];

export const AddMediaModal: React.FC<AddMediaModalProps> = ({ onAddMovie, onClose }) => {
  const [inputUrl, setInputUrl] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [posterUrl, setPosterUrl] = useState('');
  const [posterUploadMethod, setPosterUploadMethod] = useState<'upload' | 'url' | 'qrcode' | 'presets'>('upload');
  const [isProcessing, setIsProcessing] = useState(false);
  const [detectedInfo, setDetectedInfo] = useState<any>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showUrlQr, setShowUrlQr] = useState(false);
  const [urlQrDefaultMode, setUrlQrDefaultMode] = useState<'url' | 'beam'>('url');
  const [beamedNotification, setBeamedNotification] = useState<string | null>(null);
  const [showPosterQr, setShowPosterQr] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Listen for mobile beams in real-time
  useEffect(() => {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;
    const channel = new BroadcastChannel('streamglass_beam');
    channel.onmessage = (event) => {
      if (event.data?.type === 'BEAM_MOVIE' && event.data.movie) {
        const beamed = event.data.movie;
        if (beamed.streamUrl) {
          setInputUrl(beamed.streamUrl);
          const parsed = detectMediaType(beamed.streamUrl);
          setDetectedInfo(parsed);
        }
        if (beamed.name) {
          setCustomTitle(beamed.name);
        }
        if (beamed.poster) {
          setPosterUrl(beamed.poster);
        }
        setBeamedNotification(`✨ Beamed from mobile device: "${beamed.name}"`);
        setTimeout(() => setBeamedNotification(null), 6000);
      }
    };
    return () => {
      channel.close();
    };
  }, []);

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputUrl(val);
    if (val.trim().length > 5) {
      const parsed = detectMediaType(val.trim());
      setDetectedInfo(parsed);
      if (!customTitle && parsed.extractedTitle) {
        setCustomTitle(parsed.extractedTitle);
      }
    } else {
      setDetectedInfo(null);
    }
  };

  // Handle image file upload (file picker or drag-drop)
  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (JPEG, PNG, WEBP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setPosterUrl(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processImageFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl.trim()) return;

    setIsProcessing(true);
    const rawUrl = inputUrl.trim();
    const mediaDetection = detectMediaType(rawUrl);

    // Analyze via metadata service
    const analysis = await analyzeMedia(rawUrl);

    const defaultCover =
      posterUrl.trim() ||
      CINEMATIC_POSTER_PRESETS[Math.floor(Math.random() * CINEMATIC_POSTER_PRESETS.length)].url;

    const newMovie: MovieRecord = {
      id: 'movie_' + Date.now(),
      name: customTitle.trim() || mediaDetection.extractedTitle || 'UNTITLED STREAM',
      type: mediaDetection.container === 'm3u8' ? 'stream' : 'movie',
      category: 'User Added',
      year: mediaDetection.extractedYear || '2024',
      poster: defaultCover,
      backdrop: defaultCover,
      streamUrl: rawUrl, // NEVER stripped of query parameters/tokens!
      container: mediaDetection.container,
      mimeType: mediaDetection.mimeType,
      videoInfo: {
        codec: analysis.video.codec,
        width: analysis.video.width || 1920,
        height: analysis.video.height || 1080,
        frameRate: analysis.video.frameRate || 24,
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
      filenameHints: {
        audioLanguages: mediaDetection.extractedLanguages,
      },
    };

    setIsProcessing(false);
    onAddMovie(newMovie);
    onClose();
  };

  return (
    <div
      id="add-media-modal"
      className="w-[640px] max-h-[90vh] bg-neutral-900/95 backdrop-blur-2xl border border-white/20 rounded-2xl p-6 shadow-2xl text-neutral-100 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200 overflow-y-auto"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400">
            <PlusCircle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-wider text-neutral-100">ADD MEDIA STREAM & POSTER</h2>
            <p className="text-xs text-neutral-400">Upload cover artwork, paste stream URL, and inspect tracks</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors focus:ring-2 focus:ring-blue-400"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Notification when media is received from mobile beam */}
      {beamedNotification && (
        <div className="bg-emerald-500/15 border border-emerald-500/30 rounded-xl p-3 flex items-center gap-2.5 text-emerald-300 text-xs animate-in fade-in">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
          <div className="flex flex-col">
            <span className="font-bold text-white">Media Beamed from Phone!</span>
            <span className="text-[11px] text-emerald-200">{beamedNotification}</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-xs">
        {/* URL Input Section */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="font-semibold text-neutral-300 flex items-center gap-1.5">
              <Film className="w-3.5 h-3.5 text-blue-400" />
              <span>Stream URL (.mkv, .mp4, .m3u8, .ts, .mov, .webm)</span>
            </label>
            <div className="flex items-center gap-1 bg-white/5 p-0.5 rounded-lg border border-white/10">
              <button
                id="btn-toggle-url-qr"
                type="button"
                onClick={() => {
                  if (showUrlQr && urlQrDefaultMode === 'url') {
                    setShowUrlQr(false);
                  } else {
                    setUrlQrDefaultMode('url');
                    setShowUrlQr(true);
                  }
                }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                  showUrlQr && urlQrDefaultMode === 'url'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-neutral-400 hover:text-white'
                }`}
                title="Generate scannable QR code of this stream URL via qrcode.js"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>URL QR Code</span>
              </button>
              <button
                id="btn-toggle-beam-qr"
                type="button"
                onClick={() => {
                  if (showUrlQr && urlQrDefaultMode === 'beam') {
                    setShowUrlQr(false);
                  } else {
                    setUrlQrDefaultMode('beam');
                    setShowUrlQr(true);
                  }
                }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                  showUrlQr && urlQrDefaultMode === 'beam'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-neutral-400 hover:text-purple-300'
                }`}
                title="Scan QR Code with mobile phone to beam URLs and photos directly to TV"
              >
                <Smartphone className="w-3.5 h-3.5 text-purple-400" />
                <span>Beam from Phone</span>
              </button>
            </div>
          </div>
          <input
            id="input-stream-url"
            type="text"
            placeholder="https://server.com/movie.mkv?token=xxxxx"
            value={inputUrl}
            onChange={handleUrlChange}
            required
            className="w-full bg-neutral-950/90 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-neutral-100 focus:ring-2 focus:ring-blue-400 focus:outline-none"
          />

          {/* Scannable Media URL QR Code Generator (qrcode.js) & Mobile Beam */}
          {showUrlQr && (
            <div className="pt-2 animate-in fade-in zoom-in-95 duration-150">
              <MediaUrlQRCodeGenerator
                mediaUrl={inputUrl}
                title={customTitle || 'Video Stream'}
                defaultMode={urlQrDefaultMode}
                onBeamedMediaUrl={(url, title, poster) => {
                  setInputUrl(url);
                  const parsed = detectMediaType(url);
                  setDetectedInfo(parsed);
                  if (title) setCustomTitle(title);
                  if (poster) setPosterUrl(poster);
                }}
                onClose={() => setShowUrlQr(false)}
              />
            </div>
          )}

          <div className="flex items-center justify-between text-[11px] text-neutral-400">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Tokens and query parameters are preserved for stream playback and masked in UI.
            </span>
            {!showUrlQr && (
              <button
                type="button"
                onClick={() => {
                  setUrlQrDefaultMode('beam');
                  setShowUrlQr(true);
                }}
                className="text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1 font-medium"
              >
                <Smartphone className="w-3 h-3 text-purple-400" />
                <span>Beam from phone instead</span>
              </button>
            )}
          </div>
        </div>

        {/* Real-time container inspection preview */}
        {detectedInfo && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col gap-2">
            <div className="flex justify-between items-center text-neutral-400 font-semibold text-xs border-b border-white/5 pb-1.5">
              <span>Automatic Inspection</span>
              <span className="font-mono text-blue-400 uppercase font-bold text-xs">
                {detectedInfo.container} CONTAINER
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-neutral-300">
              <div>
                <span className="text-neutral-500">Sanitized URL: </span>
                <span className="font-mono text-[11px] text-neutral-300 truncate block">
                  {detectedInfo.sanitizedUrl}
                </span>
              </div>
              <div>
                <span className="text-neutral-500">MIME Type: </span>
                <span className="font-mono text-[11px] text-neutral-300">{detectedInfo.mimeType}</span>
              </div>
            </div>
            {detectedInfo.extractedLanguages.length > 0 && (
              <div className="text-[11px] text-amber-300 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Filename language hints: {detectedInfo.extractedLanguages.join(', ')}</span>
              </div>
            )}
          </div>
        )}

        {/* Title Input */}
        <div className="flex flex-col gap-1.5">
          <label className="font-semibold text-neutral-300">Title / Label</label>
          <input
            id="input-stream-title"
            type="text"
            placeholder="Movie or stream name"
            value={customTitle}
            onChange={(e) => setCustomTitle(e.target.value)}
            className="w-full bg-neutral-950/90 border border-white/15 rounded-xl px-3.5 py-2 text-xs text-neutral-100 focus:ring-2 focus:ring-blue-400 focus:outline-none"
          />
        </div>

        {/* Media Image / Poster Upload Section */}
        <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
          <div className="flex items-center justify-between">
            <label className="font-semibold text-neutral-300 flex items-center gap-1.5">
              <ImageIcon className="w-4 h-4 text-blue-400" />
              <span>Cover Poster Image Implant</span>
            </label>
            <div className="flex items-center gap-1 bg-white/5 p-0.5 rounded-lg border border-white/10">
              <button
                type="button"
                onClick={() => setPosterUploadMethod('upload')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                  posterUploadMethod === 'upload' ? 'bg-blue-600 text-white' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Upload File
              </button>
              <button
                type="button"
                onClick={() => setPosterUploadMethod('url')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                  posterUploadMethod === 'url' ? 'bg-blue-600 text-white' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Image URL
              </button>
              <button
                type="button"
                onClick={() => setPosterUploadMethod('qrcode')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                  posterUploadMethod === 'qrcode' ? 'bg-blue-600 text-white' : 'text-neutral-400 hover:text-white'
                }`}
              >
                <QrCode className="w-3 h-3" />
                <span>QR Code Implant</span>
              </button>
              <button
                type="button"
                onClick={() => setPosterUploadMethod('presets')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                  posterUploadMethod === 'presets' ? 'bg-blue-600 text-white' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Presets
              </button>
            </div>
          </div>

          {/* Option 1: File Upload Drag & Drop */}
          {posterUploadMethod === 'upload' && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
                isDragging
                  ? 'border-blue-400 bg-blue-500/10'
                  : 'border-white/15 bg-white/5 hover:border-white/30 hover:bg-white/10'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400">
                <Upload className="w-5 h-5" />
              </div>
              <div className="text-center">
                <span className="font-semibold text-neutral-200">Click to upload poster</span> or drag & drop
                <p className="text-[11px] text-neutral-400 mt-0.5">Supports PNG, JPG, WEBP • Auto-implants into stream</p>
              </div>
            </div>
          )}

          {/* Option 2: Image URL Input */}
          {posterUploadMethod === 'url' && (
            <input
              id="input-poster-url"
              type="text"
              placeholder="https://images.unsplash.com/... or direct image poster URL"
              value={posterUrl}
              onChange={(e) => setPosterUrl(e.target.value)}
              className="w-full bg-neutral-950/90 border border-white/15 rounded-xl px-3.5 py-2 text-xs text-neutral-100 focus:ring-2 focus:ring-blue-400 focus:outline-none"
            />
          )}

          {/* Option 3: QR Code Implant from Phone */}
          {posterUploadMethod === 'qrcode' && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center gap-3 text-center">
              <div className="flex items-center gap-2 text-blue-400">
                <Smartphone className="w-4 h-4" />
                <span className="font-bold text-xs text-white">Scan to Implant Image from Smartphone</span>
              </div>
              <p className="text-[11px] text-neutral-400 max-w-sm">
                Point your phone camera at this QR code to pick an image from your photo library or take a photo to implant directly as this video's cover artwork.
              </p>
              <MediaQRCodeCard
                posterUrl={posterUrl}
                title="Mobile Image Implant"
                showTabs={false}
              />
            </div>
          )}

          {/* Option 4: Presets Grid */}
          {posterUploadMethod === 'presets' && (
            <div className="grid grid-cols-6 gap-2">
              {CINEMATIC_POSTER_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setPosterUrl(preset.url)}
                  className={`group relative rounded-xl overflow-hidden aspect-[2/3] border transition-all ${
                    posterUrl === preset.url
                      ? 'border-blue-400 ring-2 ring-blue-400/50 scale-105'
                      : 'border-white/10 hover:border-white/30'
                  }`}
                >
                  <img
                    src={preset.url}
                    alt={preset.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-1">
                    <span className="text-[9px] font-bold text-white truncate w-full text-center">
                      {preset.name}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Poster Preview Box with QR Code inspection */}
          {posterUrl && (
            <div className="flex flex-col gap-2">
              <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={posterUrl}
                    alt="Poster preview"
                    className="w-12 h-16 object-cover rounded-lg border border-white/15 shadow"
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-white flex items-center gap-1">
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      Cover Artwork Implanted
                    </span>
                    <span className="text-[10px] text-neutral-400 truncate max-w-[300px]">
                      {posterUrl.startsWith('data:') ? 'Custom uploaded image (Ready)' : posterUrl}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShowPosterQr(!showPosterQr)}
                    className={`p-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1 transition-all ${
                      showPosterQr
                        ? 'bg-blue-600 text-white border-blue-400'
                        : 'bg-white/10 hover:bg-white/15 text-neutral-300 border-white/15'
                    }`}
                    title="View QR Code for this poster image"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span className="text-[10px]">{showPosterQr ? 'Hide' : 'QR Code'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPosterUrl('');
                      setShowPosterQr(false);
                    }}
                    className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors"
                    title="Remove poster"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {showPosterQr && (
                <div className="p-2 bg-black/40 border border-white/10 rounded-xl flex justify-center animate-in fade-in">
                  <MediaQRCodeCard
                    posterUrl={posterUrl}
                    title="Implanted Poster Artwork"
                    showTabs={false}
                    onClose={() => setShowPosterQr(false)}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-medium"
          >
            Cancel
          </button>
          <button
            id="btn-confirm-import"
            type="submit"
            disabled={isProcessing || !inputUrl.trim()}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold shadow-lg shadow-blue-900/30 focus:ring-2 focus:ring-blue-400 transition-all"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Analyzing & Saving...</span>
              </>
            ) : (
              <>
                <Film className="w-4 h-4" />
                <span>Save to Realtime & Play</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

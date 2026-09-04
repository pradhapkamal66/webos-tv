/**
 * StreamGlass TV - Edit Media Modal
 * Allows full modification of movie title, stream URL, container, codec,
 * audio tracks (labels, languages, codecs), and subtitle tracks (embedded/WebVTT).
 */

import React, { useState } from 'react';
import {
  Edit3,
  X,
  Save,
  Film,
  Volume2,
  Subtitles,
  Plus,
  Trash2,
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Upload,
  Image as ImageIcon,
  Check,
  QrCode,
  Smartphone,
} from 'lucide-react';
import { MovieRecord, AudioTrackItem, SubtitleTrackItem } from '../types/media';
import { detectMediaType, analyzeMedia, sanitizeUrl } from '../services/mediaService';
import { MediaQRCodeCard } from './MediaQRCodeCard';
import { MediaUrlQRCodeGenerator } from './MediaUrlQRCodeGenerator';

interface EditMediaModalProps {
  movie: MovieRecord;
  onSave: (updatedMovie: MovieRecord) => void;
  onClose: () => void;
}

export const EditMediaModal: React.FC<EditMediaModalProps> = ({ movie, onSave, onClose }) => {
  const [name, setName] = useState(movie.name);
  const [streamUrl, setStreamUrl] = useState(movie.streamUrl);
  const [year, setYear] = useState(movie.year ? String(movie.year) : '');
  const [category, setCategory] = useState(movie.category || 'General');
  const [container, setContainer] = useState(movie.container || 'mp4');
  const [videoCodec, setVideoCodec] = useState(movie.videoInfo?.codec || 'H.264 / AVC');
  const [poster, setPoster] = useState(movie.poster || '');
  const [posterUploadMethod, setPosterUploadMethod] = useState<'upload' | 'url' | 'qrcode' | 'presets'>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [showUrlQr, setShowUrlQr] = useState(false);
  const [showPosterQr, setShowPosterQr] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Track state copies
  const [audioTracks, setAudioTracks] = useState<AudioTrackItem[]>(
    JSON.parse(JSON.stringify(movie.audioTracks || []))
  );
  const [subtitleTracks, setSubtitleTracks] = useState<SubtitleTrackItem[]>(
    JSON.parse(JSON.stringify(movie.subtitleTracks || []))
  );

  const [activeTab, setActiveTab] = useState<'details' | 'audio' | 'subtitles'>('details');
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [reanalyzeNotice, setReanalyzeNotice] = useState<string | null>(null);

  // New audio track form state
  const [newAudioLabel, setNewAudioLabel] = useState('');
  const [newAudioLang, setNewAudioLang] = useState('en');
  const [newAudioCodec, setNewAudioCodec] = useState('AAC');
  const [newAudioChannels, setNewAudioChannels] = useState('2.0');

  // New subtitle track form state
  const [newSubLabel, setNewSubLabel] = useState('');
  const [newSubLang, setNewSubLang] = useState('en');
  const [newSubUrl, setNewSubUrl] = useState('');
  const [newSubEmbedded, setNewSubEmbedded] = useState(false);

  // Handle re-inspection
  const handleReanalyze = async () => {
    if (!streamUrl.trim()) return;
    setIsReanalyzing(true);
    setReanalyzeNotice(null);

    try {
      const detection = detectMediaType(streamUrl.trim());
      setContainer(detection.container);

      const analysis = await analyzeMedia(streamUrl.trim());
      if (analysis.video.codec) {
        setVideoCodec(analysis.video.codec);
      }
      if (analysis.audioTracks.length > 0) {
        setAudioTracks(analysis.audioTracks);
      }
      if (analysis.subtitleTracks.length > 0) {
        setSubtitleTracks(analysis.subtitleTracks);
      }

      setReanalyzeNotice(
        `Analysis complete: Found ${analysis.audioTracks.length} audio track(s) and ${analysis.subtitleTracks.length} subtitle track(s).`
      );
    } catch (err) {
      setReanalyzeNotice('Media inspection completed with fallback defaults.');
    } finally {
      setIsReanalyzing(false);
    }
  };

  // Audio track operations
  const handleRemoveAudio = (id: string | number) => {
    setAudioTracks((prev) => prev.filter((t) => t.id !== id));
  };

  const handleUpdateAudio = (id: string | number, field: keyof AudioTrackItem, value: any) => {
    setAudioTracks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, [field]: value } : t))
    );
  };

  const handleAddAudioTrack = () => {
    if (!newAudioLabel.trim()) return;
    const newTrack: AudioTrackItem = {
      id: 'custom_audio_' + Date.now(),
      label: newAudioLabel.trim(),
      language: newAudioLang.trim() || 'en',
      codec: newAudioCodec.trim() || 'AAC',
      channels: newAudioChannels.trim() || '2.0',
      source: 'metadata',
      default: audioTracks.length === 0,
    };
    setAudioTracks((prev) => [...prev, newTrack]);
    setNewAudioLabel('');
  };

  // Subtitle track operations
  const handleRemoveSubtitle = (id: string | number) => {
    setSubtitleTracks((prev) => prev.filter((s) => s.id !== id));
  };

  const handleUpdateSubtitle = (id: string | number, field: keyof SubtitleTrackItem, value: any) => {
    setSubtitleTracks((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const handleAddSubtitleTrack = () => {
    if (!newSubLabel.trim()) return;
    const newSub: SubtitleTrackItem = {
      id: 'custom_sub_' + Date.now(),
      label: newSubLabel.trim(),
      language: newSubLang.trim() || 'en',
      url: newSubUrl.trim() || undefined,
      embedded: newSubEmbedded,
      source: newSubUrl.trim() ? 'external' : 'metadata',
      default: subtitleTracks.length === 0,
    };
    setSubtitleTracks((prev) => [...prev, newSub]);
    setNewSubLabel('');
    setNewSubUrl('');
  };

  // Form submit
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !streamUrl.trim()) return;

    const updated: MovieRecord = {
      ...movie,
      name: name.trim(),
      streamUrl: streamUrl.trim(),
      poster: poster.trim() || undefined,
      backdrop: poster.trim() || undefined,
      year: year.trim() || undefined,
      category: category.trim(),
      container: container.toLowerCase().trim(),
      videoInfo: {
        ...movie.videoInfo,
        codec: videoCodec.trim(),
      },
      audioTracks,
      subtitleTracks,
      updatedAt: new Date().toISOString(),
    };

    onSave(updated);
    onClose();
  };

  const safeDisplayUrl = sanitizeUrl(streamUrl);

  return (
    <div
      id="edit-media-modal"
      className="w-[720px] max-h-[88vh] bg-neutral-900/95 backdrop-blur-2xl border border-white/20 rounded-2xl p-6 shadow-2xl text-neutral-100 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400">
            <Edit3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-wide text-white">Edit Video Metadata & Tracks</h2>
            <p className="text-xs text-neutral-400 font-mono truncate max-w-[460px]">{safeDisplayUrl}</p>
          </div>
        </div>
        <button
          id="btn-close-edit-modal"
          onClick={onClose}
          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('details')}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'details'
              ? 'bg-blue-600 text-white shadow'
              : 'bg-white/5 text-neutral-400 hover:text-neutral-200 hover:bg-white/10'
          }`}
        >
          <Film className="w-3.5 h-3.5" />
          <span>General & Stream URL</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('audio')}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'audio'
              ? 'bg-blue-600 text-white shadow'
              : 'bg-white/5 text-neutral-400 hover:text-neutral-200 hover:bg-white/10'
          }`}
        >
          <Volume2 className="w-3.5 h-3.5" />
          <span>Audio Tracks ({audioTracks.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('subtitles')}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'subtitles'
              ? 'bg-blue-600 text-white shadow'
              : 'bg-white/5 text-neutral-400 hover:text-neutral-200 hover:bg-white/10'
          }`}
        >
          <Subtitles className="w-3.5 h-3.5" />
          <span>Subtitle Tracks ({subtitleTracks.length})</span>
        </button>
      </div>

      {/* Content Form */}
      <form onSubmit={handleSave} className="flex flex-col gap-4 overflow-y-auto pr-1">
        {/* Tab 1: General Details */}
        {activeTab === 'details' && (
          <div className="flex flex-col gap-3.5 text-xs">
            {/* Title */}
            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-neutral-300">Video Name / Title</label>
              <input
                id="input-edit-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-neutral-950/90 border border-white/15 rounded-xl px-3.5 py-2 text-xs text-neutral-100 focus:ring-2 focus:ring-blue-400 focus:outline-none"
              />
            </div>

            {/* Stream URL */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-neutral-300 flex items-center gap-1.5">
                  <Film className="w-3.5 h-3.5 text-blue-400" />
                  <span>Stream URL (Full URL with parameters)</span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    id="btn-edit-toggle-url-qr"
                    type="button"
                    onClick={() => setShowUrlQr(!showUrlQr)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                      showUrlQr
                        ? 'bg-blue-600 text-white border-blue-400'
                        : 'bg-white/5 text-neutral-400 border-white/10 hover:text-white'
                    }`}
                    title="Show Stream URL QR Code"
                  >
                    <QrCode className="w-3 h-3" />
                    <span>{showUrlQr ? 'Hide URL QR' : 'Show URL QR'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleReanalyze}
                    disabled={isReanalyzing || !streamUrl.trim()}
                    className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 text-[11px] font-semibold transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${isReanalyzing ? 'animate-spin' : ''}`} />
                    <span>Re-inspect Tracks</span>
                  </button>
                </div>
              </div>
              <input
                id="input-edit-url"
                type="text"
                value={streamUrl}
                onChange={(e) => setStreamUrl(e.target.value)}
                required
                className="w-full bg-neutral-950/90 border border-white/15 rounded-xl px-3.5 py-2 font-mono text-xs text-neutral-100 focus:ring-2 focus:ring-blue-400 focus:outline-none"
              />

              {/* Stream URL QR Code display */}
              {showUrlQr && (
                <div className="pt-2 animate-in fade-in zoom-in-95 duration-150">
                  <MediaUrlQRCodeGenerator
                    mediaUrl={streamUrl}
                    title={name}
                    onClose={() => setShowUrlQr(false)}
                  />
                </div>
              )}

              <span className="text-[11px] text-neutral-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Query parameters and authentication tokens are kept intact for playback.
              </span>
            </div>

            {reanalyzeNotice && (
              <div className="bg-blue-950/30 border border-blue-500/30 rounded-xl p-2.5 text-[11px] text-blue-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
                <span>{reanalyzeNotice}</span>
              </div>
            )}

            {/* Format & Codec Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-neutral-300">Container</label>
                <select
                  id="select-edit-container"
                  value={container}
                  onChange={(e) => setContainer(e.target.value)}
                  className="bg-neutral-950/90 border border-white/15 rounded-xl px-3 py-2 text-xs text-neutral-100 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                >
                  <option value="mp4">MP4</option>
                  <option value="mkv">MKV (Matroska)</option>
                  <option value="m3u8">HLS (.m3u8)</option>
                  <option value="ts">MPEG-TS</option>
                  <option value="webm">WebM</option>
                  <option value="mov">MOV</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-neutral-300">Video Codec</label>
                <input
                  id="input-edit-codec"
                  type="text"
                  value={videoCodec}
                  onChange={(e) => setVideoCodec(e.target.value)}
                  placeholder="e.g. H.264 / AVC"
                  className="bg-neutral-950/90 border border-white/15 rounded-xl px-3 py-2 text-xs text-neutral-100 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-neutral-300">Year</label>
                <input
                  id="input-edit-year"
                  type="text"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="e.g. 2024"
                  className="bg-neutral-950/90 border border-white/15 rounded-xl px-3 py-2 text-xs text-neutral-100 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-semibold text-neutral-300">Category / Tag</label>
              <input
                id="input-edit-category"
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Feature Film, Test Stream, Animation"
                className="bg-neutral-950/90 border border-white/15 rounded-xl px-3 py-2 text-xs text-neutral-100 focus:ring-2 focus:ring-blue-400 focus:outline-none"
              />
            </div>

            {/* Poster / Cover Image Upload Section */}
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

              {/* Option 1: File Upload */}
              {posterUploadMethod === 'upload' && (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      const file = e.dataTransfer.files[0];
                      if (file.type.startsWith('image/')) {
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          if (ev.target?.result) setPoster(ev.target.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-3 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all ${
                    isDragging
                      ? 'border-blue-400 bg-blue-500/10'
                      : 'border-white/15 bg-white/5 hover:border-white/30 hover:bg-white/10'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0];
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          if (ev.target?.result) setPoster(ev.target.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="hidden"
                  />
                  <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
                    <Upload className="w-4 h-4" />
                  </div>
                  <span className="font-semibold text-neutral-200 text-xs">
                    Click to upload replacement poster or drag & drop
                  </span>
                </div>
              )}

              {/* Option 2: Image URL */}
              {posterUploadMethod === 'url' && (
                <input
                  id="input-edit-poster-url"
                  type="text"
                  placeholder="https://images.unsplash.com/... or image URL"
                  value={poster}
                  onChange={(e) => setPoster(e.target.value)}
                  className="w-full bg-neutral-950/90 border border-white/15 rounded-xl px-3.5 py-2 text-xs text-neutral-100 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                />
              )}

              {/* Option 3: QR Code Implant from Phone */}
              {posterUploadMethod === 'qrcode' && (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center gap-2.5 text-center">
                  <div className="flex items-center gap-2 text-blue-400">
                    <Smartphone className="w-4 h-4" />
                    <span className="font-bold text-xs text-white">Scan to Implant Image from Smartphone</span>
                  </div>
                  <p className="text-[11px] text-neutral-400 max-w-sm">
                    Scan with your phone to upload an image from your mobile photo gallery or snap a photo directly to implant into this stream!
                  </p>
                  <MediaQRCodeCard
                    posterUrl={poster}
                    title="Mobile Image Implant"
                    showTabs={false}
                  />
                </div>
              )}

              {/* Option 4: Presets */}
              {posterUploadMethod === 'presets' && (
                <div className="grid grid-cols-6 gap-2">
                  {[
                    { name: 'Sci-Fi', url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=800&q=80' },
                    { name: 'Cinema', url: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=800&q=80' },
                    { name: 'Fantasy', url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80' },
                    { name: 'Cyber', url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80' },
                    { name: 'Future', url: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&w=800&q=80' },
                    { name: 'Drama', url: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=800&q=80' },
                  ].map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setPoster(p.url)}
                      className={`group relative rounded-xl overflow-hidden aspect-[2/3] border transition-all ${
                        poster === p.url
                          ? 'border-blue-400 ring-2 ring-blue-400/50 scale-105'
                          : 'border-white/10 hover:border-white/30'
                      }`}
                    >
                      <img src={p.url} alt={p.name} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-1">
                        <span className="text-[9px] font-bold text-white truncate w-full text-center">{p.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Poster Preview */}
              {poster && (
                <div className="flex flex-col gap-2">
                  <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img src={poster} alt="Poster" className="w-12 h-16 object-cover rounded-lg border border-white/15 shadow" />
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-white flex items-center gap-1">
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          Cover Artwork Implanted
                        </span>
                        <span className="text-[10px] text-neutral-400 truncate max-w-[300px]">
                          {poster.startsWith('data:') ? 'Custom uploaded image (Ready)' : poster}
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
                          setPoster('');
                          setShowPosterQr(false);
                        }}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20"
                        title="Remove poster"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {showPosterQr && (
                    <div className="p-2 bg-black/40 border border-white/10 rounded-xl flex justify-center animate-in fade-in">
                      <MediaQRCodeCard
                        posterUrl={poster}
                        title="Implanted Poster Artwork"
                        showTabs={false}
                        onClose={() => setShowPosterQr(false)}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Audio Tracks */}
        {activeTab === 'audio' && (
          <div className="flex flex-col gap-3 text-xs">
            <p className="text-[11px] text-neutral-400">
              Manage audio streams for this video. You can edit track labels, language tags, codecs, and channels.
            </p>

            {/* List of existing audio tracks */}
            <div className="flex flex-col gap-2 max-h-[260px] overflow-y-auto pr-1">
              {audioTracks.length === 0 ? (
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center text-neutral-400">
                  No individual audio tracks configured. The default container stream will play.
                </div>
              ) : (
                audioTracks.map((track, idx) => (
                  <div
                    key={track.id || idx}
                    className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between gap-3"
                  >
                    <div className="grid grid-cols-4 gap-2 flex-1">
                      <div>
                        <label className="text-[10px] text-neutral-400 block mb-0.5">Label</label>
                        <input
                          type="text"
                          value={track.label}
                          onChange={(e) => handleUpdateAudio(track.id, 'label', e.target.value)}
                          className="w-full bg-neutral-950/90 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-neutral-400 block mb-0.5">Language</label>
                        <input
                          type="text"
                          value={track.language}
                          onChange={(e) => handleUpdateAudio(track.id, 'language', e.target.value)}
                          className="w-full bg-neutral-950/90 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-neutral-400 block mb-0.5">Codec</label>
                        <input
                          type="text"
                          value={track.codec || 'AAC'}
                          onChange={(e) => handleUpdateAudio(track.id, 'codec', e.target.value)}
                          className="w-full bg-neutral-950/90 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-neutral-400 block mb-0.5">Channels</label>
                        <input
                          type="text"
                          value={String(track.channels || '2.0')}
                          onChange={(e) => handleUpdateAudio(track.id, 'channels', e.target.value)}
                          className="w-full bg-neutral-950/90 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveAudio(track.id)}
                      className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors"
                      title="Remove audio track"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Add New Audio Track Form */}
            <div className="border-t border-white/10 pt-3 flex flex-col gap-2">
              <span className="font-semibold text-neutral-300 flex items-center gap-1.5 text-xs">
                <Plus className="w-3.5 h-3.5 text-blue-400" />
                Add Audio Track
              </span>
              <div className="grid grid-cols-4 gap-2">
                <input
                  type="text"
                  placeholder="Label (e.g. Tamil)"
                  value={newAudioLabel}
                  onChange={(e) => setNewAudioLabel(e.target.value)}
                  className="bg-neutral-950/90 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-neutral-100"
                />
                <input
                  type="text"
                  placeholder="Language (e.g. ta)"
                  value={newAudioLang}
                  onChange={(e) => setNewAudioLang(e.target.value)}
                  className="bg-neutral-950/90 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-neutral-100"
                />
                <input
                  type="text"
                  placeholder="Codec (AAC, AC3)"
                  value={newAudioCodec}
                  onChange={(e) => setNewAudioCodec(e.target.value)}
                  className="bg-neutral-950/90 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-neutral-100"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ch (2.0 / 5.1)"
                    value={newAudioChannels}
                    onChange={(e) => setNewAudioChannels(e.target.value)}
                    className="w-full bg-neutral-950/90 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-neutral-100"
                  />
                  <button
                    type="button"
                    onClick={handleAddAudioTrack}
                    disabled={!newAudioLabel.trim()}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-xs shrink-0"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Subtitles */}
        {activeTab === 'subtitles' && (
          <div className="flex flex-col gap-3 text-xs">
            <p className="text-[11px] text-neutral-400">
              Manage subtitles for this video. You can add external WebVTT subtitle links or embedded track tags.
            </p>

            {/* List of existing subtitle tracks */}
            <div className="flex flex-col gap-2 max-h-[260px] overflow-y-auto pr-1">
              {subtitleTracks.length === 0 ? (
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center text-neutral-400">
                  No subtitle tracks configured.
                </div>
              ) : (
                subtitleTracks.map((sub, idx) => (
                  <div
                    key={sub.id || idx}
                    className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between gap-3"
                  >
                    <div className="flex flex-col gap-2 flex-1">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-neutral-400 block mb-0.5">Label</label>
                          <input
                            type="text"
                            value={sub.label}
                            onChange={(e) => handleUpdateSubtitle(sub.id, 'label', e.target.value)}
                            className="w-full bg-neutral-950/90 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-neutral-400 block mb-0.5">Language Code</label>
                          <input
                            type="text"
                            value={sub.language}
                            onChange={(e) => handleUpdateSubtitle(sub.id, 'language', e.target.value)}
                            className="w-full bg-neutral-950/90 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] text-neutral-400 block mb-0.5">
                          WebVTT URL (Optional for external)
                        </label>
                        <input
                          type="text"
                          value={sub.url || ''}
                          onChange={(e) => handleUpdateSubtitle(sub.id, 'url', e.target.value)}
                          placeholder="https://server.com/subs.vtt"
                          className="w-full bg-neutral-950/90 border border-white/10 rounded-lg px-2.5 py-1 text-xs font-mono text-neutral-300"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveSubtitle(sub.id)}
                      className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors shrink-0"
                      title="Remove subtitle track"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Add New Subtitle Form */}
            <div className="border-t border-white/10 pt-3 flex flex-col gap-2">
              <span className="font-semibold text-neutral-300 flex items-center gap-1.5 text-xs">
                <Plus className="w-3.5 h-3.5 text-emerald-400" />
                Add Subtitle Track
              </span>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="Label (e.g. English CC)"
                  value={newSubLabel}
                  onChange={(e) => setNewSubLabel(e.target.value)}
                  className="bg-neutral-950/90 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-neutral-100"
                />
                <input
                  type="text"
                  placeholder="Language (e.g. en)"
                  value={newSubLang}
                  onChange={(e) => setNewSubLang(e.target.value)}
                  className="bg-neutral-950/90 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-neutral-100"
                />
                <input
                  type="text"
                  placeholder="External WebVTT URL"
                  value={newSubUrl}
                  onChange={(e) => setNewSubUrl(e.target.value)}
                  className="bg-neutral-950/90 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-neutral-100 font-mono"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleAddSubtitleTrack}
                  disabled={!newSubLabel.trim()}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs"
                >
                  Add Subtitle Track
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 pt-3 border-t border-white/10 mt-2">
          <button
            id="btn-cancel-edit"
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-medium text-xs transition-colors"
          >
            Cancel
          </button>
          <button
            id="btn-save-edit"
            type="submit"
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-lg shadow-blue-900/30 focus:ring-2 focus:ring-blue-400 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>Save Changes</span>
          </button>
        </div>
      </form>
    </div>
  );
};

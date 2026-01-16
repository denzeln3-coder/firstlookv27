import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Scissors, Volume2, VolumeX, Sun, Type, Play, Pause } from 'lucide-react';

export default function PitchEditScreen({ videoBlob, onComplete, onBack }) {
  const videoRef = useRef(null);
  const [activeTab, setActiveTab] = useState('trim');
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Trim state
  const [duration, setDuration] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  
  // Volume state
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  
  // Filter state
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [selectedFilter, setSelectedFilter] = useState('none');
  
  const [videoUrl, setVideoUrl] = useState('');

  useEffect(() => {
    const url = URL.createObjectURL(videoBlob);
    setVideoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [videoBlob]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;

    const handleLoadedMetadata = () => {
      const dur = video.duration;
      if (dur && !isNaN(dur) && isFinite(dur)) {
        setDuration(dur);
        setTrimEnd(dur);
      }
    };

    const handleTimeUpdate = () => {
      const time = video.currentTime;
      if (!isNaN(time) && isFinite(time)) {
        setCurrentTime(time);
        if (time >= trimEnd && trimEnd > 0) {
          video.pause();
          setIsPlaying(false);
        }
      }
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.load();

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [videoUrl, trimEnd]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      if (video.currentTime >= trimEnd) {
        video.currentTime = trimStart;
      }
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimelineClick = (e) => {
    if (!duration || duration === 0 || isNaN(duration)) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = x / rect.width;
    const newTime = percent * duration;
    
    if (videoRef.current && isFinite(newTime)) {
      videoRef.current.currentTime = Math.max(trimStart, Math.min(trimEnd, newTime));
    }
  };

  const applyFilter = (filterName) => {
    setSelectedFilter(filterName);
    
    const filters = {
      none: { brightness: 100, contrast: 100, saturation: 100 },
      warm: { brightness: 105, contrast: 95, saturation: 110 },
      cool: { brightness: 95, contrast: 105, saturation: 90 },
      bw: { brightness: 100, contrast: 110, saturation: 0 },
      vintage: { brightness: 110, contrast: 85, saturation: 80 }
    };
    
    const filter = filters[filterName];
    if (filter) {
      setBrightness(filter.brightness);
      setContrast(filter.contrast);
      setSaturation(filter.saturation);
    }
  };

  const handleContinue = () => {
    // Pass through the video - edits are preview only for MVP
    onComplete(videoBlob);
  };

  const videoStyle = {
    filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds) || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const tabs = [
    { id: 'trim', icon: Scissors, label: 'Trim' },
    { id: 'volume', icon: Volume2, label: 'Volume' },
    { id: 'filters', icon: Sun, label: 'Filters' },
    { id: 'text', icon: Type, label: 'Text' }
  ];

  return (
    <div className="min-h-screen bg-[#000000] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[rgba(255,255,255,0.06)]">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-[rgba(255,255,255,0.06)] flex items-center justify-center text-[#8E8E93] hover:text-white transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-white text-lg font-bold">Edit Pitch</h1>
        <span className="text-[12px] text-[#71717A]">Step 4 of 8</span>
      </div>

      {/* Video Preview */}
      <div className="flex-1 flex items-center justify-center bg-black relative min-h-[300px]">
        <div className="relative w-full max-w-md" style={{ aspectRatio: '9/16' }}>
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full h-full object-contain rounded-xl"
            style={videoStyle}
            playsInline
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
          
          {/* Play Button Overlay */}
          {!isPlaying && (
            <button
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                <Play className="w-8 h-8 text-black ml-1" fill="black" />
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="px-4 py-3 border-t border-[rgba(255,255,255,0.06)] bg-[#0A0A0A]">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-[#8E8E93] text-xs tabular-nums">{formatTime(currentTime)}</span>
          <div className="flex-1 h-2 bg-[#18181B] rounded-full relative cursor-pointer" onClick={handleTimelineClick}>
            <div 
              className="absolute h-full bg-[#6366F1]/30 rounded-full"
              style={{
                left: `${duration > 0 ? (trimStart / duration) * 100 : 0}%`,
                right: `${duration > 0 ? 100 - (trimEnd / duration) * 100 : 0}%`
              }}
            />
            <div 
              className="absolute h-full bg-[#6366F1] rounded-full transition-all"
              style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow"
              style={{ left: `calc(${duration > 0 ? (currentTime / duration) * 100 : 0}% - 6px)` }}
            />
          </div>
          <span className="text-[#8E8E93] text-xs tabular-nums">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Tool Tabs */}
      <div className="flex border-t border-[rgba(255,255,255,0.06)] bg-[#0A0A0A]">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 transition ${
                activeTab === tab.id
                  ? 'text-[#6366F1] border-t-2 border-[#6366F1] -mt-[2px]'
                  : 'text-[#8E8E93]'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tool Content */}
      <div className="p-4 bg-[#0A0A0A] border-t border-[rgba(255,255,255,0.06)] max-h-[200px] overflow-y-auto">
        {activeTab === 'trim' && (
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-white text-sm font-medium">Trim Start</label>
                <span className="text-[#6366F1] text-sm font-medium tabular-nums">{formatTime(trimStart)}</span>
              </div>
              <input
                type="range"
                min="0"
                max={duration || 100}
                step="0.1"
                value={trimStart}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setTrimStart(Math.min(val, trimEnd - 0.5));
                  if (videoRef.current) videoRef.current.currentTime = val;
                }}
                className="w-full accent-[#6366F1]"
              />
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-white text-sm font-medium">Trim End</label>
                <span className="text-[#6366F1] text-sm font-medium tabular-nums">{formatTime(trimEnd)}</span>
              </div>
              <input
                type="range"
                min="0"
                max={duration || 100}
                step="0.1"
                value={trimEnd}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setTrimEnd(Math.max(val, trimStart + 0.5));
                }}
                className="w-full accent-[#6366F1]"
              />
            </div>
            <p className="text-[#71717A] text-xs text-center">
              Final duration: {formatTime(trimEnd - trimStart)}
            </p>
          </div>
        )}

        {activeTab === 'volume' && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  setIsMuted(!isMuted);
                  if (videoRef.current) videoRef.current.muted = !isMuted;
                }}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition ${
                  isMuted ? 'bg-[#EF4444]' : 'bg-[#18181B]'
                }`}
              >
                {isMuted ? <VolumeX className="w-5 h-5 text-white" /> : <Volume2 className="w-5 h-5 text-white" />}
              </button>
              <div className="flex-1">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setVolume(val);
                    if (videoRef.current) videoRef.current.volume = val / 100;
                  }}
                  className="w-full accent-[#6366F1]"
                  disabled={isMuted}
                />
                <div className="flex justify-between text-[#8E8E93] text-xs mt-1">
                  <span>0%</span>
                  <span className="text-white font-medium">{volume}%</span>
                  <span>100%</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'filters' && (
          <div className="space-y-3">
            <div className="grid grid-cols-5 gap-2">
              {[
                { id: 'none', label: 'None' },
                { id: 'warm', label: 'Warm' },
                { id: 'cool', label: 'Cool' },
                { id: 'bw', label: 'B&W' },
                { id: 'vintage', label: 'Vintage' }
              ].map(filter => (
                <button
                  key={filter.id}
                  onClick={() => applyFilter(filter.id)}
                  className={`p-2 rounded-lg text-xs font-medium transition ${
                    selectedFilter === filter.id
                      ? 'bg-[#6366F1] text-white'
                      : 'bg-[#18181B] text-[#8E8E93] hover:bg-[#27272A]'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'text' && (
          <div className="text-center py-4">
            <p className="text-[#71717A] text-sm">Text overlays coming soon</p>
          </div>
        )}
      </div>

      {/* PROMINENT CONTINUE BUTTON */}
      <div className="p-4 bg-[#09090B] border-t border-[rgba(255,255,255,0.06)]">
        <p className="text-[12px] text-[#71717A] text-center mb-3">
          Editing is optional — your video looks great as-is
        </p>
        <button
          onClick={handleContinue}
          className="w-full py-4 bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] text-white text-[16px] font-semibold rounded-xl hover:brightness-110 transition-all duration-200 shadow-[0_4px_12px_rgba(99,102,241,0.4)]"
        >
          Continue to Demo
        </button>
      </div>
    </div>
  );
}
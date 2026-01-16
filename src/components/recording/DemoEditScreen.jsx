import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowLeft, Scissors, Play, Pause, RotateCcw, Check, Sparkles, ChevronLeft, ChevronRight, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import AIVideoEnhancer from './AIVideoEnhancer';

export default function DemoEditScreen({ videoBlob, onComplete, onBack }) {
  const videoRef = useRef(null);
  const progressRef = useRef(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [editMode, setEditMode] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  
  const [fadeIn, setFadeIn] = useState(true);
  const [fadeOut, setFadeOut] = useState(true);
  
  const [showEnhancer, setShowEnhancer] = useState(false);

  useEffect(() => {
    if (videoBlob) {
      const url = URL.createObjectURL(videoBlob);
      setVideoUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [videoBlob]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;

    const handleLoadedMetadata = () => {
      const videoDuration = video.duration;
      if (videoDuration && !isNaN(videoDuration) && isFinite(videoDuration)) {
        setDuration(videoDuration);
        setTrimEnd(videoDuration);
        setIsVideoReady(true);
      }
    };

    const handleDurationChange = () => {
      const videoDuration = video.duration;
      if (videoDuration && !isNaN(videoDuration) && isFinite(videoDuration)) {
        setDuration(videoDuration);
        if (trimEnd === 0 || trimEnd > videoDuration) {
          setTrimEnd(videoDuration);
        }
        setIsVideoReady(true);
      }
    };

    const handleTimeUpdate = () => {
      const time = video.currentTime;
      if (!isNaN(time)) {
        setCurrentTime(time);
        
        if (editMode === 'trim' && time >= trimEnd) {
          video.pause();
          video.currentTime = trimStart;
          setIsPlaying(false);
        }
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      if (editMode === 'trim') {
        video.currentTime = trimStart;
      } else {
        video.currentTime = 0;
      }
    };

    const handleCanPlay = () => {
      const videoDuration = video.duration;
      if (videoDuration && !isNaN(videoDuration) && isFinite(videoDuration)) {
        setDuration(videoDuration);
        if (trimEnd === 0) {
          setTrimEnd(videoDuration);
        }
        setIsVideoReady(true);
      }
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('canplay', handleCanPlay);

    video.load();

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('canplay', handleCanPlay);
    };
  }, [videoUrl, editMode, trimStart, trimEnd]);

  const togglePlayPause = useCallback(() => {
    const video = videoRef.current;
    if (!video || !isVideoReady) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      if (editMode === 'trim') {
        if (video.currentTime < trimStart || video.currentTime >= trimEnd) {
          video.currentTime = trimStart;
        }
      }
      video.play().catch(err => console.error('Play error:', err));
      setIsPlaying(true);
    }
  }, [isPlaying, isVideoReady, editMode, trimStart, trimEnd]);

  const handleSeek = (e) => {
    const video = videoRef.current;
    if (!video || !isVideoReady || duration === 0) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    
    let newTime;
    if (editMode === 'trim') {
      newTime = trimStart + (trimEnd - trimStart) * percentage;
    } else {
      newTime = duration * percentage;
    }
    
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleTrimStartChange = (newStart) => {
    const clampedStart = Math.max(0, Math.min(newStart, trimEnd - 1));
    setTrimStart(clampedStart);
    if (videoRef.current) {
      videoRef.current.currentTime = clampedStart;
      setCurrentTime(clampedStart);
    }
  };

  const handleTrimEndChange = (newEnd) => {
    const clampedEnd = Math.min(duration, Math.max(newEnd, trimStart + 1));
    setTrimEnd(clampedEnd);
  };

  const nudgeTime = (direction, isStart) => {
    const nudgeAmount = 0.1;
    if (isStart) {
      handleTrimStartChange(trimStart + (direction * nudgeAmount));
    } else {
      handleTrimEndChange(trimEnd + (direction * nudgeAmount));
    }
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds) || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTimeDetailed = (seconds) => {
    if (!seconds || isNaN(seconds) || !isFinite(seconds)) return '0:00.0';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`;
  };

  const handleComplete = () => {
    if (!editMode && fadeIn && fadeOut) {
      onComplete(videoBlob);
      return;
    }

    if (trimStart === 0 && trimEnd === duration && fadeIn && fadeOut) {
      onComplete(videoBlob);
      return;
    }

    toast.success('Settings saved!');
    onComplete(videoBlob);
  };

  const resetEdits = () => {
    setTrimStart(0);
    setTrimEnd(duration);
    setFadeIn(true);
    setFadeOut(true);
    setEditMode(null);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.pause();
      setIsPlaying(false);
      setCurrentTime(0);
    }
    toast.success('Edits reset');
  };

  const getProgressPercentage = () => {
    if (editMode === 'trim' && trimEnd > trimStart) {
      return ((currentTime - trimStart) / (trimEnd - trimStart)) * 100;
    }
    if (duration > 0) {
      return (currentTime / duration) * 100;
    }
    return 0;
  };

  const getTrimmedDuration = () => {
    return trimEnd - trimStart;
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-white flex flex-col">
      {/* Progress Bar */}
      <div className="h-1 bg-[#18181B]">
        <div className="h-full bg-[#6366F1] transition-all" style={{ width: '87.5%' }} />
      </div>

      {/* Header */}
      <div className="px-4 py-4 flex items-center justify-between border-b border-[rgba(255,255,255,0.06)]">
        <button onClick={onBack} className="text-[#A1A1AA] hover:text-white transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-[18px] font-semibold">Edit Demo</h1>
        <span className="text-[12px] text-[#71717A]">Step 8 of 9</span>
      </div>

      {/* Video Preview */}
      <div className="flex-1 flex items-center justify-center bg-black relative overflow-hidden min-h-[250px]">
        {videoUrl && (
          <video
            ref={videoRef}
            src={videoUrl}
            className="max-w-full max-h-full object-contain"
            playsInline
            preload="auto"
            onClick={togglePlayPause}
          />
        )}
        
        {!isPlaying && isVideoReady && (
          <button
            onClick={togglePlayPause}
            className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition"
          >
            <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
              <Play className="w-8 h-8 text-black ml-1" fill="black" />
            </div>
          </button>
        )}

        {!isVideoReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <div className="text-center">
              <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-3" />
              <p className="text-white/60 text-[14px]">Loading video...</p>
            </div>
          </div>
        )}
      </div>

      {/* Timeline & Controls */}
      <div className="px-4 py-4 bg-[#18181B] border-t border-[rgba(255,255,255,0.06)]">
        {/* Time Display */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-[14px] text-[#A1A1AA] tabular-nums">
            {editMode === 'trim' 
              ? formatTime(Math.max(0, currentTime - trimStart))
              : formatTime(currentTime)
            }
          </span>
          <button 
            onClick={togglePlayPause} 
            disabled={!isVideoReady}
            className="w-10 h-10 rounded-full bg-[#6366F1] flex items-center justify-center hover:bg-[#818CF8] transition disabled:opacity-50"
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </button>
          <span className="text-[14px] text-[#A1A1AA] tabular-nums">
            {editMode === 'trim' 
              ? formatTime(getTrimmedDuration())
              : formatTime(duration)
            }
          </span>
        </div>

        {/* Progress Bar */}
        <div
          ref={progressRef}
          className="relative h-2 bg-[#27272A] rounded-full cursor-pointer mb-4"
          onClick={handleSeek}
        >
          {editMode === 'trim' && duration > 0 && (
            <div
              className="absolute top-0 h-full bg-[#6366F1]/30 rounded-full"
              style={{
                left: `${(trimStart / duration) * 100}%`,
                width: `${((trimEnd - trimStart) / duration) * 100}%`
              }}
            />
          )}
          
          <div
            className="absolute top-0 left-0 h-full bg-[#6366F1] rounded-full transition-all"
            style={{ width: `${Math.min(100, getProgressPercentage())}%` }}
          />
          
          <div
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg transition-all"
            style={{ left: `calc(${Math.min(100, getProgressPercentage())}% - 8px)` }}
          />

          {editMode === 'trim' && duration > 0 && (
            <>
              <div
                className="absolute top-1/2 -translate-y-1/2 w-1 h-6 bg-[#10B981] rounded cursor-ew-resize z-10"
                style={{ left: `calc(${(trimStart / duration) * 100}% - 2px)` }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  const onMove = (moveEvent) => {
                    const rect = progressRef.current.getBoundingClientRect();
                    const x = moveEvent.clientX - rect.left;
                    const percentage = Math.max(0, Math.min(1, x / rect.width));
                    handleTrimStartChange(duration * percentage);
                  };
                  const onUp = () => {
                    window.removeEventListener('mousemove', onMove);
                    window.removeEventListener('mouseup', onUp);
                  };
                  window.addEventListener('mousemove', onMove);
                  window.addEventListener('mouseup', onUp);
                }}
              />
              
              <div
                className="absolute top-1/2 -translate-y-1/2 w-1 h-6 bg-[#EF4444] rounded cursor-ew-resize z-10"
                style={{ left: `calc(${(trimEnd / duration) * 100}% - 2px)` }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  const onMove = (moveEvent) => {
                    const rect = progressRef.current.getBoundingClientRect();
                    const x = moveEvent.clientX - rect.left;
                    const percentage = Math.max(0, Math.min(1, x / rect.width));
                    handleTrimEndChange(duration * percentage);
                  };
                  const onUp = () => {
                    window.removeEventListener('mousemove', onMove);
                    window.removeEventListener('mouseup', onUp);
                  };
                  window.addEventListener('mousemove', onMove);
                  window.addEventListener('mouseup', onUp);
                }}
              />
            </>
          )}
        </div>

        {/* Trim Controls */}
        {editMode === 'trim' && (
          <div className="bg-[#09090B] rounded-xl p-4 mb-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[12px] text-[#71717A] uppercase tracking-wide mb-2 block">Start</label>
                <div className="flex items-center gap-2">
                  <button onClick={() => nudgeTime(-1, true)} className="w-8 h-8 rounded-lg bg-[#27272A] flex items-center justify-center hover:bg-[#3F3F46] transition">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="flex-1 text-center text-[16px] font-medium tabular-nums text-[#10B981]">
                    {formatTimeDetailed(trimStart)}
                  </span>
                  <button onClick={() => nudgeTime(1, true)} className="w-8 h-8 rounded-lg bg-[#27272A] flex items-center justify-center hover:bg-[#3F3F46] transition">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div>
                <label className="text-[12px] text-[#71717A] uppercase tracking-wide mb-2 block">End</label>
                <div className="flex items-center gap-2">
                  <button onClick={() => nudgeTime(-1, false)} className="w-8 h-8 rounded-lg bg-[#27272A] flex items-center justify-center hover:bg-[#3F3F46] transition">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="flex-1 text-center text-[16px] font-medium tabular-nums text-[#EF4444]">
                    {formatTimeDetailed(trimEnd)}
                  </span>
                  <button onClick={() => nudgeTime(1, false)} className="w-8 h-8 rounded-lg bg-[#27272A] flex items-center justify-center hover:bg-[#3F3F46] transition">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
            
            <div className="mt-3 pt-3 border-t border-[#27272A] text-center">
              <span className="text-[13px] text-[#A1A1AA]">
                Selected: <span className="text-white font-medium">{formatTime(getTrimmedDuration())}</span>
              </span>
            </div>
          </div>
        )}

        {/* Quick Edit Tools - Simplified */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setEditMode(editMode === 'trim' ? null : 'trim')}
            disabled={!isVideoReady}
            className={`flex-1 py-2.5 rounded-xl font-medium transition flex items-center justify-center gap-2 text-[14px] ${
              editMode === 'trim'
                ? 'bg-[#6366F1] text-white'
                : 'bg-[rgba(255,255,255,0.06)] text-[#A1A1AA] hover:bg-[rgba(255,255,255,0.1)]'
            } disabled:opacity-50`}
          >
            <Scissors className="w-4 h-4" />
            Trim
          </button>
          
          <button
            onClick={resetEdits}
            disabled={!isVideoReady}
            className="py-2.5 px-4 bg-[rgba(255,255,255,0.06)] text-[#A1A1AA] rounded-xl hover:bg-[rgba(255,255,255,0.1)] transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Skip editing note */}
        <p className="text-[12px] text-[#71717A] text-center mb-4">
          Editing is optional — you can continue without changes
        </p>
      </div>

      {/* FIXED: Prominent Continue Button at Bottom */}
      <div className="px-4 py-4 bg-[#09090B] border-t border-[rgba(255,255,255,0.06)]">
        <button
          onClick={handleComplete}
          disabled={isProcessing || !isVideoReady}
          className="w-full py-4 bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] text-white text-[16px] font-semibold rounded-xl hover:brightness-110 transition-all duration-200 shadow-[0_4px_12px_rgba(99,102,241,0.4)] disabled:opacity-50"
        >
          {isProcessing ? 'Processing...' : 'Continue to Final Review'}
        </button>
      </div>
    </div>
  );
}
import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Play } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function DemoPreviewScreen({ videoBlob, onContinue, onReRecord, onBack }) {
  const videoRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [videoUrl, setVideoUrl] = useState(null);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [showReRecordDialog, setShowReRecordDialog] = useState(false);
  const [showBackDialog, setShowBackDialog] = useState(false);
  const [qualityChecks, setQualityChecks] = useState({
    screenReadable: false,
    voiceClear: false,
    mainFlow: false
  });

  useEffect(() => {
    if (!videoBlob) return;
    const url = URL.createObjectURL(videoBlob);
    setVideoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [videoBlob]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;

    const setReadyIfValid = () => {
      const dur = video.duration;
      if (dur && !isNaN(dur) && isFinite(dur)) {
        setDuration(dur);
        setIsVideoReady(true);
      }
    };

    const handleTimeUpdate = () => {
      const time = video.currentTime;
      if (!isNaN(time)) setCurrentTime(time);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      try {
        video.currentTime = 0;
      } catch {}
      setCurrentTime(0);
    };

    video.addEventListener('loadedmetadata', setReadyIfValid);
    video.addEventListener('durationchange', setReadyIfValid);
    video.addEventListener('canplay', setReadyIfValid);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);

    try {
      video.load();
    } catch {}

    return () => {
      try {
        video.pause();
      } catch {}

      video.removeEventListener('loadedmetadata', setReadyIfValid);
      video.removeEventListener('durationchange', setReadyIfValid);
      video.removeEventListener('canplay', setReadyIfValid);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
    };
  }, [videoUrl]);

  const togglePlayPause = () => {
    const v = videoRef.current;
    if (!v) return;
    if (isPlaying) v.pause();
    else v.play().catch(e => {
      console.error("Video play failed:", e);
      toast.error(`Failed to play video: ${e.message}`);
    });
  };

  const handleSeek = (e) => {
    const video = videoRef.current;
    if (!video || !duration || duration === 0) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    video.currentTime = percentage * duration;
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds) || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercent = () => {
    if (!duration || duration === 0 || isNaN(duration)) return 0;
    return (currentTime / duration) * 100;
  };

  const handleReRecordClick = () => {
    setShowReRecordDialog(true);
  };

  const confirmReRecord = () => {
    setShowReRecordDialog(false);
    onReRecord?.();
  };

  const handleBackClick = () => {
    setShowBackDialog(true);
  };

  const confirmBack = () => {
    setShowBackDialog(false);
    onBack?.();
  };

  const toggleQualityCheck = (key) => {
    setQualityChecks(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const allChecksComplete = Object.values(qualityChecks).every(Boolean);

  const handleContinueClick = () => {
    if (!onContinue) {
      toast.error('Continue action is not wired up yet (onContinue missing).');
      return;
    }
    onContinue();
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-white flex flex-col">
      {/* Progress */}
      <div className="h-1 bg-[#18181B]">
        <div className="h-full bg-[#6366F1]" style={{ width: '87.5%' }} />
      </div>

      {/* Header */}
      <div className="px-6 py-4 flex items-center justify-between border-b border-[rgba(255,255,255,0.06)]">
        <button onClick={handleBackClick} className="text-[#A1A1AA] hover:text-white transition" type="button">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="text-[14px] text-[#71717A]">Step 7 of 8</span>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 160px)' }}>
        <div className="max-w-4xl mx-auto">
          <h1 className="text-[32px] font-bold tracking-[-0.02em] mb-2">Review your demo</h1>
          <p className="text-[#A1A1AA] text-[16px] mb-6">Duration: {formatTime(duration)}</p>

          <div className="relative bg-black rounded-2xl overflow-hidden mb-6" style={{ aspectRatio: '16/9' }}>
            {videoUrl && (
              <video
                ref={videoRef}
                src={videoUrl}
                className="w-full h-full object-contain"
                playsInline
                muted
                preload="auto"
                onClick={togglePlayPause}
                onError={(e) => {
                  setIsVideoReady(false);
                  console.error('Video loading error:', { 
                    videoSrc: videoUrl, 
                    error: e.target?.error,
                    errorCode: e.target?.error?.code,
                    message: e.target?.error?.message 
                  });
                  const errorMsg = e.target?.error?.code === 4 ? 
                    'Video format not supported' : 
                    'Failed to load video';
                  toast.error(errorMsg);
                }}
              />
            )}

            {!isVideoReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-black">
                <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              </div>
            )}

            {isVideoReady && (
              <button onClick={togglePlayPause} type="button" className="absolute inset-0 flex items-center justify-center group">
                {!isPlaying && (
                  <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition">
                    <Play className="w-10 h-10 text-white ml-1" fill="white" />
                  </div>
                )}
              </button>
            )}

            {isVideoReady && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                <div className="h-1 bg-white/20 rounded-full cursor-pointer mb-2" onClick={handleSeek}>
                  <div className="h-full bg-white rounded-full transition-all" style={{ width: `${getProgressPercent()}%` }} />
                </div>
                <div className="flex justify-between text-[12px] text-white">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>
            )}
          </div>

          <div className="bg-[#18181B] border border-[rgba(255,255,255,0.1)] rounded-xl p-5">
            <h3 className="text-[16px] font-semibold mb-4">Quality Check</h3>
            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={qualityChecks.screenReadable}
                  onChange={() => toggleQualityCheck('screenReadable')}
                  className="w-5 h-5 rounded border-2 border-[#71717A] mt-0.5 flex-shrink-0 accent-[#6366F1]" 
                />
                <span className="text-[14px] text-[#A1A1AA]">Is the screen content readable?</span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={qualityChecks.voiceClear}
                  onChange={() => toggleQualityCheck('voiceClear')}
                  className="w-5 h-5 rounded border-2 border-[#71717A] mt-0.5 flex-shrink-0 accent-[#6366F1]" 
                />
                <span className="text-[14px] text-[#A1A1AA]">Is your voiceover clear?</span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={qualityChecks.mainFlow}
                  onChange={() => toggleQualityCheck('mainFlow')}
                  className="w-5 h-5 rounded border-2 border-[#71717A] mt-0.5 flex-shrink-0 accent-[#6366F1]" 
                />
                <span className="text-[14px] text-[#A1A1AA]">Did you show the main product flow?</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ Fixed bottom actions */}
      <div
        className="fixed left-0 right-0 bottom-0 bg-[#09090B]/95 backdrop-blur-lg border-t border-[rgba(255,255,255,0.08)] z-50"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex gap-4">
            <button
              onClick={handleReRecordClick}
              type="button"
              className="flex-1 py-4 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] text-white text-[16px] font-semibold rounded-xl hover:bg-[rgba(255,255,255,0.1)] transition"
            >
              Re-record
            </button>

            <button
              onClick={handleContinueClick}
              type="button"
              disabled={!allChecksComplete}
              className="flex-1 py-4 bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] text-white text-[16px] font-semibold rounded-xl hover:brightness-110 transition-all duration-200 shadow-[0_4px_12px_rgba(99,102,241,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          </div>
        </div>
      </div>

      <AlertDialog open={showReRecordDialog} onOpenChange={setShowReRecordDialog}>
        <AlertDialogContent className="bg-[#18181B] border-[rgba(255,255,255,0.1)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Re-record your demo?</AlertDialogTitle>
            <AlertDialogDescription className="text-[#A1A1AA]">
              Your current recording will be lost. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[#27272A] text-white border-[#3F3F46]">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmReRecord} className="bg-[#6366F1] text-white">
              Re-record
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showBackDialog} onOpenChange={setShowBackDialog}>
        <AlertDialogContent className="bg-[#18181B] border-[rgba(255,255,255,0.1)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Go back?</AlertDialogTitle>
            <AlertDialogDescription className="text-[#A1A1AA]">
              Your current recording will be lost. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[#27272A] text-white border-[#3F3F46]">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBack} className="bg-[#6366F1] text-white">
              Go Back
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
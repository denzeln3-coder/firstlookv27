import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Play, Volume2, VolumeX, RefreshCw } from 'lucide-react';

export default function VideoPlayer({ 
  videoUrl, 
  autoPlay = true, 
  loop = true, 
  poster, 
  startMuted = false, 
  fallbackInitial = '?'
}) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isMuted, setIsMuted] = useState(startMuted);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPlayButton, setShowPlayButton] = useState(false);

  const hasValidUrl = videoUrl && videoUrl.trim() !== '';

  useEffect(() => {
    setIsLoaded(false);
    setError(null);
    setIsPlaying(false);
    setIsLoading(true);
    setShowPlayButton(false);
  }, [videoUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !hasValidUrl) {
      setIsLoading(false);
      return;
    }

    let mounted = true;
    let loadTimeout;

    const handleLoadedData = () => {
      if (!mounted) return;
      clearTimeout(loadTimeout);
      setIsLoading(false);
      setIsLoaded(true);
      
      if (autoPlay) {
        video.muted = startMuted;
        video.play()
          .then(() => {
            if (mounted) {
              setIsMuted(startMuted);
              setIsPlaying(true);
              setShowPlayButton(false);
            }
          })
          .catch(() => {
            video.muted = true;
            if (mounted) setIsMuted(true);
            video.play()
              .then(() => { if (mounted) { setIsPlaying(true); setShowPlayButton(false); } })
              .catch(() => { if (mounted) { setIsPlaying(false); setShowPlayButton(true); } });
          });
      }
    };

    const handlePlay = () => { if (mounted) { setIsPlaying(true); setShowPlayButton(false); setIsLoading(false); } };
    const handlePause = () => { if (mounted) { setIsPlaying(false); setShowPlayButton(true); } };
    const handleCanPlay = () => { if (mounted) { setIsLoading(false); setIsLoaded(true); } };
    const handleEnded = () => { if (mounted && !loop) { setIsPlaying(false); setShowPlayButton(true); } };
    const handleError = () => { if (mounted) { setError('Failed to load video'); setIsLoading(false); setIsLoaded(false); } };

    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('error', handleError);

    loadTimeout = setTimeout(() => {
      if (mounted && isLoading && !isLoaded) { setIsLoading(false); setShowPlayButton(true); }
    }, 8000);

    return () => {
      mounted = false;
      clearTimeout(loadTimeout);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('error', handleError);
    };
  }, [videoUrl, autoPlay, startMuted, hasValidUrl, loop, isLoading, isLoaded]);

  const togglePlay = useCallback((e) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video || error) return;

    if (video.paused) {
      setIsLoading(true);
      video.play()
        .then(() => { setIsPlaying(true); setShowPlayButton(false); setIsLoading(false); })
        .catch(() => { setIsLoading(false); setShowPlayButton(true); });
    } else {
      video.pause();
      setIsPlaying(false);
      setShowPlayButton(true);
    }
  }, [error]);

  const toggleMute = useCallback((e) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  }, []);

  const handleRetry = useCallback((e) => {
    e.stopPropagation();
    setError(null);
    setIsLoading(true);
    setIsLoaded(false);
    if (videoRef.current) videoRef.current.load();
  }, []);

  if (!hasValidUrl || error) {
    return (
      <div className="relative w-full h-full bg-black flex items-center justify-center" onClick={error ? handleRetry : undefined}>
        <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center">
          <span className="text-white text-4xl font-bold">{fallbackInitial}</span>
        </div>
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/50">
            <span className="text-white/80 text-sm">{error}</span>
            <button className="flex items-center gap-2 px-4 py-2 bg-white/20 text-white text-sm rounded-full">
              <RefreshCw className="w-4 h-4" />Retry
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center" onClick={togglePlay}>
      <video
        ref={videoRef}
        src={videoUrl}
        loop={loop}
        playsInline
        preload="auto"
        poster={poster}
        className="max-w-full max-h-full w-auto h-auto"
        style={{ objectFit: 'contain' }}
        webkit-playsinline="true"
      />

      {isLoading && !isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/30">
          <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {isLoaded && (
        <button onClick={toggleMute} className="absolute top-4 left-4 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center z-20">
          {isMuted ? <VolumeX className="w-5 h-5 text-white" /> : <Volume2 className="w-5 h-5 text-white" />}
        </button>
      )}

      {((isLoaded && !isPlaying && !isLoading) || showPlayButton) && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-20 h-20 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center">
            <Play className="w-8 h-8 text-white fill-white ml-1" />
          </div>
        </div>
      )}
    </div>
  );
}

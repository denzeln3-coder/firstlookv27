import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Play, Volume2, VolumeX, RefreshCw } from 'lucide-react';

export default function VideoPlayer({ videoUrl, autoPlay = true, loop = true, poster, startMuted = false, fallbackInitial = '?' }) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isMuted, setIsMuted] = useState(startMuted);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPlayButton, setShowPlayButton] = useState(false);

  const hasValidUrl = videoUrl && videoUrl.trim() !== '';

  // Reset state when URL changes
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
            // Try muted autoplay
            video.muted = true;
            if (mounted) setIsMuted(true);
            video.play()
              .then(() => {
                if (mounted) {
                  setIsPlaying(true);
                  setShowPlayButton(false);
                }
              })
              .catch((err) => {
                console.error('Autoplay failed:', err);
                if (mounted) {
                  setIsPlaying(false);
                  setShowPlayButton(true);
                }
              });
          });
      }
    };

    const handleCanPlayThrough = () => {
      if (!mounted) return;
      clearTimeout(loadTimeout);
      setIsLoading(false);
      setIsLoaded(true);
    };

    const handlePlay = () => {
      if (mounted) {
        setIsPlaying(true);
        setShowPlayButton(false);
        setIsLoading(false);
      }
    };
    
    const handlePause = () => {
      if (mounted) {
        setIsPlaying(false);
        setShowPlayButton(true);
      }
    };
    
    const handleWaiting = () => {
      // Only show loading if we're supposed to be playing
      if (mounted && isPlaying) {
        setIsLoading(true);
      }
    };
    
    const handlePlaying = () => {
      if (mounted) {
        setIsLoading(false);
        setIsPlaying(true);
        setShowPlayButton(false);
      }
    };

    const handleCanPlay = () => {
      if (mounted) {
        setIsLoading(false);
        setIsLoaded(true);
      }
    };

    const handleEnded = () => {
      if (mounted) {
        if (!loop) {
          setIsPlaying(false);
          setShowPlayButton(true);
        }
        // For looping videos, the video element handles it automatically
      }
    };

    const handleError = (e) => {
      console.error('Video error:', e);
      if (mounted) {
        setError('Failed to load video');
        setIsLoading(false);
        setIsLoaded(false);
      }
    };

    const handleStalled = () => {
      // Video stalled, but don't show loading forever
      console.log('Video stalled');
    };

    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('canplaythrough', handleCanPlayThrough);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('error', handleError);
    video.addEventListener('stalled', handleStalled);

    // Timeout for loading - if it takes too long, hide spinner and show play button
    loadTimeout = setTimeout(() => {
      if (mounted && isLoading && !isLoaded) {
        setIsLoading(false);
        setShowPlayButton(true);
        // Don't set error, just let user try to play manually
      }
    }, 8000);

    return () => {
      mounted = false;
      clearTimeout(loadTimeout);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('canplaythrough', handleCanPlayThrough);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('error', handleError);
      video.removeEventListener('stalled', handleStalled);
    };
  }, [videoUrl, autoPlay, startMuted, hasValidUrl, loop]);

  const togglePlay = useCallback((e) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video || error) return;

    if (video.paused) {
      setIsLoading(true);
      video.play()
        .then(() => {
          setIsPlaying(true);
          setShowPlayButton(false);
          setIsLoading(false);
        })
        .catch((err) => {
          console.error('Play failed:', err);
          setIsLoading(false);
          setShowPlayButton(true);
        });
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
    if (videoRef.current) {
      videoRef.current.load();
    }
  }, []);

  return (
    <div className="relative w-full h-full" onClick={togglePlay}>
      {/* Fallback background */}
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#6366F1] to-[#8B5CF6]">
        <span className="text-white text-[64px] font-bold">{fallbackInitial}</span>
      </div>

      {/* Video element */}
      {hasValidUrl && !error && (
        <video
          ref={videoRef}
          src={videoUrl}
          loop={loop}
          playsInline
          preload="auto"
          poster={poster}
          className="absolute inset-0 w-full h-full object-contain bg-black"
          webkit-playsinline="true"
        />
      )}

      {/* Loading spinner - only show briefly, not forever */}
      {isLoading && !error && hasValidUrl && !isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/30">
          <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* Error state */}
      {error && hasValidUrl && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10 bg-black/50">
          <span className="text-white/80 text-[14px]">{error}</span>
          <button
            onClick={handleRetry}
            className="flex items-center gap-2 px-6 py-3 bg-white/20 backdrop-blur-sm text-white text-[14px] font-semibold rounded-full hover:bg-white/30 transition"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      )}

      {/* Mute/unmute button */}
      {isLoaded && !error && (
        <button
          onClick={toggleMute}
          className="absolute top-4 left-4 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center z-20 hover:bg-black/70 transition"
        >
          {isMuted ? (
            <VolumeX className="w-5 h-5 text-white" />
          ) : (
            <Volume2 className="w-5 h-5 text-white" />
          )}
        </button>
      )}

      {/* Play button overlay - show when paused or when video needs manual play */}
      {((isLoaded && !isPlaying && !isLoading) || showPlayButton) && !error && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-20 h-20 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center">
            <Play className="w-8 h-8 text-white fill-white ml-1" />
          </div>
        </div>
      )}
    </div>
  );
}
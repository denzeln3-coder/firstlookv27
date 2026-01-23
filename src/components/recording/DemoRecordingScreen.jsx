import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowLeft, Pause, Square, Play, Mic, MicOff, Monitor, Video } from 'lucide-react';

export default function DemoRecordingScreen({ recordingType = 'screen', onComplete, onBack }) {
  const videoRef = useRef(null);
  const screenPreviewRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const audioStreamRef = useRef(null);
  const timerIntervalRef = useRef(null);

  const [recordingState, setRecordingState] = useState('ready'); // ready, recording, paused, processing
  const [elapsedTime, setElapsedTime] = useState(0);
  const [error, setError] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [hasAudio, setHasAudio] = useState(true);

  const MAX_TIME = 120; // 2 minutes max

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  // Initialize camera for video mode
  useEffect(() => {
    if (recordingType === 'video') {
      startCamera();
    }
  }, [recordingType]);

  const cleanup = useCallback(() => {
    console.log('🧹 Cleaning up recording resources...');
    
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.log('MediaRecorder already stopped');
      }
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('Stopped track:', track.kind);
      });
      streamRef.current = null;
    }
    
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('Stopped audio track:', track.kind);
      });
      audioStreamRef.current = null;
    }
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'user', 
          width: { ideal: 1920 }, 
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        }
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setHasAudio(stream.getAudioTracks().length > 0);
    } catch (err) {
      console.error('Camera access error:', err);
      setError({
        title: 'Camera Access Required',
        message: 'Please allow camera and microphone access to record your demo.',
        actions: [
          { label: 'Try Again', onClick: () => { setError(null); startCamera(); } },
          { label: 'Go Back', onClick: onBack }
        ]
      });
    }
  };

  const startScreenRecording = async () => {
    try {
      console.log('🎬 Starting screen recording...');
      
      // Request screen share with system audio
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { 
          width: { ideal: 1920, max: 1920 },
          height: { ideal: 1080, max: 1080 },
          frameRate: { ideal: 30, max: 30 },
          cursor: 'always'
        },
        audio: true // Try to capture system audio
      });

      console.log('✅ Screen stream acquired');
      
      // Also get microphone audio
      let micStream = null;
      try {
        micStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 44100
          },
          video: false
        });
        audioStreamRef.current = micStream;
        setHasAudio(true);
        console.log('✅ Microphone stream acquired');
      } catch (micErr) {
        console.warn('Microphone not available:', micErr);
        setHasAudio(false);
      }

      // Combine all tracks
      const tracks = [...displayStream.getVideoTracks()];
      
      // Add system audio if available
      if (displayStream.getAudioTracks().length > 0) {
        tracks.push(...displayStream.getAudioTracks());
        console.log('✅ System audio captured');
      }
      
      // Add microphone audio
      if (micStream) {
        tracks.push(...micStream.getAudioTracks());
      }

      const combinedStream = new MediaStream(tracks);
      streamRef.current = combinedStream;

      // Show screen preview
      if (screenPreviewRef.current) {
        screenPreviewRef.current.srcObject = displayStream;
      }

      // Handle screen share ending
      displayStream.getVideoTracks()[0].onended = () => {
        console.log('⚠️ Screen sharing ended by user');
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          stopRecording();
        }
      };

      // Start the MediaRecorder
      startMediaRecorder(combinedStream);

    } catch (err) {
      console.error('Screen share error:', err);
      if (err.name === 'NotAllowedError') {
        setError({
          title: 'Screen Sharing Cancelled',
          message: 'You need to select a screen or window to share. Please try again.',
          actions: [
            { label: 'Try Again', onClick: () => { setError(null); } },
            { label: 'Go Back', onClick: onBack }
          ]
        });
      } else {
        setError({
          title: 'Screen Recording Failed',
          message: err.message || 'Unable to start screen recording.',
          actions: [
            { label: 'Try Again', onClick: () => { setError(null); } },
            { label: 'Go Back', onClick: onBack }
          ]
        });
      }
    }
  };

  const startVideoRecording = () => {
    if (!streamRef.current) {
      setError({
        title: 'Camera Not Ready',
        message: 'Please wait for camera to initialize.',
        actions: [
          { label: 'Try Again', onClick: () => { setError(null); startCamera(); } }
        ]
      });
      return;
    }
    startMediaRecorder(streamRef.current);
  };

  const startMediaRecorder = (stream) => {
    try {
      chunksRef.current = [];
      
      // Find best supported codec
      const mimeTypes = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm',
        'video/mp4'
      ];
      
      let selectedMimeType = 'video/webm';
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType;
          break;
        }
      }
      
      console.log('📹 Using codec:', selectedMimeType);
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: selectedMimeType,
        videoBitsPerSecond: 8000000, // 8 Mbps
        audioBitsPerSecond: 128000   // 128 kbps
      });
      
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
          console.log(`📦 Chunk received: ${(e.data.size / 1024).toFixed(1)} KB`);
        }
      };

      mediaRecorder.onstop = () => {
        console.log('🛑 MediaRecorder stopped');
        handleRecordingComplete();
      };

      mediaRecorder.onerror = (e) => {
        console.error('MediaRecorder error:', e);
        setError({
          title: 'Recording Error',
          message: 'An error occurred during recording.',
          actions: [
            { label: 'Try Again', onClick: () => { setError(null); setRecordingState('ready'); } }
          ]
        });
      };

      // Start recording with 1 second intervals for smoother progress
      mediaRecorder.start(1000);
      setRecordingState('recording');
      setElapsedTime(0);

      // Start timer
      timerIntervalRef.current = setInterval(() => {
        setElapsedTime(prev => {
          const newTime = prev + 1;
          if (newTime >= MAX_TIME) {
            console.log('⏱️ Max time reached, stopping...');
            stopRecording();
            return MAX_TIME;
          }
          return newTime;
        });
      }, 1000);

      console.log('🎬 Recording started!');

    } catch (err) {
      console.error('MediaRecorder start error:', err);
      setError({
        title: 'Recording Failed',
        message: 'Unable to start recording. Please try again.',
        actions: [
          { label: 'Try Again', onClick: () => { setError(null); setRecordingState('ready'); } },
          { label: 'Go Back', onClick: onBack }
        ]
      });
    }
  };

  const startRecording = () => {
    if (recordingType === 'screen') {
      startScreenRecording();
    } else {
      startVideoRecording();
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setRecordingState('paused');
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      console.log('⏸️ Recording paused');
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setRecordingState('recording');
      
      timerIntervalRef.current = setInterval(() => {
        setElapsedTime(prev => {
          const newTime = prev + 1;
          if (newTime >= MAX_TIME) {
            stopRecording();
            return MAX_TIME;
          }
          return newTime;
        });
      }, 1000);
      console.log('▶️ Recording resumed');
    }
  };

  const stopRecording = useCallback(() => {
    console.log('🛑 Stopping recording...');
    
    // Clear timer first
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    // Stop MediaRecorder
    if (mediaRecorderRef.current) {
      const state = mediaRecorderRef.current.state;
      console.log('MediaRecorder state:', state);
      
      if (state === 'recording' || state === 'paused') {
        setRecordingState('processing');
        mediaRecorderRef.current.stop();
      }
    }

    // Stop all streams
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
    }
  }, []);

  const handleRecordingComplete = () => {
    console.log('✅ Processing recording...');
    console.log(`Total chunks: ${chunksRef.current.length}`);
    
    if (chunksRef.current.length === 0) {
      setError({
        title: 'Recording Empty',
        message: 'No video data was captured. Please try again.',
        actions: [
          { label: 'Try Again', onClick: () => { setError(null); setRecordingState('ready'); setElapsedTime(0); } }
        ]
      });
      return;
    }

    const blob = new Blob(chunksRef.current, { type: 'video/webm' });
    console.log(`Final video size: ${(blob.size / (1024 * 1024)).toFixed(2)} MB`);
    
    if (blob.size < 1000) { // Less than 1KB
      setError({
        title: 'Recording Too Small',
        message: 'The recording appears to be empty. Please try again.',
        actions: [
          { label: 'Try Again', onClick: () => { setError(null); setRecordingState('ready'); setElapsedTime(0); } }
        ]
      });
      return;
    }

    onComplete(blob);
  };

  const handleCancel = () => {
    if (recordingState === 'recording' || recordingState === 'paused') {
      if (window.confirm('Stop recording and discard? Your progress will be lost.')) {
        cleanup();
        onBack();
      }
    } else {
      cleanup();
      onBack();
    }
  };

  const toggleMute = () => {
    if (audioStreamRef.current) {
      audioStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = isMuted;
      });
    }
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach(track => {
        track.enabled = isMuted;
      });
    }
    setIsMuted(!isMuted);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeRemaining = () => MAX_TIME - elapsedTime;

  return (
    <div className="fixed inset-0 bg-[#000000] z-50 flex flex-col">
      {/* Progress Bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-[#18181B] z-20">
        <div 
          className="h-full bg-[#6366F1] transition-all duration-300" 
          style={{ width: `${(elapsedTime / MAX_TIME) * 100}%` }} 
        />
      </div>

      {/* Recording Border Indicator */}
      {recordingState === 'recording' && (
        <div className="absolute inset-0 border-4 border-[#EF4444] z-10 pointer-events-none animate-pulse" />
      )}
      {recordingState === 'paused' && (
        <div className="absolute inset-0 border-4 border-[#FBBF24] z-10 pointer-events-none" />
      )}

      {/* Main Content Area */}
      <div className="flex-1 relative">
        {recordingType === 'video' ? (
          // Camera recording - full screen preview
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          // Screen recording
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#18181B] to-[#09090B]">
            {recordingState === 'ready' ? (
              // Ready state - prompt to start
              <div className="text-center px-6">
                <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-[#6366F1]/20 flex items-center justify-center">
                  <Monitor className="w-12 h-12 text-[#6366F1]" />
                </div>
                <h2 className="text-white text-2xl font-bold mb-3">Record Your Screen</h2>
                <p className="text-[#A1A1AA] text-base mb-2">
                  Show your product in action
                </p>
                <p className="text-[#71717A] text-sm mb-8">
                  You'll be asked to select which screen or window to share
                </p>
                <div className="flex flex-col gap-3 max-w-xs mx-auto">
                  <div className="flex items-center gap-3 text-left p-3 bg-[#27272A] rounded-xl">
                    <div className="w-8 h-8 rounded-full bg-[#22C55E]/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-[#22C55E] text-sm">✓</span>
                    </div>
                    <span className="text-[#D4D4D8] text-sm">Audio will be captured from your mic</span>
                  </div>
                  <div className="flex items-center gap-3 text-left p-3 bg-[#27272A] rounded-xl">
                    <div className="w-8 h-8 rounded-full bg-[#22C55E]/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-[#22C55E] text-sm">✓</span>
                    </div>
                    <span className="text-[#D4D4D8] text-sm">Maximum 2 minutes recording time</span>
                  </div>
                </div>
              </div>
            ) : (
              // Recording/paused state - show screen preview
              <div className="w-full h-full p-4">
                <video
                  ref={screenPreviewRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-contain rounded-lg"
                />
              </div>
            )}
          </div>
        )}

        {/* Timer Overlay - Top Center */}
        {recordingState !== 'ready' && recordingState !== 'processing' && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20">
            <div className="flex flex-col items-center gap-2">
              {/* Large Timer */}
              <div className="px-6 py-3 bg-black/80 backdrop-blur-md rounded-2xl border border-white/10">
                <div className="flex items-center gap-4">
                  {/* Recording indicator */}
                  <div className="flex items-center gap-2">
                    {recordingState === 'recording' ? (
                      <div className="w-3 h-3 rounded-full bg-[#EF4444] animate-pulse" />
                    ) : (
                      <div className="w-3 h-3 rounded-full bg-[#FBBF24]" />
                    )}
                    <span className="text-white text-sm font-medium">
                      {recordingState === 'recording' ? 'REC' : 'PAUSED'}
                    </span>
                  </div>
                  
                  {/* Time display */}
                  <div className="text-white text-3xl font-bold font-mono">
                    {formatTime(elapsedTime)}
                  </div>
                  
                  {/* Time remaining */}
                  <div className="text-[#71717A] text-sm">
                    / {formatTime(MAX_TIME)}
                  </div>
                </div>
              </div>

              {/* Time remaining warning */}
              {getTimeRemaining() <= 30 && getTimeRemaining() > 0 && (
                <div className="px-3 py-1 bg-[#EF4444]/20 border border-[#EF4444]/40 rounded-full">
                  <span className="text-[#EF4444] text-xs font-medium">
                    {getTimeRemaining()}s remaining
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Processing Overlay */}
        {recordingState === 'processing' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-30">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-[#6366F1]/20 border-t-[#6366F1] rounded-full animate-spin mx-auto mb-4" />
              <p className="text-white text-lg font-medium">Processing video...</p>
              <p className="text-[#71717A] text-sm mt-2">This may take a moment</p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="flex-shrink-0 pb-8 pt-4 px-6 bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex items-center justify-center gap-6">
          {/* Mute Button - Only show when recording */}
          {(recordingState === 'recording' || recordingState === 'paused') && hasAudio && (
            <button
              onClick={toggleMute}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition active:scale-95 ${
                isMuted 
                  ? 'bg-[#EF4444]/20 border-2 border-[#EF4444]' 
                  : 'bg-white/10 border-2 border-white/20'
              }`}
            >
              {isMuted ? (
                <MicOff className="w-6 h-6 text-[#EF4444]" />
              ) : (
                <Mic className="w-6 h-6 text-white" />
              )}
            </button>
          )}

          {/* Pause/Resume Button */}
          {(recordingState === 'recording' || recordingState === 'paused') && (
            <button
              onClick={recordingState === 'recording' ? pauseRecording : resumeRecording}
              className="w-14 h-14 rounded-full bg-white/10 border-2 border-white/20 flex items-center justify-center hover:bg-white/20 transition active:scale-95"
            >
              {recordingState === 'recording' ? (
                <Pause className="w-6 h-6 text-white" />
              ) : (
                <Play className="w-6 h-6 text-white ml-1" />
              )}
            </button>
          )}

          {/* Main Record/Stop Button */}
          <button
            onClick={recordingState === 'ready' ? startRecording : stopRecording}
            disabled={recordingState === 'processing'}
            className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-all disabled:opacity-50 ${
              recordingState === 'ready'
                ? 'bg-[#EF4444] shadow-[#EF4444]/30'
                : 'bg-[#EF4444] shadow-[#EF4444]/30'
            }`}
          >
            {recordingState === 'ready' ? (
              <div className="w-8 h-8 rounded-full bg-white" />
            ) : (
              <Square className="w-8 h-8 text-white" fill="white" />
            )}
          </button>

          {/* Cancel/Back Button */}
          <button
            onClick={handleCancel}
            disabled={recordingState === 'processing'}
            className="w-14 h-14 rounded-full bg-white/10 border-2 border-white/20 flex items-center justify-center hover:bg-white/20 transition active:scale-95 disabled:opacity-50"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Recording Tips */}
        {recordingState === 'ready' && (
          <p className="text-center text-[#71717A] text-sm mt-4">
            Tap the red button to start recording
          </p>
        )}
        {(recordingState === 'recording' || recordingState === 'paused') && (
          <p className="text-center text-[#71717A] text-sm mt-4">
            Tap the square to finish recording
          </p>
        )}
      </div>

      {/* Error Modal */}
      {error && (
        <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-50 p-6">
          <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-2">{error.title}</h3>
            <p className="text-[#A1A1AA] text-sm mb-6">{error.message}</p>
            <div className="flex gap-3">
              {error.actions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={action.onClick}
                  className={`flex-1 py-3 rounded-xl font-semibold transition ${
                    idx === 0
                      ? 'bg-[#6366F1] text-white hover:brightness-110'
                      : 'bg-[#27272A] text-white hover:bg-[#3F3F46]'
                  }`}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

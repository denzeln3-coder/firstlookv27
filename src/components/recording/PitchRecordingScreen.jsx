import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, SwitchCamera, Mic, MicOff } from 'lucide-react';
import RealtimeAIFeedback from './RealtimeAIFeedback';

export default function PitchRecordingScreen({ onComplete, onBack }) {
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerIntervalRef = useRef(null);

  const [recordingState, setRecordingState] = useState('ready'); // ready, countdown, recording, processing
  const [timeLeft, setTimeLeft] = useState(15);
  const [countdownNumber, setCountdownNumber] = useState(3);
  const [error, setError] = useState(null);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [facingMode, setFacingMode] = useState('user'); // 'user' = front, 'environment' = back
  const [isMuted, setIsMuted] = useState(false);

  const MAX_TIME = 15;

  useEffect(() => {
    checkPermissionsAndStartCamera();
    
    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    // Restart camera when facing mode changes
    if (permissionsGranted) {
      restartCamera();
    }
  }, [facingMode]);

  const cleanup = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  const getVideoConstraints = () => ({
    facingMode: facingMode,
    width: { ideal: 1080, min: 720 },
    height: { ideal: 1920, min: 1280 },
    aspectRatio: { ideal: 9/16 },
    frameRate: { ideal: 30, min: 24 }
  });

  const getAudioConstraints = () => ({
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: { ideal: 48000 },
    channelCount: { ideal: 1 }
  });

  const checkPermissionsAndStartCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: getVideoConstraints(),
        audio: getAudioConstraints()
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setPermissionsGranted(true);
    } catch (err) {
      console.error('Camera access error:', err);
      // Try with basic constraints if ideal ones fail
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facingMode },
          audio: true
        });
        streamRef.current = fallbackStream;
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
        }
        setPermissionsGranted(true);
      } catch (fallbackErr) {
        setError({
          title: 'Unable to access camera',
          message: 'Please grant camera and microphone permissions to record your pitch.',
          actions: [
            { label: 'Try Again', onClick: () => { setError(null); checkPermissionsAndStartCamera(); } },
            { label: 'Go Back', onClick: onBack }
          ]
        });
      }
    }
  };

  const restartCamera = async () => {
    // Stop current stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: getVideoConstraints(),
        audio: getAudioConstraints()
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Camera restart error:', err);
      // Try basic constraints
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facingMode },
          audio: true
        });
        streamRef.current = fallbackStream;
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
        }
      } catch (fallbackErr) {
        console.error('Fallback camera failed:', fallbackErr);
      }
    }
  };

  const flipCamera = () => {
    if (recordingState === 'recording') return; // Don't flip while recording
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const startCountdown = () => {
    if (!streamRef.current) {
      setError({
        title: 'Camera not ready',
        message: 'Please wait for the camera to start.',
        actions: [{ label: 'OK', onClick: () => setError(null) }]
      });
      return;
    }

    setRecordingState('countdown');
    setCountdownNumber(3);

    let count = 3;
    const countdownInterval = setInterval(() => {
      count--;
      if (count === 0) {
        clearInterval(countdownInterval);
        startRecording();
      } else {
        setCountdownNumber(count);
      }
    }, 1000);
  };

  const startRecording = () => {
    try {
      chunksRef.current = [];
      
      // Try different codec options for best quality
      let mimeType = 'video/webm;codecs=vp9,opus';
      let options = { 
        mimeType, 
        videoBitsPerSecond: 4000000, // 4 Mbps for better quality
        audioBitsPerSecond: 128000
      };
      
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm;codecs=vp8,opus';
        options = { mimeType, videoBitsPerSecond: 4000000, audioBitsPerSecond: 128000 };
      }
      
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
        options = { mimeType, videoBitsPerSecond: 4000000, audioBitsPerSecond: 128000 };
      }

      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/mp4';
        options = { mimeType };
      }
      
      const mediaRecorder = new MediaRecorder(streamRef.current, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        handleRecordingComplete();
      };

      mediaRecorder.start(100); // Collect data every 100ms
      setRecordingState('recording');
      setTimeLeft(MAX_TIME);

      timerIntervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            stopRecording();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      console.error('Recording start error:', err);
      setError({
        title: 'Recording failed',
        message: 'Unable to start recording. Please try again.',
        actions: [
          { label: 'Try Again', onClick: () => { setError(null); setRecordingState('ready'); } },
          { label: 'Go Back', onClick: onBack }
        ]
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    setRecordingState('processing');
  };

  const handleRecordingComplete = () => {
    const mimeType = mediaRecorderRef.current?.mimeType || 'video/webm';
    const blob = new Blob(chunksRef.current, { type: mimeType });
    
    if (blob.size === 0) {
      setError({
        title: 'Recording failed',
        message: 'The recording is empty. Please try again.',
        actions: [
          { label: 'Try Again', onClick: () => { setError(null); setRecordingState('ready'); setTimeLeft(MAX_TIME); } }
        ]
      });
      return;
    }

    onComplete(blob);
  };

  const handleCancel = () => {
    if (recordingState === 'recording') {
      if (window.confirm('Stop recording? Your progress will be lost.')) {
        stopRecording();
        cleanup();
        onBack();
      }
    } else if (recordingState === 'countdown') {
      setRecordingState('ready');
    } else {
      onBack();
    }
  };

  const getCurrentSection = () => {
    if (timeLeft > 10) return 'What is it?';
    if (timeLeft > 5) return 'The problem';
    return 'Why should they care?';
  };

  const getSectionProgress = () => {
    const elapsed = MAX_TIME - timeLeft;
    return (elapsed / MAX_TIME) * 100;
  };

  return (
    <div className="fixed inset-0 bg-[#000000] z-50">
      {/* Progress Bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-[#18181B] z-20">
        <div className="h-full bg-[#6366F1] transition-all" style={{ width: '37.5%' }} />
      </div>

      {/* Recording Border Animation */}
      {recordingState === 'recording' && (
        <div className="absolute inset-0 border-4 border-[#EF4444] z-10 pointer-events-none animate-pulse" />
      )}

      {/* Camera Preview */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
        style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
      />

      {/* Dark Vignette Overlay */}
      <div className="absolute inset-0 pointer-events-none z-5" 
        style={{ 
          background: 'radial-gradient(circle, transparent 50%, rgba(0,0,0,0.4) 100%)' 
        }} 
      />

      {/* Top Controls */}
      <div className="absolute top-12 left-4 right-4 flex items-center justify-between z-20">
        {/* Back Button */}
        <button
          onClick={handleCancel}
          className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Recording Indicator */}
        {recordingState === 'recording' && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#EF4444] rounded-full">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span className="text-white text-[12px] font-bold tracking-wider">REC</span>
          </div>
        )}

        {/* Step Indicator */}
        <div className="text-[12px] text-white/70 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-full">
          Step 3 of 8
        </div>
      </div>

      {/* Camera Flip & Mute Buttons */}
      {recordingState === 'ready' && (
        <div className="absolute top-28 right-4 flex flex-col gap-3 z-20">
          <button
            onClick={flipCamera}
            className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition"
          >
            <SwitchCamera className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Countdown Overlay */}
      {recordingState === 'countdown' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-30">
          <div className="text-[120px] font-bold text-white animate-bounce">
            {countdownNumber}
          </div>
        </div>
      )}

      {/* Timer & Section Display */}
      {recordingState !== 'processing' && recordingState !== 'countdown' && (
        <div className="absolute top-32 left-0 right-0 z-20">
          <div className="flex flex-col items-center gap-2">
            {/* Timer */}
            <div 
              className={`text-[72px] font-bold tabular-nums ${recordingState === 'recording' ? 'text-white' : 'text-white/90'}`}
              style={{ textShadow: '0 4px 20px rgba(0,0,0,0.8)' }}
            >
              0:{timeLeft.toString().padStart(2, '0')}
            </div>

            {/* Section Label */}
            {recordingState === 'recording' && (
              <>
                <div 
                  className="text-[18px] font-semibold text-white"
                  style={{ textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}
                >
                  {getCurrentSection()}
                </div>
                
                {/* Section Progress Bar */}
                <div className="w-64 h-1.5 bg-white/20 rounded-full overflow-hidden mt-1">
                  <div 
                    className="h-full bg-white transition-all duration-1000 ease-linear"
                    style={{ width: `${getSectionProgress()}%` }}
                  />
                </div>

                {/* Real-time AI Feedback */}
                <div className="mt-3">
                  <RealtimeAIFeedback 
                    timeLeft={timeLeft} 
                    recordingState={recordingState}
                    recordingType="pitch"
                  />
                </div>
              </>
            )}

            {recordingState === 'ready' && (
              <div 
                className="text-[14px] text-white/70"
                style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}
              >
                Tap the button to start
              </div>
            )}
          </div>
        </div>
      )}

      {/* Processing State */}
      {recordingState === 'processing' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-30">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white text-[18px] font-medium">Processing video...</p>
            <p className="text-white/60 text-[14px] mt-2">This may take a moment</p>
          </div>
        </div>
      )}

      {/* Bottom Controls */}
      {recordingState !== 'processing' && recordingState !== 'countdown' && (
        <div className="absolute bottom-16 left-0 right-0 flex flex-col items-center gap-6 z-20">
          {/* Professional Record Button */}
          <button
            onClick={recordingState === 'ready' ? startCountdown : stopRecording}
            disabled={!permissionsGranted}
            className="relative w-20 h-20 flex items-center justify-center disabled:opacity-50 transition-transform active:scale-95"
          >
            {/* Outer Ring */}
            <div className={`absolute inset-0 rounded-full border-4 ${
              recordingState === 'recording' 
                ? 'border-[#EF4444]' 
                : 'border-white/40'
            } transition-colors`} />
            
            {/* Inner Button */}
            <div className={`transition-all duration-200 ${
              recordingState === 'recording'
                ? 'w-7 h-7 rounded-md bg-[#EF4444]'
                : 'w-14 h-14 rounded-full bg-[#EF4444]'
            }`} />
          </button>

          {/* Cancel/Stop Text */}
          <button
            onClick={handleCancel}
            className="text-white/80 text-[14px] font-medium hover:text-white transition"
            style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}
          >
            {recordingState === 'recording' ? 'Tap to stop' : 'Cancel'}
          </button>
        </div>
      )}

      {/* Error Modal */}
      {error && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 p-6">
          <div className="bg-[#18181B] border border-[rgba(255,255,255,0.1)] rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-[20px] font-bold text-white mb-2">{error.title}</h3>
            <p className="text-[14px] text-[#A1A1AA] mb-6">{error.message}</p>
            <div className="flex gap-3">
              {error.actions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={action.onClick}
                  className={`flex-1 py-3 rounded-xl font-semibold transition ${
                    idx === 0
                      ? 'bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] text-white hover:brightness-110'
                      : 'bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] text-white hover:bg-[rgba(255,255,255,0.1)]'
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
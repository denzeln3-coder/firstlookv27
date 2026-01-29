import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowLeft, SwitchCamera, FileText, X, Edit3, Check } from 'lucide-react';

// Default teleprompter script template
const DEFAULT_SCRIPT = `Hey! I'm [Your Name], founder of [Startup Name].

We're solving [the problem] for [target audience].

Our solution [brief description of what you built].

What makes us different is [your unique advantage].

Try us out at [website] or reach out to learn more!`;

export default function PitchRecordingScreen({ onComplete, onBack, formData = {} }) {
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
  const [facingMode, setFacingMode] = useState('user');
  
  // Teleprompter state
  const [showTeleprompter, setShowTeleprompter] = useState(false);
  const [isEditingScript, setIsEditingScript] = useState(false);
  const [teleprompterScript, setTeleprompterScript] = useState('');
  const [teleprompterPosition, setTeleprompterPosition] = useState('bottom'); // top, middle, bottom

  const MAX_TIME = 15;

  // Initialize script with form data
  useEffect(() => {
    const personalizedScript = DEFAULT_SCRIPT
      .replace('[Your Name]', formData?.founder_name || '[Your Name]')
      .replace('[Startup Name]', formData?.startup_name || '[Startup Name]')
      .replace('[the problem]', formData?.problem || '[the problem]')
      .replace('[target audience]', formData?.target_audience || '[target audience]')
      .replace('[brief description of what you built]', formData?.solution || '[brief description]')
      .replace('[your unique advantage]', formData?.differentiator || '[your unique advantage]')
      .replace('[website]', formData?.product_url || '[website]');
    
    setTeleprompterScript(personalizedScript);
  }, [formData]);

  useEffect(() => {
    checkPermissionsAndStartCamera();
    return () => cleanup();
  }, []);

  useEffect(() => {
    if (permissionsGranted) restartCamera();
  }, [facingMode]);

  const cleanup = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  const getVideoConstraints = () => ({
    facingMode,
    width: { ideal: 1280 },
    height: { ideal: 720 },
    
    frameRate: { ideal: 30, min: 24 }
  });

  const getAudioConstraints = () => ({
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: { ideal: 44100 },
    channelCount: { ideal: 1 }
  });

  const checkPermissionsAndStartCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: getVideoConstraints(),
        audio: getAudioConstraints()
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setPermissionsGranted(true);
    } catch (err) {
      console.warn('High quality failed, trying fallback:', err);
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode },
          audio: true
        });
        streamRef.current = fallbackStream;
        if (videoRef.current) videoRef.current.srcObject = fallbackStream;
        setPermissionsGranted(true);
      } catch (fallbackErr) {
        setError({
          title: 'Camera Access Required',
          message: 'Please allow camera and microphone access to record your pitch.',
          actions: [
            { label: 'Try Again', onClick: () => { setError(null); checkPermissionsAndStartCamera(); } },
            { label: 'Go Back', onClick: onBack }
          ]
        });
      }
    }
  };

  const restartCamera = async () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: getVideoConstraints(),
        audio: getAudioConstraints()
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      console.warn('Restart camera failed, trying fallback');
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode },
          audio: true
        });
        streamRef.current = fallbackStream;
        if (videoRef.current) videoRef.current.srcObject = fallbackStream;
      } catch (fallbackErr) {
        console.error('Fallback camera failed:', fallbackErr);
      }
    }
  };

  const flipCamera = () => {
    if (recordingState === 'recording') return;
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const startCountdown = () => {
    if (!streamRef.current) {
      setError({
        title: 'Camera Not Ready',
        message: 'Please wait for the camera to initialize.',
        actions: [{ label: 'OK', onClick: () => setError(null) }]
      });
      return;
    }

    // Close edit mode if open
    setIsEditingScript(false);
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
      
      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType: selectedMimeType,
        videoBitsPerSecond: 8000000,
        audioBitsPerSecond: 128000
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => handleRecordingComplete();

      mediaRecorder.start(100); // Capture every 100ms
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
        title: 'Recording Failed',
        message: 'Unable to start recording. Please try again.',
        actions: [
          { label: 'Try Again', onClick: () => { setError(null); setRecordingState('ready'); } },
          { label: 'Go Back', onClick: onBack }
        ]
      });
    }
  };

  const stopRecording = useCallback(() => {
    console.log('🛑 Stopping recording...');
    
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      setRecordingState('processing');
      mediaRecorderRef.current.stop();
    }
  }, []);

  const handleRecordingComplete = () => {
    const mimeType = mediaRecorderRef.current?.mimeType || 'video/webm';
    const blob = new Blob(chunksRef.current, { type: mimeType });
    
    console.log(`✅ Recording complete: ${(blob.size / (1024 * 1024)).toFixed(2)} MB`);
    
    if (blob.size < 1000) {
      setError({
        title: 'Recording Empty',
        message: 'The recording appears to be empty. Please try again.',
        actions: [{ 
          label: 'Try Again', 
          onClick: () => { setError(null); setRecordingState('ready'); setTimeLeft(MAX_TIME); } 
        }]
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
      cleanup();
      onBack();
    }
  };

  const getCurrentSection = () => {
    if (timeLeft > 10) return '🎯 Hook - Grab attention!';
    if (timeLeft > 5) return '💡 Problem & Solution';
    return '🚀 Call to Action';
  };

  const getSectionProgress = () => ((MAX_TIME - timeLeft) / MAX_TIME) * 100;

  // Calculate which line of teleprompter to highlight based on time
  const getHighlightedLineIndex = () => {
    const lines = teleprompterScript.split('\n').filter(line => line.trim());
    const progress = (MAX_TIME - timeLeft) / MAX_TIME;
    return Math.min(Math.floor(progress * lines.length), lines.length - 1);
  };

  return (
    <div className="fixed inset-0 bg-[#000000] z-50">
      {/* Progress Bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-[#18181B] z-20">
        <div 
          className="h-full bg-[#6366F1] transition-all duration-300" 
          style={{ width: `${getSectionProgress()}%` }} 
        />
      </div>

      {/* Recording Border */}
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

      {/* Vignette overlay */}
      <div 
        className="absolute inset-0 pointer-events-none z-5" 
        style={{ background: 'radial-gradient(circle, transparent 40%, rgba(0,0,0,0.5) 100%)' }} 
      />

      {/* Top Controls */}
      <div className="absolute top-12 left-4 right-4 flex items-center justify-between z-20">
        <button 
          onClick={handleCancel} 
          className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {recordingState === 'recording' && (
          <div className="flex items-center gap-2 px-4 py-2 bg-[#EF4444] rounded-full">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span className="text-white text-sm font-bold">REC</span>
          </div>
        )}

        <div className="text-xs text-white/70 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full">
          15 sec pitch
        </div>
      </div>

      {/* Right Side Controls */}
      {recordingState === 'ready' && (
        <div className="absolute top-28 right-4 flex flex-col gap-3 z-20">
          <button 
            onClick={flipCamera} 
            className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition"
          >
            <SwitchCamera className="w-5 h-5" />
          </button>
          <button 
            onClick={() => {
              setShowTeleprompter(!showTeleprompter);
              if (!showTeleprompter) setIsEditingScript(false);
            }} 
            className={`w-12 h-12 rounded-full backdrop-blur-sm flex items-center justify-center transition ${
              showTeleprompter ? 'bg-[#6366F1] text-white' : 'bg-black/50 text-white hover:bg-black/70'
            }`}
          >
            <FileText className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Teleprompter - IMPROVED */}
      {showTeleprompter && recordingState !== 'countdown' && recordingState !== 'processing' && (
        <div 
          className={`absolute left-4 right-4 z-20 ${
            teleprompterPosition === 'top' ? 'top-28' :
            teleprompterPosition === 'middle' ? 'top-1/2 -translate-y-1/2' :
            'bottom-44'
          }`}
        >
          <div className="bg-black/70 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden">
            {/* Teleprompter Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#6366F1]" />
                <span className="text-white text-sm font-medium">Teleprompter</span>
              </div>
              <div className="flex items-center gap-2">
                {recordingState === 'ready' && (
                  <button
                    onClick={() => setIsEditingScript(!isEditingScript)}
                    className={`p-1.5 rounded-lg transition ${
                      isEditingScript ? 'bg-[#6366F1] text-white' : 'text-white/60 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {isEditingScript ? <Check className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                  </button>
                )}
                <button
                  onClick={() => setShowTeleprompter(false)}
                  className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {/* Teleprompter Content */}
            <div className="p-4 max-h-48 overflow-y-auto">
              {isEditingScript ? (
                <textarea
                  value={teleprompterScript}
                  onChange={(e) => setTeleprompterScript(e.target.value)}
                  placeholder="Write your script here..."
                  className="w-full h-40 bg-transparent text-white text-base leading-relaxed resize-none focus:outline-none placeholder:text-white/30"
                  autoFocus
                />
              ) : (
                <div className="space-y-2">
                  {teleprompterScript.split('\n').filter(line => line.trim()).map((line, idx) => {
                    const isHighlighted = recordingState === 'recording' && idx === getHighlightedLineIndex();
                    const isPast = recordingState === 'recording' && idx < getHighlightedLineIndex();
                    
                    return (
                      <p 
                        key={idx} 
                        className={`text-base leading-relaxed transition-all duration-300 ${
                          isHighlighted 
                            ? 'text-white text-lg font-medium' 
                            : isPast 
                              ? 'text-white/30' 
                              : 'text-white/70'
                        }`}
                      >
                        {line}
                      </p>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Position Controls - Only when not recording */}
            {recordingState === 'ready' && (
              <div className="flex items-center justify-center gap-2 px-4 py-2 border-t border-white/10">
                {['top', 'middle', 'bottom'].map((pos) => (
                  <button
                    key={pos}
                    onClick={() => setTeleprompterPosition(pos)}
                    className={`px-3 py-1 text-xs rounded-full transition ${
                      teleprompterPosition === pos 
                        ? 'bg-[#6366F1] text-white' 
                        : 'bg-white/10 text-white/60 hover:text-white'
                    }`}
                  >
                    {pos.charAt(0).toUpperCase() + pos.slice(1)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Countdown Overlay */}
      {recordingState === 'countdown' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-30">
          <div className="text-center">
            <div className="text-[120px] font-bold text-white animate-pulse">
              {countdownNumber}
            </div>
            <p className="text-white/60 text-lg mt-4">Get ready!</p>
          </div>
        </div>
      )}

      {/* Timer & Section Display - Only when teleprompter is hidden */}
      {recordingState !== 'processing' && recordingState !== 'countdown' && !showTeleprompter && (
        <div className="absolute top-32 left-0 right-0 z-20">
          <div className="flex flex-col items-center gap-3">
            {/* Large Timer */}
            <div 
              className={`text-7xl font-bold tabular-nums ${
                recordingState === 'recording' && timeLeft <= 5 ? 'text-[#EF4444]' : 'text-white'
              }`} 
              style={{ textShadow: '0 4px 20px rgba(0,0,0,0.8)' }}
            >
              0:{timeLeft.toString().padStart(2, '0')}
            </div>

            {recordingState === 'recording' && (
              <>
                {/* Section indicator */}
                <div 
                  className="text-lg font-medium text-white px-4 py-1 bg-black/40 rounded-full" 
                  style={{ textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}
                >
                  {getCurrentSection()}
                </div>
                
                {/* Progress bar */}
                <div className="w-48 h-1.5 bg-white/20 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-white transition-all duration-1000 ease-linear" 
                    style={{ width: `${getSectionProgress()}%` }} 
                  />
                </div>
              </>
            )}

            {recordingState === 'ready' && (
              <p className="text-white/60 text-sm" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                Tap the button to start
              </p>
            )}
          </div>
        </div>
      )}

      {/* Compact Timer when Teleprompter is visible */}
      {showTeleprompter && recordingState === 'recording' && (
        <div className="absolute top-28 left-4 z-20">
          <div 
            className={`text-5xl font-bold tabular-nums ${timeLeft <= 5 ? 'text-[#EF4444]' : 'text-white'}`} 
            style={{ textShadow: '0 4px 20px rgba(0,0,0,0.8)' }}
          >
            0:{timeLeft.toString().padStart(2, '0')}
          </div>
        </div>
      )}

      {/* Processing State */}
      {recordingState === 'processing' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-30">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-[#6366F1]/20 border-t-[#6366F1] rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white text-lg font-medium">Processing video...</p>
            <p className="text-white/50 text-sm mt-2">This may take a moment</p>
          </div>
        </div>
      )}

      {/* Bottom Controls */}
      {recordingState !== 'processing' && recordingState !== 'countdown' && (
        <div className="absolute bottom-12 left-0 right-0 flex flex-col items-center gap-4 z-20">
          {/* Teleprompter hint - Only in ready state */}
          {recordingState === 'ready' && !showTeleprompter && (
            <button 
              onClick={() => setShowTeleprompter(true)}
              className="flex items-center gap-2 px-4 py-2 bg-black/50 backdrop-blur-sm rounded-full text-white/70 text-sm hover:bg-black/70 hover:text-white transition"
            >
              <FileText className="w-4 h-4" />
              Use Teleprompter
            </button>
          )}

          {/* Record Button */}
          <button
            onClick={recordingState === 'ready' ? startCountdown : stopRecording}
            disabled={!permissionsGranted}
            className="relative w-20 h-20 flex items-center justify-center disabled:opacity-50 transition-transform active:scale-95"
          >
            {/* Outer ring */}
            <div className={`absolute inset-0 rounded-full border-4 transition-colors ${
              recordingState === 'recording' ? 'border-[#EF4444]' : 'border-white/50'
            }`} />
            {/* Inner button */}
            <div className={`transition-all duration-200 ${
              recordingState === 'recording' 
                ? 'w-7 h-7 rounded-md bg-[#EF4444]' 
                : 'w-14 h-14 rounded-full bg-[#EF4444]'
            }`} />
          </button>

          {/* Cancel/Stop hint */}
          <p 
            className="text-white/60 text-sm" 
            style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}
          >
            {recordingState === 'recording' ? 'Tap square to stop' : 'Cancel'}
          </p>
        </div>
      )}

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

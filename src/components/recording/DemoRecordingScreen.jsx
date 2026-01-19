import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Pause, Square, Play } from 'lucide-react';
import RealtimeAIFeedback from './RealtimeAIFeedback';

export default function DemoRecordingScreen({ recordingType = 'video', onComplete, onBack }) {
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerIntervalRef = useRef(null);

  const [recordingState, setRecordingState] = useState('ready');
  const [timeLeft, setTimeLeft] = useState(120);
  const [error, setError] = useState(null);

  const MAX_TIME = 120;

  useEffect(() => {
    // Check if user uploaded a video instead of recording
    const uploadedDemo = localStorage.getItem('uploadedDemoBlob');
    if (uploadedDemo) {
      // Convert data URL back to blob
      fetch(uploadedDemo)
        .then(res => res.blob())
        .then(blob => {
          localStorage.removeItem('uploadedDemoBlob');
          onComplete(blob);
        })
        .catch(() => {
          localStorage.removeItem('uploadedDemoBlob');
          startCamera();
        });
    } else {
      startCamera();
    }
    
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  const startCamera = async () => {
    try {
      if (recordingType === 'screen') {
        setRecordingState('ready');
      } else {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: 'environment', 
            width: { ideal: 1920 }, 
            height: { ideal: 1080 },
            frameRate: { ideal: 60 }
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
        
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setError({
        title: 'Unable to access camera',
        message: 'Please grant camera and microphone permissions.',
        actions: [
          { label: 'Try Again', onClick: () => { setError(null); startCamera(); } },
          { label: 'Go Back', onClick: onBack }
        ]
      });
    }
  };

  const startRecording = async () => {
    try {
      let stream;
      
      if (recordingType === 'screen') {
        try {
          const displayStream = await navigator.mediaDevices.getDisplayMedia({
            video: { 
              width: { ideal: 1920 },
              height: { ideal: 1080 },
              frameRate: { ideal: 60 }
            },
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              sampleRate: 44100
            }
          });
          
          const audioStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            },
            video: false
          });
          
          stream = new MediaStream([
            ...displayStream.getVideoTracks(),
            ...audioStream.getAudioTracks()
          ]);
          
          displayStream.getVideoTracks()[0].onended = () => {
            if (recordingState === 'recording' || recordingState === 'paused') {
              setError({
                title: 'Screen sharing ended',
                message: 'Would you like to keep what you recorded or start over?',
                actions: [
                  { label: 'Keep & Continue', onClick: () => { stopRecording(); setError(null); } },
                  { label: 'Re-record', onClick: () => { setError(null); setRecordingState('ready'); setTimeLeft(MAX_TIME); } }
                ]
              });
            }
          };
        } catch (err) {
          console.error('Screen share error:', err);
          setError({
            title: 'Screen sharing cancelled',
            message: 'Please try again and select a screen or window to share. Or use camera instead.',
            actions: [
              { label: 'Try Again', onClick: () => { setError(null); startRecording(); } },
              { label: 'Go Back', onClick: onBack }
            ]
          });
          return;
        }
      } else {
        stream = streamRef.current;
      }

      if (!stream) {
        throw new Error('No media stream available');
      }

      streamRef.current = stream;
      if (videoRef.current && recordingType === 'screen') {
        videoRef.current.srcObject = stream;
      }

      chunksRef.current = [];
      
      let mimeType = 'video/webm;codecs=vp9';
      let options = { 
        mimeType, 
        videoBitsPerSecond: 10000000,
        audioBitsPerSecond: 192000
      };
      
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm;codecs=vp8';
        options = { 
          mimeType, 
          videoBitsPerSecond: 10000000,
          audioBitsPerSecond: 192000
        };
      }
      
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
        options = { 
          mimeType,
          videoBitsPerSecond: 10000000,
          audioBitsPerSecond: 192000
        };
      }
      
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        handleRecordingComplete();
      };

      mediaRecorder.start();
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
          { label: 'Try Again', onClick: () => { setError(null); startRecording(); } },
          { label: 'Go Back', onClick: onBack }
        ]
      });
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setRecordingState('paused');
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setRecordingState('recording');
      
      timerIntervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            stopRecording();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
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

  const handleRecordingComplete = async () => {
    const blob = new Blob(chunksRef.current, { type: 'video/webm' });
    
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

    // No minimum duration requirement - just proceed
    onComplete(blob);
  };

  const getVideoDuration = (blob) => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src);
        resolve(video.duration);
      };
      
      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        reject(new Error('Failed to load video metadata'));
      };
      
      video.src = URL.createObjectURL(blob);
    });
  };

  const handleCancel = () => {
    if (recordingState === 'recording' || recordingState === 'paused') {
      if (window.confirm('Stop recording? Your progress will be lost.')) {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
        cleanup();
        onBack();
      }
    } else {
      onBack();
    }
  };

  const getCurrentSection = () => {
    const elapsed = MAX_TIME - timeLeft;
    if (elapsed < 15) return 'Intro';
    if (elapsed < 45) return 'The Problem';
    if (elapsed < 90) return 'The Solution';
    if (elapsed < 110) return 'Differentiator';
    return 'Call to Action';
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-[#000000] z-50">
      {/* Progress Bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-[#18181B] z-20">
        <div className="h-full bg-[#6366F1]" style={{ width: '75%' }} />
      </div>

      {/* Recording Border */}
      {recordingState === 'recording' && (
        <div className="absolute inset-0 border-4 border-[#EF4444] z-10 pointer-events-none" />
      )}

      {/* Camera/Screen Preview */}
      {recordingType === 'video' ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-[#18181B]">
          {recordingState === 'ready' ? (
            <div className="text-center">
              <div className="text-[48px] mb-4">🖥️</div>
              <p className="text-white text-[18px] mb-2">Ready to record your screen</p>
              <p className="text-[#A1A1AA] text-[14px]">Click Start to begin</p>
            </div>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute bottom-4 right-4 w-32 h-32 rounded-lg border-2 border-[rgba(255,255,255,0.2)] object-cover"
            />
          )}
        </div>
      )}

      {/* Top Overlay */}
      {recordingState !== 'processing' && (
        <div className="absolute top-8 left-0 right-0 z-20">
          <div className="flex flex-col items-center gap-2">
            {recordingState === 'ready' ? (
              <div className="text-[18px] text-white/70" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                Tap the button to start
              </div>
            ) : (
              <div className="text-[64px] font-bold tabular-nums text-white" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
                {formatTime(MAX_TIME - timeLeft)} / {formatTime(MAX_TIME)}
              </div>
            )}
            {(recordingState === 'recording' || recordingState === 'paused') && (
              <>
                <div className="text-[16px] font-medium text-white" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                  {getCurrentSection()}
                </div>
                {recordingState === 'paused' ? (
                  <div className="px-4 py-2 bg-[#FBBF24] text-black rounded-full text-[14px] font-semibold">
                    PAUSED
                  </div>
                ) : (
                  <RealtimeAIFeedback 
                    timeLeft={timeLeft} 
                    recordingState={recordingState}
                    recordingType="demo"
                  />
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Processing State */}
      {recordingState === 'processing' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-30">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white mx-auto mb-4" />
            <p className="text-white text-[18px]">Processing video...</p>
          </div>
        </div>
      )}

      {/* Bottom Controls */}
      {recordingState !== 'processing' && (
        <div className="absolute bottom-12 left-0 right-0 flex items-center justify-center gap-6 z-20">
          {/* Pause/Resume Button */}
          {(recordingState === 'recording' || recordingState === 'paused') && (
            <button
              onClick={recordingState === 'recording' ? pauseRecording : resumeRecording}
              className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition active:scale-95"
            >
              {recordingState === 'recording' ? (
                <Pause className="w-6 h-6 text-white" fill="white" />
              ) : (
                <Play className="w-6 h-6 text-white" fill="white" />
              )}
            </button>
          )}

          {/* Record/Stop Button */}
          <button
            onClick={recordingState === 'ready' ? startRecording : stopRecording}
            className="w-20 h-20 rounded-full bg-[#EF4444] flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.5)] active:scale-95 transition-transform"
          >
            {recordingState === 'ready' ? (
              <div className="w-16 h-16 rounded-full border-4 border-white" />
            ) : (
              <Square className="w-8 h-8 text-white" fill="white" />
            )}
          </button>

          {/* Cancel Button */}
          <button
            onClick={handleCancel}
            className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition active:scale-95"
          >
            <span className="text-white text-[24px]">×</span>
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
                      ? 'bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] text-white'
                      : 'bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] text-white'
                  }`}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step Indicator & Duration Info */}
      <div className="absolute top-8 right-6 flex flex-col items-end gap-2 z-20">
        <div className="text-[12px] text-[#71717A]" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
          Step 6 of 8
        </div>
        <div className="px-3 py-1 bg-black/60 backdrop-blur-sm rounded-full text-[11px] text-white/90 font-medium">
          Max 2 min | Best under 1:30
        </div>
      </div>
    </div>
  );
}
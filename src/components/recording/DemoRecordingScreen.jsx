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

  const [recordingState, setRecordingState] = useState('ready');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [error, setError] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [hasAudio, setHasAudio] = useState(true);

  const MAX_TIME = 120;

  useEffect(() => {
    return () => cleanup();
  }, []);

  useEffect(() => {
    if (recordingType === 'video') {
      startCamera();
    }
  }, [recordingType]);

  const cleanup = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch (e) {}
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } },
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, sampleRate: 44100 }
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setHasAudio(stream.getAudioTracks().length > 0);
    } catch (err) {
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
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 }, cursor: 'always' },
        audio: true
      });

      let micStream = null;
      try {
        micStream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          video: false
        });
        audioStreamRef.current = micStream;
        setHasAudio(true);
      } catch (micErr) {
        setHasAudio(false);
      }

      const tracks = [...displayStream.getVideoTracks()];
      if (displayStream.getAudioTracks().length > 0) tracks.push(...displayStream.getAudioTracks());
      if (micStream) tracks.push(...micStream.getAudioTracks());

      const combinedStream = new MediaStream(tracks);
      streamRef.current = combinedStream;

      if (screenPreviewRef.current) screenPreviewRef.current.srcObject = displayStream;

      displayStream.getVideoTracks()[0].onended = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') stopRecording();
      };

      startMediaRecorder(combinedStream);
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setError({
          title: 'Screen Sharing Cancelled',
          message: 'You need to select a screen or window to share. Please try again.',
          actions: [
            { label: 'Try Again', onClick: () => setError(null) },
            { label: 'Go Back', onClick: onBack }
          ]
        });
      } else {
        setError({
          title: 'Screen Recording Failed',
          message: err.message || 'Unable to start screen recording.',
          actions: [
            { label: 'Try Again', onClick: () => setError(null) },
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
        actions: [{ label: 'Try Again', onClick: () => { setError(null); startCamera(); } }]
      });
      return;
    }
    startMediaRecorder(streamRef.current);
  };

  const startMediaRecorder = (stream) => {
    try {
      chunksRef.current = [];
      const mimeTypes = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];
      let selectedMimeType = 'video/webm';
      for (const mt of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mt)) { selectedMimeType = mt; break; }
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: selectedMimeType,
        videoBitsPerSecond: 8000000,
        audioBitsPerSecond: 128000
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = () => handleRecordingComplete();
      mediaRecorder.onerror = () => {
        setError({
          title: 'Recording Error',
          message: 'An error occurred during recording.',
          actions: [{ label: 'Try Again', onClick: () => { setError(null); setRecordingState('ready'); } }]
        });
      };

      mediaRecorder.start(1000);
      setRecordingState('recording');
      setElapsedTime(0);

      timerIntervalRef.current = setInterval(() => {
        setElapsedTime(prev => {
          if (prev + 1 >= MAX_TIME) { stopRecording(); return MAX_TIME; }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
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
    if (recordingType === 'screen') startScreenRecording();
    else startVideoRecording();
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.pause();
      setRecordingState('paused');
      if (timerIntervalRef.current) { clearInterval(timerIntervalRef.current); timerIntervalRef.current = null; }
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current?.state === 'paused') {
      mediaRecorderRef.current.resume();
      setRecordingState('recording');
      timerIntervalRef.current = setInterval(() => {
        setElapsedTime(prev => {
          if (prev + 1 >= MAX_TIME) { stopRecording(); return MAX_TIME; }
          return prev + 1;
        });
      }, 1000);
    }
  };

  const stopRecording = useCallback(() => {
    if (timerIntervalRef.current) { clearInterval(timerIntervalRef.current); timerIntervalRef.current = null; }
    if (mediaRecorderRef.current) {
      const state = mediaRecorderRef.current.state;
      if (state === 'recording' || state === 'paused') {
        setRecordingState('processing');
        mediaRecorderRef.current.stop();
      }
    }
    if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
    if (audioStreamRef.current) audioStreamRef.current.getTracks().forEach(track => track.stop());
  }, []);

  const handleRecordingComplete = () => {
    if (chunksRef.current.length === 0) {
      setError({
        title: 'Recording Empty',
        message: 'No video data was captured. Please try again.',
        actions: [{ label: 'Try Again', onClick: () => { setError(null); setRecordingState('ready'); setElapsedTime(0); } }]
      });
      return;
    }
    const blob = new Blob(chunksRef.current, { type: 'video/webm' });
    if (blob.size < 1000) {
      setError({
        title: 'Recording Too Small',
        message: 'The recording appears to be empty. Please try again.',
        actions: [{ label: 'Try Again', onClick: () => { setError(null); setRecordingState('ready'); setElapsedTime(0); } }]
      });
      return;
    }
    onComplete(blob);
  };

  const handleCancel = () => {
    if (recordingState === 'recording' || recordingState === 'paused') {
      if (window.confirm('Stop recording and discard?')) { cleanup(); onBack(); }
    } else { cleanup(); onBack(); }
  };

  const toggleMute = () => {
    const newMuted = !isMuted;
    audioStreamRef.current?.getAudioTracks().forEach(t => t.enabled = !newMuted);
    streamRef.current?.getAudioTracks().forEach(t => t.enabled = !newMuted);
    setIsMuted(newMuted);
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  // Render error modal
  if (error) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50 p-6">
        <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-6 max-w-md w-full">
          <h3 className="text-xl font-bold text-white mb-2">{error.title}</h3>
          <p className="text-[#A1A1AA] text-sm mb-6">{error.message}</p>
          <div className="flex gap-3">
            {error.actions.map((action, idx) => (
              <button key={idx} onClick={action.onClick}
                className={`flex-1 py-3 rounded-xl font-semibold transition ${idx === 0 ? 'bg-[#6366F1] text-white' : 'bg-[#27272A] text-white'}`}>
                {action.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Render processing state
  if (recordingState === 'processing') {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#6366F1]/20 border-t-[#6366F1] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white text-lg font-medium">Processing video...</p>
          <p className="text-[#71717A] text-sm mt-2">This may take a moment</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Progress Bar */}
      <div className="h-1 bg-[#27272A]">
        <div className="h-full bg-[#6366F1] transition-all" style={{ width: `${(elapsedTime / MAX_TIME) * 100}%` }} />
      </div>

      {/* Recording border */}
      {recordingState === 'recording' && <div className="absolute inset-0 border-4 border-[#EF4444] pointer-events-none animate-pulse" />}
      {recordingState === 'paused' && <div className="absolute inset-0 border-4 border-[#FBBF24] pointer-events-none" />}

      {/* TIMER - Fixed height section */}
      <div className="flex-shrink-0 py-4 flex justify-center">
        <div className="px-5 py-2.5 bg-[#18181B] rounded-full border border-[#27272A]">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {recordingState === 'ready' && <div className="w-2.5 h-2.5 rounded-full bg-[#71717A]" />}
              {recordingState === 'recording' && <div className="w-2.5 h-2.5 rounded-full bg-[#EF4444] animate-pulse" />}
              {recordingState === 'paused' && <div className="w-2.5 h-2.5 rounded-full bg-[#FBBF24]" />}
              <span className="text-white text-xs font-medium uppercase">
                {recordingState === 'ready' ? 'Ready' : recordingState === 'recording' ? 'Rec' : 'Paused'}
              </span>
            </div>
            <span className="text-white text-xl font-mono font-bold">{formatTime(elapsedTime)}</span>
            <span className="text-[#71717A] text-xs">/ {formatTime(MAX_TIME)}</span>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT - Flexible */}
      <div className="flex-1 overflow-hidden">
        {recordingType === 'video' ? (
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        ) : recordingState === 'ready' ? (
          <div className="h-full flex items-center justify-center px-6">
            <div className="text-center max-w-sm">
              <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-[#6366F1]/20 flex items-center justify-center">
                <Monitor className="w-8 h-8 text-[#6366F1]" />
              </div>
              <h2 className="text-white text-xl font-bold mb-2">Record Your Screen</h2>
              <p className="text-[#A1A1AA] text-sm mb-5">
                Click the red button below. A popup will appear to select your screen or window.
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-2.5 bg-[#1C1C1E] rounded-lg text-left">
                  <Mic className="w-4 h-4 text-[#22C55E] flex-shrink-0" />
                  <span className="text-[#A1A1AA] text-xs">Audio captured from your mic</span>
                </div>
                <div className="flex items-center gap-3 p-2.5 bg-[#1C1C1E] rounded-lg text-left">
                  <span className="text-[#22C55E] text-xs font-bold flex-shrink-0">2:00</span>
                  <span className="text-[#A1A1AA] text-xs">Maximum recording time</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full p-4">
            <video ref={screenPreviewRef} autoPlay playsInline muted className="w-full h-full object-contain rounded-lg bg-[#0A0A0A]" />
          </div>
        )}
      </div>

      {/* BOTTOM CONTROLS - Fixed height */}
      <div className="flex-shrink-0 py-6 px-4 bg-gradient-to-t from-black to-transparent">
        <div className="flex items-center justify-center gap-4">
          {/* Mute */}
          {(recordingState === 'recording' || recordingState === 'paused') && hasAudio && (
            <button onClick={toggleMute}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition ${isMuted ? 'bg-[#EF4444]/20 border-2 border-[#EF4444]' : 'bg-white/10 border-2 border-white/20'}`}>
              {isMuted ? <MicOff className="w-5 h-5 text-[#EF4444]" /> : <Mic className="w-5 h-5 text-white" />}
            </button>
          )}

          {/* Pause/Play */}
          {(recordingState === 'recording' || recordingState === 'paused') && (
            <button onClick={recordingState === 'recording' ? pauseRecording : resumeRecording}
              className="w-12 h-12 rounded-full bg-white/10 border-2 border-white/20 flex items-center justify-center">
              {recordingState === 'recording' ? <Pause className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 text-white ml-0.5" />}
            </button>
          )}

          {/* Record/Stop */}
          <button onClick={recordingState === 'ready' ? startRecording : stopRecording}
            className="w-16 h-16 rounded-full bg-[#EF4444] flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.4)]">
            {recordingState === 'ready' ? <div className="w-6 h-6 rounded-full bg-white" /> : <Square className="w-6 h-6 text-white" fill="white" />}
          </button>

          {/* Back */}
          <button onClick={handleCancel}
            className="w-12 h-12 rounded-full bg-white/10 border-2 border-white/20 flex items-center justify-center">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
        </div>

        <p className="text-center text-[#71717A] text-xs mt-4">
          {recordingState === 'ready' && 'Tap the red button to start'}
          {recordingState === 'recording' && 'Recording... Tap square to stop'}
          {recordingState === 'paused' && 'Paused. Tap play or stop'}
        </p>
      </div>
    </div>
  );
}

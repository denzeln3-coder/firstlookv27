import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { ArrowLeft, Upload, Check, Image, ChevronLeft, ChevronRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSubscription } from '../components/useSubscription';
import UpgradeModal from '../components/UpgradeModal';
import { toast } from 'sonner';

export default function ThumbnailSelector() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const { user, isPro } = useSubscription();
  
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [videoFile, setVideoFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [thumbnails, setThumbnails] = useState([]);
  const [selectedThumbnail, setSelectedThumbnail] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedPitchId, setSelectedPitchId] = useState(null);

  const { data: userPitches = [] } = useQuery({
    queryKey: ['userPitches', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const pitches = await base44.entities.Pitch.filter({ founder_id: user.id });
      return pitches;
    },
    enabled: !!user?.id
  });

  useEffect(() => {
    if (!isPro) {
      setShowUpgrade(true);
    }
  }, [isPro]);

  const handleVideoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setVideoFile(file);
    setVideoUrl(URL.createObjectURL(file));
    setThumbnails([]);
    setSelectedThumbnail(null);
  };

  const handleVideoLoad = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      generateThumbnails();
    }
  };

  const generateThumbnails = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    setIsGenerating(true);
    const ctx = canvas.getContext('2d');
    const thumbs = [];
    const numThumbnails = 8;
    
    canvas.width = 320;
    canvas.height = 180;

    for (let i = 0; i < numThumbnails; i++) {
      const time = (video.duration / numThumbnails) * i;
      video.currentTime = time;
      
      await new Promise((resolve) => {
        video.onseeked = () => {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          thumbs.push({
            time: time,
            dataUrl: canvas.toDataURL('image/jpeg', 0.8)
          });
          resolve();
        };
      });
    }

    setThumbnails(thumbs);
    setIsGenerating(false);
    video.currentTime = 0;
  };

  const handleTimeChange = (e) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const captureCurrentFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setSelectedThumbnail({
      time: currentTime,
      dataUrl: dataUrl
    });
    toast.success('Frame captured!');
  };

  const handleSelectThumbnail = (thumb) => {
    setSelectedThumbnail(thumb);
    if (videoRef.current) {
      videoRef.current.currentTime = thumb.time;
      setCurrentTime(thumb.time);
    }
  };

  const handleSaveThumbnail = async () => {
    if (!selectedThumbnail || !selectedPitchId) {
      toast.error('Please select a thumbnail and a pitch');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(selectedThumbnail.dataUrl);
      const blob = await response.blob();
      const file = new File([blob], 'thumbnail.jpg', { type: 'image/jpeg' });
      
      const result = await base44.integrations.Core.UploadFile({ file });
      
      await base44.entities.Pitch.update(selectedPitchId, {
        thumbnail_url: result.file_url
      });

      queryClient.invalidateQueries({ queryKey: ['pitches'] });
      queryClient.invalidateQueries({ queryKey: ['userPitches'] });
      
      toast.success('Thumbnail saved to pitch!');
      navigate(createPageUrl('Profile'));
    } catch (error) {
      console.error('Save failed:', error);
      toast.error('Failed to save thumbnail');
    }
    setIsSaving(false);
  };

  const stepFrame = (direction) => {
    const video = videoRef.current;
    if (!video) return;
    
    const step = 1 / 30;
    const newTime = Math.max(0, Math.min(duration, currentTime + (direction * step)));
    setCurrentTime(newTime);
    video.currentTime = newTime;
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-[#000000] pb-20">
      <div className="sticky top-0 bg-[#000000]/95 backdrop-blur-lg z-20 border-b border-[rgba(255,255,255,0.06)]">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(createPageUrl('CreatorStudio'))}
              className="w-10 h-10 rounded-full bg-[rgba(255,255,255,0.06)] flex items-center justify-center text-[#8E8E93] hover:text-white transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-white text-xl font-bold">Thumbnail Selector</h1>
              <p className="text-[#8E8E93] text-sm">Pick the perfect frame</p>
            </div>
          </div>
          {selectedThumbnail && (
            <button
              onClick={handleSaveThumbnail}
              disabled={isSaving || !selectedPitchId}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white font-semibold rounded-xl hover:brightness-110 transition disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save Thumbnail'}
            </button>
          )}
        </div>
      </div>

      <div className="px-4 py-6 max-w-4xl mx-auto">
        {!videoUrl ? (
          <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-[#3F3F46] rounded-2xl cursor-pointer hover:border-[#6366F1] transition bg-[#18181B]">
            <input type="file" accept="video/*" onChange={handleVideoUpload} className="hidden" />
            <Upload className="w-12 h-12 text-[#71717A] mb-4" />
            <span className="text-[#71717A] text-lg">Upload a video to select thumbnail</span>
            <span className="text-[#52525B] text-sm mt-2">MP4, MOV, WebM supported</span>
          </label>
        ) : (
          <div className="space-y-6">
            <div className="relative rounded-2xl overflow-hidden bg-[#18181B]">
              <video
                ref={videoRef}
                src={videoUrl}
                onLoadedMetadata={handleVideoLoad}
                onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
                className="w-full aspect-video object-contain"
              />
              <canvas ref={canvasRef} className="hidden" />
            </div>

            <div className="bg-[#18181B] rounded-xl p-4">
              <div className="flex items-center gap-4 mb-4">
                <button
                  onClick={() => stepFrame(-1)}
                  className="w-10 h-10 rounded-lg bg-[#27272A] flex items-center justify-center text-white hover:bg-[#3F3F46] transition"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <input
                  type="range"
                  min="0"
                  max={duration}
                  step="0.01"
                  value={currentTime}
                  onChange={handleTimeChange}
                  className="flex-1 h-2 bg-[#27272A] rounded-full appearance-none cursor-pointer"
                />
                <button
                  onClick={() => stepFrame(1)}
                  className="w-10 h-10 rounded-lg bg-[#27272A] flex items-center justify-center text-white hover:bg-[#3F3F46] transition"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-[#8E8E93] text-sm font-mono">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
                <button
                  onClick={captureCurrentFrame}
                  className="flex items-center gap-2 px-4 py-2 bg-[#6366F1] text-white font-semibold rounded-lg hover:brightness-110 transition"
                >
                  <Image className="w-4 h-4" />
                  Capture Frame
                </button>
              </div>
            </div>

            {isGenerating ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-2 border-[#6366F1] border-t-transparent rounded-full animate-spin" />
                <span className="text-[#8E8E93] ml-3">Generating thumbnails...</span>
              </div>
            ) : thumbnails.length > 0 && (
              <div>
                <h3 className="text-white font-semibold mb-3">Quick Select</h3>
                <div className="grid grid-cols-4 gap-2">
                  {thumbnails.map((thumb, i) => (
                    <button
                      key={i}
                      onClick={() => handleSelectThumbnail(thumb)}
                      className={`relative rounded-lg overflow-hidden aspect-video transition ${
                        selectedThumbnail?.time === thumb.time
                          ? 'ring-2 ring-[#6366F1]'
                          : 'hover:ring-2 hover:ring-[#3F3F46]'
                      }`}
                    >
                      <img src={thumb.dataUrl} alt={`Frame ${i + 1}`} className="w-full h-full object-cover" />
                      {selectedThumbnail?.time === thumb.time && (
                        <div className="absolute inset-0 bg-[#6366F1]/20 flex items-center justify-center">
                          <Check className="w-6 h-6 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selectedThumbnail && (
              <div className="bg-[#18181B] rounded-xl p-4">
                <h3 className="text-white font-semibold mb-3">Selected Thumbnail</h3>
                <div className="flex gap-4">
                  <img
                    src={selectedThumbnail.dataUrl}
                    alt="Selected thumbnail"
                    className="w-48 aspect-video object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <p className="text-[#8E8E93] text-sm mb-4">
                      Frame at {formatTime(selectedThumbnail.time)}
                    </p>
                    
                    <label className="block text-[#8E8E93] text-sm font-medium mb-2">
                      Apply to Pitch
                    </label>
                    <select
                      value={selectedPitchId || ''}
                      onChange={(e) => setSelectedPitchId(e.target.value)}
                      className="w-full px-4 py-3 bg-[#27272A] border border-[#3F3F46] rounded-xl text-white focus:outline-none focus:border-[#6366F1]"
                    >
                      <option value="">Select a pitch...</option>
                      {userPitches.map((pitch) => (
                        <option key={pitch.id} value={pitch.id}>
                          {pitch.startup_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <UpgradeModal
        isOpen={showUpgrade}
        onClose={() => {
          setShowUpgrade(false);
          if (!isPro) {
            navigate(createPageUrl('CreatorStudio'));
          }
        }}
        feature="Thumbnail Selector"
      />
    </div>
  );
}
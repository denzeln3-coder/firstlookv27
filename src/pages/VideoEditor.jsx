import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Play, Pause, Save, Download, Loader2, Plus, Type, Volume2, Wand2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';
import Timeline from '../components/editor/Timeline';
import ClipTrack from '../components/editor/ClipTrack';
import TextOverlayPanel from '../components/editor/TextOverlayPanel';
import AudioPanel from '../components/editor/AudioPanel';
import CaptionsPanel from '../components/editor/CaptionsPanel';
import AIEnhancementPanel from '../components/editor/AIEnhancementPanel';
import ExportModal from '../components/editor/ExportModal';

export default function VideoEditor() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('projectId');
  const projectType = urlParams.get('type') || 'pitch';

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [activePanel, setActivePanel] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: project, isLoading } = useQuery({
    queryKey: ['editProject', projectId],
    queryFn: async () => {
      if (projectId) {
        return await base44.entities.EditProject.list().then(projects => 
          projects.find(p => p.id === projectId)
        );
      }
      // Create new project
      return {
        project_name: `New ${projectType} Edit`,
        project_type: projectType,
        status: 'draft',
        edit_instructions: {
          clips: [],
          background_music: null,
          text_overlays: [],
          captions: null
        }
      };
    },
    enabled: !!user
  });

  const saveProjectMutation = useMutation({
    mutationFn: async (updates) => {
      if (projectId) {
        return await base44.entities.EditProject.update(projectId, updates);
      } else {
        return await base44.entities.EditProject.create(updates);
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['editProject'] });
      if (!projectId) {
        window.history.replaceState({}, '', `${window.location.pathname}?projectId=${data.id}&type=${projectType}`);
      }
      toast.success('Project saved');
    }
  });

  const handleSave = () => {
    if (project) {
      saveProjectMutation.mutate({
        ...project,
        updated_date: new Date().toISOString()
      });
    }
  };

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleEnded = () => setIsPlaying(false);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
    };
  }, []);

  if (!user) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-white text-xl font-bold mb-4">Please log in</h2>
          <button
            onClick={() => base44.auth.redirectToLogin(createPageUrl('VideoEditor'))}
            className="px-6 py-3 bg-[#6366F1] text-white font-semibold rounded-xl hover:brightness-110 transition"
          >
            Log In
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#6366F1] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000000] flex flex-col">
      {/* Header */}
      <div className="bg-[#0A0A0A] border-b border-[#18181B] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(createPageUrl('RecordPitch'))}
            className="w-9 h-9 rounded-full bg-[rgba(255,255,255,0.06)] flex items-center justify-center text-[#8E8E93] hover:text-white transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-white text-sm font-semibold">{project?.project_name}</h1>
            <p className="text-[#636366] text-xs capitalize">{projectType} Editor</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={saveProjectMutation.isPending}
            className="px-4 py-2 bg-[rgba(255,255,255,0.06)] text-white text-sm font-medium rounded-lg hover:bg-[rgba(255,255,255,0.1)] transition flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saveProjectMutation.isPending ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={() => setShowExportModal(true)}
            className="px-4 py-2 bg-[#6366F1] text-white text-sm font-semibold rounded-lg hover:brightness-110 transition flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Preview Area */}
        <div className="flex-1 flex flex-col items-center justify-center bg-[#000000] p-4">
          <div className="relative w-full max-w-md aspect-[9/16] bg-[#18181B] rounded-xl overflow-hidden">
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full"
            />
            <video
              ref={videoRef}
              className="w-full h-full object-contain"
              playsInline
            />
            
            {/* Play/Pause Overlay */}
            <button
              onClick={handlePlayPause}
              className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/50 transition opacity-0 hover:opacity-100"
            >
              {isPlaying ? (
                <Pause className="w-16 h-16 text-white" />
              ) : (
                <Play className="w-16 h-16 text-white" />
              )}
            </button>
          </div>

          {/* Playback Controls */}
          <div className="mt-4 flex items-center gap-4">
            <button
              onClick={handlePlayPause}
              className="w-12 h-12 rounded-full bg-[#6366F1] flex items-center justify-center hover:brightness-110 transition"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 text-white" />
              ) : (
                <Play className="w-5 h-5 text-white ml-0.5" />
              )}
            </button>
            <span className="text-[#8E8E93] text-sm font-mono">
              {Math.floor(currentTime)}s / {Math.floor(project?.current_duration_seconds || 0)}s
            </span>
          </div>
        </div>

        {/* Tools Panel */}
        <div className="w-80 bg-[#0A0A0A] border-l border-[#18181B] flex flex-col">
          <div className="flex border-b border-[#18181B]">
            <button
              onClick={() => setActivePanel('clips')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition ${
                activePanel === 'clips' ? 'text-[#6366F1] border-b-2 border-[#6366F1]' : 'text-[#8E8E93] hover:text-white'
              }`}
            >
              <Plus className="w-4 h-4 mx-auto mb-1" />
              Clips
            </button>
            <button
              onClick={() => setActivePanel('text')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition ${
                activePanel === 'text' ? 'text-[#6366F1] border-b-2 border-[#6366F1]' : 'text-[#8E8E93] hover:text-white'
              }`}
            >
              <Type className="w-4 h-4 mx-auto mb-1" />
              Text
            </button>
            <button
              onClick={() => setActivePanel('audio')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition ${
                activePanel === 'audio' ? 'text-[#6366F1] border-b-2 border-[#6366F1]' : 'text-[#8E8E93] hover:text-white'
              }`}
            >
              <Volume2 className="w-4 h-4 mx-auto mb-1" />
              Audio
            </button>
            <button
              onClick={() => setActivePanel('captions')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition ${
                activePanel === 'captions' ? 'text-[#6366F1] border-b-2 border-[#6366F1]' : 'text-[#8E8E93] hover:text-white'
              }`}
            >
              <Wand2 className="w-4 h-4 mx-auto mb-1" />
              Captions
            </button>
            <button
              onClick={() => setActivePanel('ai')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition ${
                activePanel === 'ai' ? 'text-[#6366F1] border-b-2 border-[#6366F1]' : 'text-[#8E8E93] hover:text-white'
              }`}
            >
              <Wand2 className="w-4 h-4 mx-auto mb-1" />
              AI
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {activePanel === 'clips' && <ClipTrack project={project} onUpdate={handleSave} />}
            {activePanel === 'text' && <TextOverlayPanel project={project} onUpdate={handleSave} />}
            {activePanel === 'audio' && <AudioPanel project={project} onUpdate={handleSave} />}
            {activePanel === 'captions' && <CaptionsPanel project={project} onUpdate={handleSave} />}
            {activePanel === 'ai' && <AIEnhancementPanel project={project} onUpdate={handleSave} />}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <Timeline
        project={project}
        currentTime={currentTime}
        onSeek={(time) => {
          if (videoRef.current) {
            videoRef.current.currentTime = time;
            setCurrentTime(time);
          }
        }}
        onUpdate={handleSave}
      />

      {showExportModal && (
        <ExportModal
          project={project}
          onClose={() => setShowExportModal(false)}
          onExportComplete={(url) => {
            setShowExportModal(false);
            toast.success('Video exported successfully!');
            navigate(createPageUrl('RecordPitch'));
          }}
        />
      )}
    </div>
  );
}
import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Play, Pause, Save, Download, Loader2, Plus, Type, Volume2, Wand2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';

export default function VideoEditor() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const videoRef = useRef(null);
  
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('projectId');
  const projectType = urlParams.get('type') || 'pitch';

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [activePanel, setActivePanel] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return null;
      const { data: profile } = await supabase.from('users').select('*').eq('id', authUser.id).single();
      return { ...authUser, ...profile };
    }
  });

  const [project, setProject] = useState({
    project_name: `New ${projectType} Edit`,
    project_type: projectType,
    status: 'draft',
    current_duration_seconds: 0
  });

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
          <button onClick={() => navigate('/login')} className="px-6 py-3 bg-[#6366F1] text-white font-semibold rounded-xl hover:brightness-110 transition">Log In</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000000] flex flex-col">
      <div className="bg-[#0A0A0A] border-b border-[#18181B] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(createPageUrl('RecordPitch'))} className="w-9 h-9 rounded-full bg-[rgba(255,255,255,0.06)] flex items-center justify-center text-[#8E8E93] hover:text-white transition"><ArrowLeft className="w-5 h-5" /></button>
          <div>
            <h1 className="text-white text-sm font-semibold">{project?.project_name}</h1>
            <p className="text-[#636366] text-xs capitalize">{projectType} Editor</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => toast.success('Project saved')} className="px-4 py-2 bg-[rgba(255,255,255,0.06)] text-white text-sm font-medium rounded-lg hover:bg-[rgba(255,255,255,0.1)] transition flex items-center gap-2"><Save className="w-4 h-4" />Save</button>
          <button onClick={() => toast.info('Export coming soon')} className="px-4 py-2 bg-[#6366F1] text-white text-sm font-semibold rounded-lg hover:brightness-110 transition flex items-center gap-2"><Download className="w-4 h-4" />Export</button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col items-center justify-center bg-[#000000] p-4">
          <div className="relative w-full max-w-md aspect-[9/16] bg-[#18181B] rounded-xl overflow-hidden">
            <video ref={videoRef} className="w-full h-full object-contain" playsInline />
            <button onClick={handlePlayPause} className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/50 transition opacity-0 hover:opacity-100">
              {isPlaying ? <Pause className="w-16 h-16 text-white" /> : <Play className="w-16 h-16 text-white" />}
            </button>
          </div>
          <div className="mt-4 flex items-center gap-4">
            <button onClick={handlePlayPause} className="w-12 h-12 rounded-full bg-[#6366F1] flex items-center justify-center hover:brightness-110 transition">
              {isPlaying ? <Pause className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 text-white ml-0.5" />}
            </button>
            <span className="text-[#8E8E93] text-sm font-mono">{Math.floor(currentTime)}s / {Math.floor(project?.current_duration_seconds || 0)}s</span>
          </div>
        </div>

        <div className="w-80 bg-[#0A0A0A] border-l border-[#18181B] flex flex-col">
          <div className="flex border-b border-[#18181B]">
            {[{ id: 'clips', icon: Plus, label: 'Clips' }, { id: 'text', icon: Type, label: 'Text' }, { id: 'audio', icon: Volume2, label: 'Audio' }, { id: 'ai', icon: Wand2, label: 'AI' }].map(tab => (
              <button key={tab.id} onClick={() => setActivePanel(tab.id)} className={`flex-1 px-4 py-3 text-sm font-medium transition ${activePanel === tab.id ? 'text-[#6366F1] border-b-2 border-[#6366F1]' : 'text-[#8E8E93] hover:text-white'}`}>
                <tab.icon className="w-4 h-4 mx-auto mb-1" />{tab.label}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <p className="text-[#636366] text-sm text-center py-8">Select a tool above to begin editing</p>
          </div>
        </div>
      </div>

      <div className="h-24 bg-[#0A0A0A] border-t border-[#18181B] flex items-center justify-center">
        <p className="text-[#636366] text-sm">Timeline - Coming Soon</p>
      </div>
    </div>
  );
}

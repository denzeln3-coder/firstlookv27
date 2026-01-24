import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Home, Trophy, Video, Bookmark, User, Compass } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import PitchModal from '../components/PitchModal';

export default function Discover() {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedPitch, setSelectedPitch] = useState(null);
  const containerRef = useRef(null);
  const videoRefs = useRef({});

  const { data: pitches = [] } = useQuery({
    queryKey: ['pitches'],
    queryFn: async () => {
      const { data } = await supabase.from('startups').select('*').eq('is_published', true).order('created_at', { ascending: false });
      return data || [];
    }
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return null;
      const { data: profile } = await supabase.from('users').select('*').eq('id', authUser.id).single();
      return { ...authUser, ...profile };
    }
  });

  const handleScroll = React.useCallback((e) => {
    const container = e.target;
    const scrollPosition = container.scrollTop;
    const itemHeight = container.clientHeight;
    const newIndex = Math.round(scrollPosition / itemHeight);
    
    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < pitches.length) {
      setCurrentIndex(newIndex);
      Object.keys(videoRefs.current).forEach((key) => {
        const video = videoRefs.current[key];
        if (video) {
          if (parseInt(key) === newIndex) {
            video.play().catch(() => {});
          } else {
            video.pause();
            video.currentTime = 0;
          }
        }
      });
    }
  }, [currentIndex, pitches.length]);

  useEffect(() => {
    const firstVideo = videoRefs.current[0];
    if (firstVideo) {
      firstVideo.play().catch(() => {});
    }
    return () => {
      Object.values(videoRefs.current).forEach((video) => {
        if (video) {
          video.pause();
          video.currentTime = 0;
        }
      });
    };
  }, [pitches.length]);

  return (
    <div className="fixed inset-0 bg-[#000000]">
      <div className="fixed top-0 left-0 right-0 bg-[#000000]/80 backdrop-blur-xl z-20 px-4 py-4 flex items-center justify-between border-b border-[rgba(255,255,255,0.06)]">
        <button onClick={(e) => { e.stopPropagation(); navigate(createPageUrl('Explore')); }} className="text-[#8E8E93] hover:text-[#FFFFFF] transition-colors duration-200"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-[#FFFFFF] text-[18px] font-semibold">Discover</h1>
        <div className="w-5" />
      </div>

      <div ref={containerRef} onScroll={handleScroll} className="h-full overflow-y-scroll snap-y snap-mandatory pt-16 pb-20" style={{ scrollSnapType: 'y mandatory', WebkitOverflowScrolling: 'touch', scrollBehavior: 'smooth' }}>
        {pitches.map((pitch, index) => (
          <div key={pitch.id} className="w-full h-full snap-start flex items-center justify-center relative cursor-pointer" style={{ height: 'calc(100vh - 144px)' }} onClick={() => setSelectedPitch(pitch)}>
            {pitch.video_url ? (
              <video ref={(el) => videoRefs.current[index] = el} src={pitch.video_url} poster={pitch.thumbnail_url} loop playsInline muted preload="metadata" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
            ) : pitch.thumbnail_url ? (
              <img src={pitch.thumbnail_url} alt={pitch.startup_name || pitch.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#6366F1] to-[#8B5CF6]">
                <span className="text-white text-[64px] font-bold">{(pitch.startup_name || pitch.name)?.[0]?.toUpperCase()}</span>
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent pointer-events-none">
              <h2 className="text-white text-[24px] font-bold mb-2">{pitch.startup_name || pitch.name}</h2>
              <p className="text-[#A1A1AA] text-[14px] line-clamp-2">{pitch.one_liner}</p>
            </div>
          </div>
        ))}

        {pitches.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center px-6">
              <p className="text-[#8E8E93] text-[16px] mb-6">No pitches to discover yet</p>
              <button onClick={() => navigate(createPageUrl('Explore'))} className="px-6 py-3 bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] text-white text-[14px] font-semibold rounded-xl hover:brightness-110 transition-all duration-200">Back to Home</button>
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-[rgba(0,0,0,0.8)] backdrop-blur-xl border-t border-[rgba(255,255,255,0.06)] z-50" style={{ paddingBottom: 'env(safe-area-inset-bottom, 8px)' }}>
        <div className="flex items-center justify-around py-2 px-4">
          <button onClick={() => navigate(createPageUrl('Explore'))} className="flex flex-col items-center gap-1 text-[#636366] hover:text-[#FFFFFF] transition-colors duration-200 min-h-[44px] justify-center"><Home className="w-6 h-6" /><span className="text-[10px] font-semibold tracking-[0.04em] uppercase">Home</span></button>
          <button onClick={() => navigate(createPageUrl('Discover'))} className="flex flex-col items-center gap-1 text-[#6366F1] min-h-[44px] justify-center"><Compass className="w-6 h-6" /><span className="text-[10px] font-semibold tracking-[0.04em] uppercase">Discover</span></button>
          <button onClick={() => navigate(createPageUrl('Leaderboard'))} className="flex flex-col items-center gap-1 text-[#636366] hover:text-[#FFFFFF] transition-colors duration-200 min-h-[44px] justify-center"><Trophy className="w-6 h-6" /><span className="text-[10px] font-semibold tracking-[0.04em] uppercase">Top</span></button>
          <button onClick={() => { if (user) navigate(createPageUrl('RecordPitch')); else navigate('/login'); }} className="flex flex-col items-center gap-1 text-[#636366] hover:text-[#FFFFFF] transition-colors duration-200 min-h-[44px] justify-center"><Video className="w-6 h-6" /><span className="text-[10px] font-semibold tracking-[0.04em] uppercase">Record</span></button>
          <button onClick={() => navigate(createPageUrl('Saved'))} className="flex flex-col items-center gap-1 text-[#636366] hover:text-[#FFFFFF] transition-colors duration-200 min-h-[44px] justify-center"><Bookmark className="w-6 h-6" /><span className="text-[10px] font-semibold tracking-[0.04em] uppercase">Saved</span></button>
          <button onClick={() => { if (user) navigate(createPageUrl('Profile')); else navigate('/login'); }} className="flex flex-col items-center gap-1 text-[#636366] hover:text-[#FFFFFF] transition-colors duration-200 min-h-[44px] justify-center"><User className="w-6 h-6" /><span className="text-[10px] font-semibold tracking-[0.04em] uppercase">Profile</span></button>
        </div>
      </div>

      {selectedPitch && <PitchModal pitch={selectedPitch} onClose={() => setSelectedPitch(null)} />}
    </div>
  );
}

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Sparkles, TrendingUp, Users, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import PitchModal from '../components/PitchModal';

export default function Recommendations() {
  const navigate = useNavigate();
  const [selectedPitch, setSelectedPitch] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return null;
      const { data: profile } = await supabase.from('users').select('*').eq('id', authUser.id).single();
      return { ...authUser, ...profile };
    }
  });

  const { data: allPitches = [], isLoading: pitchesLoading } = useQuery({
    queryKey: ['allPitches'],
    queryFn: async () => {
      const { data } = await supabase.from('startups').select('*').eq('is_published', true).order('upvote_count', { ascending: false });
      return data || [];
    }
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: async () => {
      const { data } = await supabase.from('users').select('*');
      return data || [];
    }
  });

  const { data: following = [] } = useQuery({
    queryKey: ['following', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('follows').select('*').eq('follower_id', user.id);
      return data || [];
    },
    enabled: !!user
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-white text-xl font-bold mb-4">Log in to see recommendations</h2>
          <button onClick={() => navigate('/login')} className="px-6 py-3 bg-[#6366F1] text-white font-semibold rounded-xl hover:brightness-110 transition">Log In</button>
        </div>
      </div>
    );
  }

  // Simple recommendation logic - top pitches user hasn't seen and users they don't follow
  const followedIds = following.map(f => f.following_id);
  const recommendedPitches = allPitches.filter(p => p.founder_id !== user.id).slice(0, 6);
  const recommendedUsers = allUsers.filter(u => u.id !== user.id && !followedIds.includes(u.id) && u.user_type === 'founder').slice(0, 6);

  return (
    <div className="min-h-screen bg-[#000000] pb-20">
      <div className="sticky top-0 bg-[#000000]/95 backdrop-blur-lg z-20 border-b border-[rgba(255,255,255,0.06)]">
        <div className="px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate(createPageUrl('Explore'))} className="w-10 h-10 rounded-full bg-[rgba(255,255,255,0.06)] flex items-center justify-center text-[#8E8E93] hover:text-white transition"><ArrowLeft className="w-5 h-5" /></button>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#6366F1]" />
            <h1 className="text-white text-xl font-bold">For You</h1>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 max-w-4xl mx-auto">
        {pitchesLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-[#6366F1] animate-spin mb-4" />
            <p className="text-[#8E8E93] text-sm">Loading recommendations...</p>
          </div>
        ) : (
          <div className="space-y-8">
            <section>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-[#6366F1]" />
                <h2 className="text-white text-lg font-bold">Pitches You Might Like</h2>
              </div>
              {recommendedPitches.length === 0 ? (
                <p className="text-[#8E8E93] text-sm">No recommendations yet. Keep exploring!</p>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {recommendedPitches.map((pitch) => (
                    <button key={pitch.id} onClick={() => setSelectedPitch(pitch)} className="bg-[#18181B] border border-[rgba(255,255,255,0.1)] rounded-xl p-4 hover:bg-[rgba(255,255,255,0.06)] transition text-left">
                      <div className="flex gap-3">
                        <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {pitch.thumbnail_url ? <img src={pitch.thumbnail_url} alt="" className="w-full h-full object-cover" /> : <span className="text-white text-xl font-bold">{(pitch.startup_name || pitch.name)?.[0]?.toUpperCase()}</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-white font-semibold mb-1 line-clamp-1">{pitch.startup_name || pitch.name}</h3>
                          <p className="text-[#8E8E93] text-sm line-clamp-2 mb-2">{pitch.one_liner}</p>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-[#6366F1]/20 text-[#6366F1] text-xs rounded">{pitch.category}</span>
                            <span className="text-[#636366] text-xs">{pitch.upvote_count || 0} upvotes</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section>
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-[#6366F1]" />
                <h2 className="text-white text-lg font-bold">People to Connect With</h2>
              </div>
              {recommendedUsers.length === 0 ? (
                <p className="text-[#8E8E93] text-sm">No recommendations yet. Keep exploring!</p>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {recommendedUsers.map((recUser) => (
                    <button key={recUser.id} onClick={() => navigate(createPageUrl('Profile') + `?userId=${recUser.id}`)} className="bg-[#18181B] border border-[rgba(255,255,255,0.1)] rounded-xl p-4 hover:bg-[rgba(255,255,255,0.06)] transition text-left">
                      <div className="flex gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {recUser.avatar_url ? <img src={recUser.avatar_url} alt="" className="w-full h-full object-cover" /> : <span className="text-white text-sm font-bold">{(recUser.display_name || 'U')[0].toUpperCase()}</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-white font-semibold mb-1">{recUser.display_name || recUser.username || 'User'}</h3>
                          {recUser.bio && <p className="text-[#8E8E93] text-sm line-clamp-2">{recUser.bio}</p>}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      {selectedPitch && <PitchModal pitch={selectedPitch} onClose={() => setSelectedPitch(null)} />}
    </div>
  );
}

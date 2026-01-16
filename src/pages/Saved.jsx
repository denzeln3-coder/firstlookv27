import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Play, Bookmark } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import PitchModal from '../components/PitchModal';

export default function Saved() {
  const navigate = useNavigate();
  const [selectedPitch, setSelectedPitch] = React.useState(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch {
        return null;
      }
    }
  });

  const { data: bookmarks = [], isLoading: bookmarksLoading } = useQuery({
    queryKey: ['userBookmarks', user?.id],
    queryFn: () => base44.entities.Bookmark.filter({ user_id: user.id }),
    enabled: !!user
  });

  const { data: pitches = [], isLoading: pitchesLoading } = useQuery({
    queryKey: ['bookmarkedPitches', bookmarks.map(b => b.pitch_id)],
    queryFn: async () => {
      if (bookmarks.length === 0) return [];
      const allPitches = await base44.entities.Pitch.list();
      const bookmarkedIds = bookmarks.map(b => b.pitch_id);
      return allPitches.filter(p => bookmarkedIds.includes(p.id));
    },
    enabled: bookmarks.length > 0
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-[#09090B] flex items-center justify-center">
        <div className="text-center">
          <Bookmark className="w-12 h-12 text-[#71717A] mx-auto mb-4" />
          <h2 className="text-[#FAFAFA] text-[24px] font-bold mb-4">Save Your Favorites</h2>
          <p className="text-[#A1A1AA] text-[14px] mb-6">Log in to bookmark pitches you love</p>
          <button
            onClick={() => base44.auth.redirectToLogin(createPageUrl('Saved'))}
            className="px-6 py-3 bg-[#6366F1] text-white text-[14px] font-semibold rounded-full hover:brightness-110 transition-all duration-150"
          >
            Log In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090B] pb-20">
      <div className="fixed top-0 left-0 right-0 bg-[#09090B] z-20 px-4 py-4 flex items-center justify-between border-b border-[#27272A]">
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(createPageUrl('Explore'));
          }}
          className="text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors duration-150"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-[#FAFAFA] text-[20px] font-bold">Saved Pitches</h1>
        <div className="w-5" />
      </div>

      <div className="pt-20 px-4">
        {bookmarksLoading || pitchesLoading ? (
          <div className="text-[#FAFAFA] text-[14px] text-center py-8">Loading...</div>
        ) : pitches.length === 0 ? (
          <div className="text-center py-12">
            <Bookmark className="w-16 h-16 text-[#71717A] mx-auto mb-4" />
            <p className="text-[#A1A1AA] text-[14px] mb-2">No saved pitches yet</p>
            <p className="text-[#71717A] text-[12px] mb-6">Bookmark pitches to save them here</p>
            <button
              onClick={() => navigate(createPageUrl('Explore'))}
              className="px-6 py-3 bg-[#6366F1] text-white text-[14px] font-semibold rounded-lg hover:brightness-110 transition-all duration-150"
            >
              Explore Pitches
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1">
            {pitches.map((pitch) => (
              <button
                key={pitch.id}
                onClick={() => setSelectedPitch(pitch)}
                className="relative overflow-hidden transition-transform duration-150 hover:scale-[1.02] hover:brightness-110"
                style={{ aspectRatio: '1/1', borderRadius: '8px' }}
              >
                {pitch.thumbnail_url ? (
                  <img
                    src={pitch.thumbnail_url}
                    alt={pitch.startup_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#18181B]">
                    <span className="text-[#71717A] text-[12px]">No image</span>
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/40 to-transparent" />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center" style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.4))' }}>
                    <Play className="w-4 h-4 text-white fill-white ml-0.5 opacity-80" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedPitch && (
        <PitchModal pitch={selectedPitch} onClose={() => setSelectedPitch(null)} />
      )}
    </div>
  );
}
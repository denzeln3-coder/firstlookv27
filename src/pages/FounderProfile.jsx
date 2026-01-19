import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Play, UserPlus, UserCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';

export default function FounderProfile() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const userId = urlParams.get('userId');
  const [activeTab, setActiveTab] = React.useState('pitches');

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch {
        return null;
      }
    }
  });

  const { data: founder, isLoading: founderLoading } = useQuery({
    queryKey: ['founder', userId],
    queryFn: async () => {
      const users = await base44.entities.User.list();
      return users.find(u => u.id === userId);
    },
    enabled: !!userId
  });

  const { data: founderPitches = [], isLoading: pitchesLoading } = useQuery({
    queryKey: ['founderPitches', userId],
    queryFn: () => base44.entities.Pitch.filter({ founder_id: userId }, '-created_date'),
    enabled: !!userId
  });

  const { data: totalUpvotes = 0 } = useQuery({
    queryKey: ['founderUpvotes', userId],
    queryFn: async () => {
      return founderPitches.reduce((sum, pitch) => sum + (pitch.upvote_count || 0), 0);
    },
    enabled: founderPitches.length > 0
  });

  const isOwnProfile = currentUser && founder && currentUser.id === founder.id;

  if (founderLoading) {
    return (
      <div className="min-h-screen bg-[#09090B] flex items-center justify-center">
        <div className="text-[#FAFAFA] text-[14px]">Loading...</div>
      </div>
    );
  }

  if (!founder) {
    return (
      <div className="min-h-screen bg-[#09090B] flex items-center justify-center">
        <div className="text-[#FAFAFA] text-[14px]">Founder not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090B] pb-20">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 bg-[#09090B] z-20 px-4 py-4 flex items-center justify-between border-b border-[#27272A]">
        <button
          onClick={() => navigate(-1)}
          className="text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors duration-150"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-[#FAFAFA] text-[20px] font-bold">Profile</h1>
        <div className="w-5" />
      </div>

      {/* Profile Info */}
      <div className="pt-20 px-6 pb-8 border-b border-[#27272A]">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-20 h-20 rounded-full bg-[#6366F1] flex items-center justify-center text-white text-3xl font-bold overflow-hidden border-3 border-[#27272A]">
            {founder.avatar_url ? (
              <img src={founder.avatar_url} alt={founder.display_name || founder.full_name} className="w-full h-full object-cover" />
            ) : (
              <span>{(founder.display_name || founder.full_name || founder.email)?.[0]?.toUpperCase()}</span>
            )}
          </div>
          <div className="flex-1">
            <h2 className="text-[#FAFAFA] text-[24px] font-bold mb-1 leading-[1.4]">
              {founder.display_name || founder.full_name || 'Founder'}
            </h2>
            {founder.bio && (
              <p className="text-[#A1A1AA] text-[14px] leading-[1.6]">{founder.bio}</p>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-6 mb-4">
          <div>
            <div className="text-[#FAFAFA] text-[24px] font-bold leading-[1.4]">{founderPitches.length}</div>
            <div className="text-[#71717A] text-[12px] uppercase tracking-wide font-medium">Pitches</div>
          </div>
          <div>
            <div className="text-[#FAFAFA] text-[24px] font-bold leading-[1.4]">{totalUpvotes}</div>
            <div className="text-[#71717A] text-[12px] uppercase tracking-wide font-medium">Upvotes</div>
          </div>
        </div>

        {isOwnProfile && (
          <button 
            onClick={() => navigate(createPageUrl('Profile'))}
            className="w-full px-4 py-2 bg-[#6366F1] text-white text-[14px] font-semibold rounded-lg hover:brightness-110 transition-all duration-150"
          >
            Edit Profile
          </button>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-[#27272A] px-6">
        {['pitches', 'demo', 'updates', 'about'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 text-[14px] font-medium capitalize transition-colors ${
              activeTab === tab
                ? 'text-[#FAFAFA] border-b-2 border-[#6366F1]'
                : 'text-[#71717A] hover:text-[#A1A1AA]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Pitches Tab */}
      {activeTab === 'pitches' && (
        <div className="px-6 pt-6">
          <h3 className="text-[#FAFAFA] text-[18px] font-semibold mb-4">Pitches ({founderPitches.length})</h3>
          
          {pitchesLoading ? (
            <div className="text-[#A1A1AA] text-[14px] text-center py-8">Loading pitches...</div>
          ) : founderPitches.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[#A1A1AA] text-[14px]">No pitches yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1">
              {founderPitches.map((pitch) => (
                <button
                  key={pitch.id}
                  onClick={() => {
                    navigate(createPageUrl('Explore'));
                    setTimeout(() => {
                      const pitchElements = document.querySelectorAll('[data-pitch-id]');
                      const element = Array.from(pitchElements).find(el => el.getAttribute('data-pitch-id') === pitch.id);
                      if (element) element.click();
                    }, 100);
                  }}
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
                  <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/60 to-transparent" />
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
      )}

      {/* Demo Tab */}
      {activeTab === 'demo' && (
        <div className="px-6 pt-6">
          <div className="text-center py-12">
            <p className="text-[#71717A] text-[14px]">No demo video yet</p>
          </div>
        </div>
      )}

      {/* Updates Tab */}
      {activeTab === 'updates' && (
        <div className="px-6 pt-6">
          <div className="text-center py-12">
            <p className="text-[#71717A] text-[14px]">No updates yet</p>
          </div>
        </div>
      )}

      {/* About Tab */}
      {activeTab === 'about' && (
        <div className="px-6 pt-6">
          <div className="space-y-4">
            {founder.bio && (
              <div>
                <h4 className="text-[#71717A] text-[12px] uppercase tracking-wide mb-2">Bio</h4>
                <p className="text-[#FAFAFA] text-[14px]">{founder.bio}</p>
              </div>
            )}
            {founder.website_url && (
              <div>
                <h4 className="text-[#71717A] text-[12px] uppercase tracking-wide mb-2">Website</h4>
                <a href={founder.website_url} target="_blank" rel="noopener noreferrer" className="text-[#6366F1] text-[14px] hover:underline">{founder.website_url}</a>
              </div>
            )}
            {founder.collab_modes?.length > 0 && (
              <div>
                <h4 className="text-[#71717A] text-[12px] uppercase tracking-wide mb-2">Looking For</h4>
                <div className="flex flex-wrap gap-2">
                  {founder.collab_modes.map(mode => (
                    <span key={mode} className="px-3 py-1 bg-[#18181B] text-[#A1A1AA] text-[12px] rounded-full">{mode}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

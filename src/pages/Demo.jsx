import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ExternalLink, MessageCircle, ArrowUp, Calendar, Tag, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';

export default function Demo() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pitchId = localStorage.getItem('selectedPitchId');

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

  const { data: pitch, isLoading: pitchLoading } = useQuery({
    queryKey: ['pitch', pitchId],
    queryFn: async () => {
      const allPitches = await base44.entities.Pitch.list();
      return allPitches.find(p => p.id === pitchId);
    },
    enabled: !!pitchId
  });

  const { data: demo, isLoading: demoLoading } = useQuery({
    queryKey: ['demo', pitchId],
    queryFn: async () => {
      const allDemos = await base44.entities.Demo.list();
      return allDemos.find(d => d.pitch_id === pitchId);
    },
    enabled: !!pitchId
  });

  const { data: founder } = useQuery({
    queryKey: ['founder', pitch?.founder_id],
    queryFn: async () => {
      const users = await base44.entities.User.list();
      return users.find(u => u.id === pitch.founder_id);
    },
    enabled: !!pitch?.founder_id
  });

  const { data: hasUpvoted = false } = useQuery({
    queryKey: ['upvote', pitchId, user?.id],
    queryFn: async () => {
      if (!user) return false;
      const upvotes = await base44.entities.Upvote.filter({ user_id: user.id, pitch_id: pitchId });
      return upvotes.length > 0;
    },
    enabled: !!user && !!pitchId
  });

  const upvoteMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const upvotes = await base44.entities.Upvote.filter({ user_id: user.id, pitch_id: pitchId });
      if (upvotes.length > 0) {
        await base44.entities.Upvote.delete(upvotes[0].id);
        await base44.entities.Pitch.update(pitchId, {
          upvote_count: Math.max(0, (pitch.upvote_count || 0) - 1)
        });
      } else {
        await base44.entities.Upvote.create({ user_id: user.id, pitch_id: pitchId });
        await base44.entities.Pitch.update(pitchId, {
          upvote_count: (pitch.upvote_count || 0) + 1
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pitch', pitchId] });
      queryClient.invalidateQueries({ queryKey: ['upvote', pitchId, user?.id] });
    }
  });

  const isLoading = pitchLoading || demoLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center">
        <div className="skeleton w-32 h-8 rounded-xl" />
      </div>
    );
  }

  if (!pitch) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-white text-xl font-bold mb-4">Pitch not found</h2>
          <button
            onClick={() => navigate(createPageUrl('Explore'))}
            className="px-6 py-3 bg-[#6366F1] text-white font-semibold rounded-xl hover:brightness-110 transition"
          >
            Back to Explore
          </button>
        </div>
      </div>
    );
  }

  const handleUpvote = () => {
    if (!user) {
      toast.error('Please log in to upvote');
      return;
    }
    upvoteMutation.mutate();
  };

  const getTimeSince = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return `${Math.floor(seconds / 604800)}w ago`;
  };

  return (
    <div className="min-h-screen bg-[#000000] pb-20">
      <div className="sticky top-0 bg-[#000000]/95 backdrop-blur-lg z-20 border-b border-[rgba(255,255,255,0.06)]">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <button
            onClick={() => navigate(createPageUrl('Explore'))}
            className="flex items-center gap-2 text-[#8E8E93] hover:text-white transition"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Back</span>
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Video Player */}
        <div className="aspect-video bg-black rounded-2xl overflow-hidden mb-6 border border-[rgba(255,255,255,0.06)]">
          {demo?.video_url ? (
            <video
              src={demo.video_url}
              controls
              autoPlay
              className="w-full h-full"
              poster={pitch.thumbnail_url}
            />
          ) : pitch.video_url ? (
            <video
              src={pitch.video_url}
              controls
              className="w-full h-full"
              poster={pitch.thumbnail_url}
            />
          ) : (
            <img
              src={pitch.thumbnail_url}
              alt={pitch.startup_name}
              className="w-full h-full object-cover"
            />
          )}
        </div>

        {/* Header with Logo and Upvote */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {pitch.thumbnail_url && (
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center overflow-hidden flex-shrink-0">
                <img src={pitch.thumbnail_url} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            <div>
              <h1 className="text-white text-2xl font-bold">{pitch.startup_name}</h1>
            </div>
          </div>
          <button
            onClick={handleUpvote}
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition ${
              hasUpvoted
                ? 'bg-[#34D399]/20 text-[#34D399]'
                : 'bg-[rgba(255,255,255,0.06)] text-white hover:bg-[rgba(255,255,255,0.1)]'
            }`}
          >
            <ArrowUp className={`w-5 h-5 ${hasUpvoted ? 'fill-current' : ''}`} />
            <span className="text-sm font-semibold">{pitch.upvote_count || 0}</span>
          </button>
        </div>

        {/* One-liner */}
        <p className="text-[#8E8E93] text-base leading-relaxed mb-6">
          {pitch.one_liner}
        </p>

        {/* Metadata */}
        <div className="flex flex-wrap items-center gap-4 mb-6 text-sm">
          {pitch.category && (
            <div className="flex items-center gap-2 text-[#8E8E93]">
              <Tag className="w-4 h-4" />
              <span>{pitch.category}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-[#8E8E93]">
            <Calendar className="w-4 h-4" />
            <span>Posted {getTimeSince(pitch.created_date)}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mb-8">
          {(demo?.product_url || pitch.product_url) && (
            <a
              href={demo?.product_url || pitch.product_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-6 py-3 bg-white text-black font-semibold rounded-xl hover:bg-gray-100 transition"
            >
              <ExternalLink className="w-4 h-4" />
              Visit Product
            </a>
          )}
          <button
            onClick={() => {
              if (!user) {
                toast.error('Please log in to comment');
                return;
              }
              navigate(createPageUrl('Explore') + `?pitch=${pitchId}`);
            }}
            className="flex items-center gap-2 px-6 py-3 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] text-white font-semibold rounded-xl hover:bg-[rgba(255,255,255,0.1)] transition"
          >
            <MessageCircle className="w-4 h-4" />
            Comment
          </button>
        </div>

        {/* About Section */}
        <div className="bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] rounded-2xl p-6 mb-6">
          <h2 className="text-white text-lg font-bold mb-4">ABOUT THIS DEMO</h2>
          <p className="text-[#8E8E93] text-sm leading-relaxed">
            {pitch.what_problem_do_you_solve || 'This demo showcases the product in action. Watch to see how it works and what problems it solves.'}
          </p>
        </div>

        {/* Founder Section */}
        {founder && (
          <div className="bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] rounded-2xl p-6">
            <h2 className="text-white text-lg font-bold mb-4">FOUNDER</h2>
            <div className="flex items-center justify-between">
              <button
                onClick={() => navigate(createPageUrl('Profile') + `?userId=${founder.id}`)}
                className="flex items-center gap-3 hover:opacity-80 transition"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center overflow-hidden">
                  {founder.avatar_url ? (
                    <img src={founder.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-6 h-6 text-white" />
                  )}
                </div>
                <div>
                  <div className="text-white font-semibold">{founder.display_name || founder.full_name || 'Founder'}</div>
                  {founder.username && (
                    <div className="text-[#8E8E93] text-sm">@{founder.username.replace('@', '')}</div>
                  )}
                </div>
              </button>
              {user && founder.id !== user.id && (
                <button
                  onClick={() => navigate(createPageUrl('Messages') + `?userId=${founder.id}`)}
                  className="px-4 py-2 bg-[#6366F1] text-white text-sm font-semibold rounded-xl hover:brightness-110 transition"
                >
                  Message
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ExternalLink, MessageCircle, ArrowUp, Calendar, Tag, User, Pencil, Check, X, Send, Volume2, VolumeX } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';

export default function Demo() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  
  // Get pitch ID from URL params first, then localStorage as fallback
  const urlPitchId = searchParams.get('id') || searchParams.get('pitch');
  const storedPitchId = localStorage.getItem('selectedPitchId');
  const pitchId = urlPitchId || storedPitchId;

  const videoRef = useRef(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState('');
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        return user;
      } catch {
        return null;
      }
    }
  });

  const { data: pitch, isLoading: pitchLoading } = useQuery({
    queryKey: ['pitch', pitchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('startups')
        .select('*')
        .eq('id', pitchId)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!pitchId
  });

  const { data: founder } = useQuery({
    queryKey: ['founder', pitch?.founder_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', pitch.founder_id)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!pitch?.founder_id
  });

  const { data: hasUpvoted = false } = useQuery({
    queryKey: ['upvote', pitchId, user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data, error } = await supabase
        .from('upvotes')
        .select('*')
        .eq('user_id', user.id)
        .eq('startup_id', pitchId);
      return data && data.length > 0;
    },
    enabled: !!user && !!pitchId
  });

  // Fetch comments for this pitch
  const { data: comments = [], isLoading: commentsLoading } = useQuery({
    queryKey: ['comments', pitchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('startup_id', pitchId)
        .order('created_at', { ascending: false });
      
      if (error || !data) return [];
      
      // Fetch user profiles for comments
      const userIds = [...new Set(data.map(c => c.user_id))];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name, username, avatar_url, full_name')
          .in('id', userIds);
        
        return data.map(comment => ({
          ...comment,
          profile: profiles?.find(p => p.id === comment.user_id) || null
        }));
      }
      return data;
    },
    enabled: !!pitchId
  });

  // Set edited description when pitch loads
  useEffect(() => {
    if (pitch?.description) {
      setEditedDescription(pitch.description);
    }
  }, [pitch?.description]);

  const upvoteMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      
      const { data: existing } = await supabase
        .from('upvotes')
        .select('*')
        .eq('user_id', user.id)
        .eq('startup_id', pitchId);

      if (existing && existing.length > 0) {
        await supabase.from('upvotes').delete().eq('id', existing[0].id);
        await supabase
          .from('startups')
          .update({ upvote_count: Math.max(0, (pitch.upvote_count || 0) - 1) })
          .eq('id', pitchId);
      } else {
        await supabase.from('upvotes').insert({ user_id: user.id, startup_id: pitchId });
        await supabase
          .from('startups')
          .update({ upvote_count: (pitch.upvote_count || 0) + 1 })
          .eq('id', pitchId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pitch', pitchId] });
      queryClient.invalidateQueries({ queryKey: ['upvote', pitchId, user?.id] });
    }
  });

  // Update description mutation
  const updateDescriptionMutation = useMutation({
    mutationFn: async (newDescription) => {
      const { error } = await supabase
        .from('startups')
        .update({ description: newDescription })
        .eq('id', pitchId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pitch', pitchId] });
      setIsEditingDescription(false);
      toast.success('Description updated!');
    },
    onError: (error) => {
      toast.error('Failed to update description');
      console.error(error);
    }
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async (content) => {
      const { error } = await supabase
        .from('comments')
        .insert({
          startup_id: pitchId,
          user_id: user.id,
          content: content
        });
      
      if (error) throw error;
      
      // Update comment count on startup
      const currentCount = pitch?.comment_count || 0;
      await supabase
        .from('startups')
        .update({ comment_count: currentCount + 1 })
        .eq('id', pitchId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', pitchId] });
      queryClient.invalidateQueries({ queryKey: ['pitch', pitchId] });
      setNewComment('');
      toast.success('Comment posted!');
    },
    onError: (error) => {
      toast.error('Failed to post comment');
      console.error(error);
    }
  });

  const handleToggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleSaveDescription = () => {
    if (!editedDescription.trim()) {
      toast.error('Description cannot be empty');
      return;
    }
    updateDescriptionMutation.mutate(editedDescription.trim());
  };

  const handleCancelEdit = () => {
    setEditedDescription(pitch?.description || '');
    setIsEditingDescription(false);
  };

  const handleSubmitComment = () => {
    if (!user) {
      toast.error('Please log in to comment');
      return;
    }
    if (!newComment.trim()) {
      toast.error('Please enter a comment');
      return;
    }
    addCommentMutation.mutate(newComment.trim());
  };

  if (pitchLoading) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-[#6366F1]/20 border-t-[#6366F1] rounded-full animate-spin" />
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

  // Use demo_url if available, otherwise fall back to video_url
  const videoToPlay = pitch.demo_url || pitch.video_url;
  
  // Check if current user is the owner
  const isOwner = user && pitch.founder_id === user.id;

  return (
    <div className="min-h-screen bg-[#000000] pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-[#000000]/95 backdrop-blur-lg z-20 border-b border-[rgba(255,255,255,0.06)]">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-[#8E8E93] hover:text-white transition"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Back</span>
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Video Player */}
        <div className="relative aspect-video bg-black rounded-2xl overflow-hidden mb-6 border border-[rgba(255,255,255,0.06)]">
          {videoToPlay ? (
            <>
              <video
                ref={videoRef}
                src={videoToPlay}
                controls
                autoPlay
                muted={isMuted}
                playsInline
                className="w-full h-full"
                poster={pitch.thumbnail_url}
              />
              {/* Mute/Unmute Button Overlay */}
              <button
                onClick={handleToggleMute}
                className="absolute bottom-4 right-4 p-2 bg-black/60 rounded-full hover:bg-black/80 transition z-10"
              >
                {isMuted ? (
                  <VolumeX className="w-5 h-5 text-white" />
                ) : (
                  <Volume2 className="w-5 h-5 text-white" />
                )}
              </button>
            </>
          ) : pitch.thumbnail_url ? (
            <img
              src={pitch.thumbnail_url}
              alt={pitch.startup_name || pitch.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#6366F1] to-[#8B5CF6]">
              <span className="text-white text-4xl font-bold">
                {(pitch.startup_name || pitch.name)?.[0]?.toUpperCase() || '?'}
              </span>
            </div>
          )}
        </div>

        {/* No Demo Notice */}
        {!pitch.demo_url && pitch.video_url && (
          <div className="mb-6 p-4 bg-[#6366F1]/10 border border-[#6366F1]/20 rounded-xl">
            <p className="text-[#8E8E93] text-sm">
              <span className="text-[#6366F1] font-semibold">Note:</span> This startup hasn't uploaded a demo yet. You're watching their 15-second pitch.
            </p>
          </div>
        )}

        {/* Header with Logo and Upvote */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {pitch.thumbnail_url && (
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center overflow-hidden flex-shrink-0">
                <img src={pitch.thumbnail_url} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            <div>
              <h1 className="text-white text-2xl font-bold">{pitch.startup_name || pitch.name}</h1>
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
          {pitch.one_liner || pitch.tagline}
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
            <span>Posted {getTimeSince(pitch.created_at)}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mb-8">
          {pitch.product_url && (
            <a
              href={pitch.product_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-6 py-3 bg-white text-black font-semibold rounded-xl hover:bg-gray-100 transition"
            >
              <ExternalLink className="w-4 h-4" />
              Visit Product
            </a>
          )}
          <button
            onClick={() => setShowComments(!showComments)}
            className={`flex items-center gap-2 px-6 py-3 border font-semibold rounded-xl transition ${
              showComments 
                ? 'bg-[#6366F1] border-[#6366F1] text-white' 
                : 'bg-[rgba(255,255,255,0.06)] border-[rgba(255,255,255,0.1)] text-white hover:bg-[rgba(255,255,255,0.1)]'
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            {comments.length > 0 ? `${comments.length} Comments` : 'Comment'}
          </button>
        </div>

        {/* Comments Section */}
        {showComments && (
          <div className="bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] rounded-2xl p-6 mb-6">
            <h2 className="text-white text-lg font-bold mb-4">COMMENTS</h2>
            
            {/* Add Comment Input */}
            {user ? (
              <div className="flex gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center overflow-hidden flex-shrink-0">
                  {user.user_metadata?.avatar_url ? (
                    <img src={user.user_metadata.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white text-sm font-bold">
                      {(user.email || 'U')[0].toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1 flex gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmitComment()}
                    placeholder="Add a comment..."
                    className="flex-1 px-4 py-2.5 bg-[#1C1C1E] text-white text-sm rounded-xl border border-[rgba(255,255,255,0.1)] focus:border-[#6366F1] focus:outline-none"
                  />
                  <button
                    onClick={handleSubmitComment}
                    disabled={!newComment.trim() || addCommentMutation.isPending}
                    className="px-4 py-2.5 bg-[#6366F1] text-white rounded-xl disabled:opacity-50 hover:brightness-110 transition"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="mb-6 p-4 bg-[#1C1C1E] rounded-xl text-center">
                <p className="text-[#8E8E93] text-sm mb-2">Log in to leave a comment</p>
                <button
                  onClick={() => navigate('/Login')}
                  className="text-[#6366F1] text-sm font-semibold hover:underline"
                >
                  Log In
                </button>
              </div>
            )}
            
            {/* Comments List */}
            {commentsLoading ? (
              <div className="text-center py-8">
                <div className="w-6 h-6 border-2 border-[#6366F1]/20 border-t-[#6366F1] rounded-full animate-spin mx-auto" />
              </div>
            ) : comments.length === 0 ? (
              <div className="text-center py-8">
                <MessageCircle className="w-10 h-10 text-[#3F3F46] mx-auto mb-2" />
                <p className="text-[#8E8E93] text-sm">No comments yet. Be the first!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center overflow-hidden flex-shrink-0">
                      {comment.profile?.avatar_url ? (
                        <img src={comment.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-white text-sm font-bold">
                          {(comment.profile?.display_name || comment.profile?.full_name || 'U')[0].toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white font-semibold text-sm">
                          {comment.profile?.display_name || comment.profile?.full_name || 'User'}
                        </span>
                        <span className="text-[#8E8E93] text-xs">
                          {getTimeSince(comment.created_at)}
                        </span>
                      </div>
                      <p className="text-[#D4D4D8] text-sm">{comment.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* About Section - Editable for owner */}
        <div className="bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white text-lg font-bold">ABOUT THIS DEMO</h2>
            {isOwner && !isEditingDescription && (
              <button
                onClick={() => setIsEditingDescription(true)}
                className="p-2 text-[#8E8E93] hover:text-[#6366F1] hover:bg-[#6366F1]/10 rounded-lg transition"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
          </div>
          
          {isEditingDescription ? (
            <div className="space-y-3">
              <textarea
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                placeholder="Describe your demo..."
                rows={4}
                className="w-full px-4 py-3 bg-[#1C1C1E] text-white text-sm rounded-xl border border-[rgba(255,255,255,0.1)] focus:border-[#6366F1] focus:outline-none resize-none"
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={handleCancelEdit}
                  className="px-4 py-2 text-[#8E8E93] hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveDescription}
                  disabled={updateDescriptionMutation.isPending}
                  className="px-4 py-2 bg-[#6366F1] text-white rounded-xl font-medium hover:brightness-110 transition disabled:opacity-50 flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  {updateDescriptionMutation.isPending ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-[#8E8E93] text-sm leading-relaxed">
              {pitch.description || 'This demo showcases the product in action. Watch to see how it works and what problems it solves.'}
            </p>
          )}
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
                  <div className="text-white font-semibold">{founder.display_name || founder.full_name || founder.email || 'Founder'}</div>
                  {founder.username && (
                    <div className="text-[#8E8E93] text-sm">{founder.username}</div>
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

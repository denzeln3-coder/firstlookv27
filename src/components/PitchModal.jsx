import React, { useState } from 'react';
import { X, ArrowUp, MessageCircle, Share2, Bookmark, Link2, Twitter, Flag, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import ReportModal from './ReportModal';
import VideoPlayer from './VideoPlayer';

export default function PitchModal({ pitch, onClose, isInvestorView = false }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [showReportModal, setShowReportModal] = useState(false);
  const [showInvestorActions, setShowInvestorActions] = useState(false);
  const [showPassModal, setShowPassModal] = useState(false);
  const [passFeedback, setPassFeedback] = useState('');
  const viewStartTime = React.useRef(Date.now());

  React.useEffect(() => {
    const trackView = async () => {
      try {
        const user = await base44.auth.me().catch(() => null);
        await base44.entities.PitchView.create({
          pitch_id: pitch.id,
          user_id: user?.id || null,
          watch_time_seconds: 0,
          completed: false
        });
      } catch (error) {
        console.error('Failed to track view:', error);
      }
    };
    trackView();
    viewStartTime.current = Date.now();
  }, [pitch.id]);

  React.useEffect(() => {
    return () => {
      const watchTime = Math.round((Date.now() - viewStartTime.current) / 1000);
      if (watchTime > 1) {
        base44.auth.me()
          .then(user => {
            base44.entities.PitchView.create({
              pitch_id: pitch.id,
              user_id: user?.id || null,
              watch_time_seconds: watchTime,
              completed: watchTime >= 15
            }).catch(() => {});
          })
          .catch(() => {
            base44.entities.PitchView.create({
              pitch_id: pitch.id,
              user_id: null,
              watch_time_seconds: watchTime,
              completed: watchTime >= 15
            }).catch(() => {});
          });
      }
    };
  }, [pitch.id]);

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

  const { data: founder } = useQuery({
    queryKey: ['founder', pitch?.founder_id],
    queryFn: async () => {
      if (!pitch?.founder_id) return null;
      const users = await base44.entities.User.list();
      return users.find(u => u.id === pitch.founder_id);
    },
    enabled: !!pitch?.founder_id
  });

  const { data: isFollowingFounder = false } = useQuery({
    queryKey: ['isFollowingFounder', user?.id, pitch?.founder_id],
    queryFn: async () => {
      if (!user || !pitch?.founder_id || pitch.founder_id === user.id) return false;
      const follows = await base44.entities.Follow.filter({ 
        follower_id: user.id, 
        following_id: pitch.founder_id 
      });
      return follows.length > 0;
    },
    enabled: !!user && !!pitch?.founder_id && pitch?.founder_id !== user?.id
  });

  const { data: hasUpvoted = false } = useQuery({
    queryKey: ['upvote', pitch.id, user?.id],
    queryFn: async () => {
      if (!user) return false;
      const upvotes = await base44.entities.Upvote.filter({ user_id: user.id, pitch_id: pitch.id });
      return upvotes.length > 0;
    },
    enabled: !!user
  });

  const { data: hasBookmarked = false } = useQuery({
    queryKey: ['bookmark', pitch.id, user?.id],
    queryFn: async () => {
      if (!user) return false;
      const bookmarks = await base44.entities.Bookmark.filter({ user_id: user.id, pitch_id: pitch.id });
      return bookmarks.length > 0;
    },
    enabled: !!user
  });

  const { data: comments = [] } = useQuery({
    queryKey: ['comments', pitch.id],
    queryFn: () => base44.entities.Comment.filter({ pitch_id: pitch.id }, '-created_date')
  });

  const { data: commentUsers = [] } = useQuery({
    queryKey: ['commentUsers', comments.map(c => c.user_id)],
    queryFn: async () => {
      if (comments.length === 0) return [];
      const users = await base44.entities.User.list();
      return users;
    },
    enabled: comments.length > 0
  });

  const { data: pipelineItem } = useQuery({
    queryKey: ['pipelineItem', pitch.id, user?.id],
    queryFn: async () => {
      if (!user?.is_investor) return null;
      const items = await base44.entities.InvestorPipeline.filter({ 
        investor_id: user.id, 
        pitch_id: pitch.id 
      });
      return items[0] || null;
    },
    enabled: !!user?.is_investor
  });

  const investorActionMutation = useMutation({
    mutationFn: async ({ actionType, feedback }) => {
      await base44.entities.InvestorAction.create({
        investor_id: user.id,
        pitch_id: pitch.id,
        action_type: actionType,
        feedback: feedback || null
      });

      if (actionType === 'interested' || actionType === 'saved') {
        const existing = await base44.entities.InvestorPipeline.filter({
          investor_id: user.id,
          pitch_id: pitch.id
        });

        if (existing.length === 0) {
          await base44.entities.InvestorPipeline.create({
            investor_id: user.id,
            pitch_id: pitch.id,
            status: actionType === 'interested' ? 'interested' : 'watching',
            last_viewed: new Date().toISOString()
          });
        }

        if (actionType === 'interested' && pitch.founder_id) {
          await base44.functions.invoke('createNotification', {
            userId: pitch.founder_id,
            type: 'system',
            fromUserId: user.id,
            pitchId: pitch.id,
            message: 'An investor is interested in your pitch!',
            actionUrl: `/Profile?userId=${user.id}`
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investorActions'] });
      queryClient.invalidateQueries({ queryKey: ['investorPipeline'] });
      queryClient.invalidateQueries({ queryKey: ['pipelineItem'] });
    }
  });

  const handleInvestorAction = (actionType) => {
    if (!user) {
      setShowLoginPrompt(true);
      return;
    }

    if (actionType === 'passed') {
      setShowPassModal(true);
      return;
    }

    if (actionType === 'request_intro') {
      setShowInvestorActions(false);
      // Show intro request modal
      const message = prompt('Message to founder (optional):');
      if (message !== null) {
        base44.entities.IntroRequest.create({
          investor_id: user.id,
          founder_id: pitch.founder_id,
          pitch_id: pitch.id,
          message: message || ''
        }).then(() => {
          toast.success('Intro request sent!');
          base44.functions.invoke('createNotification', {
            userId: pitch.founder_id,
            type: 'system',
            fromUserId: user.id,
            pitchId: pitch.id,
            message: 'An investor wants to connect with you!',
            actionUrl: createPageUrl('IntroRequests')
          });
        });
      }
      return;
    }

    investorActionMutation.mutate({ actionType });

    const messages = {
      interested: 'Added to your pipeline! The founder has been notified.',
      saved: 'Saved to your pipeline',
      contacted: 'Marked as contacted'
    };

    toast.success(messages[actionType] || 'Action recorded');
    setShowInvestorActions(false);
  };

  const handlePass = () => {
    investorActionMutation.mutate({ 
      actionType: 'passed',
      feedback: passFeedback 
    });
    toast.success('Pitch hidden from your feed');
    setShowPassModal(false);
    setPassFeedback('');
    onClose();
  };

  const followMutation = useMutation({
    mutationFn: async () => {
      if (!user || !pitch?.founder_id) return;
      
      const existingFollow = await base44.entities.Follow.filter({
        follower_id: user.id,
        following_id: pitch.founder_id
      });

      if (existingFollow.length > 0) {
        await base44.entities.Follow.delete(existingFollow[0].id);
        toast.success('Unfollowed');
      } else {
        await base44.entities.Follow.create({
          follower_id: user.id,
          following_id: pitch.founder_id
        });
        toast.success(`Following ${founder?.display_name || founder?.username || 'founder'}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['isFollowingFounder'] });
    }
  });

  const upvoteMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      
      const upvotes = await base44.entities.Upvote.filter({ user_id: user.id, pitch_id: pitch.id });
      
      if (upvotes.length > 0) {
        await base44.entities.Upvote.delete(upvotes[0].id);
        await base44.entities.Pitch.update(pitch.id, {
          upvote_count: Math.max(0, (pitch.upvote_count || 0) - 1)
        });
      } else {
        await base44.entities.Upvote.create({ user_id: user.id, pitch_id: pitch.id });
        await base44.entities.Pitch.update(pitch.id, {
          upvote_count: (pitch.upvote_count || 0) + 1
        });
        
        if (pitch.founder_id && pitch.founder_id !== user.id) {
          await base44.functions.invoke('createNotification', {
            userId: pitch.founder_id,
            type: 'upvote',
            fromUserId: user.id,
            pitchId: pitch.id,
            message: `${user.display_name || user.username || 'Someone'} upvoted your pitch "${pitch.startup_name}"`,
            actionUrl: `/Explore?pitch=${pitch.id}`
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pitches'] });
      queryClient.invalidateQueries({ queryKey: ['upvote', pitch.id, user?.id] });
    }
  });

  const bookmarkMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      
      const bookmarks = await base44.entities.Bookmark.filter({ user_id: user.id, pitch_id: pitch.id });
      
      if (bookmarks.length > 0) {
        await base44.entities.Bookmark.delete(bookmarks[0].id);
        toast.success('Removed from bookmarks');
      } else {
        await base44.entities.Bookmark.create({ user_id: user.id, pitch_id: pitch.id });
        toast.success('Added to bookmarks');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookmark', pitch.id, user?.id] });
    }
  });

  const handleUpvote = async () => {
    if (!user) {
      setShowLoginPrompt(true);
      return;
    }
    upvoteMutation.mutate();
  };

  const handleBookmark = async () => {
    if (!user) {
      setShowLoginPrompt(true);
      return;
    }
    bookmarkMutation.mutate();
  };

  const handleComment = () => {
    if (!user) {
      setShowLoginPrompt(true);
      return;
    }
    setShowComments(true);
  };

  const submitComment = async () => {
    if (!commentText.trim() || !user) return;
    
    try {
      await base44.entities.Comment.create({
        pitch_id: pitch.id,
        user_id: user.id,
        text: commentText.trim()
      });
      
      if (pitch.founder_id && pitch.founder_id !== user.id) {
        await base44.functions.invoke('createNotification', {
          userId: pitch.founder_id,
          type: 'comment_reply',
          fromUserId: user.id,
          pitchId: pitch.id,
          message: `${user.display_name || user.username || 'Someone'} commented on your pitch "${pitch.startup_name}"`,
          actionUrl: `/Explore?pitch=${pitch.id}`
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ['comments', pitch.id] });
      setCommentText('');
      toast.success('Comment added!');
    } catch (error) {
      toast.error('Failed to add comment');
    }
  };

  const getPitchUrl = () => {
    return `${window.location.origin}${createPageUrl('Explore')}?pitch=${pitch.id}`;
  };

  const handleCopyLink = async () => {
    const url = getPitchUrl();
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied!');
      setShowShareMenu(false);
    } catch (err) {
      toast.error('Failed to copy link');
    }
  };

  const handleShareTwitter = () => {
    const url = getPitchUrl();
    const text = `Check out ${pitch.startup_name} on FirstLook!`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, '_blank');
    setShowShareMenu(false);
  };

  const handleShareLinkedIn = () => {
    const url = getPitchUrl();
    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
    window.open(linkedInUrl, '_blank');
    setShowShareMenu(false);
  };

  if (!pitch) {
    console.error('PitchModal: No pitch data provided');
    return null;
  }

  if (!pitch.video_url) {
    return (
      <div className="fixed inset-0 bg-[#000000] z-40 flex items-center justify-center">
        <div className="bg-[#18181B] border border-[rgba(255,255,255,0.1)] rounded-2xl p-8 max-w-sm mx-4 text-center">
          <h3 className="text-white text-xl font-bold mb-2">Video Unavailable</h3>
          <p className="text-[#A1A1AA] mb-6">This pitch video is currently unavailable. Please try again later.</p>
          <button 
            onClick={onClose}
            className="px-6 py-3 bg-[#6366F1] text-white font-semibold rounded-xl hover:brightness-110 transition"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const handleWatchDemo = async () => {
    try {
      const user = await base44.auth.me().catch(() => null);
      await base44.entities.LinkClick.create({
        pitch_id: pitch.id,
        user_id: user?.id || null,
        link_type: 'demo'
      });
    } catch (error) {
      console.error('Failed to track click:', error);
    }
    
    localStorage.setItem('selectedPitchId', pitch.id);
    navigate(createPageUrl('Demo'));
  };

  const handleMessageFounder = async () => {
    if (!user) {
      setShowLoginPrompt(true);
      return;
    }
    
    if (pitch.founder_id === user.id) {
      toast.error("You can't message yourself");
      return;
    }
    
    navigate(createPageUrl('Messages') + `?userId=${pitch.founder_id}`);
  };

  return (
    <div className="fixed inset-0 bg-[#000000] z-40">
      <div className="relative w-full h-full">
        <VideoPlayer
          videoUrl={pitch.video_url}
          poster={pitch.thumbnail_url}
          autoPlay={true}
          loop={true}
          startMuted={false}
          fallbackInitial={pitch.startup_name?.[0]?.toUpperCase() || '?'}
        />

        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black pointer-events-none" style={{ background: 'linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.8) 100%)' }} />

        <div className="absolute top-4 right-4 z-20 flex gap-2">
          <button
            onClick={() => setShowReportModal(true)}
            className="w-11 h-11 rounded-full bg-[rgba(0,0,0,0.5)] backdrop-blur-sm flex items-center justify-center text-white hover:bg-[rgba(0,0,0,0.7)] transition"
            title="Report this pitch"
          >
            <Flag className="w-5 h-5" />
          </button>
          <button
            onClick={onClose}
            className="w-11 h-11 rounded-full bg-[rgba(0,0,0,0.5)] backdrop-blur-sm flex items-center justify-center text-white hover:bg-[rgba(0,0,0,0.7)] transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="absolute bottom-20 left-4 right-20 z-10">
          <button
            onClick={() => {
              if (pitch.founder_id) {
                navigate(createPageUrl('Profile') + `?userId=${pitch.founder_id}`);
              }
            }}
            className="text-left hover:opacity-80 transition"
          >
            <h2 className="text-white font-bold text-[22px] mb-1" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
              {pitch.startup_name}
            </h2>
            <p className="text-[#E4E4E7] text-[14px] line-clamp-2 mb-2" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
              {pitch.one_liner}
            </p>
          </button>
          {founder && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate(createPageUrl('Profile') + `?userId=${pitch.founder_id}`)}
                className="text-[#E4E4E7] text-[12px] hover:text-white transition" 
                style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}
              >
                by @{founder.username || founder.display_name || 'founder'}
              </button>
              {user && pitch.founder_id !== user.id && (
                <button
                  onClick={() => followMutation.mutate()}
                  disabled={followMutation.isPending}
                  className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all ${
                    isFollowingFounder
                      ? 'bg-white/10 backdrop-blur-sm text-white border border-white/20 hover:bg-red-500/20 hover:text-red-500 hover:border-red-500/50'
                      : 'bg-white text-black hover:bg-white/90'
                  }`}
                >
                  {isFollowingFounder ? '✓ Following' : '+ Follow'}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="absolute bottom-28 right-4 flex flex-col gap-4 z-10">
          <button onClick={handleUpvote} className="flex flex-col items-center">
            <div className={`w-12 h-12 rounded-full backdrop-blur-sm flex items-center justify-center transition-all ${hasUpvoted ? 'bg-[#34D399]/20' : 'bg-black/50 hover:bg-black/70'}`}>
              <ArrowUp 
                className="w-6 h-6 transition-transform hover:scale-110" 
                style={{ color: hasUpvoted ? '#34D399' : 'white', fill: hasUpvoted ? '#34D399' : 'none' }} 
              />
            </div>
            <span className="text-white text-[12px] font-semibold mt-1" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
              {pitch.upvote_count || 0}
            </span>
          </button>

          <button onClick={handleComment} className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <span className="text-white text-[12px] font-semibold mt-1" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
              {comments.length}
            </span>
          </button>

          <button onClick={() => setShowShareMenu(true)} className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition">
            <Share2 className="w-6 h-6 text-white" />
          </button>

          <button onClick={handleBookmark} className={`w-12 h-12 rounded-full backdrop-blur-sm flex items-center justify-center transition-all ${hasBookmarked ? 'bg-[#6366F1]/20' : 'bg-black/50 hover:bg-black/70'}`}>
            <Bookmark 
              className="w-6 h-6 transition-transform hover:scale-110" 
              style={{ color: hasBookmarked ? '#6366F1' : 'white', fill: hasBookmarked ? '#6366F1' : 'none' }} 
            />
          </button>
        </div>

        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3 px-4 z-10">
          {isInvestorView && user?.is_investor ? (
            <>
              <button
                onClick={() => setShowInvestorActions(true)}
                className="flex-1 max-w-[200px] px-6 py-3 bg-white text-black text-[14px] font-semibold rounded-full hover:bg-gray-100 transition shadow-[0_4px_20px_rgba(0,0,0,0.3)]"
              >
                Investor Actions
              </button>
              <button
                onClick={handleWatchDemo}
                className="px-6 py-3 bg-[#6366F1] text-white text-[14px] font-semibold rounded-full hover:brightness-110 transition shadow-[0_4px_20px_rgba(99,102,241,0.4)]"
              >
                Watch Demo
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleWatchDemo}
                className="flex-1 max-w-[200px] px-6 py-3 bg-white text-black text-[14px] font-semibold rounded-full hover:bg-gray-100 transition shadow-[0_4px_20px_rgba(0,0,0,0.3)]"
              >
                Watch Demo
              </button>
              {pitch.founder_id && pitch.founder_id !== user?.id && (
                <button
                  onClick={handleMessageFounder}
                  className="px-6 py-3 bg-[#6366F1] text-white text-[14px] font-semibold rounded-full hover:brightness-110 transition shadow-[0_4px_20px_rgba(99,102,241,0.4)] flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Message
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {showComments && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end justify-center z-[60]" onClick={() => setShowComments(false)}>
          <div className="bg-[#18181B] rounded-t-3xl w-full max-w-[500px] flex flex-col border-t border-[rgba(255,255,255,0.1)]" style={{ maxHeight: '70vh' }} onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-[rgba(255,255,255,0.1)]">
              <div className="w-12 h-1.5 bg-[#3F3F46] rounded-full mx-auto mb-4" />
              <h3 className="text-white text-xl font-bold">{comments.length} Comments</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {comments.length === 0 ? (
                <div className="text-center py-8 text-[#71717A]">No comments yet. Be the first!</div>
              ) : (
                comments.map((comment) => {
                  const commenter = commentUsers.find(u => u.id === comment.user_id);
                  return (
                    <div key={comment.id} className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center text-white text-xs font-bold overflow-hidden flex-shrink-0">
                        {commenter?.avatar_url ? (
                          <img src={commenter.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span>{(commenter?.display_name || commenter?.full_name || commenter?.email)?.[0]?.toUpperCase()}</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="text-white font-semibold text-sm mb-1">{commenter?.display_name || commenter?.full_name || 'User'}</div>
                        <div className="text-[#A1A1AA] text-sm">{comment.text}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-4 border-t border-[rgba(255,255,255,0.1)] bg-[#0A0A0A]">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && commentText.trim() && submitComment()}
                  placeholder="Add a comment..."
                  autoFocus
                  className="flex-1 px-4 py-3 bg-[#3F3F46] text-white rounded-xl border border-[rgba(255,255,255,0.1)] focus:outline-none focus:ring-2 focus:ring-[#6366F1] placeholder:text-[#A1A1AA]"
                />
                <button
                  onClick={submitComment}
                  disabled={!commentText.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white font-semibold rounded-xl hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showShareMenu && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-end justify-center z-20" onClick={() => setShowShareMenu(false)}>
          <div className="bg-[#18181B] rounded-t-3xl w-full max-w-[500px] p-6 pb-8 border-t border-[rgba(255,255,255,0.1)]" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-1.5 bg-[#3F3F46] rounded-full mx-auto mb-6" />
            <h3 className="text-white text-xl font-bold mb-6">Share</h3>
            <div className="space-y-3">
              <button onClick={handleCopyLink} className="w-full flex items-center gap-4 px-4 py-4 bg-[#27272A] hover:bg-[#3F3F46] rounded-xl transition">
                <div className="w-12 h-12 bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] rounded-full flex items-center justify-center">
                  <Link2 className="w-6 h-6 text-white" />
                </div>
                <span className="text-white font-medium">Copy Link</span>
              </button>
              
              <button onClick={handleShareTwitter} className="w-full flex items-center gap-4 px-4 py-4 bg-[#27272A] hover:bg-[#3F3F46] rounded-xl transition">
                <div className="w-12 h-12 bg-[#1DA1F2] rounded-full flex items-center justify-center">
                  <Twitter className="w-6 h-6 text-white" fill="white" />
                </div>
                <span className="text-white font-medium">Share to Twitter</span>
              </button>
              
              <button onClick={handleShareLinkedIn} className="w-full flex items-center gap-4 px-4 py-4 bg-[#27272A] hover:bg-[#3F3F46] rounded-xl transition">
                <div className="w-12 h-12 bg-[#0A66C2] rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                  </svg>
                </div>
                <span className="text-white font-medium">Share to LinkedIn</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {showLoginPrompt && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-20">
          <div className="bg-[#18181B] border border-[rgba(255,255,255,0.1)] rounded-2xl p-8 max-w-sm mx-4">
            <h3 className="text-white text-xl font-bold mb-2">Login Required</h3>
            <p className="text-[#A1A1AA] mb-6">Please log in to upvote pitches and interact with the community.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowLoginPrompt(false)} className="flex-1 px-4 py-3 bg-[#27272A] text-white rounded-xl hover:bg-[#3F3F46] transition">
                Cancel
              </button>
              <button onClick={() => base44.auth.redirectToLogin(window.location.pathname)} className="flex-1 px-4 py-3 bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white font-semibold rounded-xl hover:brightness-110 transition">
                Log In
              </button>
            </div>
          </div>
        </div>
      )}

      <ReportModal
        pitch={pitch}
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
      />

      {showInvestorActions && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-end justify-center z-20" onClick={() => setShowInvestorActions(false)}>
          <div className="bg-[#18181B] rounded-t-3xl w-full max-w-[500px] p-6 pb-8 border-t border-[rgba(255,255,255,0.1)]" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-1.5 bg-[#3F3F46] rounded-full mx-auto mb-6" />
            <h3 className="text-white text-xl font-bold mb-6">Investor Actions</h3>
            <div className="space-y-3">
              <button
                onClick={() => handleInvestorAction('interested')}
                className="w-full flex items-center justify-between px-4 py-4 bg-[#27272A] hover:bg-[#3F3F46] rounded-xl transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#22C55E]/20 rounded-full flex items-center justify-center">
                    <span className="text-2xl">👍</span>
                  </div>
                  <div className="text-left">
                    <div className="text-white font-semibold">Interested</div>
                    <div className="text-[#8E8E93] text-xs">Add to pipeline & notify founder</div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleInvestorAction('saved')}
                className="w-full flex items-center justify-between px-4 py-4 bg-[#27272A] hover:bg-[#3F3F46] rounded-xl transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#6366F1]/20 rounded-full flex items-center justify-center">
                    <span className="text-2xl">💾</span>
                  </div>
                  <div className="text-left">
                    <div className="text-white font-semibold">Save to Pipeline</div>
                    <div className="text-[#8E8E93] text-xs">Track without notifying</div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleInvestorAction('request_intro')}
                className="w-full flex items-center justify-between px-4 py-4 bg-[#27272A] hover:bg-[#3F3F46] rounded-xl transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#8B5CF6]/20 rounded-full flex items-center justify-center">
                    <span className="text-2xl">📧</span>
                  </div>
                  <div className="text-left">
                    <div className="text-white font-semibold">Request Intro</div>
                    <div className="text-[#8E8E93] text-xs">Get founder's contact</div>
                  </div>
                </div>
              </button>

              <button
                onClick={handleMessageFounder}
                className="w-full flex items-center justify-between px-4 py-4 bg-[#27272A] hover:bg-[#3F3F46] rounded-xl transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#3B82F6]/20 rounded-full flex items-center justify-center">
                    <span className="text-2xl">💬</span>
                  </div>
                  <div className="text-left">
                    <div className="text-white font-semibold">Message Founder</div>
                    <div className="text-[#8E8E93] text-xs">Start a conversation</div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleInvestorAction('passed')}
                className="w-full flex items-center justify-between px-4 py-4 bg-[#27272A] hover:bg-[#3F3F46] rounded-xl transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#EF4444]/20 rounded-full flex items-center justify-center">
                    <span className="text-2xl">👎</span>
                  </div>
                  <div className="text-left">
                    <div className="text-white font-semibold">Pass</div>
                    <div className="text-[#8E8E93] text-xs">Hide from feed</div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowInvestorActions(false);
                  navigate(createPageUrl('InvestorFeedback') + `?pitchId=${pitch.id}`);
                }}
                className="w-full flex items-center justify-between px-4 py-4 bg-[#27272A] hover:bg-[#3F3F46] rounded-xl transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#F59E0B]/20 rounded-full flex items-center justify-center">
                    <span className="text-2xl">📝</span>
                  </div>
                  <div className="text-left">
                    <div className="text-white font-semibold">Give Feedback</div>
                    <div className="text-[#8E8E93] text-xs">Help founder improve</div>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {showPassModal && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-20">
          <div className="bg-[#18181B] border border-[rgba(255,255,255,0.1)] rounded-2xl p-6 max-w-md mx-4">
            <h3 className="text-white text-xl font-bold mb-2">Pass on this pitch?</h3>
            <p className="text-[#A1A1AA] text-sm mb-4">This will hide it from your feed. Optionally, provide anonymous feedback to help the founder improve.</p>
            <textarea
              value={passFeedback}
              onChange={(e) => setPassFeedback(e.target.value)}
              placeholder="Optional feedback for the founder (anonymous)..."
              className="w-full px-3 py-2 bg-[#27272A] text-white border border-[#3F3F46] rounded-xl focus:outline-none focus:border-[#6366F1] mb-4 resize-none"
              rows={3}
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowPassModal(false);
                  setPassFeedback('');
                }}
                className="flex-1 px-4 py-3 bg-[#27272A] text-white rounded-xl hover:bg-[#3F3F46] transition"
              >
                Cancel
              </button>
              <button
                onClick={handlePass}
                className="flex-1 px-4 py-3 bg-[#EF4444] text-white font-semibold rounded-xl hover:brightness-110 transition"
              >
                Pass
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
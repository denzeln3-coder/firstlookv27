import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { X, ArrowUp, MessageCircle, Share2, Bookmark, Link2, Twitter, Flag, Send, ExternalLink, Users, MapPin, TrendingUp, DollarSign, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import ReportModal from './ReportModal';
import VideoPlayer from './VideoPlayer';
import { HeartAnimation } from './HeartAnimation';

export default function PitchModal({ pitch, onClose, isInvestorView = false, isHunterView = false }) {
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
  const [showInfoCard, setShowInfoCard] = useState(false);
  const [localUpvoteCount, setLocalUpvoteCount] = useState(pitch.upvote_count || 0);
  const [investorNotes, setInvestorNotes] = useState('');
  const [investorStatus, setInvestorStatus] = useState(null);
  const [savingNotes, setSavingNotes] = useState(false);
  const [hunterRating, setHunterRating] = useState(0);
  const [hunterFeedback, setHunterFeedback] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [existingFeedback, setExistingFeedback] = useState(null);
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);
  const lastTapRef = useRef(0);
  const viewStartTime = useRef(Date.now());

  useEffect(() => {
    const trackView = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('pitch_views').insert({ startup_id: pitch.id, user_id: user?.id || null, watch_time_seconds: 0, completed: false });
        await supabase.from('startups').update({ view_count: (pitch.view_count || 0) + 1 }).eq('id', pitch.id);
      } catch (error) { console.error('Failed to track view:', error); }
    };
    trackView();
    viewStartTime.current = Date.now();
  }, [pitch.id]);

  useEffect(() => {
    return () => {
      const watchTime = Math.round((Date.now() - viewStartTime.current) / 1000);
      if (watchTime > 1) {
        supabase.auth.getUser().then(({ data: { user } }) => {
          supabase.from('pitch_views').insert({ startup_id: pitch.id, user_id: user?.id || null, watch_time_seconds: watchTime, completed: watchTime >= 15 });
        });
      }
    };
  }, [pitch.id]);

  useEffect(() => { setLocalUpvoteCount(pitch.upvote_count || 0); }, [pitch.upvote_count]);

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: async () => { const { data: { user } } = await supabase.auth.getUser(); return user; } });

  const { data: existingNotes } = useQuery({
    queryKey: ['investorNotes', user?.id, pitch.id],
    queryFn: async () => { const { data } = await supabase.from('investor_notes').select('*').eq('investor_id', user.id).eq('startup_id', pitch.id).single(); return data; },
    enabled: !!user && isInvestorView
  });

  useEffect(() => { if (existingNotes) { setInvestorNotes(existingNotes.notes || ''); setInvestorStatus(existingNotes.status || null); } }, [existingNotes]);

  const { data: founder } = useQuery({
    queryKey: ['founder', pitch?.founder_id],
    queryFn: async () => { if (!pitch?.founder_id) return null; const { data, error } = await supabase.from('users').select('*').eq('id', pitch.founder_id).single(); if (error) return null; return data; },
    enabled: !!pitch?.founder_id
  });

  const { data: isFollowingFounder = false } = useQuery({
    queryKey: ['isFollowingFounder', user?.id, pitch?.founder_id],
    queryFn: async () => { if (!user || !pitch?.founder_id || pitch.founder_id === user.id) return false; const { data } = await supabase.from('follows').select('*').eq('follower_id', user.id).eq('following_id', pitch.founder_id); return (data || []).length > 0; },
    enabled: !!user && !!pitch?.founder_id && pitch?.founder_id !== user?.id
  });

  const { data: hasUpvoted = false } = useQuery({
    queryKey: ['upvote', pitch.id, user?.id],
    queryFn: async () => { if (!user) return false; const { data } = await supabase.from('upvotes').select('*').eq('user_id', user.id).eq('startup_id', pitch.id); return (data || []).length > 0; },
    enabled: !!user
  });

  const { data: hasBookmarked = false } = useQuery({
    queryKey: ['bookmark', pitch.id, user?.id],
    queryFn: async () => { if (!user) return false; const { data } = await supabase.from('bookmarks').select('*').eq('user_id', user.id).eq('startup_id', pitch.id); return (data || []).length > 0; },
    enabled: !!user
  });

  const { data: comments = [] } = useQuery({
    queryKey: ['comments', pitch.id],
    queryFn: async () => { const { data } = await supabase.from('comments').select('*').eq('startup_id', pitch.id).order('created_at', { ascending: false }); return data || []; }
  });

  const { data: commentUsers = [] } = useQuery({
    queryKey: ['commentUsers', comments.map(c => c.user_id)],
    queryFn: async () => { if (comments.length === 0) return []; const userIds = [...new Set(comments.map(c => c.user_id))]; const { data } = await supabase.from('users').select('*').in('id', userIds); return data || []; },
    enabled: comments.length > 0
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      if (!user || !pitch?.founder_id) return;
      const { data: existingFollow } = await supabase.from('follows').select('*').eq('follower_id', user.id).eq('following_id', pitch.founder_id);
      if (existingFollow && existingFollow.length > 0) { await supabase.from('follows').delete().eq('id', existingFollow[0].id); toast.success('Unfollowed'); }
      else { await supabase.from('follows').insert({ follower_id: user.id, following_id: pitch.founder_id }); toast.success(`Following ${founder?.display_name || founder?.full_name || founder?.username || 'founder'}`); }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['isFollowingFounder'] }); }
  });

  const upvoteMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { data: upvotes } = await supabase.from('upvotes').select('*').eq('user_id', user.id).eq('startup_id', pitch.id);
      if (upvotes && upvotes.length > 0) {
        await supabase.from('upvotes').delete().eq('id', upvotes[0].id);
        await supabase.from('startups').update({ upvote_count: Math.max(0, localUpvoteCount - 1) }).eq('id', pitch.id);
        setLocalUpvoteCount(prev => Math.max(0, prev - 1));
      } else {
        await supabase.from('upvotes').insert({ user_id: user.id, startup_id: pitch.id });
        await supabase.from('startups').update({ upvote_count: localUpvoteCount + 1 }).eq('id', pitch.id);
        setLocalUpvoteCount(prev => prev + 1);
        setShowHeartAnimation(true);
        if (navigator.vibrate) navigator.vibrate(50);
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['pitches'] }); queryClient.invalidateQueries({ queryKey: ['upvote', pitch.id, user?.id] }); }
  });

  const bookmarkMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { data: bookmarks } = await supabase.from('bookmarks').select('*').eq('user_id', user.id).eq('startup_id', pitch.id);
      if (bookmarks && bookmarks.length > 0) { await supabase.from('bookmarks').delete().eq('id', bookmarks[0].id); toast.success('Removed from bookmarks'); }
      else { await supabase.from('bookmarks').insert({ user_id: user.id, startup_id: pitch.id }); toast.success('Added to bookmarks'); }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['bookmark', pitch.id, user?.id] }); }
  });

  const handleUpvote = async () => { if (!user) { setShowLoginPrompt(true); return; } upvoteMutation.mutate(); };
  const handleDoubleTap = (e) => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      if (!hasUpvoted && user) handleUpvote();
      else if (!user) setShowLoginPrompt(true);
      else { setShowHeartAnimation(true); if (navigator.vibrate) navigator.vibrate(50); }
    }
    lastTapRef.current = now;
  };
  const handleBookmark = async () => { if (!user) { setShowLoginPrompt(true); return; } bookmarkMutation.mutate(); };
  const handleComment = () => { if (!user) { setShowLoginPrompt(true); return; } setShowComments(true); };
  const submitComment = async () => {
    if (!commentText.trim() || !user) return;
    try { await supabase.from('comments').insert({ startup_id: pitch.id, user_id: user.id, content: commentText.trim() }); queryClient.invalidateQueries({ queryKey: ['comments', pitch.id] }); setCommentText(''); toast.success('Comment added!'); }
    catch (error) { toast.error('Failed to add comment'); }
  };
  const getPitchUrl = () => `${window.location.origin}${createPageUrl('Explore')}?pitch=${pitch.id}`;
  const handleCopyLink = async () => { try { await navigator.clipboard.writeText(getPitchUrl()); toast.success('Link copied!'); setShowShareMenu(false); } catch { toast.error('Failed to copy link'); } };
  const handleShareTwitter = () => { window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out ${pitch.startup_name} on FirstLook!`)}&url=${encodeURIComponent(getPitchUrl())}`, '_blank'); setShowShareMenu(false); };
  const handleShareLinkedIn = () => { window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(getPitchUrl())}`, '_blank'); setShowShareMenu(false); };
  const handleWatchDemo = () => { localStorage.setItem('selectedPitchId', pitch.id); navigate(createPageUrl('Demo')); };
  const handleMessageFounder = () => { if (!user) { setShowLoginPrompt(true); return; } if (pitch.founder_id === user.id) { toast.error("You can't message yourself"); return; } navigate(createPageUrl('Messages') + `?userId=${pitch.founder_id}`); };
  const handleSaveNotes = async () => {
    if (!user) return;
    setSavingNotes(true);
    try {
      await supabase.from('investor_notes').upsert({ investor_id: user.id, startup_id: pitch.id, notes: investorNotes, status: investorStatus, updated_at: new Date().toISOString() }, { onConflict: 'investor_id,startup_id' });
      toast.success('Notes saved!');
      queryClient.invalidateQueries({ queryKey: ['investorNotes', user?.id, pitch.id] });
    } catch (error) { toast.error('Failed to save notes'); }
    finally { setSavingNotes(false); }
  };

  const handleSubmitFeedback = async () => {
    if (!user || hunterRating === 0) { toast.error("Please select a rating"); return; }
    setSubmittingFeedback(true);
    try {
      await supabase.from("startup_feedback").upsert({ user_id: user.id, startup_id: pitch.id, rating: hunterRating, feedback: hunterFeedback, created_at: new Date().toISOString() }, { onConflict: "user_id,startup_id" });
      toast.success("Feedback submitted!");
      setExistingFeedback({ rating: hunterRating, feedback: hunterFeedback });
    } catch (error) { toast.error("Failed to submit feedback"); }
    finally { setSubmittingFeedback(false); }
  };

  const handleStatusChange = async (newStatus) => {
    setInvestorStatus(newStatus);
    if (!user) return;
    try {
      await supabase.from('investor_notes').upsert({ investor_id: user.id, startup_id: pitch.id, status: newStatus, notes: investorNotes, updated_at: new Date().toISOString() }, { onConflict: 'investor_id,startup_id' });
      toast.success({ interested: '✅ Marked as Interested', watching: '👀 Added to Watch List', passed: '❌ Passed' }[newStatus] || 'Status updated');
      queryClient.invalidateQueries({ queryKey: ['investorNotes', user?.id, pitch.id] });
    } catch (error) { toast.error('Failed to update status'); }
  };

  const handleInvestorAction = async (actionType) => {
    if (!user) { setShowLoginPrompt(true); return; }
    if (actionType === 'passed') { setShowPassModal(true); return; }
    if (actionType === 'request_intro') {
      setShowInvestorActions(false);
      const message = prompt('Message to founder (optional):');
      if (message !== null) { await supabase.from('intro_requests').insert({ investor_id: user.id, founder_id: pitch.founder_id, startup_id: pitch.id, message: message || '' }); toast.success('Intro request sent!'); }
      return;
    }
    await supabase.from('investor_actions').insert({ investor_id: user.id, startup_id: pitch.id, action_type: actionType });
    toast.success({ interested: 'Added to your pipeline!', saved: 'Saved to your pipeline', contacted: 'Marked as contacted' }[actionType] || 'Action recorded');
    setShowInvestorActions(false);
  };

  const handlePass = async () => {
    await supabase.from('investor_actions').insert({ investor_id: user.id, startup_id: pitch.id, action_type: 'passed', feedback: passFeedback || null });
    await handleStatusChange('passed');
    toast.success('Pitch hidden from your feed');
    setShowPassModal(false);
    setPassFeedback('');
    onClose();
  };

  const getDisplayName = (userObj) => userObj?.display_name || userObj?.full_name || userObj?.username || userObj?.email?.split('@')[0] || 'User';
  const getUsername = (userObj) => userObj?.username || userObj?.display_name || userObj?.full_name || 'user';

  if (!pitch) return null;
  if (!pitch.video_url) {
    return (
      <div className="fixed inset-0 bg-black z-40 flex items-center justify-center">
        <div className="bg-[#18181B] border border-[rgba(255,255,255,0.1)] rounded-2xl p-8 max-w-sm mx-4 text-center">
          <h3 className="text-white text-xl font-bold mb-2">Video Unavailable</h3>
          <p className="text-[#A1A1AA] mb-6">This pitch video is currently unavailable.</p>
          <button onClick={onClose} className="px-6 py-3 bg-[#6366F1] text-white font-semibold rounded-xl">Close</button>
        </div>
      </div>
    );
  }

  const stageColors = { 'MVP': 'bg-[#F59E0B]/20 text-[#F59E0B]', 'Beta': 'bg-[#3B82F6]/20 text-[#3B82F6]', 'Launched': 'bg-[#22C55E]/20 text-[#22C55E]', 'Scaling': 'bg-[#8B5CF6]/20 text-[#8B5CF6]' };
  const fundingColors = { 'Pre-seed': 'bg-[#EC4899]/20 text-[#EC4899]', 'Seed': 'bg-[#F59E0B]/20 text-[#F59E0B]', 'Series A': 'bg-[#22C55E]/20 text-[#22C55E]', 'Series B+': 'bg-[#3B82F6]/20 text-[#3B82F6]', 'Bootstrapped': 'bg-[#8B5CF6]/20 text-[#8B5CF6]' };
  const statusColors = { interested: 'bg-[#22C55E] text-white', watching: 'bg-[#F59E0B] text-white', passed: 'bg-[#EF4444] text-white' };

  return (
    <div className="fixed inset-0 bg-black z-40">
      <HeartAnimation show={showHeartAnimation} onComplete={() => setShowHeartAnimation(false)} />
      
      {/* Main container - centers video */}
      <div className="relative w-full h-full flex items-center justify-center" onClick={handleDoubleTap}>
        {/* Video container - 9:16 aspect ratio */}
        <div className="relative h-full" style={{ aspectRatio: '9/16', maxWidth: '100%' }}>
          <VideoPlayer videoUrl={pitch.video_url} poster={pitch.thumbnail_url} autoPlay={true} loop={true} startMuted={false} fallbackInitial={pitch.startup_name?.[0]?.toUpperCase() || '?'} />

          {/* Gradient overlay */}
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.7) 80%, rgba(0,0,0,0.9) 100%)' }} />

          {/* Top buttons */}
          <div className="absolute top-4 right-4 z-20 flex gap-2">
            <button onClick={(e) => { e.stopPropagation(); setShowReportModal(true); }} className="w-11 h-11 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white"><Flag className="w-5 h-5" /></button>
            <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="w-11 h-11 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white"><X className="w-6 h-6" /></button>
          </div>

          {isInvestorView && investorStatus && (
            <div className="absolute top-4 left-4 z-20">
              <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${statusColors[investorStatus]}`}>
                {investorStatus === 'interested' && '✅ Interested'}{investorStatus === 'watching' && '👀 Watching'}{investorStatus === 'passed' && '❌ Passed'}
              </span>
            </div>
          )}

          {/* Bottom left - Startup info */}
          <div className="absolute bottom-20 left-4 right-16 z-10" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => pitch.founder_id && navigate(createPageUrl('Profile') + `?userId=${pitch.founder_id}`)} className="text-left hover:opacity-80 transition">
              <div className="flex items-center gap-3 mb-2">
                {pitch.logo_url ? <img src={pitch.logo_url} alt={pitch.startup_name} className="w-10 h-10 rounded-lg object-cover border border-white/20" /> : <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center text-white font-bold">{pitch.startup_name?.[0]?.toUpperCase()}</div>}
                <div>
                  <h2 className="text-white font-bold text-lg" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>{pitch.startup_name}</h2>
                  <div className="flex items-center gap-2">
                    <span className="text-[#A1A1AA] text-xs px-2 py-0.5 bg-white/10 rounded-full">{pitch.category}</span>
                    {pitch.product_stage && <span className={`text-xs px-2 py-0.5 rounded-full ${stageColors[pitch.product_stage] || 'bg-white/10 text-white'}`}>{pitch.product_stage}</span>}
                  </div>
                </div>
              </div>
              <p className="text-[#E4E4E7] text-sm line-clamp-2 mb-2" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>{pitch.one_liner}</p>
            </button>
            <button onClick={() => setShowInfoCard(!showInfoCard)} className="flex items-center gap-1 text-[#6366F1] text-xs font-semibold hover:text-[#818CF8] transition">
              {showInfoCard ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}{showInfoCard ? 'Hide details' : 'View startup details'}
            </button>
            {founder && (
              <div className="flex items-center gap-2 mt-2">
                <button onClick={() => navigate(createPageUrl('Profile') + `?userId=${pitch.founder_id}`)} className="text-[#E4E4E7] text-xs hover:text-white transition">by @{getUsername(founder)}</button>
                {user && pitch.founder_id !== user.id && (
                  <button onClick={() => followMutation.mutate()} disabled={followMutation.isPending} className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all ${isFollowingFounder ? 'bg-white/10 text-white border border-white/20' : 'bg-white text-black'}`}>
                    {isFollowingFounder ? '✓ Following' : '+ Follow'}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Right side actions */}
          <div className="absolute bottom-28 right-4 flex flex-col gap-4 z-10" onClick={(e) => e.stopPropagation()}>
            <button onClick={handleUpvote} className="flex flex-col items-center group">
              <div className={`w-12 h-12 rounded-full backdrop-blur-sm flex items-center justify-center transition-all ${hasUpvoted ? 'bg-[#34D399]/20' : 'bg-black/50'}`}>
                <ArrowUp className="w-6 h-6" style={{ color: hasUpvoted ? '#34D399' : 'white', fill: hasUpvoted ? '#34D399' : 'none' }} />
              </div>
              <span className={`text-xs font-semibold mt-1 ${hasUpvoted ? 'text-[#34D399]' : 'text-white'}`}>{localUpvoteCount}</span>
            </button>
            <button onClick={handleComment} className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center"><MessageCircle className="w-6 h-6 text-white" /></div>
              <span className="text-white text-xs font-semibold mt-1">{comments.length}</span>
            </button>
            <button onClick={() => setShowShareMenu(true)} className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center"><Share2 className="w-6 h-6 text-white" /></button>
            <button onClick={handleBookmark} className={`w-12 h-12 rounded-full backdrop-blur-sm flex items-center justify-center ${hasBookmarked ? 'bg-white/20' : 'bg-black/50'}`}><Bookmark className="w-6 h-6 text-white" fill={hasBookmarked ? 'white' : 'none'} /></button>
            {isInvestorView && <button onClick={() => setShowInvestorActions(true)} className="w-12 h-12 rounded-full bg-[#6366F1]/50 backdrop-blur-sm flex items-center justify-center"><FileText className="w-6 h-6 text-white" /></button>}
          </div>

          {/* Bottom CTA */}
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3 px-4 z-10" onClick={(e) => e.stopPropagation()}>
            {isInvestorView ? (
              <>
                <button onClick={() => setShowInvestorActions(true)} className="flex-1 max-w-[200px] px-6 py-3 bg-white text-black text-sm font-semibold rounded-full">Investor Actions</button>
                <button onClick={handleWatchDemo} className="px-6 py-3 bg-[#6366F1] text-white text-sm font-semibold rounded-full">Watch Demo</button>
              </>
            ) : (
              <>
                <button onClick={handleWatchDemo} className="flex-1 max-w-[200px] px-6 py-3 bg-white text-black text-sm font-semibold rounded-full">Watch Demo</button>
                {pitch.founder_id && pitch.founder_id !== user?.id && <button onClick={handleMessageFounder} className="px-6 py-3 bg-[#6366F1] text-white text-sm font-semibold rounded-full flex items-center gap-2"><Send className="w-4 h-4" />Message</button>}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Info Card */}
      {showInfoCard && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={() => setShowInfoCard(false)}>
          <div className="absolute bottom-20 left-0 right-0 bg-[#18181B] rounded-t-3xl p-6 pb-8 border-t border-white/10 max-h-[60vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-1.5 bg-[#3F3F46] rounded-full mx-auto mb-6" />
            <div className="flex items-start gap-4 mb-6">
              {pitch.logo_url ? <img src={pitch.logo_url} alt={pitch.startup_name} className="w-16 h-16 rounded-xl object-cover border border-white/10" /> : <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center text-white text-2xl font-bold">{pitch.startup_name?.[0]?.toUpperCase()}</div>}
              <div className="flex-1"><h2 className="text-white text-xl font-bold">{pitch.startup_name}</h2><p className="text-[#A1A1AA] text-sm mt-1">{pitch.one_liner}</p></div>
            </div>
            <div className="flex flex-wrap gap-2 mb-6">
              <span className="px-3 py-1.5 bg-[#6366F1]/20 text-[#6366F1] text-sm font-medium rounded-full">{pitch.category}</span>
              {pitch.product_stage && <span className={`px-3 py-1.5 text-sm font-medium rounded-full ${stageColors[pitch.product_stage] || 'bg-white/10 text-white'}`}>{pitch.product_stage}</span>}
              {pitch.funding_stage && <span className={`px-3 py-1.5 text-sm font-medium rounded-full ${fundingColors[pitch.funding_stage] || 'bg-white/10 text-white'}`}>{pitch.funding_stage}</span>}
            </div>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {pitch.team_size && <div className="p-4 bg-white/5 rounded-xl"><div className="flex items-center gap-2 text-[#8E8E93] mb-1"><Users className="w-4 h-4" /><span className="text-xs uppercase">Team Size</span></div><div className="text-white text-lg font-semibold">{pitch.team_size}</div></div>}
              {pitch.location && <div className="p-4 bg-white/5 rounded-xl"><div className="flex items-center gap-2 text-[#8E8E93] mb-1"><MapPin className="w-4 h-4" /><span className="text-xs uppercase">Location</span></div><div className="text-white text-lg font-semibold">{pitch.location}</div></div>}
              {pitch.funding_amount && <div className="p-4 bg-white/5 rounded-xl"><div className="flex items-center gap-2 text-[#8E8E93] mb-1"><DollarSign className="w-4 h-4" /><span className="text-xs uppercase">Raised</span></div><div className="text-white text-lg font-semibold">{pitch.funding_amount}</div></div>}
              {pitch.traction_metrics && <div className="p-4 bg-white/5 rounded-xl"><div className="flex items-center gap-2 text-[#8E8E93] mb-1"><TrendingUp className="w-4 h-4" /><span className="text-xs uppercase">Traction</span></div><div className="text-white text-base font-semibold">{pitch.traction_metrics}</div></div>}
            </div>
            <div className="space-y-2 mb-6">
              {(pitch.product_url || pitch.website_url) && <a href={pitch.product_url || pitch.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition"><ExternalLink className="w-5 h-5 text-[#6366F1]" /><span className="text-white text-sm">{(pitch.product_url || pitch.website_url).replace(/^https?:\/\//, '')}</span></a>}
              {pitch.twitter_url && <a href={pitch.twitter_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition"><Twitter className="w-5 h-5 text-[#1DA1F2]" /><span className="text-white text-sm">Twitter</span></a>}
            </div>
            {founder && (
              <div className="p-4 bg-white/5 rounded-xl">
                <div className="text-[#8E8E93] text-xs uppercase mb-3">Founder</div>
                <button onClick={() => { setShowInfoCard(false); navigate(createPageUrl('Profile') + `?userId=${pitch.founder_id}`); }} className="flex items-center gap-3 w-full hover:opacity-80 transition">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center overflow-hidden">
                    {founder.avatar_url ? <img src={founder.avatar_url} alt="" className="w-full h-full object-cover" /> : <span className="text-white font-bold">{getDisplayName(founder)[0]?.toUpperCase()}</span>}
                  </div>
                  <div className="text-left"><div className="text-white font-semibold">{getDisplayName(founder)}</div>{founder.username && <div className="text-[#8E8E93] text-sm">@{founder.username}</div>}</div>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Comments Modal */}
      {showComments && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end justify-center z-[60]" onClick={() => setShowComments(false)}>
          <div className="bg-[#18181B] rounded-t-3xl w-full max-w-[500px] flex flex-col border-t border-white/10" style={{ maxHeight: '60vh', marginBottom: '80px' }} onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-white/10"><div className="w-12 h-1.5 bg-[#3F3F46] rounded-full mx-auto mb-4" /><h3 className="text-white text-xl font-bold">{comments.length} Comments</h3></div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {comments.length === 0 ? <div className="text-center py-8 text-[#71717A]">No comments yet. Be the first!</div> : comments.map((comment) => {
                const commenter = commentUsers.find(u => u.id === comment.user_id);
                return (
                  <div key={comment.id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center text-white text-xs font-bold overflow-hidden flex-shrink-0">
                      {commenter?.avatar_url ? <img src={commenter.avatar_url} alt="" className="w-full h-full object-cover" /> : <span>{getDisplayName(commenter)[0]?.toUpperCase()}</span>}
                    </div>
                    <div className="flex-1"><div className="text-white font-semibold text-sm mb-1">{getDisplayName(commenter)}</div><div className="text-[#A1A1AA] text-sm">{comment.content}</div></div>
                  </div>
                );
              })}
            </div>
            <div className="p-4 border-t border-white/10 bg-[#0A0A0A]">
              <div className="flex gap-2">
                <input type="text" value={commentText} onChange={(e) => setCommentText(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && commentText.trim() && submitComment()} placeholder="Add a comment..." autoFocus className="flex-1 px-4 py-3 bg-[#3F3F46] text-white rounded-xl border border-white/10 focus:outline-none focus:ring-2 focus:ring-[#6366F1] placeholder:text-[#A1A1AA]" />
                <button onClick={submitComment} disabled={!commentText.trim()} className="px-6 py-3 bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white font-semibold rounded-xl disabled:opacity-50">Send</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share Menu */}
      {showShareMenu && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end justify-center z-50" onClick={() => setShowShareMenu(false)}>
          <div className="bg-[#18181B] rounded-t-3xl w-full max-w-[500px] p-6 pb-8 border-t border-white/10" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-1.5 bg-[#3F3F46] rounded-full mx-auto mb-6" /><h3 className="text-white text-xl font-bold mb-6">Share</h3>
            <div className="space-y-3">
              <button onClick={handleCopyLink} className="w-full flex items-center gap-4 px-4 py-4 bg-[#27272A] hover:bg-[#3F3F46] rounded-xl transition"><div className="w-12 h-12 bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] rounded-full flex items-center justify-center"><Link2 className="w-6 h-6 text-white" /></div><span className="text-white font-medium">Copy Link</span></button>
              <button onClick={handleShareTwitter} className="w-full flex items-center gap-4 px-4 py-4 bg-[#27272A] hover:bg-[#3F3F46] rounded-xl transition"><div className="w-12 h-12 bg-[#1DA1F2] rounded-full flex items-center justify-center"><Twitter className="w-6 h-6 text-white" fill="white" /></div><span className="text-white font-medium">Share to Twitter</span></button>
              <button onClick={handleShareLinkedIn} className="w-full flex items-center gap-4 px-4 py-4 bg-[#27272A] hover:bg-[#3F3F46] rounded-xl transition"><div className="w-12 h-12 bg-[#0A66C2] rounded-full flex items-center justify-center"><svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg></div><span className="text-white font-medium">Share to LinkedIn</span></button>
            </div>
          </div>
        </div>
      )}

      {/* Login Prompt */}
      {showLoginPrompt && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#18181B] border border-white/10 rounded-2xl p-8 max-w-sm mx-4">
            <h3 className="text-white text-xl font-bold mb-2">Login Required</h3><p className="text-[#A1A1AA] mb-6">Please log in to interact with pitches.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowLoginPrompt(false)} className="flex-1 px-4 py-3 bg-[#27272A] text-white rounded-xl">Cancel</button>
              <button onClick={() => window.location.href = '/login'} className="flex-1 px-4 py-3 bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white font-semibold rounded-xl">Log In</button>
            </div>
          </div>
        </div>
      )}

      <ReportModal pitch={pitch} isOpen={showReportModal} onClose={() => setShowReportModal(false)} />

      {/* Investor Actions Modal */}
      {showInvestorActions && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end justify-center z-50" onClick={() => setShowInvestorActions(false)}>
          <div className="bg-[#18181B] rounded-t-3xl w-full max-w-[500px] p-6 pb-8 border-t border-white/10 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-1.5 bg-[#3F3F46] rounded-full mx-auto mb-6" /><h3 className="text-white text-xl font-bold mb-4">Investor Actions</h3>
            <div className="mb-6"><div className="text-[#8E8E93] text-sm mb-3">Deal Status</div>
              <div className="flex gap-2">
                <button onClick={() => handleStatusChange('interested')} className={`flex-1 py-3 rounded-xl font-semibold transition ${investorStatus === 'interested' ? 'bg-[#22C55E] text-white' : 'bg-[#27272A] text-[#8E8E93]'}`}>✅ Interested</button>
                <button onClick={() => handleStatusChange('watching')} className={`flex-1 py-3 rounded-xl font-semibold transition ${investorStatus === 'watching' ? 'bg-[#F59E0B] text-white' : 'bg-[#27272A] text-[#8E8E93]'}`}>👀 Watching</button>
                <button onClick={() => handleStatusChange('passed')} className={`flex-1 py-3 rounded-xl font-semibold transition ${investorStatus === 'passed' ? 'bg-[#EF4444] text-white' : 'bg-[#27272A] text-[#8E8E93]'}`}>❌ Pass</button>
              </div>
            </div>
            <div className="mb-6"><div className="text-[#8E8E93] text-sm mb-3">Private Notes</div>
              <textarea value={investorNotes} onChange={(e) => setInvestorNotes(e.target.value)} placeholder="Add your private notes..." className="w-full px-4 py-3 bg-[#27272A] text-white border border-[#3F3F46] rounded-xl focus:outline-none resize-none" rows={4} />
              <button onClick={handleSaveNotes} disabled={savingNotes} className="mt-3 w-full py-3 bg-[#6366F1] text-white font-semibold rounded-xl disabled:opacity-50">{savingNotes ? 'Saving...' : 'Save Notes'}</button>
            </div>
            <div className="text-[#8E8E93] text-sm mb-3">Quick Actions</div>
            <div className="space-y-3">
              <button onClick={() => handleInvestorAction('request_intro')} className="w-full flex items-center gap-3 px-4 py-4 bg-[#27272A] hover:bg-[#3F3F46] rounded-xl transition"><div className="w-10 h-10 bg-[#8B5CF6]/20 rounded-full flex items-center justify-center">📧</div><div className="text-left"><div className="text-white font-semibold">Request Intro</div><div className="text-[#8E8E93] text-xs">Get founder's contact</div></div></button>
              <button onClick={handleMessageFounder} className="w-full flex items-center gap-3 px-4 py-4 bg-[#27272A] hover:bg-[#3F3F46] rounded-xl transition"><div className="w-10 h-10 bg-[#3B82F6]/20 rounded-full flex items-center justify-center">💬</div><div className="text-left"><div className="text-white font-semibold">Message Founder</div><div className="text-[#8E8E93] text-xs">Start a conversation</div></div></button>
            </div>
          </div>
        </div>
      )}

      {isHunterView && (
        <div className="absolute bottom-20 left-4 right-4 bg-[#18181B]/95 backdrop-blur-sm border border-[#27272A] rounded-2xl p-4 z-10">
          <h4 className="text-white font-semibold mb-3">Rate this startup</h4>
          <div className="flex gap-2 mb-3">{[1, 2, 3, 4, 5].map((star) => <button key={star} onClick={() => setHunterRating(star)} className={`text-2xl transition ${hunterRating >= star ? "text-amber-500" : "text-gray-600"}`}>★</button>)}</div>
          <textarea value={hunterFeedback} onChange={(e) => setHunterFeedback(e.target.value)} placeholder="Share your thoughts (optional)..." className="w-full px-3 py-2 bg-[#27272A] text-white border border-[#3F3F46] rounded-xl focus:outline-none resize-none text-sm mb-3" rows={2} />
          <button onClick={handleSubmitFeedback} disabled={submittingFeedback || hunterRating === 0} className="w-full py-2.5 bg-amber-500 text-white font-semibold rounded-xl disabled:opacity-50">{submittingFeedback ? "Submitting..." : existingFeedback ? "Update Feedback" : "Submit Feedback"}</button>
        </div>
      )}

      {showPassModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#18181B] border border-white/10 rounded-2xl p-6 max-w-md mx-4">
            <h3 className="text-white text-xl font-bold mb-2">Pass on this pitch?</h3><p className="text-[#A1A1AA] text-sm mb-4">This will hide it from your feed.</p>
            <textarea value={passFeedback} onChange={(e) => setPassFeedback(e.target.value)} placeholder="Optional feedback for the founder..." className="w-full px-3 py-2 bg-[#27272A] text-white border border-[#3F3F46] rounded-xl focus:outline-none mb-4 resize-none" rows={3} />
            <div className="flex gap-3">
              <button onClick={() => { setShowPassModal(false); setPassFeedback(''); }} className="flex-1 px-4 py-3 bg-[#27272A] text-white rounded-xl">Cancel</button>
              <button onClick={handlePass} className="flex-1 px-4 py-3 bg-[#EF4444] text-white font-semibold rounded-xl">Pass</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

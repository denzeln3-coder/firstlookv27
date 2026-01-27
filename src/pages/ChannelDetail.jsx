import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { createPageUrl } from '../utils';
import { ArrowLeft, Search, TrendingUp, Clock, Plus, ThumbsUp, MessageCircle, X, Image, Link2, Send, AtSign, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

const DISCUSSION_TYPES = [
  { value: 'Feedback', label: 'Feedback', color: 'bg-purple-500' },
  { value: 'Question', label: 'Question', color: 'bg-blue-500' },
  { value: 'Milestone', label: 'Milestone', color: 'bg-green-500' },
  { value: 'Hiring', label: 'Hiring', color: 'bg-orange-500' },
  { value: 'Customer', label: 'Customer', color: 'bg-pink-500' },
];

export default function ChannelDetail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const channelId = searchParams.get('id');
  
  const [user, setUser] = useState(null);
  const [channel, setChannel] = useState(null);
  const [discussions, setDiscussions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expandedDiscussion, setExpandedDiscussion] = useState(null);
  const [userUpvotes, setUserUpvotes] = useState([]);

  // Fetch user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single();
        setUser({ ...user, ...profile });
      }
    };
    getUser();
  }, []);

  // Fetch channel
  useEffect(() => {
    const getChannel = async () => {
      if (!channelId) return;
      const { data } = await supabase.from('channels').select('*').eq('id', channelId).single();
      setChannel(data);
    };
    getChannel();
  }, [channelId]);

  // Fetch discussions
  const fetchDiscussions = async () => {
    if (!channelId) return;
    setIsLoading(true);
    
    try {
      let query = supabase
        .from('discussions')
        .select('*')
        .eq('channel_id', channelId);

      if (activeTab === 'Trending') {
        query = query.order('upvote_count', { ascending: false });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query.limit(50);
      
      if (error) {
        console.error('Error fetching discussions:', error);
        setDiscussions([]);
      } else {
        if (data && data.length > 0) {
          // Get unique user IDs, filter out any null/undefined
          const userIds = [...new Set(data.map(d => d.user_id).filter(Boolean))];
          
          if (userIds.length > 0) {
            const { data: profiles, error: profileError } = await supabase
              .from('users')
              .select('id, display_name, username, avatar_url')
              .in('id', userIds);
            
            if (profileError) {
              console.error('Error fetching profiles:', profileError);
            }
            
            // Attach profiles to discussions
            const discussionsWithProfiles = data.map(d => ({
              ...d,
              profiles: profiles?.find(p => p.id === d.user_id) || null
            }));
            
            setDiscussions(discussionsWithProfiles);
          } else {
            setDiscussions(data);
          }
        } else {
          setDiscussions([]);
        }
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setDiscussions([]);
    }
    
    setIsLoading(false);
  };

  useEffect(() => {
    fetchDiscussions();
  }, [channelId, activeTab]);

  // Fetch user upvotes
  useEffect(() => {
    const getUpvotes = async () => {
      if (!user) return;
      const { data } = await supabase.from('discussion_upvotes').select('discussion_id').eq('user_id', user.id);
      setUserUpvotes((data || []).map(u => u.discussion_id));
    };
    getUpvotes();
  }, [user]);

  const handleUpvote = async (discussionId) => {
    if (!user) {
      navigate('/Login');
      return;
    }
    
    const hasUpvoted = userUpvotes.includes(discussionId);
    const currentCount = discussions.find(d => d.id === discussionId)?.upvote_count || 0;
    
    if (hasUpvoted) {
      await supabase.from('discussion_upvotes').delete().eq('discussion_id', discussionId).eq('user_id', user.id);
      await supabase.from('discussions').update({ upvote_count: Math.max(0, currentCount - 1) }).eq('id', discussionId);
      setUserUpvotes(prev => prev.filter(id => id !== discussionId));
    } else {
      await supabase.from('discussion_upvotes').insert({ discussion_id: discussionId, user_id: user.id });
      await supabase.from('discussions').update({ upvote_count: currentCount + 1 }).eq('id', discussionId);
      setUserUpvotes(prev => [...prev, discussionId]);
    }
    
    fetchDiscussions();
  };

  const handleStartDiscussion = () => {
    if (!user) {
      navigate('/Login');
      return;
    }
    setShowCreateModal(true);
  };

  const formatTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const filteredDiscussions = discussions.filter(d =>
    d.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.body?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!channelId) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-white">Channel not found</div>;
  }

  // Helper to get display name from discussion
  const getDisplayName = (discussion) => {
    if (discussion.profiles?.display_name) return discussion.profiles.display_name;
    if (discussion.profiles?.username) return discussion.profiles.username;
    return 'Anonymous';
  };

  const getAvatarLetter = (discussion) => {
    const name = getDisplayName(discussion);
    return name[0].toUpperCase();
  };

  return (
    <div className="min-h-screen bg-black pb-24">
      <div className="sticky top-0 z-40 bg-black/95 backdrop-blur-lg border-b border-white/10">
        <div className="px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate(createPageUrl('Community'))} className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{channel?.icon}</span>
              <h1 className="text-white font-semibold text-lg">{channel?.name || 'Channel'}</h1>
              {channel?.is_official && <span className="px-1.5 py-0.5 bg-[#6366F1]/20 text-[#6366F1] text-[10px] font-bold rounded">OFFICIAL</span>}
            </div>
            <p className="text-gray-500 text-sm">{channel?.member_count || 0} members</p>
          </div>
        </div>

        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search discussions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#1C1C1E] text-white text-sm border border-white/10 rounded-xl focus:outline-none focus:border-[#6366F1]"
            />
          </div>
        </div>

        <div className="px-4 pb-3 flex gap-2">
          {['All', 'Trending', 'Recent'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                activeTab === tab ? 'bg-[#6366F1] text-white' : 'bg-[#1C1C1E] text-gray-400 hover:text-white'
              }`}
            >
              {tab === 'Trending' && <TrendingUp className="w-4 h-4 inline mr-1" />}
              {tab === 'Recent' && <Clock className="w-4 h-4 inline mr-1" />}
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">
        {isLoading ? (
          [...Array(3)].map((_, i) => <div key={i} className="h-32 bg-[#1C1C1E] rounded-xl animate-pulse" />)
        ) : filteredDiscussions.length === 0 ? (
          <div className="text-center py-16">
            <MessageCircle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 mb-4">No discussions yet</p>
            <button onClick={handleStartDiscussion} className="px-6 py-3 bg-[#6366F1] text-white rounded-xl font-medium">
              Start the first discussion
            </button>
          </div>
        ) : (
          filteredDiscussions.map(discussion => {
            const typeConfig = DISCUSSION_TYPES.find(t => t.value === discussion.type) || DISCUSSION_TYPES[1];
            const hasUpvoted = userUpvotes.includes(discussion.id);

            return (
              <div key={discussion.id} className="bg-[#1C1C1E] rounded-2xl border border-white/5 hover:border-white/10 transition overflow-hidden">
                <div className="p-4">
                  <div className="flex gap-3">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center overflow-hidden flex-shrink-0">
                      {discussion.profiles?.avatar_url ? (
                        <img src={discussion.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-white font-bold">{getAvatarLetter(discussion)}</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-white font-semibold text-sm">{getDisplayName(discussion)}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium text-white ${typeConfig.color}`}>{discussion.type}</span>
                        <span className="text-gray-500 text-xs">{formatTimeAgo(discussion.created_at)}</span>
                      </div>

                      <h3 className="text-white font-semibold mb-1">{discussion.title}</h3>
                      <p className="text-gray-400 text-sm mb-3 whitespace-pre-wrap">{discussion.body}</p>

                      {discussion.image_url && (
                        <div className="mb-3 rounded-xl overflow-hidden">
                          <img src={discussion.image_url} alt="" className="w-full max-h-64 object-cover" />
                        </div>
                      )}

                      {discussion.video_url && (
                        <div className="mb-3 p-3 bg-black/30 rounded-xl">
                          <a href={discussion.video_url} target="_blank" rel="noopener noreferrer" className="text-[#6366F1] text-sm hover:underline">
                            🎬 Watch video
                          </a>
                        </div>
                      )}

                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => handleUpvote(discussion.id)}
                          className={`flex items-center gap-1.5 text-sm ${hasUpvoted ? 'text-[#6366F1]' : 'text-gray-500 hover:text-white'}`}
                        >
                          <ThumbsUp className={`w-4 h-4 ${hasUpvoted ? 'fill-current' : ''}`} />
                          {discussion.upvote_count || 0}
                        </button>
                        <button
                          onClick={() => setExpandedDiscussion(expandedDiscussion === discussion.id ? null : discussion.id)}
                          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-white"
                        >
                          <MessageCircle className="w-4 h-4" />
                          {discussion.reply_count || 0} replies
                          {expandedDiscussion === discussion.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {expandedDiscussion === discussion.id && (
                  <RepliesSection 
                    discussionId={discussion.id} 
                    user={user} 
                    navigate={navigate}
                    onReplyAdded={fetchDiscussions}
                  />
                )}
              </div>
            );
          })
        )}
      </div>

      {user && (
        <button
          onClick={handleStartDiscussion}
          className="fixed bottom-24 right-4 w-14 h-14 bg-[#6366F1] rounded-full flex items-center justify-center shadow-lg shadow-[#6366F1]/30 z-50"
        >
          <Plus className="w-6 h-6 text-white" />
        </button>
      )}

      {showCreateModal && (
        <CreateDiscussionModal 
          channelId={channelId} 
          user={user} 
          onClose={() => setShowCreateModal(false)} 
          onCreated={() => { 
            setShowCreateModal(false); 
            fetchDiscussions();
            toast.success('Discussion posted!'); 
          }} 
        />
      )}
    </div>
  );
}

function RepliesSection({ discussionId, user, navigate, onReplyAdded }) {
  const [replies, setReplies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Helper to get display name from reply
  const getDisplayName = (reply) => {
    if (reply.profiles?.display_name) return reply.profiles.display_name;
    if (reply.profiles?.username) return reply.profiles.username;
    return 'Anonymous';
  };

  const getAvatarLetter = (reply) => {
    const name = getDisplayName(reply);
    return name[0].toUpperCase();
  };

  const fetchReplies = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('discussion_replies')
      .select('*')
      .eq('discussion_id', discussionId)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Error fetching replies:', error);
      setReplies([]);
      setIsLoading(false);
      return;
    }
    
    if (data && data.length > 0) {
      const userIds = [...new Set(data.map(r => r.user_id).filter(Boolean))];
      
      if (userIds.length > 0) {
        const { data: profiles, error: profileError } = await supabase
          .from('users')
          .select('id, display_name, username, avatar_url')
          .in('id', userIds);
        
        if (profileError) {
          console.error('Error fetching reply profiles:', profileError);
        }
        
        const repliesWithProfiles = data.map(r => ({
          ...r,
          profiles: profiles?.find(p => p.id === r.user_id) || null
        }));
        setReplies(repliesWithProfiles);
      } else {
        setReplies(data);
      }
    } else {
      setReplies([]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchReplies();
  }, [discussionId]);

  const handleSubmitReply = async () => {
    if (!replyText.trim() || !user) return;
    setSubmitting(true);
    
    const finalText = replyingTo ? `@${replyingTo.username || replyingTo.display_name} ${replyText}` : replyText;
    
    const { error } = await supabase.from('discussion_replies').insert({
      discussion_id: discussionId,
      user_id: user.id,
      content: finalText.trim()
    });
    
    if (!error) {
      // Update reply count
      const { data: disc } = await supabase.from('discussions').select('reply_count').eq('id', discussionId).single();
      await supabase.from('discussions').update({ reply_count: (disc?.reply_count || 0) + 1 }).eq('id', discussionId);
      
      setReplyText('');
      setReplyingTo(null);
      fetchReplies();
      onReplyAdded();
      toast.success('Reply posted!');
    } else {
      toast.error('Failed to post reply');
    }
    setSubmitting(false);
  };

  const formatTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="border-t border-white/10 bg-black/20">
      <div className="max-h-80 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-gray-500 text-sm">Loading replies...</div>
        ) : replies.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">No replies yet. Be the first!</div>
        ) : (
          <div className="p-4 space-y-4">
            {replies.map(reply => (
              <div key={reply.id} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center overflow-hidden flex-shrink-0">
                  {reply.profiles?.avatar_url ? (
                    <img src={reply.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white text-xs font-bold">{getAvatarLetter(reply)}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-white font-medium text-sm">{getDisplayName(reply)}</span>
                    <span className="text-gray-500 text-xs">{formatTimeAgo(reply.created_at)}</span>
                  </div>
                  <p className="text-gray-300 text-sm whitespace-pre-wrap">{reply.content}</p>
                  <button
                    onClick={() => setReplyingTo(reply.profiles)}
                    className="text-gray-500 text-xs mt-1 hover:text-[#6366F1] flex items-center gap-1"
                  >
                    <AtSign className="w-3 h-3" /> Reply
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-3 border-t border-white/10">
        {replyingTo && (
          <div className="flex items-center gap-2 mb-2 px-2">
            <span className="text-gray-400 text-xs">Replying to</span>
            <span className="text-[#6366F1] text-xs font-medium">@{replyingTo.username || replyingTo.display_name}</span>
            <button onClick={() => setReplyingTo(null)} className="text-gray-500 hover:text-white">
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSubmitReply()}
            placeholder={user ? "Write a reply..." : "Login to reply"}
            disabled={!user || submitting}
            className="flex-1 px-4 py-2.5 bg-[#2C2C2E] text-white text-sm rounded-xl border border-white/10 focus:border-[#6366F1] focus:outline-none disabled:opacity-50"
          />
          <button
            onClick={handleSubmitReply}
            disabled={!replyText.trim() || !user || submitting}
            className="px-4 py-2.5 bg-[#6366F1] text-white rounded-xl disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateDiscussionModal({ channelId, user, onClose, onCreated }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState('Question');
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const { error } = await supabase.storage.from('discussion-images').upload(fileName, file);
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('discussion-images').getPublicUrl(fileName);
        setImageUrl(publicUrl);
      }
    } catch (err) {
      toast.error('Failed to upload image');
    }
    setUploading(false);
  };

  const handleSubmit = async () => {
    if (!title.trim() || !body.trim()) { 
      toast.error('Please fill in title and details'); 
      return; 
    }
    
    setSubmitting(true);
    
    const { error } = await supabase.from('discussions').insert({ 
      channel_id: channelId, 
      user_id: user.id, 
      title: title.trim(), 
      body: body.trim(), 
      type, 
      image_url: imageUrl || null, 
      video_url: videoUrl || null,
      upvote_count: 0,
      reply_count: 0
    });
    
    if (error) {
      console.error('Error creating discussion:', error);
      toast.error('Failed to post: ' + error.message);
    } else {
      onCreated();
    }
    
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-[#1C1C1E] w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-[#1C1C1E] border-b border-white/10 px-4 py-4 flex items-center justify-between">
          <h2 className="text-white font-bold text-lg">New Discussion</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full"><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="text-gray-400 text-sm mb-2 block">Type</label>
            <div className="flex flex-wrap gap-2">
              {DISCUSSION_TYPES.map(t => (
                <button key={t.value} onClick={() => setType(t.value)} className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${type === t.value ? t.color + ' text-white' : 'bg-[#2C2C2E] text-gray-400'}`}>{t.label}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-gray-400 text-sm mb-2 block">Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What's your discussion about?" className="w-full px-4 py-3 bg-[#2C2C2E] text-white rounded-xl border border-white/10 focus:border-[#6366F1] focus:outline-none" maxLength={150} />
          </div>
          <div>
            <label className="text-gray-400 text-sm mb-2 block">Details</label>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Share more details..." rows={4} className="w-full px-4 py-3 bg-[#2C2C2E] text-white rounded-xl border border-white/10 focus:border-[#6366F1] focus:outline-none resize-none" />
          </div>
          <div className="flex gap-3">
            <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#2C2C2E] rounded-xl border border-white/10 cursor-pointer hover:border-[#6366F1] transition">
              <Image className="w-5 h-5 text-gray-400" />
              <span className="text-gray-400 text-sm">{uploading ? 'Uploading...' : imageUrl ? 'Image added ✓' : 'Add image'}</span>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading} />
            </label>
            <div className="flex-1">
              <div className="flex items-center gap-2 px-4 py-3 bg-[#2C2C2E] rounded-xl border border-white/10">
                <Link2 className="w-5 h-5 text-gray-400" />
                <input type="url" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="Video URL" className="bg-transparent text-white text-sm focus:outline-none flex-1" />
              </div>
            </div>
          </div>
          {imageUrl && (
            <div className="relative rounded-xl overflow-hidden">
              <img src={imageUrl} alt="" className="w-full max-h-48 object-cover" />
              <button onClick={() => setImageUrl('')} className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-full"><X className="w-4 h-4 text-white" /></button>
            </div>
          )}
          <button onClick={handleSubmit} disabled={!title.trim() || !body.trim() || submitting} className="w-full py-4 bg-[#6366F1] text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed">
            {submitting ? 'Posting...' : 'Post Discussion'}
          </button>
        </div>
      </div>
    </div>
  );
}

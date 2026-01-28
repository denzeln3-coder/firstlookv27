import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { ArrowLeft, Users, MapPin, Calendar, Plus, MessageCircle, ChevronRight, Search, Video, Clock, X, Hash, Check, ExternalLink, Share2, Send, Trash2, Star } from 'lucide-react';
import { toast } from 'sonner';

const CHANNEL_ICONS = ['💬', '🚀', '💡', '🎯', '🔥', '⚡', '🌟', '💎', '🎨', '🛠️', '📱', '🤖', '💰', '📈', '🎮', '🏥', '🌍', '📚'];

const CHANNEL_CATEGORIES = [
  'AI/ML', 'SaaS', 'Fintech', 'Healthcare', 'E-commerce', 'Consumer', 
  'Climate', 'Education', 'Gaming', 'Hardware', 'Marketplace', 'Developer Tools', 'Other'
];

const COLLAB_OPTIONS = [
  { id: 'cofounder', label: '👥 Co-founder', color: 'from-purple-500/20 to-pink-500/20' },
  { id: 'designer', label: '🎨 Designer', color: 'from-blue-500/20 to-cyan-500/20' },
  { id: 'developer', label: '💻 Developer', color: 'from-green-500/20 to-emerald-500/20' },
  { id: 'feedback', label: '💬 Feedback', color: 'from-yellow-500/20 to-orange-500/20' },
  { id: 'advisor', label: '🧠 Advisor', color: 'from-indigo-500/20 to-violet-500/20' },
  { id: 'investor', label: '💰 Raising', color: 'from-rose-500/20 to-red-500/20' },
];

const CITIES = ['San Francisco', 'New York', 'Austin', 'Los Angeles', 'Seattle', 'Miami', 'Chicago', 'Denver', 'Boston', 'Remote'];

export default function Community() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('channels');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateMeetup, setShowCreateMeetup] = useState(false);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [selectedMeetup, setSelectedMeetup] = useState(null);
  const [collabFilter, setCollabFilter] = useState(null);
  const [deletingChannel, setDeletingChannel] = useState(null);
  const [deletingMeetup, setDeletingMeetup] = useState(null);
  const [founderSort, setFounderSort] = useState('recent');
  const [cityFilter, setCityFilter] = useState('');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single();
        return { ...user, ...profile };
      }
      return null;
    }
  });

  const { data: channels = [], isLoading: channelsLoading } = useQuery({
    queryKey: ['channels'],
    queryFn: async () => {
      const { data: channelsData } = await supabase.from('channels').select('*').order('member_count', { ascending: false });
      if (!channelsData) return [];
      const creatorIds = [...new Set(channelsData.filter(c => c.created_by).map(c => c.created_by))];
      let creators = {};
      if (creatorIds.length > 0) {
        const { data: creatorsData } = await supabase.from('users').select('id, display_name, avatar_url').in('id', creatorIds);
        if (creatorsData) creatorsData.forEach(c => { creators[c.id] = c; });
      }
      return channelsData.map(channel => ({ ...channel, creator: channel.created_by ? creators[channel.created_by] : null }));
    }
  });

  const { data: userChannels = [] } = useQuery({
    queryKey: ['userChannels', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from('channel_members').select('channel_id').eq('user_id', user.id);
      return (data || []).map(m => m.channel_id);
    },
    enabled: !!user
  });

  const { data: meetups = [], isLoading: meetupsLoading } = useQuery({
    queryKey: ['meetups'],
    queryFn: async () => {
      const { data } = await supabase.from('meetups').select('*').gte('event_date', new Date().toISOString()).order('event_date', { ascending: true }).limit(20);
      return data || [];
    }
  });

  const { data: userRSVPs = [] } = useQuery({
    queryKey: ['userRSVPs', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from('meetup_attendees').select('meetup_id, status').eq('user_id', user.id);
      return data || [];
    },
    enabled: !!user
  });

  const { data: meetupHosts = [] } = useQuery({
    queryKey: ['meetupHosts', meetups.map(m => m.host_id)],
    queryFn: async () => {
      if (meetups.length === 0) return [];
      const hostIds = [...new Set(meetups.map(m => m.host_id))];
      const { data } = await supabase.from('users').select('*').in('id', hostIds);
      return data || [];
    },
    enabled: meetups.length > 0
  });

  const { data: founders = [], isLoading: foundersLoading } = useQuery({
    queryKey: ['founders', searchQuery, collabFilter, founderSort, cityFilter],
    queryFn: async () => {
      let query = supabase.from('users').select('*').limit(50);
      if (searchQuery) query = query.or(`display_name.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%,bio.ilike.%${searchQuery}%`);
      if (collabFilter) query = query.contains('collab_modes', [collabFilter]);
      if (cityFilter) query = query.ilike('city', `%${cityFilter}%`);
      if (founderSort === 'followed') query = query.order('follower_count', { ascending: false, nullsFirst: false });
      else if (founderSort === 'active') query = query.order('last_active', { ascending: false, nullsFirst: false });
      else query = query.order('created_at', { ascending: false });
      const { data } = await query;
      return (data || []).map(f => ({ ...f, latest_pitch: f.startups?.[0] || null, pitch_count: f.startups?.length || 0 }));
    },
    enabled: activeTab === 'founders'
  });

  const { data: featuredFounders = [] } = useQuery({
    queryKey: ['featuredFounders'],
    queryFn: async () => {
      const { data } = await supabase.from('users').select('*').order('follower_count', { ascending: false, nullsFirst: false }).limit(8);
      return (data || []).map(f => ({ ...f, latest_pitch: f.startups?.[0] || null, pitch_count: f.startups?.length || 0 }));
    },
    enabled: activeTab === 'founders'
  });

  const { data: userFollowing = [] } = useQuery({
    queryKey: ['communityUserFollowing', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from('follows').select('following_id').eq('follower_id', user.id);
      return (data || []).map(f => f.following_id);
    },
    enabled: !!user
  });

  const joinChannelMutation = useMutation({
    mutationFn: async (channelId) => {
      if (!user) throw new Error('Must be logged in');
      const isJoined = userChannels.includes(channelId);
      if (isJoined) await supabase.from('channel_members').delete().eq('channel_id', channelId).eq('user_id', user.id);
      else await supabase.from('channel_members').insert({ channel_id: channelId, user_id: user.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userChannels'] });
      queryClient.invalidateQueries({ queryKey: ['channels'] });
    }
  });

  const rsvpMutation = useMutation({
    mutationFn: async ({ meetupId, action }) => {
      if (!user) throw new Error('Must be logged in');
      const existingRSVP = userRSVPs.find(r => r.meetup_id === meetupId);
      if (action === 'cancel' && existingRSVP) await supabase.from('meetup_attendees').delete().eq('meetup_id', meetupId).eq('user_id', user.id);
      else if (action === 'going' && !existingRSVP) await supabase.from('meetup_attendees').insert({ meetup_id: meetupId, user_id: user.id, status: 'going' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userRSVPs'] });
      queryClient.invalidateQueries({ queryKey: ['meetups'] });
      toast.success('RSVP updated!');
    },
    onError: () => toast.error('Failed to update RSVP')
  });

  const followMutation = useMutation({
    mutationFn: async (founderId) => {
      if (!user) throw new Error('Must be logged in');
      const isFollowing = userFollowing.includes(founderId);
      if (isFollowing) await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', founderId);
      else await supabase.from('follows').insert({ follower_id: user.id, following_id: founderId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communityUserFollowing'] });
      queryClient.invalidateQueries({ queryKey: ['founders'] });
      queryClient.invalidateQueries({ queryKey: ['featuredFounders'] });
    }
  });

  const handleJoinChannel = (e, channelId) => { e.stopPropagation(); if (!user) { navigate('/Login'); return; } joinChannelMutation.mutate(channelId); };

  const handleDeleteChannel = async (channelId) => {
    try {
      const { data: discussions } = await supabase.from('discussions').select('id').eq('channel_id', channelId);
      const discussionIds = (discussions || []).map(d => d.id);
      await supabase.from('channel_members').delete().eq('channel_id', channelId);
      if (discussionIds.length > 0) {
        await supabase.from('discussion_replies').delete().in('discussion_id', discussionIds);
        await supabase.from('discussion_upvotes').delete().in('discussion_id', discussionIds);
      }
      await supabase.from('discussions').delete().eq('channel_id', channelId);
      const { error } = await supabase.from('channels').delete().eq('id', channelId);
      if (error) throw error;
      toast.success('Channel deleted');
      setDeletingChannel(null);
      queryClient.invalidateQueries({ queryKey: ['channels'] });
    } catch (error) { toast.error('Failed to delete channel'); }
  };

  const handleDeleteMeetup = async (meetupId) => {
    try {
      // Delete attendees first (ignore errors)
      await supabase.from("meetup_attendees").delete().eq("meetup_id", meetupId).then(() => {}).catch(() => {});
      
      // Try to delete comments - table might not exist, so ignore errors
      await supabase.from("meetup_comments").delete().eq("meetup_id", meetupId).then(() => {}).catch(() => {});
      
      // Delete the meetup
      const { error } = await supabase.from("meetups").delete().eq("id", meetupId);
      
      if (error) {
        console.error("Meetup delete error:", error);
        throw error;
      }
      
      toast.success("Meetup deleted");
      setDeletingMeetup(null);
      setSelectedMeetup(null);
      queryClient.invalidateQueries({ queryKey: ["meetups"] });
    } catch (error) {
      console.error("Delete failed:", error);
      toast.error("Failed to delete meetup");
    }
  };

  const handleFollowFounder = (founderId) => { if (!user) { navigate('/Login'); return; } followMutation.mutate(founderId); };
  const handleRSVP = (meetupId, action) => { if (!user) { navigate('/Login'); return; } rsvpMutation.mutate({ meetupId, action }); };

  const filteredChannels = channels.filter(c => c.name?.toLowerCase().includes(searchQuery.toLowerCase()) || c.description?.toLowerCase().includes(searchQuery.toLowerCase()) || c.category?.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredMeetups = meetups.filter(m => m.title?.toLowerCase().includes(searchQuery.toLowerCase()) || m.city?.toLowerCase().includes(searchQuery.toLowerCase()) || m.location?.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="min-h-screen bg-[#000000] pb-20">
      <div className="fixed top-0 left-0 right-0 bg-[#000000]/95 backdrop-blur-lg z-20 border-b border-[rgba(255,255,255,0.06)]">
        <div className="px-4 py-4 flex items-center justify-between">
          <button onClick={() => navigate(createPageUrl('Explore'))} className="text-[#8E8E93] hover:text-white transition"><ArrowLeft className="w-5 h-5" /></button>
          <h1 className="text-white text-[18px] font-semibold">Community</h1>
          <div className="w-5" />
        </div>
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#636366]" />
            <input type="text" placeholder={activeTab === 'channels' ? 'Search channels...' : activeTab === 'meetups' ? 'Search meetups...' : 'Search founders...'} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-[#1C1C1E] text-white text-[14px] border border-[rgba(255,255,255,0.06)] rounded-xl focus:outline-none focus:border-[#6366F1] placeholder:text-[#636366]" />
          </div>
        </div>
        <div className="flex border-b border-[rgba(255,255,255,0.06)]">
          {[{ id: 'channels', label: 'Channels', icon: MessageCircle }, { id: 'meetups', label: 'Meetups', icon: Calendar }, { id: 'founders', label: 'Founders', icon: Users }].map(tab => {
            const Icon = tab.icon;
            return (<button key={tab.id} onClick={() => { setActiveTab(tab.id); setSearchQuery(''); }} className={`flex-1 flex items-center justify-center gap-2 py-3 transition ${activeTab === tab.id ? 'text-white border-b-2 border-[#6366F1]' : 'text-[#636366]'}`}><Icon className="w-4 h-4" /><span className="text-[14px] font-medium">{tab.label}</span></button>);
          })}
        </div>
      </div>

      <div className="pt-44 px-4">
        {activeTab === 'channels' && (
          <div className="space-y-3">
            {user && (<button onClick={() => setShowCreateChannel(true)} className="w-full p-4 bg-gradient-to-r from-[#6366F1]/20 to-[#8B5CF6]/20 border border-[#6366F1]/40 rounded-xl flex items-center justify-center gap-2 text-[#6366F1] font-semibold hover:from-[#6366F1]/30 hover:to-[#8B5CF6]/30 transition"><Plus className="w-5 h-5" />Create a Channel</button>)}
            {channelsLoading ? [...Array(6)].map((_, i) => <div key={i} className="h-20 bg-[#1C1C1E] rounded-xl animate-pulse" />) : filteredChannels.length === 0 ? (<div className="text-center py-12"><MessageCircle className="w-12 h-12 text-[#636366] mx-auto mb-3" /><p className="text-[#8E8E93]">No channels found</p></div>) : filteredChannels.map(channel => {
              const isJoined = userChannels.includes(channel.id);
              const isOwner = user?.id === channel.created_by;
              return (<div key={channel.id} onClick={() => navigate(createPageUrl('ChannelDetail') + `?id=${channel.id}`)} className="bg-[#1C1C1E] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 cursor-pointer hover:bg-[rgba(255,255,255,0.04)] transition"><div className="flex items-start gap-3"><div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#6366F1]/20 to-[#8B5CF6]/20 flex items-center justify-center text-2xl">{channel.icon || '💬'}</div><div className="flex-1 min-w-0"><div className="flex items-center gap-2"><h3 className="text-white font-semibold text-[15px]">{channel.name}</h3>{channel.is_official && <span className="px-1.5 py-0.5 bg-[#6366F1]/20 text-[#6366F1] text-[10px] font-bold rounded">OFFICIAL</span>}{channel.category && <span className="px-1.5 py-0.5 bg-white/10 text-gray-400 text-[10px] rounded">{channel.category}</span>}</div><p className="text-[#8E8E93] text-[13px] line-clamp-1 mt-0.5">{channel.description}</p><div className="flex items-center gap-3 mt-2"><span className="text-[#636366] text-[12px] flex items-center gap-1"><Users className="w-3 h-3" />{channel.member_count || 0} members</span>{channel.creator && (<span className="text-[#8E8E93] text-[12px]">by {channel.creator?.display_name || 'Anonymous'}</span>)}</div></div><div className="flex items-center gap-2">{isOwner && (<button onClick={(e) => { e.stopPropagation(); setDeletingChannel(channel); }} className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition"><Trash2 className="w-4 h-4" /></button>)}<button onClick={(e) => handleJoinChannel(e, channel.id)} disabled={joinChannelMutation.isPending} className={`px-4 py-2 rounded-lg text-[13px] font-semibold transition ${isJoined ? 'bg-[rgba(255,255,255,0.06)] text-white' : 'bg-[#6366F1] text-white hover:brightness-110'}`}>{isJoined ? 'Joined' : 'Join'}</button></div></div></div>);
            })}
          </div>
        )}

        {activeTab === 'meetups' && (
          <div className="space-y-4">
            {user && <button onClick={() => setShowCreateMeetup(true)} className="w-full p-4 bg-gradient-to-r from-[#6366F1]/20 to-[#8B5CF6]/20 border border-[#6366F1]/40 rounded-xl flex items-center justify-center gap-2 text-[#6366F1] font-semibold hover:from-[#6366F1]/30 hover:to-[#8B5CF6]/30 transition"><Plus className="w-5 h-5" />Create a Meetup</button>}
            {meetupsLoading ? [...Array(4)].map((_, i) => <div key={i} className="h-32 bg-[#1C1C1E] rounded-xl animate-pulse" />) : filteredMeetups.length === 0 ? (<div className="text-center py-12"><Calendar className="w-12 h-12 text-[#636366] mx-auto mb-3" /><p className="text-[#8E8E93] mb-2">No upcoming meetups</p><p className="text-[#636366] text-[13px]">Be the first to create one!</p></div>) : filteredMeetups.map(meetup => {
              const host = meetupHosts.find(h => h.id === meetup.host_id);
              const eventDate = new Date(meetup.event_date);
              const userRSVP = userRSVPs.find(r => r.meetup_id === meetup.id);
              const isGoing = userRSVP?.status === 'going';
              return (<div key={meetup.id} onClick={() => setSelectedMeetup({ ...meetup, host })} className="w-full bg-[#1C1C1E] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 cursor-pointer hover:bg-[rgba(255,255,255,0.04)] transition"><div className="flex gap-4"><div className="w-14 h-14 rounded-xl bg-[#6366F1]/20 flex flex-col items-center justify-center flex-shrink-0"><span className="text-[#6366F1] text-[10px] font-bold uppercase">{eventDate.toLocaleDateString('en-US', { month: 'short' })}</span><span className="text-white text-[20px] font-bold leading-none">{eventDate.getDate()}</span></div><div className="flex-1 min-w-0"><h3 className="text-white font-semibold text-[15px] mb-1">{meetup.title}</h3><div className="flex items-center gap-3 text-[#8E8E93] text-[12px]"><span className="flex items-center gap-1"><Clock className="w-3 h-3" />{eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span><span className="flex items-center gap-1">{meetup.is_virtual ? <Video className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}{meetup.is_virtual ? 'Virtual' : meetup.city || meetup.location}</span></div><div className="flex items-center gap-2 mt-2"><div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center overflow-hidden">{host?.avatar_url ? <img src={host.avatar_url} alt="" className="w-full h-full object-cover" /> : <span className="text-white text-[10px] font-bold">{(host?.display_name || 'H')?.[0]}</span>}</div><span className="text-[#636366] text-[11px]">Hosted by {host?.display_name || 'Unknown'}</span><span className="text-[#636366] text-[11px]">• {meetup.attendee_count || 0}/{meetup.max_attendees} going</span></div></div>{user?.id === meetup.host_id && (<button onClick={(e) => { e.stopPropagation(); setDeletingMeetup(meetup); }} className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition self-start"><Trash2 className="w-4 h-4" /></button>)}<div className="flex flex-col items-end gap-2">{isGoing && (<span className="px-2 py-1 bg-green-500/20 text-green-400 text-[11px] font-semibold rounded-lg flex items-center gap-1"><Check className="w-3 h-3" /> Going</span>)}<ChevronRight className="w-5 h-5 text-[#636366]" /></div></div></div>);
            })}
          </div>
        )}

        {activeTab === 'founders' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <select value={founderSort} onChange={(e) => setFounderSort(e.target.value)} className="flex-1 px-3 py-2 bg-[#1C1C1E] text-white text-[13px] border border-[rgba(255,255,255,0.06)] rounded-xl focus:outline-none focus:border-[#6366F1]">
                <option value="recent">Recently Joined</option>
                <option value="active">Most Active</option>
                <option value="followed">Most Followed</option>
              </select>
              <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} className="flex-1 px-3 py-2 bg-[#1C1C1E] text-white text-[13px] border border-[rgba(255,255,255,0.06)] rounded-xl focus:outline-none focus:border-[#6366F1]">
                <option value="">All Cities</option>
                {CITIES.map(city => (<option key={city} value={city}>{city}</option>))}
              </select>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
              <button onClick={() => setCollabFilter(null)} className={`px-3 py-1.5 rounded-full text-[12px] font-medium whitespace-nowrap transition ${!collabFilter ? 'bg-[#6366F1] text-white' : 'bg-[#1C1C1E] text-[#8E8E93] hover:bg-[#27272A]'}`}>All</button>
              {COLLAB_OPTIONS.map(option => (<button key={option.id} onClick={() => setCollabFilter(collabFilter === option.id ? null : option.id)} className={`px-3 py-1.5 rounded-full text-[12px] font-medium whitespace-nowrap transition ${collabFilter === option.id ? 'bg-[#6366F1] text-white' : 'bg-[#1C1C1E] text-[#8E8E93] hover:bg-[#27272A]'}`}>{option.label}</button>))}
            </div>
            {!searchQuery && !collabFilter && !cityFilter && featuredFounders.length > 0 && (
              <div className="mb-2">
                <h3 className="text-white font-semibold text-[14px] mb-3 flex items-center gap-2"><Star className="w-4 h-4 text-yellow-400" /> Featured Founders</h3>
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                  {featuredFounders.slice(0, 6).map(founder => (<button key={founder.id} onClick={() => navigate(createPageUrl('Profile') + `?userId=${founder.id}`)} className="flex-shrink-0 w-28 bg-gradient-to-br from-[#6366F1]/10 to-[#8B5CF6]/10 border border-[#6366F1]/30 rounded-xl p-3 text-center hover:border-[#6366F1]/60 transition"><div className="w-12 h-12 mx-auto rounded-full bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center overflow-hidden mb-2 ring-2 ring-[#6366F1]/30">{founder.avatar_url ? (<img src={founder.avatar_url} alt="" className="w-full h-full object-cover" />) : (<span className="text-white text-[18px] font-bold">{(founder.display_name || 'F')?.[0]?.toUpperCase()}</span>)}</div><h4 className="text-white font-semibold text-[12px] truncate">{founder.display_name || 'Founder'}</h4><p className="text-[#8E8E93] text-[10px] truncate">{founder.city || '@' + (founder.username || 'user')}</p><div className="flex items-center justify-center gap-1 mt-1 text-[9px]"><span className="text-[#6366F1]">{founder.pitch_count} pitches</span></div></button>))}
                </div>
              </div>
            )}
            {foundersLoading ? (<div className="space-y-3">{[...Array(6)].map((_, i) => (<div key={i} className="h-24 bg-[#1C1C1E] rounded-xl animate-pulse" />))}</div>) : founders.length === 0 ? (<div className="text-center py-12"><Users className="w-12 h-12 text-[#636366] mx-auto mb-3" /><p className="text-[#8E8E93]">No founders found</p><p className="text-[#636366] text-[13px] mt-1">Try adjusting your filters</p></div>) : (
              <div className="space-y-3">
                {founders.map(founder => {
                  const isFollowing = userFollowing.includes(founder.id);
                  const wasActiveRecently = founder.last_active && (Date.now() - new Date(founder.last_active).getTime()) < 24 * 60 * 60 * 1000;
                  return (<div key={founder.id} className="w-full bg-[#1C1C1E] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 hover:bg-[rgba(255,255,255,0.04)] transition"><div className="flex gap-3"><button onClick={() => navigate(createPageUrl('Profile') + `?userId=${founder.id}`)} className="relative flex-shrink-0"><div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center overflow-hidden">{founder.avatar_url ? (<img src={founder.avatar_url} alt="" className="w-full h-full object-cover" />) : (<span className="text-white text-[20px] font-bold">{(founder.display_name || founder.username || 'U')?.[0]?.toUpperCase()}</span>)}</div>{wasActiveRecently && (<div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-[#1C1C1E]" title="Active today" />)}</button><div className="flex-1 min-w-0"><div className="flex items-start justify-between gap-2"><button onClick={() => navigate(createPageUrl('Profile') + `?userId=${founder.id}`)} className="text-left"><div className="flex items-center gap-1.5"><h3 className="text-white font-semibold text-[15px]">{founder.display_name || 'Founder'}</h3>{founder.is_verified && (<svg className="w-4 h-4 text-[#3B82F6]" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>)}</div>{founder.username && <p className="text-[#8E8E93] text-[13px]">@{founder.username}</p>}</button>{user && user.id !== founder.id && (<button onClick={(e) => { e.stopPropagation(); handleFollowFounder(founder.id); }} disabled={followMutation.isPending} className={`px-4 py-1.5 rounded-lg text-[12px] font-semibold transition ${isFollowing ? 'bg-[#27272A] text-white hover:bg-red-500/20 hover:text-red-400' : 'bg-[#6366F1] text-white hover:brightness-110'}`}>{isFollowing ? 'Following' : 'Follow'}</button>)}</div>{founder.bio && (<p className="text-[#A1A1AA] text-[13px] line-clamp-1 mt-1">{founder.bio}</p>)}<div className="flex items-center gap-3 mt-2 text-[12px]">{founder.city && (<span className="flex items-center gap-1 text-[#636366]"><MapPin className="w-3 h-3" />{founder.city}</span>)}<span className="text-[#6366F1]">{founder.pitch_count || 0} pitches</span><span className="text-[#8E8E93]">{founder.follower_count || 0} followers</span></div>{founder.collab_modes && founder.collab_modes.length > 0 && (<div className="flex flex-wrap gap-1 mt-2">{founder.collab_modes.slice(0, 3).map(mode => { const option = COLLAB_OPTIONS.find(o => o.id === mode); return option ? (<span key={mode} className={`px-2 py-0.5 bg-gradient-to-r ${option.color} text-[10px] rounded-full text-white/90 border border-white/10`}>{option.label}</span>) : null; })}{founder.collab_modes.length > 3 && (<span className="px-2 py-0.5 bg-white/10 text-gray-400 text-[10px] rounded-full">+{founder.collab_modes.length - 3}</span>)}</div>)}</div>{founder.latest_pitch && (<button onClick={() => navigate(createPageUrl('Profile') + `?userId=${founder.id}`)} className="flex-shrink-0 w-14 rounded-lg overflow-hidden bg-[#27272A] relative" style={{ aspectRatio: '9/16' }}>{founder.latest_pitch.thumbnail_url ? (<img src={founder.latest_pitch.thumbnail_url} alt="" className="w-full h-full object-cover" />) : founder.latest_pitch.video_url ? (<video src={founder.latest_pitch.video_url} className="w-full h-full object-cover" muted />) : (<div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#6366F1] to-[#8B5CF6]"><span className="text-white text-[12px] font-bold">{founder.latest_pitch.startup_name?.[0]?.toUpperCase()}</span></div>)}<div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition"><svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" /></svg></div></button>)}</div></div>);
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {showCreateMeetup && <CreateMeetupModal user={user} onClose={() => setShowCreateMeetup(false)} onSuccess={() => { setShowCreateMeetup(false); queryClient.invalidateQueries({ queryKey: ['meetups'] }); toast.success('Meetup created!'); }} />}
      {showCreateChannel && <CreateChannelModal user={user} onClose={() => setShowCreateChannel(false)} onSuccess={() => { setShowCreateChannel(false); queryClient.invalidateQueries({ queryKey: ['channels'] }); toast.success('Channel created!'); }} />}
      {selectedMeetup && (<MeetupDetailModal meetup={selectedMeetup} user={user} isGoing={userRSVPs.find(r => r.meetup_id === selectedMeetup.id)?.status === 'going'} onClose={() => setSelectedMeetup(null)} onRSVP={handleRSVP} isPending={rsvpMutation.isPending} />)}
      {deletingMeetup && (<div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setDeletingMeetup(null)}><div className="bg-[#1C1C1E] rounded-2xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}><h3 className="text-white font-bold text-lg mb-2">Delete Meetup?</h3><p className="text-gray-400 text-sm mb-6">This will permanently delete "{deletingMeetup.title}" and remove all RSVPs.</p><div className="flex gap-3"><button onClick={() => setDeletingMeetup(null)} className="flex-1 py-2.5 bg-[#2C2C2E] text-white rounded-xl font-medium">Cancel</button><button onClick={() => handleDeleteMeetup(deletingMeetup.id)} className="flex-1 py-2.5 bg-red-500 text-white rounded-xl font-medium">Delete</button></div></div></div>)}
      {deletingChannel && (<div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setDeletingChannel(null)}><div className="bg-[#1C1C1E] rounded-2xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}><h3 className="text-white font-bold text-lg mb-2">Delete Channel?</h3><p className="text-gray-400 text-sm mb-6">This will permanently delete "{deletingChannel.name}" and all its discussions.</p><div className="flex gap-3"><button onClick={() => setDeletingChannel(null)} className="flex-1 py-2.5 bg-[#2C2C2E] text-white rounded-xl font-medium">Cancel</button><button onClick={() => handleDeleteChannel(deletingChannel.id)} className="flex-1 py-2.5 bg-red-500 text-white rounded-xl font-medium">Delete</button></div></div></div>)}
    </div>
  );
}

function MeetupDetailModal({ meetup, user, isGoing, onClose, onRSVP, isPending }) {
  const eventDate = new Date(meetup.event_date);
  const isFull = meetup.attendee_count >= meetup.max_attendees;
  const isHost = user?.id === meetup.host_id;
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => { if (showComments && meetup.id) fetchComments(); }, [showComments, meetup.id]);

  const fetchComments = async () => {
    setLoadingComments(true);
    try {
      const { data, error } = await supabase.from('meetup_comments').select('*').eq('meetup_id', meetup.id).order('created_at', { ascending: true });
      if (error) { setComments([]); } else if (data && data.length > 0) {
        const userIds = [...new Set(data.map(c => c.user_id))];
        const { data: profiles } = await supabase.from('users').select('id, display_name, username, avatar_url').in('id', userIds);
        setComments(data.map(comment => ({ ...comment, profile: profiles?.find(p => p.id === comment.user_id) || null })));
      } else { setComments([]); }
    } catch (err) { setComments([]); }
    setLoadingComments(false);
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !user) return;
    setSubmittingComment(true);
    try {
      const { error } = await supabase.from('meetup_comments').insert({ meetup_id: meetup.id, user_id: user.id, content: newComment.trim() });
      if (error) throw error;
      setNewComment('');
      fetchComments();
      toast.success('Comment posted!');
    } catch (err) { toast.error('Failed to post comment'); }
    setSubmittingComment(false);
  };

  const formatTimeAgo = (date) => { const seconds = Math.floor((new Date() - new Date(date)) / 1000); if (seconds < 60) return 'just now'; const minutes = Math.floor(seconds / 60); if (minutes < 60) return `${minutes}m ago`; const hours = Math.floor(minutes / 60); if (hours < 24) return `${hours}h ago`; const days = Math.floor(hours / 24); return `${days}d ago`; };
  const handleShare = async () => { if (navigator.share) { await navigator.share({ title: meetup.title, text: `Join me at ${meetup.title}!`, url: window.location.href }); } else { navigator.clipboard.writeText(window.location.href); toast.success('Link copied!'); } };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center z-50" onClick={onClose}>
      <div className="bg-[#18181B] rounded-t-3xl sm:rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <div className="w-12 h-1.5 bg-[#3F3F46] rounded-full mx-auto mb-4 sm:hidden" />
          <div className="flex items-start justify-between mb-6"><div className="flex items-center gap-4"><div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#6366F1]/30 to-[#8B5CF6]/30 flex flex-col items-center justify-center"><span className="text-[#6366F1] text-[11px] font-bold uppercase">{eventDate.toLocaleDateString('en-US', { month: 'short' })}</span><span className="text-white text-[24px] font-bold leading-none">{eventDate.getDate()}</span></div><div><h2 className="text-white text-[20px] font-bold">{meetup.title}</h2><p className="text-[#8E8E93] text-[14px] mt-1">{eventDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p></div></div><button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition"><X className="w-5 h-5 text-[#8E8E93]" /></button></div>
          <div className="space-y-4 mb-6"><div className="flex items-center gap-3 text-[#FAFAFA]"><Clock className="w-5 h-5 text-[#6366F1]" /><span>{eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</span></div><div className="flex items-center gap-3 text-[#FAFAFA]">{meetup.is_virtual ? <Video className="w-5 h-5 text-[#6366F1]" /> : <MapPin className="w-5 h-5 text-[#6366F1]" />}<span>{meetup.is_virtual ? 'Virtual Event' : `${meetup.location}${meetup.city ? `, ${meetup.city}` : ''}`}</span></div><div className="flex items-center gap-3 text-[#FAFAFA]"><Users className="w-5 h-5 text-[#6366F1]" /><span>{meetup.attendee_count || 0} / {meetup.max_attendees} attending</span>{isFull && <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-[11px] rounded">FULL</span>}</div></div>
          <div className="flex items-center gap-3 p-3 bg-[#27272A] rounded-xl mb-6"><div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center overflow-hidden">{meetup.host?.avatar_url ? (<img src={meetup.host.avatar_url} alt="" className="w-full h-full object-cover" />) : (<span className="text-white text-[14px] font-bold">{(meetup.host?.display_name || 'H')?.[0]}</span>)}</div><div className="flex-1"><p className="text-[#8E8E93] text-[12px]">Hosted by</p><p className="text-white font-semibold">{meetup.host?.display_name || 'Unknown'}</p></div></div>
          {meetup.description && (<div className="mb-6"><h3 className="text-white font-semibold mb-2">About</h3><p className="text-[#A1A1AA] text-[14px] leading-relaxed">{meetup.description}</p></div>)}
          {meetup.is_virtual && meetup.meeting_link && isGoing && (<a href={meetup.meeting_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 bg-[#6366F1]/20 border border-[#6366F1]/40 rounded-xl text-[#6366F1] mb-6 hover:bg-[#6366F1]/30 transition"><ExternalLink className="w-5 h-5" /><span className="font-medium">Join Meeting</span></a>)}
          <div className="mb-6"><button onClick={() => setShowComments(!showComments)} className="flex items-center gap-2 text-white font-semibold mb-3 hover:text-[#6366F1] transition"><MessageCircle className="w-5 h-5" /><span>Comments {comments.length > 0 && `(${comments.length})`}</span></button>{showComments && (<div className="bg-[#0A0A0A] border border-[#27272A] rounded-xl p-4">{user ? (<div className="flex gap-3 mb-4"><div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center overflow-hidden flex-shrink-0">{user.avatar_url ? (<img src={user.avatar_url} alt="" className="w-full h-full object-cover" />) : (<span className="text-white text-xs font-bold">{(user.display_name || user.email || 'U')[0].toUpperCase()}</span>)}</div><div className="flex-1 flex gap-2"><input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSubmitComment()} placeholder="Add a comment..." className="flex-1 px-3 py-2 bg-[#1C1C1E] text-white text-sm rounded-lg border border-[#27272A] focus:border-[#6366F1] focus:outline-none" /><button onClick={handleSubmitComment} disabled={!newComment.trim() || submittingComment} className="px-3 py-2 bg-[#6366F1] text-white rounded-lg disabled:opacity-50 hover:brightness-110 transition"><Send className="w-4 h-4" /></button></div></div>) : (<p className="text-[#8E8E93] text-sm text-center py-2 mb-4">Log in to leave a comment</p>)}{loadingComments ? (<div className="text-center py-4"><div className="w-5 h-5 border-2 border-[#6366F1]/20 border-t-[#6366F1] rounded-full animate-spin mx-auto" /></div>) : comments.length === 0 ? (<p className="text-[#636366] text-sm text-center py-4">No comments yet. Be the first!</p>) : (<div className="space-y-3 max-h-48 overflow-y-auto">{comments.map((comment) => (<div key={comment.id} className="flex gap-3"><div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center overflow-hidden flex-shrink-0">{comment.profile?.avatar_url ? (<img src={comment.profile.avatar_url} alt="" className="w-full h-full object-cover" />) : (<span className="text-white text-xs font-bold">{(comment.profile?.display_name || 'U')[0].toUpperCase()}</span>)}</div><div className="flex-1 min-w-0"><div className="flex items-center gap-2 mb-0.5"><span className="text-white font-medium text-sm">{comment.profile?.display_name || 'User'}</span><span className="text-[#636366] text-xs">{formatTimeAgo(comment.created_at)}</span></div><p className="text-[#D4D4D8] text-sm">{comment.content}</p></div></div>))}</div>)}</div>)}</div>
          <div className="flex gap-3"><button onClick={handleShare} className="p-3 bg-[#27272A] rounded-xl hover:bg-[#3F3F46] transition"><Share2 className="w-5 h-5 text-white" /></button>{isHost ? (<button disabled className="flex-1 py-3 bg-[#27272A] text-[#8E8E93] font-semibold rounded-xl">You're hosting</button>) : isGoing ? (<button onClick={() => onRSVP(meetup.id, 'cancel')} disabled={isPending} className="flex-1 py-3 bg-[#27272A] text-white font-semibold rounded-xl hover:bg-[#3F3F46] transition disabled:opacity-50">{isPending ? 'Updating...' : 'Cancel RSVP'}</button>) : (<button onClick={() => onRSVP(meetup.id, 'going')} disabled={isPending || isFull} className="flex-1 py-3 bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white font-semibold rounded-xl hover:brightness-110 transition disabled:opacity-50">{isPending ? 'Updating...' : isFull ? 'Event Full' : "I'm Going"}</button>)}</div>
        </div>
      </div>
    </div>
  );
}

function CreateChannelModal({ user, onClose, onSuccess }) {
  const [formData, setFormData] = useState({ name: '', description: '', icon: '💬', category: '', is_private: false });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) { toast.error('Please enter a channel name'); return; }
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('channels').insert({ name: formData.name.trim(), description: formData.description.trim() || null, icon: formData.icon, category: formData.category || null, is_official: false, is_private: formData.is_private, created_by: user.id, member_count: 1 });
      if (error) throw error;
      const { data: newChannel } = await supabase.from('channels').select('id').eq('name', formData.name.trim()).eq('created_by', user.id).single();
      if (newChannel) { await supabase.from('channel_members').insert({ channel_id: newChannel.id, user_id: user.id }); }
      onSuccess();
    } catch (err) { toast.error('Failed to create channel'); } finally { setIsSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center z-50" onClick={onClose}>
      <div className="bg-[#18181B] rounded-t-3xl sm:rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-[rgba(255,255,255,0.1)]"><div className="w-12 h-1.5 bg-[#3F3F46] rounded-full mx-auto mb-4 sm:hidden" /><h2 className="text-white text-[20px] font-bold">Create a Channel</h2><p className="text-gray-400 text-sm mt-1">Build a community around a topic</p></div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div><label className="block text-[#8E8E93] text-[13px] mb-2">Icon</label><div className="relative"><button type="button" onClick={() => setShowIconPicker(!showIconPicker)} className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#6366F1]/20 to-[#8B5CF6]/20 border border-white/10 flex items-center justify-center text-3xl hover:border-[#6366F1] transition">{formData.icon}</button>{showIconPicker && (<div className="absolute top-20 left-0 bg-[#27272A] border border-white/10 rounded-xl p-3 grid grid-cols-6 gap-2 z-10">{CHANNEL_ICONS.map(icon => (<button key={icon} type="button" onClick={() => { setFormData(prev => ({ ...prev, icon })); setShowIconPicker(false); }} className="w-10 h-10 rounded-lg hover:bg-white/10 flex items-center justify-center text-xl transition">{icon}</button>))}</div>)}</div></div>
          <div><label className="block text-[#8E8E93] text-[13px] mb-2">Channel Name *</label><input type="text" value={formData.name} onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))} placeholder="e.g., AI Builders Austin" className="w-full px-4 py-3 bg-[#27272A] text-white border border-[rgba(255,255,255,0.1)] rounded-xl focus:outline-none focus:border-[#6366F1]" maxLength={50} /></div>
          <div><label className="block text-[#8E8E93] text-[13px] mb-2">Description</label><textarea value={formData.description} onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))} placeholder="What's this channel about?" rows={3} className="w-full px-4 py-3 bg-[#27272A] text-white border border-[rgba(255,255,255,0.1)] rounded-xl focus:outline-none focus:border-[#6366F1] resize-none" /></div>
          <div><label className="block text-[#8E8E93] text-[13px] mb-2">Category</label><select value={formData.category} onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))} className="w-full px-4 py-3 bg-[#27272A] text-white border border-[rgba(255,255,255,0.1)] rounded-xl focus:outline-none focus:border-[#6366F1]"><option value="">Select a category...</option>{CHANNEL_CATEGORIES.map(cat => (<option key={cat} value={cat}>{cat}</option>))}</select></div>
          <div className="flex items-center gap-3 p-3 bg-[#27272A] rounded-xl"><input type="checkbox" checked={formData.is_private} onChange={e => setFormData(prev => ({ ...prev, is_private: e.target.checked }))} className="w-5 h-5 rounded bg-[#3F3F46] border-none text-[#6366F1]" /><div><span className="text-white text-[14px]">Private channel</span><p className="text-gray-500 text-[12px]">Only approved members can join</p></div></div>
          <div className="flex gap-3 pt-4"><button type="button" onClick={onClose} className="flex-1 py-3 bg-[#27272A] text-white font-semibold rounded-xl hover:bg-[#3F3F46] transition">Cancel</button><button type="submit" disabled={isSubmitting || !formData.name.trim()} className="flex-1 py-3 bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white font-semibold rounded-xl hover:brightness-110 transition disabled:opacity-50">{isSubmitting ? 'Creating...' : 'Create Channel'}</button></div>
        </form>
      </div>
    </div>
  );
}

function CreateMeetupModal({ user, onClose, onSuccess }) {
  const [formData, setFormData] = useState({ title: '', description: '', location: '', city: '', event_date: '', event_time: '', max_attendees: '', is_virtual: false, meeting_link: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const handleMaxAttendeesChange = (e) => { const value = e.target.value; if (value === '' || /^\d+$/.test(value)) setFormData(prev => ({ ...prev, max_attendees: value })); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.event_date || !formData.event_time) { toast.error('Please fill in required fields'); return; }
    const maxAttendees = parseInt(formData.max_attendees) || 20;
    if (maxAttendees < 2) { toast.error('Max attendees must be at least 2'); return; }
    if (maxAttendees > 500) { toast.error('Max attendees cannot exceed 500'); return; }
    setIsSubmitting(true);
    try {
      const eventDateTime = new Date(`${formData.event_date}T${formData.event_time}`);
      const { error } = await supabase.from('meetups').insert({ title: formData.title, description: formData.description, location: formData.is_virtual ? 'Virtual' : formData.location, city: formData.city, event_date: eventDateTime.toISOString(), max_attendees: maxAttendees, is_virtual: formData.is_virtual, meeting_link: formData.meeting_link, host_id: user.id, attendee_count: 1 });
      if (error) throw error;
      onSuccess();
    } catch (err) { toast.error('Failed to create meetup'); } finally { setIsSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center z-50" onClick={onClose}>
      <div className="bg-[#18181B] rounded-t-3xl sm:rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-[rgba(255,255,255,0.1)]"><div className="w-12 h-1.5 bg-[#3F3F46] rounded-full mx-auto mb-4 sm:hidden" /><h2 className="text-white text-[20px] font-bold">Create a Meetup</h2><p className="text-gray-400 text-sm mt-1">Bring founders together</p></div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div><label className="block text-[#8E8E93] text-[13px] mb-2">Title *</label><input type="text" value={formData.title} onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))} placeholder="e.g., AI Founders Happy Hour" className="w-full px-4 py-3 bg-[#27272A] text-white border border-[rgba(255,255,255,0.1)] rounded-xl focus:outline-none focus:border-[#6366F1]" /></div>
          <div><label className="block text-[#8E8E93] text-[13px] mb-2">Description</label><textarea value={formData.description} onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))} placeholder="What's this meetup about?" rows={3} className="w-full px-4 py-3 bg-[#27272A] text-white border border-[rgba(255,255,255,0.1)] rounded-xl focus:outline-none focus:border-[#6366F1] resize-none" /></div>
          <div className="flex items-center gap-3 p-3 bg-[#27272A] rounded-xl"><input type="checkbox" checked={formData.is_virtual} onChange={e => setFormData(prev => ({ ...prev, is_virtual: e.target.checked }))} className="w-5 h-5 rounded bg-[#3F3F46] border-none text-[#6366F1]" /><div><span className="text-white text-[14px]">Virtual meetup</span><p className="text-gray-500 text-[12px]">Host online via Zoom, Meet, etc.</p></div></div>
          {!formData.is_virtual && (<><div><label className="block text-[#8E8E93] text-[13px] mb-2">Location *</label><input type="text" value={formData.location} onChange={e => setFormData(prev => ({ ...prev, location: e.target.value }))} placeholder="e.g., Blue Bottle Coffee, 123 Main St" className="w-full px-4 py-3 bg-[#27272A] text-white border border-[rgba(255,255,255,0.1)] rounded-xl focus:outline-none focus:border-[#6366F1]" /></div><div><label className="block text-[#8E8E93] text-[13px] mb-2">City</label><input type="text" value={formData.city} onChange={e => setFormData(prev => ({ ...prev, city: e.target.value }))} placeholder="e.g., San Francisco" className="w-full px-4 py-3 bg-[#27272A] text-white border border-[rgba(255,255,255,0.1)] rounded-xl focus:outline-none focus:border-[#6366F1]" /></div></>)}
          {formData.is_virtual && (<div><label className="block text-[#8E8E93] text-[13px] mb-2">Meeting Link</label><input type="url" value={formData.meeting_link} onChange={e => setFormData(prev => ({ ...prev, meeting_link: e.target.value }))} placeholder="https://zoom.us/j/..." className="w-full px-4 py-3 bg-[#27272A] text-white border border-[rgba(255,255,255,0.1)] rounded-xl focus:outline-none focus:border-[#6366F1]" /><p className="text-[#636366] text-[11px] mt-1">Only visible to attendees who RSVP</p></div>)}
          <div className="grid grid-cols-2 gap-4"><div><label className="block text-[#8E8E93] text-[13px] mb-2">Date *</label><input type="date" value={formData.event_date} onChange={e => setFormData(prev => ({ ...prev, event_date: e.target.value }))} min={new Date().toISOString().split('T')[0]} className="w-full px-4 py-3 bg-[#27272A] text-white border border-[rgba(255,255,255,0.1)] rounded-xl focus:outline-none focus:border-[#6366F1]" /></div><div><label className="block text-[#8E8E93] text-[13px] mb-2">Time *</label><input type="time" value={formData.event_time} onChange={e => setFormData(prev => ({ ...prev, event_time: e.target.value }))} className="w-full px-4 py-3 bg-[#27272A] text-white border border-[rgba(255,255,255,0.1)] rounded-xl focus:outline-none focus:border-[#6366F1]" /></div></div>
          <div><label className="block text-[#8E8E93] text-[13px] mb-2">Max Attendees</label><input type="text" inputMode="numeric" pattern="[0-9]*" value={formData.max_attendees} onChange={handleMaxAttendeesChange} placeholder="20" className="w-full px-4 py-3 bg-[#27272A] text-white border border-[rgba(255,255,255,0.1)] rounded-xl focus:outline-none focus:border-[#6366F1]" /><p className="text-[#636366] text-[11px] mt-1">Leave empty for default (20). Max 500.</p></div>
          <div className="flex gap-3 pt-4"><button type="button" onClick={onClose} className="flex-1 py-3 bg-[#27272A] text-white font-semibold rounded-xl hover:bg-[#3F3F46] transition">Cancel</button><button type="submit" disabled={isSubmitting} className="flex-1 py-3 bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white font-semibold rounded-xl hover:brightness-110 transition disabled:opacity-50">{isSubmitting ? 'Creating...' : 'Create Meetup'}</button></div>
        </form>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { ArrowLeft, Users, MapPin, Calendar, Plus, MessageCircle, ChevronRight, Search, Video, Clock, X, Hash } from 'lucide-react';
import { toast } from 'sonner';

const CHANNEL_ICONS = ['💬', '🚀', '💡', '🎯', '🔥', '⚡', '🌟', '💎', '🎨', '🛠️', '📱', '🤖', '💰', '📈', '🎮', '🏥', '🌍', '📚'];

const CHANNEL_CATEGORIES = [
  'AI/ML', 'SaaS', 'Fintech', 'Healthcare', 'E-commerce', 'Consumer', 
  'Climate', 'Education', 'Gaming', 'Hardware', 'Marketplace', 'Developer Tools', 'Other'
];

export default function Community() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('channels');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateMeetup, setShowCreateMeetup] = useState(false);
  const [showCreateChannel, setShowCreateChannel] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        return { ...user, ...profile };
      }
      return null;
    }
  });

  const { data: channels = [], isLoading: channelsLoading } = useQuery({
    queryKey: ['channels'],
    queryFn: async () => {
      const { data } = await supabase.from('channels').select('*').order('member_count', { ascending: false });
      return data || [];
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

  const { data: meetupHosts = [] } = useQuery({
    queryKey: ['meetupHosts', meetups.map(m => m.host_id)],
    queryFn: async () => {
      if (meetups.length === 0) return [];
      const hostIds = [...new Set(meetups.map(m => m.host_id))];
      const { data } = await supabase.from('profiles').select('*').in('id', hostIds);
      return data || [];
    },
    enabled: meetups.length > 0
  });

  const { data: founders = [], isLoading: foundersLoading } = useQuery({
    queryKey: ['founders', searchQuery],
    queryFn: async () => {
      let query = supabase.from('profiles').select('*').eq('is_visible_in_directory', true).limit(50);
      if (searchQuery) {
        query = query.or(`display_name.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%`);
      }
      const { data } = await query;
      return data || [];
    },
    enabled: activeTab === 'founders'
  });

  const joinChannelMutation = useMutation({
    mutationFn: async (channelId) => {
      if (!user) throw new Error('Must be logged in');
      const isJoined = userChannels.includes(channelId);
      if (isJoined) {
        await supabase.from('channel_members').delete().eq('channel_id', channelId).eq('user_id', user.id);
      } else {
        await supabase.from('channel_members').insert({ channel_id: channelId, user_id: user.id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userChannels'] });
      queryClient.invalidateQueries({ queryKey: ['channels'] });
    }
  });

  const handleJoinChannel = (e, channelId) => {
    e.stopPropagation();
    if (!user) { navigate('/Login'); return; }
    joinChannelMutation.mutate(channelId);
  };

  const filteredChannels = channels.filter(c => 
    c.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            return (
              <button key={tab.id} onClick={() => { setActiveTab(tab.id); setSearchQuery(''); }} className={`flex-1 flex items-center justify-center gap-2 py-3 transition ${activeTab === tab.id ? 'text-white border-b-2 border-[#6366F1]' : 'text-[#636366]'}`}>
                <Icon className="w-4 h-4" /><span className="text-[14px] font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="pt-44 px-4">
        {activeTab === 'channels' && (
          <div className="space-y-3">
            {/* Create Channel Button */}
            {user && (
              <button 
                onClick={() => setShowCreateChannel(true)} 
                className="w-full p-4 bg-gradient-to-r from-[#6366F1]/20 to-[#8B5CF6]/20 border border-[#6366F1]/40 rounded-xl flex items-center justify-center gap-2 text-[#6366F1] font-semibold hover:from-[#6366F1]/30 hover:to-[#8B5CF6]/30 transition"
              >
                <Plus className="w-5 h-5" />Create a Channel
              </button>
            )}
            
            {channelsLoading ? [...Array(6)].map((_, i) => <div key={i} className="h-20 bg-[#1C1C1E] rounded-xl animate-pulse" />) : filteredChannels.length === 0 ? (
              <div className="text-center py-12"><MessageCircle className="w-12 h-12 text-[#636366] mx-auto mb-3" /><p className="text-[#8E8E93]">No channels found</p></div>
            ) : filteredChannels.map(channel => {
              const isJoined = userChannels.includes(channel.id);
              return (
                <div 
                  key={channel.id} 
                  onClick={() => navigate(createPageUrl('ChannelDetail') + `?id=${channel.id}`)}
                  className="bg-[#1C1C1E] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 cursor-pointer hover:bg-[rgba(255,255,255,0.04)] transition"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#6366F1]/20 to-[#8B5CF6]/20 flex items-center justify-center text-2xl">{channel.icon || '💬'}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-white font-semibold text-[15px]">{channel.name}</h3>
                        {channel.is_official && <span className="px-1.5 py-0.5 bg-[#6366F1]/20 text-[#6366F1] text-[10px] font-bold rounded">OFFICIAL</span>}
                        {channel.category && <span className="px-1.5 py-0.5 bg-white/10 text-gray-400 text-[10px] rounded">{channel.category}</span>}
                      </div>
                      <p className="text-[#8E8E93] text-[13px] line-clamp-1 mt-0.5">{channel.description}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-[#636366] text-[12px] flex items-center gap-1"><Users className="w-3 h-3" />{channel.member_count || 0} members</span>
                        {channel.created_by && channel.created_by === user?.id && (
                          <span className="text-[#6366F1] text-[10px] font-medium">Your channel</span>
                        )}
                      </div>
                    </div>
                    <button 
                      onClick={(e) => handleJoinChannel(e, channel.id)} 
                      disabled={joinChannelMutation.isPending} 
                      className={`px-4 py-2 rounded-lg text-[13px] font-semibold transition ${isJoined ? 'bg-[rgba(255,255,255,0.06)] text-white' : 'bg-[#6366F1] text-white hover:brightness-110'}`}
                    >
                      {isJoined ? 'Joined' : 'Join'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'meetups' && (
          <div className="space-y-4">
            {user && <button onClick={() => setShowCreateMeetup(true)} className="w-full p-4 bg-gradient-to-r from-[#6366F1]/20 to-[#8B5CF6]/20 border border-[#6366F1]/40 rounded-xl flex items-center justify-center gap-2 text-[#6366F1] font-semibold hover:from-[#6366F1]/30 hover:to-[#8B5CF6]/30 transition"><Plus className="w-5 h-5" />Create a Meetup</button>}
            {meetupsLoading ? [...Array(4)].map((_, i) => <div key={i} className="h-32 bg-[#1C1C1E] rounded-xl animate-pulse" />) : meetups.length === 0 ? (
              <div className="text-center py-12"><Calendar className="w-12 h-12 text-[#636366] mx-auto mb-3" /><p className="text-[#8E8E93] mb-2">No upcoming meetups</p><p className="text-[#636366] text-[13px]">Be the first to create one!</p></div>
            ) : meetups.map(meetup => {
              const host = meetupHosts.find(h => h.id === meetup.host_id);
              const eventDate = new Date(meetup.event_date);
              return (
                <div key={meetup.id} className="w-full bg-[#1C1C1E] border border-[rgba(255,255,255,0.06)] rounded-xl p-4">
                  <div className="flex gap-4">
                    <div className="w-14 h-14 rounded-xl bg-[#6366F1]/20 flex flex-col items-center justify-center flex-shrink-0">
                      <span className="text-[#6366F1] text-[10px] font-bold uppercase">{eventDate.toLocaleDateString('en-US', { month: 'short' })}</span>
                      <span className="text-white text-[20px] font-bold leading-none">{eventDate.getDate()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-semibold text-[15px] mb-1">{meetup.title}</h3>
                      <div className="flex items-center gap-3 text-[#8E8E93] text-[12px]">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
                        <span className="flex items-center gap-1">{meetup.is_virtual ? <Video className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}{meetup.is_virtual ? 'Virtual' : meetup.city || meetup.location}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center overflow-hidden">
                          {host?.avatar_url ? <img src={host.avatar_url} alt="" className="w-full h-full object-cover" /> : <span className="text-white text-[10px] font-bold">{(host?.display_name || 'H')?.[0]}</span>}
                        </div>
                        <span className="text-[#636366] text-[11px]">Hosted by {host?.display_name || 'Unknown'}</span>
                        <span className="text-[#636366] text-[11px]">• {meetup.attendee_count}/{meetup.max_attendees} going</span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-[#636366] self-center" />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'founders' && (
          <div className="space-y-3">
            {foundersLoading ? [...Array(6)].map((_, i) => <div key={i} className="h-20 bg-[#1C1C1E] rounded-xl animate-pulse" />) : founders.length === 0 ? (
              <div className="text-center py-12"><Users className="w-12 h-12 text-[#636366] mx-auto mb-3" /><p className="text-[#8E8E93]">No founders found</p></div>
            ) : founders.map(founder => (
              <button key={founder.id} onClick={() => navigate(createPageUrl('Profile') + `?userId=${founder.id}`)} className="w-full bg-[#1C1C1E] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 text-left hover:bg-[rgba(255,255,255,0.04)] transition">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center overflow-hidden">
                    {founder.avatar_url ? <img src={founder.avatar_url} alt="" className="w-full h-full object-cover" /> : <span className="text-white text-[18px] font-bold">{(founder.display_name || founder.username || 'U')?.[0]?.toUpperCase()}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-semibold text-[15px]">{founder.display_name || founder.full_name || 'Founder'}</h3>
                    {founder.username && <p className="text-[#8E8E93] text-[13px]">@{founder.username}</p>}
                    {(founder.city || founder.company_name) && <div className="flex items-center gap-2 mt-1 text-[#636366] text-[12px]">{founder.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{founder.city}</span>}{founder.company_name && <span>• {founder.company_name}</span>}</div>}
                  </div>
                  <ChevronRight className="w-5 h-5 text-[#636366]" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {showCreateMeetup && <CreateMeetupModal user={user} onClose={() => setShowCreateMeetup(false)} onSuccess={() => { setShowCreateMeetup(false); queryClient.invalidateQueries({ queryKey: ['meetups'] }); toast.success('Meetup created!'); }} />}
      
      {showCreateChannel && <CreateChannelModal user={user} onClose={() => setShowCreateChannel(false)} onSuccess={() => { setShowCreateChannel(false); queryClient.invalidateQueries({ queryKey: ['channels'] }); toast.success('Channel created!'); }} />}
    </div>
  );
}

function CreateChannelModal({ user, onClose, onSuccess }) {
  const [formData, setFormData] = useState({ 
    name: '', 
    description: '', 
    icon: '💬',
    category: '',
    is_private: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) { 
      toast.error('Please enter a channel name'); 
      return; 
    }
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('channels').insert({ 
        name: formData.name.trim(), 
        description: formData.description.trim() || null,
        icon: formData.icon,
        category: formData.category || null,
        is_official: false,
        is_private: formData.is_private,
        created_by: user.id,
        member_count: 1
      });
      
      if (error) throw error;
      
      // Auto-join the channel creator
      const { data: newChannel } = await supabase
        .from('channels')
        .select('id')
        .eq('name', formData.name.trim())
        .eq('created_by', user.id)
        .single();
      
      if (newChannel) {
        await supabase.from('channel_members').insert({
          channel_id: newChannel.id,
          user_id: user.id
        });
      }
      
      onSuccess();
    } catch (err) { 
      console.error('Error creating channel:', err);
      toast.error('Failed to create channel'); 
    } finally { 
      setIsSubmitting(false); 
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center z-50" onClick={onClose}>
      <div className="bg-[#18181B] rounded-t-3xl sm:rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-[rgba(255,255,255,0.1)]">
          <div className="w-12 h-1.5 bg-[#3F3F46] rounded-full mx-auto mb-4 sm:hidden" />
          <h2 className="text-white text-[20px] font-bold">Create a Channel</h2>
          <p className="text-gray-400 text-sm mt-1">Build a community around a topic</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Icon Picker */}
          <div>
            <label className="block text-[#8E8E93] text-[13px] mb-2">Icon</label>
            <div className="relative">
              <button 
                type="button"
                onClick={() => setShowIconPicker(!showIconPicker)}
                className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#6366F1]/20 to-[#8B5CF6]/20 border border-white/10 flex items-center justify-center text-3xl hover:border-[#6366F1] transition"
              >
                {formData.icon}
              </button>
              {showIconPicker && (
                <div className="absolute top-20 left-0 bg-[#27272A] border border-white/10 rounded-xl p-3 grid grid-cols-6 gap-2 z-10">
                  {CHANNEL_ICONS.map(icon => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => { setFormData(prev => ({ ...prev, icon })); setShowIconPicker(false); }}
                      className="w-10 h-10 rounded-lg hover:bg-white/10 flex items-center justify-center text-xl transition"
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-[#8E8E93] text-[13px] mb-2">Channel Name *</label>
            <input 
              type="text" 
              value={formData.name} 
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))} 
              placeholder="e.g., AI Builders Austin" 
              className="w-full px-4 py-3 bg-[#27272A] text-white border border-[rgba(255,255,255,0.1)] rounded-xl focus:outline-none focus:border-[#6366F1]" 
              maxLength={50}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-[#8E8E93] text-[13px] mb-2">Description</label>
            <textarea 
              value={formData.description} 
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))} 
              placeholder="What's this channel about?" 
              rows={3} 
              className="w-full px-4 py-3 bg-[#27272A] text-white border border-[rgba(255,255,255,0.1)] rounded-xl focus:outline-none focus:border-[#6366F1] resize-none" 
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-[#8E8E93] text-[13px] mb-2">Category</label>
            <select
              value={formData.category}
              onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
              className="w-full px-4 py-3 bg-[#27272A] text-white border border-[rgba(255,255,255,0.1)] rounded-xl focus:outline-none focus:border-[#6366F1]"
            >
              <option value="">Select a category...</option>
              {CHANNEL_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Private toggle */}
          <div className="flex items-center gap-3 p-3 bg-[#27272A] rounded-xl">
            <input 
              type="checkbox" 
              checked={formData.is_private} 
              onChange={e => setFormData(prev => ({ ...prev, is_private: e.target.checked }))} 
              className="w-5 h-5 rounded bg-[#3F3F46] border-none text-[#6366F1]" 
            />
            <div>
              <span className="text-white text-[14px]">Private channel</span>
              <p className="text-gray-500 text-[12px]">Only approved members can join</p>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-3 bg-[#27272A] text-white font-semibold rounded-xl hover:bg-[#3F3F46] transition">Cancel</button>
            <button type="submit" disabled={isSubmitting || !formData.name.trim()} className="flex-1 py-3 bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white font-semibold rounded-xl hover:brightness-110 transition disabled:opacity-50">{isSubmitting ? 'Creating...' : 'Create Channel'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreateMeetupModal({ user, onClose, onSuccess }) {
  const [formData, setFormData] = useState({ title: '', description: '', location: '', city: '', event_date: '', event_time: '', max_attendees: 20, is_virtual: false, meeting_link: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.event_date || !formData.event_time) { toast.error('Please fill in required fields'); return; }
    setIsSubmitting(true);
    try {
      const eventDateTime = new Date(`${formData.event_date}T${formData.event_time}`);
      const { error } = await supabase.from('meetups').insert({ title: formData.title, description: formData.description, location: formData.is_virtual ? 'Virtual' : formData.location, city: formData.city, event_date: eventDateTime.toISOString(), max_attendees: formData.max_attendees, is_virtual: formData.is_virtual, meeting_link: formData.meeting_link, host_id: user.id, attendee_count: 1 });
      if (error) throw error;
      onSuccess();
    } catch (err) { toast.error('Failed to create meetup'); } finally { setIsSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center z-50" onClick={onClose}>
      <div className="bg-[#18181B] rounded-t-3xl sm:rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-[rgba(255,255,255,0.1)]">
          <div className="w-12 h-1.5 bg-[#3F3F46] rounded-full mx-auto mb-4 sm:hidden" />
          <h2 className="text-white text-[20px] font-bold">Create a Meetup</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div><label className="block text-[#8E8E93] text-[13px] mb-2">Title *</label><input type="text" value={formData.title} onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))} placeholder="e.g., AI Founders Happy Hour" className="w-full px-4 py-3 bg-[#27272A] text-white border border-[rgba(255,255,255,0.1)] rounded-xl focus:outline-none focus:border-[#6366F1]" /></div>
          <div><label className="block text-[#8E8E93] text-[13px] mb-2">Description</label><textarea value={formData.description} onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))} placeholder="What's this meetup about?" rows={3} className="w-full px-4 py-3 bg-[#27272A] text-white border border-[rgba(255,255,255,0.1)] rounded-xl focus:outline-none focus:border-[#6366F1] resize-none" /></div>
          <div className="flex items-center gap-3 p-3 bg-[#27272A] rounded-xl"><input type="checkbox" checked={formData.is_virtual} onChange={e => setFormData(prev => ({ ...prev, is_virtual: e.target.checked }))} className="w-5 h-5 rounded bg-[#3F3F46] border-none text-[#6366F1]" /><span className="text-white text-[14px]">Virtual meetup</span></div>
          {!formData.is_virtual && <><div><label className="block text-[#8E8E93] text-[13px] mb-2">Location *</label><input type="text" value={formData.location} onChange={e => setFormData(prev => ({ ...prev, location: e.target.value }))} placeholder="e.g., Blue Bottle Coffee" className="w-full px-4 py-3 bg-[#27272A] text-white border border-[rgba(255,255,255,0.1)] rounded-xl focus:outline-none focus:border-[#6366F1]" /></div><div><label className="block text-[#8E8E93] text-[13px] mb-2">City</label><input type="text" value={formData.city} onChange={e => setFormData(prev => ({ ...prev, city: e.target.value }))} placeholder="e.g., San Francisco" className="w-full px-4 py-3 bg-[#27272A] text-white border border-[rgba(255,255,255,0.1)] rounded-xl focus:outline-none focus:border-[#6366F1]" /></div></>}
          {formData.is_virtual && <div><label className="block text-[#8E8E93] text-[13px] mb-2">Meeting Link</label><input type="url" value={formData.meeting_link} onChange={e => setFormData(prev => ({ ...prev, meeting_link: e.target.value }))} placeholder="https://zoom.us/j/..." className="w-full px-4 py-3 bg-[#27272A] text-white border border-[rgba(255,255,255,0.1)] rounded-xl focus:outline-none focus:border-[#6366F1]" /></div>}
          <div className="grid grid-cols-2 gap-3"><div><label className="block text-[#8E8E93] text-[13px] mb-2">Date *</label><input type="date" value={formData.event_date} onChange={e => setFormData(prev => ({ ...prev, event_date: e.target.value }))} min={new Date().toISOString().split('T')[0]} className="w-full px-4 py-3 bg-[#27272A] text-white border border-[rgba(255,255,255,0.1)] rounded-xl focus:outline-none focus:border-[#6366F1]" /></div><div><label className="block text-[#8E8E93] text-[13px] mb-2">Time *</label><input type="time" value={formData.event_time} onChange={e => setFormData(prev => ({ ...prev, event_time: e.target.value }))} className="w-full px-4 py-3 bg-[#27272A] text-white border border-[rgba(255,255,255,0.1)] rounded-xl focus:outline-none focus:border-[#6366F1]" /></div></div>
          <div><label className="block text-[#8E8E93] text-[13px] mb-2">Max Attendees</label><input type="number" value={formData.max_attendees} onChange={e => setFormData(prev => ({ ...prev, max_attendees: parseInt(e.target.value) || 20 }))} min={2} max={100} className="w-full px-4 py-3 bg-[#27272A] text-white border border-[rgba(255,255,255,0.1)] rounded-xl focus:outline-none focus:border-[#6366F1]" /></div>
          <div className="flex gap-3 pt-4"><button type="button" onClick={onClose} className="flex-1 py-3 bg-[#27272A] text-white font-semibold rounded-xl hover:bg-[#3F3F46] transition">Cancel</button><button type="submit" disabled={isSubmitting} className="flex-1 py-3 bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white font-semibold rounded-xl hover:brightness-110 transition disabled:opacity-50">{isSubmitting ? 'Creating...' : 'Create Meetup'}</button></div>
        </form>
      </div>
    </div>
  );
}

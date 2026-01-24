import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Search, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';

export default function ForumHome() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newThread, setNewThread] = useState({ title: '', content: '', category: 'General' });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return null;
      const { data: profile } = await supabase.from('users').select('*').eq('id', authUser.id).single();
      return { ...authUser, ...profile };
    }
  });

  const { data: threads = [], isLoading } = useQuery({
    queryKey: ['forumThreads', selectedCategory],
    queryFn: async () => {
      let query = supabase.from('forum_threads').select('*').order('last_post_at', { ascending: false });
      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory);
      }
      const { data } = await query;
      return data || [];
    },
    refetchInterval: 10000
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: async () => {
      const { data } = await supabase.from('users').select('*');
      return data || [];
    }
  });

  const createThreadMutation = useMutation({
    mutationFn: async (threadData) => {
      const { data, error } = await supabase.from('forum_threads').insert({
        ...threadData,
        created_by: user.id,
        last_post_at: new Date().toISOString()
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (thread) => {
      queryClient.invalidateQueries({ queryKey: ['forumThreads'] });
      setShowCreateModal(false);
      setNewThread({ title: '', content: '', category: 'General' });
      toast.success('Thread created!');
      navigate(createPageUrl('ForumThreadDetail') + `?id=${thread.id}`);
    },
    onError: () => {
      toast.error('Failed to create thread');
    }
  });

  const categories = ['General', 'Product Feedback', 'Help & Support', 'Feature Requests', 'Show & Tell', 'Off Topic'];

  const filteredThreads = threads.filter(thread =>
    !searchQuery || 
    thread.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    thread.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateThread = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    setShowCreateModal(true);
  };

  const handleSubmitThread = () => {
    if (!newThread.title.trim() || !newThread.content.trim()) {
      toast.error('Please fill in all fields');
      return;
    }
    createThreadMutation.mutate(newThread);
  };

  const formatTime = (date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return 'now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-[#000000] pb-20">
      <div className="sticky top-0 bg-[#000000]/95 backdrop-blur-lg z-20 border-b border-[rgba(255,255,255,0.06)]">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(createPageUrl('Explore'))} className="w-10 h-10 rounded-full bg-[rgba(255,255,255,0.06)] flex items-center justify-center text-[#8E8E93] hover:text-white transition"><ArrowLeft className="w-5 h-5" /></button>
            <div>
              <h1 className="text-white text-xl font-bold">Community Forum</h1>
              <p className="text-[#8E8E93] text-sm">{threads.length} discussions</p>
            </div>
          </div>
          <button onClick={handleCreateThread} className="px-4 py-2 bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] text-white text-sm font-semibold rounded-xl hover:brightness-110 transition flex items-center gap-2"><Plus className="w-4 h-4" />New Thread</button>
        </div>

        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#636366]" />
            <input type="text" placeholder="Search discussions..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-[#1C1C1E] text-white text-sm border border-[rgba(255,255,255,0.06)] rounded-xl focus:outline-none focus:border-[#6366F1] placeholder:text-[#636366]" />
          </div>
        </div>

        <div className="px-4 py-3 border-t border-[rgba(255,255,255,0.06)] overflow-x-auto">
          <div className="flex gap-2">
            <button onClick={() => setSelectedCategory('all')} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${selectedCategory === 'all' ? 'bg-[#6366F1] text-white' : 'bg-[rgba(255,255,255,0.06)] text-[#8E8E93] hover:bg-[rgba(255,255,255,0.1)]'}`}>All</button>
            {categories.map((cat) => (
              <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${selectedCategory === cat ? 'bg-[#6366F1] text-white' : 'bg-[rgba(255,255,255,0.06)] text-[#8E8E93] hover:bg-[rgba(255,255,255,0.1)]'}`}>{cat}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-2 border-[#6366F1] border-t-transparent rounded-full animate-spin" /></div>
        ) : filteredThreads.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="w-12 h-12 text-[#3F3F46] mx-auto mb-4" />
            <h3 className="text-white font-semibold mb-2">No discussions yet</h3>
            <p className="text-[#8E8E93] mb-6">Be the first to start a conversation!</p>
            <button onClick={handleCreateThread} className="px-6 py-3 bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] text-white font-semibold rounded-xl hover:brightness-110 transition">Create Thread</button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredThreads.map((thread) => {
              const author = allUsers.find(u => u.id === thread.created_by);
              return (
                <button key={thread.id} onClick={() => navigate(createPageUrl('ForumThreadDetail') + `?id=${thread.id}`)} className="w-full bg-[#18181B] border border-[rgba(255,255,255,0.1)] rounded-xl p-4 hover:border-[#6366F1]/50 transition text-left">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center overflow-hidden flex-shrink-0">
                      {author?.avatar_url ? <img src={author.avatar_url} alt="" className="w-full h-full object-cover" /> : <span className="text-white text-sm font-bold">{(author?.display_name || 'U')[0].toUpperCase()}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 bg-[#6366F1]/20 text-[#6366F1] text-xs font-medium rounded">{thread.category}</span>
                        {thread.is_pinned && <span className="text-[#F59E0B] text-xs">📌 Pinned</span>}
                        {thread.is_locked && <span className="text-[#EF4444] text-xs">🔒 Locked</span>}
                      </div>
                      <h3 className="text-white font-semibold mb-1 truncate">{thread.title}</h3>
                      <p className="text-[#8E8E93] text-sm line-clamp-2 mb-2">{thread.content}</p>
                      <div className="flex items-center gap-4 text-[#636366] text-xs">
                        <span>{author?.display_name || 'Unknown'}</span>
                        <span>{thread.view_count || 0} views</span>
                        <span>{thread.post_count || 0} replies</span>
                        <span>{formatTime(thread.last_post_at || thread.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="bg-[#18181B] border border-[rgba(255,255,255,0.1)] rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-white mb-6">Create New Thread</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#A1A1AA] mb-2">Category</label>
                <select value={newThread.category} onChange={(e) => setNewThread({ ...newThread, category: e.target.value })} className="w-full px-4 py-3 bg-[#0A0A0A] border border-[rgba(255,255,255,0.1)] rounded-xl text-white focus:outline-none focus:border-[#6366F1]">
                  {categories.map((cat) => (<option key={cat} value={cat}>{cat}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#A1A1AA] mb-2">Title</label>
                <input type="text" value={newThread.title} onChange={(e) => setNewThread({ ...newThread, title: e.target.value })} placeholder="What's on your mind?" maxLength={200} className="w-full px-4 py-3 bg-[#0A0A0A] border border-[rgba(255,255,255,0.1)] rounded-xl text-white placeholder:text-[#636366] focus:outline-none focus:border-[#6366F1]" />
                <div className="text-right text-[#636366] text-xs mt-1">{newThread.title.length}/200</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#A1A1AA] mb-2">Content</label>
                <textarea value={newThread.content} onChange={(e) => setNewThread({ ...newThread, content: e.target.value })} placeholder="Share your thoughts..." rows={8} className="w-full px-4 py-3 bg-[#0A0A0A] border border-[rgba(255,255,255,0.1)] rounded-xl text-white placeholder:text-[#636366] focus:outline-none focus:border-[#6366F1] resize-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowCreateModal(false); setNewThread({ title: '', content: '', category: 'General' }); }} className="flex-1 px-6 py-3 bg-[#27272A] text-white rounded-xl hover:bg-[#3F3F46] transition">Cancel</button>
              <button onClick={handleSubmitThread} disabled={createThreadMutation.isPending} className="flex-1 px-6 py-3 bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] text-white font-semibold rounded-xl hover:brightness-110 transition disabled:opacity-50">{createThreadMutation.isPending ? 'Creating...' : 'Create Thread'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

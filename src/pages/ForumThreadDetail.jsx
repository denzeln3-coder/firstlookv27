import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Send, Pin, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';
import ForumPostItem from '../components/forum/ForumPostItem';

export default function ForumThreadDetail() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const postsEndRef = useRef(null);
  const [replyContent, setReplyContent] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);

  const urlParams = new URLSearchParams(window.location.search);
  const threadId = urlParams.get('id');

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

  const { data: thread, isLoading: threadLoading } = useQuery({
    queryKey: ['forumThread', threadId],
    queryFn: async () => {
      const threads = await base44.entities.ForumThread.list();
      const thread = threads.find(t => t.id === threadId);
      if (thread) {
        // Increment view count
        await base44.entities.ForumThread.update(threadId, {
          view_count: (thread.view_count || 0) + 1
        });
      }
      return thread;
    },
    enabled: !!threadId
  });

  const { data: posts = [], isLoading: postsLoading } = useQuery({
    queryKey: ['forumPosts', threadId],
    queryFn: () => base44.entities.ForumPost.filter({ thread_id: threadId }, 'created_date'),
    enabled: !!threadId,
    refetchInterval: 5000
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list()
  });

  const createPostMutation = useMutation({
    mutationFn: async (postData) => {
      await base44.entities.ForumPost.create(postData);
      await base44.entities.ForumThread.update(threadId, {
        last_post_at: new Date().toISOString(),
        post_count: (thread?.post_count || 0) + 1
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forumPosts'] });
      queryClient.invalidateQueries({ queryKey: ['forumThread'] });
      setReplyContent('');
      setReplyingTo(null);
      toast.success('Reply posted!');
    },
    onError: () => {
      toast.error('Failed to post reply');
    }
  });

  useEffect(() => {
    postsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [posts]);

  const handleSubmitReply = () => {
    if (!user) {
      base44.auth.redirectToLogin(window.location.pathname + window.location.search);
      return;
    }

    if (!replyContent.trim()) {
      toast.error('Please write something');
      return;
    }

    if (thread?.is_locked) {
      toast.error('This thread is locked');
      return;
    }

    createPostMutation.mutate({
      thread_id: threadId,
      content: replyContent.trim(),
      parent_post_id: replyingTo?.id || null
    });
  };

  if (threadLoading) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#6366F1] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-white text-xl font-bold mb-4">Thread not found</h2>
          <button
            onClick={() => navigate(createPageUrl('ForumHome'))}
            className="px-6 py-3 bg-[#6366F1] text-white font-semibold rounded-xl hover:brightness-110 transition"
          >
            Back to Forum
          </button>
        </div>
      </div>
    );
  }

  const threadAuthor = allUsers.find(u => u.id === thread.created_by);

  return (
    <div className="min-h-screen bg-[#000000] pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-[#000000]/95 backdrop-blur-lg z-20 border-b border-[rgba(255,255,255,0.06)]">
        <div className="px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate(createPageUrl('ForumHome'))}
            className="w-10 h-10 rounded-full bg-[rgba(255,255,255,0.06)] flex items-center justify-center text-[#8E8E93] hover:text-white transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              {thread.is_pinned && <Pin className="w-4 h-4 text-[#6366F1]" />}
              {thread.is_locked && <Lock className="w-4 h-4 text-[#F59E0B]" />}
              <span className="px-2 py-0.5 bg-[#6366F1]/20 text-[#6366F1] text-xs font-medium rounded">
                {thread.category}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Thread Content */}
      <div className="px-4 py-6">
        {/* Original Post */}
        <div className="bg-[#18181B] border border-[rgba(255,255,255,0.1)] rounded-2xl p-6 mb-6">
          <h1 className="text-white text-2xl font-bold mb-4">{thread.title}</h1>
          
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center overflow-hidden">
              {threadAuthor?.avatar_url ? (
                <img src={threadAuthor.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white text-sm font-bold">
                  {(threadAuthor?.display_name || threadAuthor?.username)?.[0]?.toUpperCase() || '?'}
                </span>
              )}
            </div>
            <div>
              <div className="text-white text-sm font-semibold">
                {threadAuthor?.display_name || threadAuthor?.username || 'Unknown'}
              </div>
              <div className="text-[#636366] text-xs">
                {new Date(thread.created_date).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit'
                })}
              </div>
            </div>
          </div>

          <div className="text-[#A1A1AA] text-sm leading-relaxed whitespace-pre-wrap">{thread.content}</div>

          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-[rgba(255,255,255,0.06)] text-[#636366] text-xs">
            <span>{thread.view_count || 0} views</span>
            <span>{thread.post_count || 0} replies</span>
          </div>
        </div>

        {/* Replies */}
        <div className="space-y-4">
          <h2 className="text-white text-lg font-semibold mb-4">
            {posts.length} {posts.length === 1 ? 'Reply' : 'Replies'}
          </h2>
          
          {postsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-[#6366F1] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-[#8E8E93]">No replies yet. Be the first to respond!</p>
            </div>
          ) : (
            posts.map((post) => (
              <ForumPostItem 
                key={post.id} 
                post={post} 
                users={allUsers}
                onReply={setReplyingTo}
              />
            ))
          )}
          <div ref={postsEndRef} />
        </div>
      </div>

      {/* Reply Input */}
      {!thread.is_locked && (
        <div className="fixed bottom-0 left-0 right-0 bg-[#000000]/95 backdrop-blur-lg border-t border-[rgba(255,255,255,0.06)] p-4">
          {replyingTo && (
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-[#6366F1]">Replying to {allUsers.find(u => u.id === replyingTo.created_by)?.display_name || 'someone'}</span>
              <button
                onClick={() => setReplyingTo(null)}
                className="text-[#8E8E93] hover:text-white"
              >
                Cancel
              </button>
            </div>
          )}
          <div className="flex gap-2">
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmitReply();
                }
              }}
              placeholder={user ? "Write a reply..." : "Log in to reply"}
              disabled={!user}
              rows={2}
              className="flex-1 px-4 py-3 bg-[#1C1C1E] text-white text-sm border border-[rgba(255,255,255,0.06)] rounded-xl focus:outline-none focus:border-[#6366F1] placeholder:text-[#636366] resize-none disabled:opacity-50"
            />
            <button
              onClick={handleSubmitReply}
              disabled={!replyContent.trim() || !user || createPostMutation.isPending}
              className="px-4 py-3 bg-[#6366F1] text-white rounded-xl hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed self-end"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
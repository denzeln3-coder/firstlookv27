import React from 'react';
import { Reply, ThumbsUp } from 'lucide-react';

export default function ForumPostItem({ post, users, onReply }) {
  const author = users.find(u => u.id === post.created_by);

  return (
    <div className="bg-[#18181B] border border-[rgba(255,255,255,0.1)] rounded-xl p-4">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center flex-shrink-0 overflow-hidden">
          {author?.avatar_url ? (
            <img src={author.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-white text-xs font-bold">
              {(author?.display_name || author?.username)?.[0]?.toUpperCase() || '?'}
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="text-white text-sm font-semibold">
                {author?.display_name || author?.username || 'Unknown'}
              </span>
              <span className="text-[#636366] text-xs ml-2">
                {new Date(post.created_date).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit'
                })}
              </span>
            </div>
          </div>

          <div className="text-[#A1A1AA] text-sm leading-relaxed whitespace-pre-wrap mb-3">
            {post.content}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onReply(post)}
              className="flex items-center gap-1 text-[#636366] hover:text-[#6366F1] text-xs transition"
            >
              <Reply className="w-3.5 h-3.5" />
              Reply
            </button>
            <button className="flex items-center gap-1 text-[#636366] hover:text-[#6366F1] text-xs transition">
              <ThumbsUp className="w-3.5 h-3.5" />
              {post.upvote_count || 0}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
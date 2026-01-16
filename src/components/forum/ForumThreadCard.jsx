import React from 'react';
import { MessageSquare, Eye, Pin, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../../utils';

export default function ForumThreadCard({ thread, users }) {
  const navigate = useNavigate();
  const author = users.find(u => u.id === thread.created_by);

  return (
    <button
      onClick={() => navigate(createPageUrl('ForumThreadDetail') + `?id=${thread.id}`)}
      className="w-full bg-[#18181B] border border-[rgba(255,255,255,0.1)] rounded-xl p-4 hover:bg-[rgba(255,255,255,0.06)] transition text-left"
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center flex-shrink-0 overflow-hidden">
          {author?.avatar_url ? (
            <img src={author.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-white text-sm font-bold">
              {(author?.display_name || author?.username)?.[0]?.toUpperCase() || '?'}
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {thread.is_pinned && <Pin className="w-3.5 h-3.5 text-[#6366F1]" />}
            {thread.is_locked && <Lock className="w-3.5 h-3.5 text-[#F59E0B]" />}
            <span className="px-2 py-0.5 bg-[#6366F1]/20 text-[#6366F1] text-xs font-medium rounded">
              {thread.category}
            </span>
          </div>

          <h3 className="text-white text-base font-semibold mb-1 line-clamp-2">{thread.title}</h3>
          
          <p className="text-[#8E8E93] text-sm line-clamp-2 mb-2">{thread.content}</p>

          <div className="flex items-center gap-3 text-[#636366] text-xs">
            <span>{author?.display_name || author?.username || 'Unknown'}</span>
            <span>•</span>
            <span>{new Date(thread.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              {thread.post_count || 0}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {thread.view_count || 0}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}
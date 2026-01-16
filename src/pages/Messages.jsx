import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Send, Search, Check, CheckCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';

export default function Messages() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef(null);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Check for userId in URL params to auto-select conversation
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('userId');
    if (userId) {
      setSelectedUserId(userId);
    }
  }, []);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch {
        return null;
      }
    }
  });

  const { data: allMessages = [] } = useQuery({
    queryKey: ['allMessages', currentUser?.id],
    queryFn: async () => {
      if (!currentUser) return [];
      const sent = await base44.entities.Message.filter({ sender_id: currentUser.id }, '-created_date');
      const received = await base44.entities.Message.filter({ recipient_id: currentUser.id }, '-created_date');
      return [...sent, ...received].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    },
    enabled: !!currentUser,
    refetchInterval: 5000
  });

  const { data: connections = [] } = useQuery({
    queryKey: ['connections', currentUser?.id],
    queryFn: async () => {
      if (!currentUser) return [];
      const asRequester = await base44.entities.Connection.filter({ requester_id: currentUser.id, status: 'accepted' });
      const asReceiver = await base44.entities.Connection.filter({ receiver_id: currentUser.id, status: 'accepted' });
      return [...asRequester, ...asReceiver];
    },
    enabled: !!currentUser
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list()
  });

  // Get unique conversation partners
  const conversationPartners = React.useMemo(() => {
    if (!currentUser) return [];
    const partnerIds = new Set();
    
    allMessages.forEach(msg => {
      if (msg.sender_id === currentUser.id) {
        partnerIds.add(msg.recipient_id);
      } else if (msg.recipient_id === currentUser.id) {
        partnerIds.add(msg.sender_id);
      }
    });

    return Array.from(partnerIds).map(id => {
      const user = allUsers.find(u => u.id === id);
      const userMessages = allMessages.filter(m => 
        (m.sender_id === id && m.recipient_id === currentUser.id) ||
        (m.sender_id === currentUser.id && m.recipient_id === id)
      );
      const lastMessage = userMessages[0];
      const unreadCount = userMessages.filter(m => 
        m.recipient_id === currentUser.id && !m.is_read
      ).length;
      
      return { user, lastMessage, unreadCount };
    }).filter(c => c.user).sort((a, b) => 
      new Date(b.lastMessage?.created_date) - new Date(a.lastMessage?.created_date)
    );
  }, [allMessages, currentUser, allUsers]);

  // Get messages for selected conversation
  const conversationMessages = React.useMemo(() => {
    if (!selectedUserId || !currentUser) return [];
    return allMessages.filter(m =>
      (m.sender_id === selectedUserId && m.recipient_id === currentUser.id) ||
      (m.sender_id === currentUser.id && m.recipient_id === selectedUserId)
    ).sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
  }, [allMessages, selectedUserId, currentUser]);

  const sendMessageMutation = useMutation({
    mutationFn: async (content) => {
      await base44.entities.Message.create({
        sender_id: currentUser.id,
        recipient_id: selectedUserId,
        content,
        is_read: false
      });

      // Create notification
      await base44.functions.invoke('createNotification', {
        userId: selectedUserId,
        type: 'message',
        fromUserId: currentUser.id,
        message: `${currentUser.display_name || currentUser.username || 'Someone'} sent you a message`,
        actionUrl: `/Messages?userId=${currentUser.id}`
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allMessages'] });
      setMessageText('');
    }
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (messageIds) => {
      await Promise.all(messageIds.map(id => 
        base44.entities.Message.update(id, { 
          is_read: true,
          read_at: new Date().toISOString()
        })
      ));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allMessages'] });
    }
  });

  // Mark messages as read when viewing conversation
  useEffect(() => {
    if (selectedUserId && currentUser) {
      const unreadMessages = conversationMessages.filter(m => 
        m.recipient_id === currentUser.id && !m.is_read
      );
      if (unreadMessages.length > 0) {
        markAsReadMutation.mutate(unreadMessages.map(m => m.id));
      }
    }
  }, [selectedUserId, conversationMessages, currentUser]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationMessages]);

  const handleSendMessage = () => {
    if (!messageText.trim()) return;
    sendMessageMutation.mutate(messageText.trim());
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-[#FAFAFA] text-[24px] font-bold mb-4">Please Log In</h2>
          <button
            onClick={() => base44.auth.redirectToLogin(createPageUrl('Messages'))}
            className="px-6 py-3 bg-[#6366F1] text-white font-semibold rounded-xl hover:brightness-110 transition"
          >
            Log In
          </button>
        </div>
      </div>
    );
  }

  const selectedUser = selectedUserId ? allUsers.find(u => u.id === selectedUserId) : null;

  return (
    <div className="h-screen bg-[#000000] flex flex-col">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 bg-[#000000]/80 backdrop-blur-xl z-20 px-4 py-4 flex items-center justify-between border-b border-[rgba(255,255,255,0.06)]">
        <div className="flex items-center gap-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(-1);
            }}
            className="text-[#8E8E93] hover:text-[#FFFFFF] transition-colors duration-200"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-[#FFFFFF] text-[18px] font-semibold">
            {selectedUser ? (selectedUser.display_name || selectedUser.username || 'User') : 'Messages'}
          </h1>
        </div>
        {selectedUser && (
          <button
            onClick={() => navigate(createPageUrl('Profile') + `?userId=${selectedUser.id}`)}
            className="text-[#6366F1] text-[14px] font-medium hover:brightness-110 transition"
          >
            View Profile
          </button>
        )}
      </div>

      <div className="flex-1 flex pt-16 overflow-hidden">
        {/* Conversation List */}
        <div className={`${selectedUserId ? 'hidden md:block' : 'block'} w-full md:w-80 border-r border-[rgba(255,255,255,0.06)] flex flex-col bg-[#000000]`}>
          {/* Search */}
          <div className="p-4 border-b border-[rgba(255,255,255,0.06)]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#636366]" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#1C1C1E] text-[#FFFFFF] text-[14px] border border-[rgba(255,255,255,0.06)] rounded-lg focus:outline-none focus:border-[#6366F1] placeholder:text-[#636366]"
              />
            </div>
          </div>

          {/* Conversations */}
          <div className="flex-1 overflow-y-auto">
            {conversationPartners.filter(c => 
              !searchQuery || 
              c.user.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              c.user.username?.toLowerCase().includes(searchQuery.toLowerCase())
            ).map(({ user, lastMessage, unreadCount }) => (
              <button
                key={user.id}
                onClick={() => setSelectedUserId(user.id)}
                className={`w-full p-4 flex items-start gap-3 hover:bg-[rgba(255,255,255,0.06)] transition-colors border-b border-[rgba(255,255,255,0.06)] ${
                  selectedUserId === user.id ? 'bg-[rgba(255,255,255,0.06)]' : ''
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.display_name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white text-[16px] font-bold">
                      {(user.display_name || user.username)?.[0]?.toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1 text-left overflow-hidden">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-[#FFFFFF] text-[14px] font-semibold truncate">
                      {user.display_name || user.username}
                    </h3>
                    {lastMessage && (
                      <span className="text-[#636366] text-[11px]">
                        {new Date(lastMessage.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                  {lastMessage && (
                    <p className="text-[#8E8E93] text-[13px] truncate">
                      {lastMessage.sender_id === currentUser.id ? 'You: ' : ''}
                      {lastMessage.content}
                    </p>
                  )}
                </div>
                {unreadCount > 0 && (
                  <div className="w-5 h-5 rounded-full bg-[#6366F1] flex items-center justify-center">
                    <span className="text-white text-[10px] font-bold">{unreadCount}</span>
                  </div>
                )}
              </button>
            ))}
            {conversationPartners.length === 0 && (
              <div className="p-8 text-center">
                <p className="text-[#8E8E93] text-[14px]">No conversations yet</p>
                <p className="text-[#636366] text-[12px] mt-2">Connect with founders to start chatting</p>
              </div>
            )}
          </div>
        </div>

        {/* Message Thread */}
        {selectedUserId ? (
          <div className="flex-1 flex flex-col bg-[#000000]">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {conversationMessages.map((message) => {
                const isSent = message.sender_id === currentUser.id;
                return (
                  <div key={message.id} className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                      isSent 
                        ? 'bg-[#6366F1] text-white' 
                        : 'bg-[#1C1C1E] text-[#FFFFFF]'
                    }`}>
                      <p className="text-[14px] leading-relaxed">{message.content}</p>
                      <div className="flex items-center gap-1 mt-1 justify-end">
                        <span className={`text-[10px] ${isSent ? 'text-white/70' : 'text-[#636366]'}`}>
                          {new Date(message.created_date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </span>
                        {isSent && (
                          message.is_read ? (
                            <CheckCheck className="w-3 h-3 text-white/70" />
                          ) : (
                            <Check className="w-3 h-3 text-white/70" />
                          )
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-[rgba(255,255,255,0.06)]">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-3 bg-[#1C1C1E] text-[#FFFFFF] text-[14px] border border-[rgba(255,255,255,0.06)] rounded-xl focus:outline-none focus:border-[#6366F1] placeholder:text-[#636366]"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!messageText.trim() || sendMessageMutation.isPending}
                  className="px-4 py-3 bg-[#6366F1] text-white rounded-xl hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="hidden md:flex flex-1 items-center justify-center">
            <div className="text-center">
              <p className="text-[#8E8E93] text-[16px]">Select a conversation to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { createPageUrl } from '../utils';
import { ArrowLeft, Send, Search } from 'lucide-react';

export default function Messages() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedUserId = searchParams.get('userId');
  
  const [user, setUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single();
        setUser({ ...user, ...profile });
      } else {
        navigate('/Login');
      }
    };
    getUser();
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    const fetchConversations = async () => {
      setLoading(true);
      const { data: allMessages } = await supabase
        .from('direct_messages')
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (!allMessages || allMessages.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      const conversationMap = new Map();
      allMessages.forEach(msg => {
        const partnerId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
        if (!conversationMap.has(partnerId)) {
          conversationMap.set(partnerId, { partnerId, lastMessage: msg, unreadCount: msg.receiver_id === user.id && !msg.read ? 1 : 0 });
        } else if (msg.receiver_id === user.id && !msg.read) {
          conversationMap.get(partnerId).unreadCount++;
        }
      });

      const partnerIds = [...conversationMap.keys()];
      const { data: profiles } = await supabase.from('users').select('id, display_name, username, avatar_url').in('id', partnerIds);
      const convos = [...conversationMap.values()].map(conv => ({ ...conv, partner: profiles?.find(p => p.id === conv.partnerId) }));
      setConversations(convos);
      setLoading(false);

      if (selectedUserId) {
        const existing = convos.find(c => c.partnerId === selectedUserId);
        if (existing) {
          setSelectedConversation(existing);
        } else {
          const { data: partnerProfile } = await supabase.from('users').select('id, display_name, username, avatar_url').eq('id', selectedUserId).single();
          if (partnerProfile) setSelectedConversation({ partnerId: selectedUserId, partner: partnerProfile, lastMessage: null, unreadCount: 0 });
        }
      }
    };
    fetchConversations();
  }, [user, selectedUserId]);

  useEffect(() => {
    if (!user || !selectedConversation) return;
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('direct_messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${selectedConversation.partnerId}),and(sender_id.eq.${selectedConversation.partnerId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true });
      setMessages(data || []);
      await supabase.from('direct_messages').update({ read: true }).eq('sender_id', selectedConversation.partnerId).eq('receiver_id', user.id).eq('read', false);
    };
    fetchMessages();
  }, [user, selectedConversation]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedConversation || sending) return;
    setSending(true);
    const { data, error } = await supabase.from('direct_messages').insert({ sender_id: user.id, receiver_id: selectedConversation.partnerId, content: newMessage.trim(), read: false }).select().single();
    if (!error && data) {
      setMessages(prev => [...prev, data]);
      setNewMessage('');
    }
    setSending(false);
  };

  const formatTime = (date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return 'now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const filteredConversations = conversations.filter(c => c.partner?.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) || c.partner?.username?.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="min-h-screen bg-black flex">
      <div className={`w-full md:w-80 border-r border-white/10 flex flex-col ${selectedConversation ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => navigate(createPageUrl('Explore'))} className="text-gray-400 hover:text-white"><ArrowLeft className="w-5 h-5" /></button>
            <h1 className="text-white font-semibold text-lg">Messages</h1>
            <div className="w-5" />
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-[#1C1C1E] text-white text-sm rounded-xl border border-white/10 focus:outline-none focus:border-[#6366F1]" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? [...Array(5)].map((_, i) => <div key={i} className="p-4 flex gap-3 animate-pulse"><div className="w-12 h-12 rounded-full bg-[#1C1C1E]" /><div className="flex-1"><div className="h-4 bg-[#1C1C1E] rounded w-24 mb-2" /><div className="h-3 bg-[#1C1C1E] rounded w-32" /></div></div>) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center"><p className="text-gray-500">No conversations yet</p></div>
          ) : filteredConversations.map(conv => (
            <button key={conv.partnerId} onClick={() => setSelectedConversation(conv)} className={`w-full p-4 flex gap-3 hover:bg-white/5 transition text-left ${selectedConversation?.partnerId === conv.partnerId ? 'bg-white/10' : ''}`}>
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center overflow-hidden flex-shrink-0">
                {conv.partner?.avatar_url ? <img src={conv.partner.avatar_url} alt="" className="w-full h-full object-cover" /> : <span className="text-white font-bold">{(conv.partner?.display_name || 'U')[0].toUpperCase()}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between"><span className="text-white font-medium truncate">{conv.partner?.display_name || 'User'}</span><span className="text-gray-500 text-xs">{conv.lastMessage && formatTime(conv.lastMessage.created_at)}</span></div>
                <p className="text-gray-400 text-sm truncate">{conv.lastMessage?.content || 'No messages'}</p>
              </div>
              {conv.unreadCount > 0 && <div className="w-5 h-5 rounded-full bg-[#6366F1] flex items-center justify-center"><span className="text-white text-xs">{conv.unreadCount}</span></div>}
            </button>
          ))}
        </div>
      </div>
      <div className={`flex-1 flex flex-col ${selectedConversation ? 'flex' : 'hidden md:flex'}`}>
        {selectedConversation ? (
          <>
            <div className="p-4 border-b border-white/10 flex items-center gap-3">
              <button onClick={() => setSelectedConversation(null)} className="md:hidden text-gray-400 hover:text-white"><ArrowLeft className="w-5 h-5" /></button>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center overflow-hidden">
                {selectedConversation.partner?.avatar_url ? <img src={selectedConversation.partner.avatar_url} alt="" className="w-full h-full object-cover" /> : <span className="text-white font-bold">{(selectedConversation.partner?.display_name || 'U')[0].toUpperCase()}</span>}
              </div>
              <div className="flex-1"><h2 className="text-white font-medium">{selectedConversation.partner?.display_name || 'User'}</h2></div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? <div className="text-center py-12"><p className="text-gray-500">No messages yet. Say hello!</p></div> : messages.map(msg => {
                const isOwn = msg.sender_id === user?.id;
                return (
                  <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl ${isOwn ? 'bg-[#6366F1] text-white rounded-br-md' : 'bg-[#1C1C1E] text-white rounded-bl-md'}`}>
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      <p className={`text-xs mt-1 ${isOwn ? 'text-white/60' : 'text-gray-500'}`}>{formatTime(msg.created_at)}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
            <div className="p-4 border-t border-white/10">
              <div className="flex gap-3">
                <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder="Type a message..." className="flex-1 px-4 py-3 bg-[#1C1C1E] text-white rounded-xl border border-white/10 focus:outline-none focus:border-[#6366F1]" />
                <button onClick={handleSend} disabled={!newMessage.trim() || sending} className="px-4 py-3 bg-[#6366F1] text-white rounded-xl disabled:opacity-50"><Send className="w-5 h-5" /></button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center"><div className="text-center"><Send className="w-12 h-12 text-gray-600 mx-auto mb-4" /><p className="text-gray-500">Select a conversation</p></div></div>
        )}
      </div>
    </div>
  );
}

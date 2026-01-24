import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, UserPlus, ArrowUp, MessageCircle, Megaphone, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';

export default function NotificationBell() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showDropdown, setShowDropdown] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return null;
      const { data: profile } = await supabase.from('users').select('*').eq('id', authUser.id).single();
      return { ...authUser, ...profile };
    }
  });

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50);
      return data || [];
    },
    enabled: !!user,
    refetchInterval: 60000
  });

  const { data: notificationUsers = {} } = useQuery({
    queryKey: ['notificationUsers'],
    queryFn: async () => {
      const { data } = await supabase.from('users').select('*');
      return (data || []).reduce((acc, u) => ({ ...acc, [u.id]: u }), {});
    }
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId) => {
      await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] })
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
      if (unreadIds.length > 0) {
        await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] })
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId) => {
      await supabase.from('notifications').delete().eq('id', notificationId);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] })
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'follow': return <UserPlus className="w-5 h-5 text-[#6366F1]" />;
      case 'upvote': return <ArrowUp className="w-5 h-5 text-[#22C55E]" />;
      case 'message': return <MessageCircle className="w-5 h-5 text-[#3B82F6]" />;
      case 'comment_reply': return <MessageCircle className="w-5 h-5 text-[#3B82F6]" />;
      case 'system': return <Megaphone className="w-5 h-5 text-[#F59E0B]" />;
      default: return <Bell className="w-5 h-5 text-[#A1A1AA]" />;
    }
  };

  const handleNotificationClick = (notification) => {
    markAsReadMutation.mutate(notification.id);
    switch (notification.type) {
      case 'message':
        navigate(notification.from_user_id ? createPageUrl('Messages') + `?userId=${notification.from_user_id}` : createPageUrl('Messages'));
        break;
      case 'follow':
        if (notification.from_user_id) navigate(createPageUrl('Profile') + `?userId=${notification.from_user_id}`);
        break;
      case 'upvote':
      case 'comment_reply':
        if (notification.pitch_id) { localStorage.setItem('selectedPitchId', notification.pitch_id); navigate(createPageUrl('Demo')); }
        break;
    }
    setShowDropdown(false);
  };

  if (!user) return null;

  return (
    <div className="relative">
      <button onClick={() => setShowDropdown(!showDropdown)} className="relative text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors duration-150">
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#EF4444] rounded-full flex items-center justify-center"><span className="text-white text-[10px] font-bold">{unreadCount > 9 ? '9+' : unreadCount}</span></div>}
      </button>

      {showDropdown && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setShowDropdown(false)} />
          <div className="absolute top-full right-0 mt-2 w-[380px] max-w-[calc(100vw-2rem)] bg-[#18181B] border border-[#27272A] rounded-xl shadow-2xl overflow-hidden z-40">
            <div className="flex items-center justify-between p-4 border-b border-[#27272A]">
              <h3 className="text-[#FAFAFA] text-[16px] font-bold">Notifications</h3>
              {unreadCount > 0 && <button onClick={() => markAllAsReadMutation.mutate()} className="text-[#6366F1] text-[12px] font-semibold hover:brightness-110 transition">Mark all read</button>}
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              {isLoading ? (
                <div className="p-8 text-center text-[#A1A1AA] text-[14px]">Loading...</div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center"><Bell className="w-12 h-12 text-[#71717A] mx-auto mb-3" /><p className="text-[#A1A1AA] text-[14px]">No notifications yet</p></div>
              ) : (
                <div className="divide-y divide-[#27272A]">
                  {notifications.map((notification) => {
                    const fromUser = notificationUsers[notification.from_user_id];
                    return (
                      <div key={notification.id} className={`relative group ${notification.is_read ? 'bg-[#18181B]' : 'bg-[#27272A]/30'}`}>
                        <button onClick={() => handleNotificationClick(notification)} className="w-full p-4 text-left hover:bg-[#27272A]/50 transition-colors">
                          <div className="flex gap-3">
                            <div className="flex-shrink-0">
                              {notification.type === 'system' ? (
                                <div className="w-10 h-10 rounded-full bg-[#F59E0B]/20 flex items-center justify-center">{getNotificationIcon(notification.type)}</div>
                              ) : fromUser ? (
                                <div className="w-10 h-10 rounded-full bg-[#6366F1] flex items-center justify-center overflow-hidden border-2 border-[#27272A]">
                                  {fromUser.avatar_url ? <img src={fromUser.avatar_url} alt={fromUser.display_name} className="w-full h-full object-cover" /> : <span className="text-white text-[14px] font-bold">{(fromUser.display_name || fromUser.username || fromUser.email)?.[0]?.toUpperCase()}</span>}
                                </div>
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-[#27272A] flex items-center justify-center">{getNotificationIcon(notification.type)}</div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[#FAFAFA] text-[14px] leading-[1.5]">{notification.message}</p>
                              <p className="text-[#71717A] text-[12px] mt-1">{new Date(notification.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>
                            </div>
                            {!notification.is_read && <div className="flex-shrink-0"><div className="w-2 h-2 rounded-full bg-[#6366F1]" /></div>}
                          </div>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); deleteNotificationMutation.mutate(notification.id); }} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-[#27272A] rounded"><X className="w-4 h-4 text-[#A1A1AA]" /></button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

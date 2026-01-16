import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Briefcase, MessageSquare, Calendar, Send, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';

export default function DealRooms() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [showScheduler, setShowScheduler] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: dealRooms = [] } = useQuery({
    queryKey: ['dealRooms', user?.id],
    queryFn: async () => {
      const asFounder = await base44.entities.DealRoom.filter({ founder_id: user.id });
      const asInvestor = await base44.entities.DealRoom.filter({ investor_id: user.id });
      return [...asFounder, ...asInvestor].sort((a, b) => 
        new Date(b.last_activity || b.created_date) - new Date(a.last_activity || a.created_date)
      );
    },
    enabled: !!user
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list()
  });

  const { data: allPitches = [] } = useQuery({
    queryKey: ['allPitches'],
    queryFn: () => base44.entities.Pitch.list()
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['dealRoomMessages', selectedRoomId],
    queryFn: () => base44.entities.DealRoomMessage.filter({ deal_room_id: selectedRoomId }, '-created_date'),
    enabled: !!selectedRoomId,
    refetchInterval: 3000
  });

  // Real-time subscription
  useEffect(() => {
    if (!selectedRoomId) return;
    
    const unsubscribe = base44.entities.DealRoomMessage.subscribe((event) => {
      if (event.data.deal_room_id === selectedRoomId) {
        queryClient.invalidateQueries({ queryKey: ['dealRoomMessages', selectedRoomId] });
      }
    });
    
    return unsubscribe;
  }, [selectedRoomId, queryClient]);

  const sendMessageMutation = useMutation({
    mutationFn: async (content) => {
      await base44.entities.DealRoomMessage.create({
        deal_room_id: selectedRoomId,
        sender_id: user.id,
        content,
        message_type: 'text'
      });

      // Update deal room last activity
      await base44.entities.DealRoom.update(selectedRoomId, {
        last_activity: new Date().toISOString()
      });

      // Send Slack notification
      try {
        await base44.functions.invoke('sendSlackNotification', {
          message: `💬 New message in deal room: "${content.substring(0, 100)}..."`,
          title: 'Deal Room Activity',
          type: 'deal_room_update'
        });
      } catch (err) {
        console.log('Slack notification skipped:', err.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dealRoomMessages'] });
      setMessageText('');
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ roomId, newStatus }) => {
      await base44.entities.DealRoom.update(roomId, {
        status: newStatus,
        last_activity: new Date().toISOString()
      });

      // Send notification
      const room = dealRooms.find(r => r.id === roomId);
      const isFounder = room.founder_id === user.id;
      const recipientId = isFounder ? room.investor_id : room.founder_id;

      await base44.functions.invoke('createNotification', {
        userId: recipientId,
        type: 'system',
        message: `Deal room status updated to: ${newStatus}`,
        actionUrl: `/DealRooms?roomId=${roomId}`
      });

      // Sync to CRM
      try {
        await base44.functions.invoke('syncCrmData', {
          crmType: 'salesforce',
          dealRoomId: roomId,
          action: 'status_update'
        });
      } catch (err) {
        console.log('CRM sync skipped:', err.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dealRooms'] });
      toast.success('Status updated');
    }
  });

  const statusColors = {
    active: 'bg-[#3B82F6]/20 text-[#3B82F6]',
    due_diligence: 'bg-[#F59E0B]/20 text-[#F59E0B]',
    term_sheet: 'bg-[#8B5CF6]/20 text-[#8B5CF6]',
    closed: 'bg-[#22C55E]/20 text-[#22C55E]',
    passed: 'bg-[#64748B]/20 text-[#64748B]'
  };

  const selectedRoom = selectedRoomId ? dealRooms.find(r => r.id === selectedRoomId) : null;
  const sortedMessages = [...messages].sort((a, b) => 
    new Date(a.created_date) - new Date(b.created_date)
  );

  if (selectedRoomId && selectedRoom) {
    const isFounder = selectedRoom.founder_id === user.id;
    const otherId = isFounder ? selectedRoom.investor_id : selectedRoom.founder_id;
    const otherUser = allUsers.find(u => u.id === otherId);
    const pitch = allPitches.find(p => p.id === selectedRoom.pitch_id);

    return (
      <div className="min-h-screen bg-[#000000] flex flex-col">
        <div className="sticky top-0 bg-[#000000]/95 backdrop-blur-xl z-20 border-b border-[#18181B]">
          <div className="px-4 py-4 flex items-center justify-between">
            <button
              onClick={() => setSelectedRoomId(null)}
              className="w-10 h-10 rounded-full bg-[rgba(255,255,255,0.06)] flex items-center justify-center text-[#8E8E93] hover:text-white transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1 mx-3">
              <h2 className="text-white font-semibold">{otherUser?.display_name}</h2>
              <p className="text-[#636366] text-xs">{pitch?.startup_name}</p>
            </div>
            <button
              onClick={() => setShowScheduler(true)}
              className="px-3 py-2 bg-[#6366F1] text-white text-sm rounded-lg hover:brightness-110 transition flex items-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              Schedule
            </button>
          </div>

          <div className="px-4 pb-3 flex gap-2 overflow-x-auto">
            {['active', 'due_diligence', 'term_sheet', 'closed', 'passed'].map(status => (
              <button
                key={status}
                onClick={() => updateStatusMutation.mutate({ roomId: selectedRoomId, newStatus: status })}
                className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                  selectedRoom.status === status
                    ? statusColors[status]
                    : 'bg-[#18181B] text-[#636366]'
                }`}
              >
                {status.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {sortedMessages.map(msg => {
            const isMine = msg.sender_id === user.id;
            const sender = allUsers.find(u => u.id === msg.sender_id);

            return (
              <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-xl px-4 py-2 ${
                  isMine ? 'bg-[#6366F1] text-white' : 'bg-[#18181B] text-white'
                }`}>
                  {!isMine && (
                    <div className="text-xs text-[#A1A1AA] mb-1">{sender?.display_name}</div>
                  )}
                  <p className="text-sm">{msg.content}</p>
                  <div className="text-[10px] opacity-60 mt-1">
                    {new Date(msg.created_date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-4 border-t border-[#18181B]">
          <div className="flex gap-2">
            <input
              type="text"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !sendMessageMutation.isPending && messageText.trim() && sendMessageMutation.mutate(messageText)}
              placeholder="Type a message..."
              className="flex-1 px-4 py-3 bg-[#18181B] text-white rounded-xl border border-[#27272A] focus:outline-none focus:border-[#6366F1] placeholder:text-[#636366]"
            />
            <button
              onClick={() => sendMessageMutation.mutate(messageText)}
              disabled={!messageText.trim() || sendMessageMutation.isPending}
              className="px-4 py-3 bg-[#6366F1] text-white rounded-xl hover:brightness-110 transition disabled:opacity-50"
            >
              {sendMessageMutation.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {showScheduler && (
          <MeetingScheduler
            dealRoomId={selectedRoomId}
            onClose={() => setShowScheduler(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000000] pb-20">
      <div className="sticky top-0 bg-[#000000]/95 backdrop-blur-xl z-20 border-b border-[#18181B]">
        <div className="px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate(createPageUrl('Profile'))}
            className="w-10 h-10 rounded-full bg-[rgba(255,255,255,0.06)] flex items-center justify-center text-[#8E8E93] hover:text-white transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-white text-xl font-bold">Deal Rooms</h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="px-4 py-6 max-w-4xl mx-auto">
        {dealRooms.length === 0 ? (
          <div className="text-center py-12">
            <Briefcase className="w-16 h-16 text-[#636366] mx-auto mb-4" />
            <p className="text-[#8E8E93]">No deal rooms yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {dealRooms.map(room => {
              const isFounder = room.founder_id === user.id;
              const otherId = isFounder ? room.investor_id : room.founder_id;
              const otherUser = allUsers.find(u => u.id === otherId);
              const pitch = allPitches.find(p => p.id === room.pitch_id);

              return (
                <button
                  key={room.id}
                  onClick={() => setSelectedRoomId(room.id)}
                  className="w-full p-4 bg-[#0A0A0A] border border-[#18181B] rounded-xl hover:border-[#27272A] transition text-left"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {otherUser?.avatar_url ? (
                        <img src={otherUser.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-white font-bold">
                          {otherUser?.display_name?.[0]?.toUpperCase() || '?'}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-white font-semibold">{otherUser?.display_name || 'User'}</h3>
                        <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${statusColors[room.status]}`}>
                          {room.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-[#8E8E93] text-sm mb-2">{pitch?.startup_name || 'Discussion'}</p>
                      <div className="flex items-center gap-4 text-[#636366] text-xs">
                        <div className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          Active conversation
                        </div>
                        {room.last_activity && (
                          <div>
                            Updated {new Date(room.last_activity).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function MeetingScheduler({ dealRoomId, onClose }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: '',
    scheduled_time: '',
    duration_minutes: 30,
    agenda: '',
    meeting_url: ''
  });

  const scheduleMutation = useMutation({
    mutationFn: async () => {
      const meeting = await base44.entities.DealMeeting.create({
        deal_room_id: dealRoomId,
        ...formData
      });

      // Send notification
      const room = await base44.entities.DealRoom.list().then(rooms => 
        rooms.find(r => r.id === dealRoomId)
      );
      
      await base44.functions.invoke('createNotification', {
        userId: room.investor_id,
        type: 'system',
        message: `Meeting scheduled: ${formData.title}`,
        actionUrl: `/DealRooms?roomId=${dealRoomId}`
      });

      await base44.functions.invoke('createNotification', {
        userId: room.founder_id,
        type: 'system',
        message: `Meeting scheduled: ${formData.title}`,
        actionUrl: `/DealRooms?roomId=${dealRoomId}`
      });

      // Add to Google Calendar
      try {
        await base44.functions.invoke('scheduleCalendarMeeting', {
          meetingId: meeting.id
        });
      } catch (err) {
        console.log('Calendar sync skipped:', err.message);
      }

      // Send Slack notification
      try {
        await base44.functions.invoke('sendSlackNotification', {
          message: `📅 Meeting scheduled: ${formData.title} on ${new Date(formData.scheduled_time).toLocaleString()}`,
          title: 'New Meeting',
          type: 'meeting_scheduled'
        });
      } catch (err) {
        console.log('Slack notification skipped:', err.message);
      }

      return meeting;
    },
    onSuccess: () => {
      toast.success('Meeting scheduled!');
      onClose();
    }
  });

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0A0A0A] border border-[#18181B] rounded-2xl max-w-md w-full p-6">
        <h3 className="text-white text-lg font-bold mb-4">Schedule Meeting</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-[#8E8E93] text-sm mb-2">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Pitch Discussion"
              className="w-full px-4 py-2 bg-[#18181B] text-white rounded-lg border border-[#27272A] focus:outline-none focus:border-[#6366F1]"
            />
          </div>

          <div>
            <label className="block text-[#8E8E93] text-sm mb-2">Date & Time</label>
            <input
              type="datetime-local"
              value={formData.scheduled_time}
              onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
              className="w-full px-4 py-2 bg-[#18181B] text-white rounded-lg border border-[#27272A] focus:outline-none focus:border-[#6366F1]"
            />
          </div>

          <div>
            <label className="block text-[#8E8E93] text-sm mb-2">Duration (minutes)</label>
            <input
              type="number"
              value={formData.duration_minutes}
              onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
              className="w-full px-4 py-2 bg-[#18181B] text-white rounded-lg border border-[#27272A] focus:outline-none focus:border-[#6366F1]"
            />
          </div>

          <div>
            <label className="block text-[#8E8E93] text-sm mb-2">Meeting Link (optional)</label>
            <input
              type="url"
              value={formData.meeting_url}
              onChange={(e) => setFormData({ ...formData, meeting_url: e.target.value })}
              placeholder="https://meet.google.com/..."
              className="w-full px-4 py-2 bg-[#18181B] text-white rounded-lg border border-[#27272A] focus:outline-none focus:border-[#6366F1]"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2 bg-[#27272A] text-white rounded-lg hover:bg-[#3F3F46] transition"
            >
              Cancel
            </button>
            <button
              onClick={() => scheduleMutation.mutate()}
              disabled={!formData.title || !formData.scheduled_time || scheduleMutation.isPending}
              className="flex-1 py-2 bg-[#6366F1] text-white font-semibold rounded-lg hover:brightness-110 transition disabled:opacity-50"
            >
              {scheduleMutation.isPending ? 'Scheduling...' : 'Schedule'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
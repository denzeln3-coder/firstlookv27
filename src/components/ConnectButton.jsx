import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, UserCheck, MessageCircle, X } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';

export default function ConnectButton({ targetUserId, currentUser }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestMessage, setRequestMessage] = useState('');

  const { data: connection } = useQuery({
    queryKey: ['connection', currentUser?.id, targetUserId],
    queryFn: async () => {
      if (!currentUser) return null;
      const { data: asRequester } = await supabase.from('connections').select('*').eq('requester_id', currentUser.id).eq('receiver_id', targetUserId);
      const { data: asReceiver } = await supabase.from('connections').select('*').eq('requester_id', targetUserId).eq('receiver_id', currentUser.id);
      return [...(asRequester || []), ...(asReceiver || [])][0] || null;
    },
    enabled: !!currentUser && !!targetUserId
  });

  const sendConnectionMutation = useMutation({
    mutationFn: async (message) => {
      const { error } = await supabase.from('connections').insert({
        requester_id: currentUser.id,
        receiver_id: targetUserId,
        status: 'pending',
        message: message || ''
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connection'] });
      toast.success('Connection request sent!');
      setShowRequestModal(false);
      setRequestMessage('');
    }
  });

  const acceptConnectionMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('connections').update({ status: 'accepted' }).eq('id', connection.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connection'] });
      toast.success('Connection accepted!');
    }
  });

  const handleMessage = () => {
    navigate(createPageUrl('Messages') + `?userId=${targetUserId}`);
  };

  if (!currentUser) return null;

  if (connection?.status === 'accepted') {
    return (
      <button onClick={handleMessage} className="flex items-center gap-2 px-4 py-2 bg-[#6366F1] text-white text-[14px] font-semibold rounded-xl hover:brightness-110 transition">
        <MessageCircle className="w-4 h-4" />Message
      </button>
    );
  }

  if (connection?.status === 'pending' && connection.requester_id === currentUser.id) {
    return (
      <button disabled className="flex items-center gap-2 px-4 py-2 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] text-[#8E8E93] text-[14px] font-medium rounded-xl cursor-not-allowed">
        <UserCheck className="w-4 h-4" />Request Sent
      </button>
    );
  }

  if (connection?.status === 'pending' && connection.receiver_id === currentUser.id) {
    return (
      <button onClick={() => acceptConnectionMutation.mutate()} className="flex items-center gap-2 px-4 py-2 bg-[#22C55E] text-white text-[14px] font-semibold rounded-xl hover:brightness-110 transition">
        <UserCheck className="w-4 h-4" />Accept Request
      </button>
    );
  }

  return (
    <>
      <button onClick={() => setShowRequestModal(true)} className="flex items-center gap-2 px-4 py-2 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] text-white text-[14px] font-semibold rounded-xl hover:bg-[rgba(255,255,255,0.1)] transition">
        <UserPlus className="w-4 h-4" />Connect
      </button>

      {showRequestModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-6">
          <div className="bg-[#18181B] border border-[rgba(255,255,255,0.1)] rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[20px] font-bold text-white">Send Connection Request</h3>
              <button onClick={() => setShowRequestModal(false)} className="text-[#8E8E93] hover:text-white transition"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-[#A1A1AA] text-[14px] mb-4">Add an optional message to introduce yourself</p>
            <textarea value={requestMessage} onChange={(e) => setRequestMessage(e.target.value)} placeholder="Hi! I'd love to connect and discuss..." maxLength={300} className="w-full h-24 px-4 py-3 bg-[#1C1C1E] text-[#FFFFFF] text-[14px] border border-[rgba(255,255,255,0.06)] rounded-xl focus:outline-none focus:border-[#6366F1] placeholder:text-[#636366] resize-none" />
            <div className="text-[#636366] text-[12px] mb-4">{requestMessage.length}/300</div>
            <div className="flex gap-3">
              <button onClick={() => setShowRequestModal(false)} className="flex-1 py-3 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] text-white rounded-xl hover:bg-[rgba(255,255,255,0.1)] transition">Cancel</button>
              <button onClick={() => sendConnectionMutation.mutate(requestMessage)} disabled={sendConnectionMutation.isPending} className="flex-1 py-3 bg-[#6366F1] text-white font-semibold rounded-xl hover:brightness-110 transition disabled:opacity-50">Send Request</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

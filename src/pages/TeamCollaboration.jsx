import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, UserPlus, Mail, Check, X, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';

export default function TeamCollaboration() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState('editor');

  const urlParams = new URLSearchParams(window.location.search);
  const pitchId = urlParams.get('pitchId');
  const projectId = urlParams.get('projectId');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: pitch } = useQuery({
    queryKey: ['pitch', pitchId],
    queryFn: async () => {
      const pitches = await base44.entities.Pitch.list();
      return pitches.find(p => p.id === pitchId);
    },
    enabled: !!pitchId
  });

  const { data: invites = [] } = useQuery({
    queryKey: ['teamInvites', pitchId, projectId],
    queryFn: () => {
      if (pitchId) return base44.entities.TeamInvite.filter({ pitch_id: pitchId });
      if (projectId) return base44.entities.TeamInvite.filter({ project_id: projectId });
      return [];
    },
    enabled: !!pitchId || !!projectId
  });

  const sendInviteMutation = useMutation({
    mutationFn: async () => {
      return await base44.entities.TeamInvite.create({
        inviter_id: user.id,
        invitee_email: inviteEmail,
        role: selectedRole,
        pitch_id: pitchId || undefined,
        project_id: projectId || undefined,
        status: 'pending'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamInvites'] });
      setInviteEmail('');
      toast.success('Invitation sent!');
    }
  });

  const roleDescriptions = {
    admin: 'Full access - can edit, invite, and delete',
    editor: 'Can edit content and settings',
    viewer: 'Can view only, no editing'
  };

  return (
    <div className="min-h-screen bg-[#000000] pb-20">
      <div className="sticky top-0 bg-[#000000]/95 backdrop-blur-xl z-20 border-b border-[#18181B]">
        <div className="px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-[rgba(255,255,255,0.06)] flex items-center justify-center text-[#8E8E93] hover:text-white transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-white text-xl font-bold">Team Collaboration</h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="px-4 py-6 max-w-4xl mx-auto space-y-6">
        <div className="p-4 bg-[#0A0A0A] border border-[#18181B] rounded-xl">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-5 h-5 text-[#6366F1]" />
            <h2 className="text-white font-semibold">
              {pitch?.startup_name || 'Team Collaboration'}
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[#8E8E93] text-sm mb-2">Email Address</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@example.com"
                className="w-full px-4 py-3 bg-[#18181B] text-white border border-[#27272A] rounded-xl focus:outline-none focus:border-[#6366F1] placeholder:text-[#3F3F46]"
              />
            </div>

            <div>
              <label className="block text-[#8E8E93] text-sm mb-2">Role</label>
              <div className="space-y-2">
                {['admin', 'editor', 'viewer'].map(role => (
                  <button
                    key={role}
                    onClick={() => setSelectedRole(role)}
                    className={`w-full p-3 rounded-lg border text-left transition ${
                      selectedRole === role
                        ? 'border-[#6366F1] bg-[#6366F1]/10'
                        : 'border-[#27272A] bg-[#18181B] hover:border-[#3F3F46]'
                    }`}
                  >
                    <div className="text-white font-medium text-sm capitalize mb-1">{role}</div>
                    <div className="text-[#636366] text-xs">{roleDescriptions[role]}</div>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => sendInviteMutation.mutate()}
              disabled={!inviteEmail || sendInviteMutation.isPending}
              className="w-full py-3 bg-[#6366F1] text-white font-semibold rounded-xl hover:brightness-110 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Send Invitation
            </button>
          </div>
        </div>

        <div>
          <h3 className="text-white font-semibold mb-3">Pending Invitations</h3>
          {invites.length === 0 ? (
            <div className="p-6 bg-[#0A0A0A] border border-[#18181B] rounded-xl text-center">
              <Mail className="w-8 h-8 text-[#636366] mx-auto mb-2" />
              <p className="text-[#636366] text-sm">No pending invitations</p>
            </div>
          ) : (
            <div className="space-y-2">
              {invites.map(invite => (
                <div key={invite.id} className="p-4 bg-[#0A0A0A] border border-[#18181B] rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white font-medium text-sm">{invite.invitee_email}</div>
                      <div className="text-[#636366] text-xs capitalize">{invite.role} • {invite.status}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {invite.status === 'pending' && (
                        <span className="px-2 py-1 bg-[#F59E0B]/20 text-[#F59E0B] text-xs font-bold rounded">
                          Pending
                        </span>
                      )}
                      {invite.status === 'accepted' && (
                        <Check className="w-5 h-5 text-[#22C55E]" />
                      )}
                      {invite.status === 'declined' && (
                        <X className="w-5 h-5 text-[#EF4444]" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
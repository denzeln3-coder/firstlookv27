import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { ArrowLeft, Plus, Users, Briefcase, Lightbulb, TrendingUp, MessageCircle, X } from 'lucide-react';
import { toast } from 'sonner';

export default function CollaborationBoard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedType, setSelectedType] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [responseMessage, setResponseMessage] = useState('');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: requests = [] } = useQuery({
    queryKey: ['collaborationRequests'],
    queryFn: () => base44.entities.CollaborationRequest.filter({ is_active: true }, '-created_date')
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
    enabled: requests.length > 0
  });

  const filteredRequests = selectedType === 'all' 
    ? requests 
    : requests.filter(r => r.request_type === selectedType);

  const respondMutation = useMutation({
    mutationFn: async ({ requestId, message }) => {
      await base44.entities.CollaborationResponse.create({
        request_id: requestId,
        user_id: user.id,
        message
      });
      
      const request = requests.find(r => r.id === requestId);
      await base44.entities.CollaborationRequest.update(requestId, {
        responses_count: (request.responses_count || 0) + 1
      });

      await base44.functions.invoke('createNotification', {
        userId: request.user_id,
        type: 'system',
        fromUserId: user.id,
        message: `Someone responded to your collaboration request: ${request.title}`,
        actionUrl: createPageUrl('CollaborationBoard')
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collaborationRequests'] });
      setSelectedRequest(null);
      setResponseMessage('');
      toast.success('Response sent!');
    }
  });

  const typeIcons = {
    co_founder: <Users className="w-5 h-5" />,
    advisor: <Lightbulb className="w-5 h-5" />,
    investor: <TrendingUp className="w-5 h-5" />,
    team_member: <Briefcase className="w-5 h-5" />,
    mentor: <Users className="w-5 h-5" />
  };

  const typeLabels = {
    co_founder: 'Co-Founder',
    advisor: 'Advisor',
    investor: 'Investor',
    team_member: 'Team Member',
    mentor: 'Mentor'
  };

  const typeColors = {
    co_founder: 'from-purple-500 to-pink-500',
    advisor: 'from-blue-500 to-cyan-500',
    investor: 'from-green-500 to-emerald-500',
    team_member: 'from-orange-500 to-red-500',
    mentor: 'from-indigo-500 to-purple-500'
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center">
        <button
          onClick={() => base44.auth.redirectToLogin(createPageUrl('CollaborationBoard'))}
          className="px-6 py-3 bg-[#6366F1] text-white font-semibold rounded-xl hover:brightness-110 transition"
        >
          Log In to View Collaboration Board
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000000] pb-20">
      <div className="sticky top-0 bg-[#000000]/95 backdrop-blur-xl z-20 border-b border-[#18181B]">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(createPageUrl('Explore'))}
                className="w-10 h-10 rounded-full bg-[#18181B] flex items-center justify-center text-[#8E8E93] hover:text-white transition"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-white text-xl font-bold">Collaboration Board</h1>
                <p className="text-[#8E8E93] text-sm">Find co-founders, advisors, and team members</p>
              </div>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white text-sm font-semibold rounded-xl hover:brightness-110 transition"
            >
              <Plus className="w-4 h-4" />
              Post Request
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2">
            {['all', 'co_founder', 'advisor', 'investor', 'team_member', 'mentor'].map(type => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition ${
                  selectedType === type
                    ? 'bg-[#6366F1] text-white'
                    : 'bg-[#18181B] text-[#8E8E93] hover:bg-[#27272A]'
                }`}
              >
                {type === 'all' ? 'All Requests' : typeLabels[type]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">
        {filteredRequests.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-[#636366] mx-auto mb-4" />
            <h3 className="text-white text-xl font-bold mb-2">No collaboration requests yet</h3>
            <p className="text-[#8E8E93] mb-6">Be the first to post a collaboration request</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-[#6366F1] text-white font-semibold rounded-xl hover:brightness-110 transition"
            >
              Post a Request
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredRequests.map(request => {
              const poster = allUsers.find(u => u.id === request.user_id);
              return (
                <div key={request.id} className="bg-[#0A0A0A] border border-[#18181B] rounded-xl p-5 hover:border-[#27272A] transition">
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${typeColors[request.request_type]} flex items-center justify-center flex-shrink-0`}>
                      {typeIcons[request.request_type]}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-[#6366F1] bg-[#6366F1]/10 px-2 py-1 rounded">
                          {typeLabels[request.request_type]}
                        </span>
                        {request.equity_offered && (
                          <span className="text-xs font-semibold text-[#34D399] bg-[#34D399]/10 px-2 py-1 rounded">
                            Equity
                          </span>
                        )}
                      </div>
                      <h3 className="text-white font-bold text-lg mb-1">{request.title}</h3>
                      <button
                        onClick={() => navigate(createPageUrl('Profile') + `?userId=${request.user_id}`)}
                        className="text-[#8E8E93] text-sm hover:text-white transition"
                      >
                        by @{poster?.username || poster?.display_name || 'Unknown'}
                      </button>
                    </div>
                  </div>

                  <p className="text-[#A1A1AA] text-sm mb-3 line-clamp-3">{request.description}</p>

                  {request.skills_needed && request.skills_needed.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {request.skills_needed.map((skill, i) => (
                        <span key={i} className="text-xs bg-[#18181B] text-[#8E8E93] px-2 py-1 rounded">
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-[#18181B]">
                    <div className="flex items-center gap-4 text-sm text-[#636366]">
                      <span>{request.commitment_level?.replace('_', ' ')}</span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="w-4 h-4" />
                        {request.responses_count || 0}
                      </span>
                    </div>
                    {request.user_id !== user.id && (
                      <button
                        onClick={() => setSelectedRequest(request)}
                        className="px-4 py-2 bg-[#6366F1] text-white text-sm font-semibold rounded-lg hover:brightness-110 transition"
                      >
                        Respond
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedRequest && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedRequest(null)}>
          <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white text-xl font-bold">Respond to Request</h3>
              <button onClick={() => setSelectedRequest(null)} className="text-[#8E8E93] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-[#A1A1AA] text-sm mb-4">
              Send a message to express your interest in this collaboration opportunity.
            </p>
            <textarea
              value={responseMessage}
              onChange={(e) => setResponseMessage(e.target.value)}
              placeholder="Tell them why you're interested and what you can bring to the table..."
              className="w-full px-4 py-3 bg-[#0A0A0A] text-white border border-[#27272A] rounded-xl focus:outline-none focus:border-[#6366F1] resize-none mb-4"
              rows={5}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setSelectedRequest(null)}
                className="flex-1 px-4 py-3 bg-[#27272A] text-white rounded-xl hover:bg-[#3F3F46] transition"
              >
                Cancel
              </button>
              <button
                onClick={() => respondMutation.mutate({ requestId: selectedRequest.id, message: responseMessage })}
                disabled={!responseMessage.trim() || respondMutation.isPending}
                className="flex-1 px-4 py-3 bg-[#6366F1] text-white font-semibold rounded-xl hover:brightness-110 transition disabled:opacity-50"
              >
                {respondMutation.isPending ? 'Sending...' : 'Send Response'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <CreateRequestModal onClose={() => setShowCreateModal(false)} user={user} />
      )}
    </div>
  );
}

function CreateRequestModal({ onClose, user }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    request_type: 'co_founder',
    title: '',
    description: '',
    skills_needed: [],
    commitment_level: 'full_time',
    equity_offered: false
  });
  const [skillInput, setSkillInput] = useState('');

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.CollaborationRequest.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collaborationRequests'] });
      toast.success('Request posted!');
      onClose();
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({ ...formData, user_id: user.id });
  };

  const addSkill = () => {
    if (skillInput.trim() && !formData.skills_needed.includes(skillInput.trim())) {
      setFormData({ ...formData, skills_needed: [...formData.skills_needed, skillInput.trim()] });
      setSkillInput('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-white text-xl font-bold">Post Collaboration Request</h3>
          <button onClick={onClose} className="text-[#8E8E93] hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-white text-sm font-semibold mb-2">Request Type</label>
            <select
              value={formData.request_type}
              onChange={(e) => setFormData({ ...formData, request_type: e.target.value })}
              className="w-full px-4 py-3 bg-[#0A0A0A] text-white border border-[#27272A] rounded-xl focus:outline-none focus:border-[#6366F1]"
            >
              <option value="co_founder">Co-Founder</option>
              <option value="advisor">Advisor</option>
              <option value="investor">Investor</option>
              <option value="team_member">Team Member</option>
              <option value="mentor">Mentor</option>
            </select>
          </div>

          <div>
            <label className="block text-white text-sm font-semibold mb-2">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Looking for Technical Co-Founder"
              className="w-full px-4 py-3 bg-[#0A0A0A] text-white border border-[#27272A] rounded-xl focus:outline-none focus:border-[#6366F1]"
              required
            />
          </div>

          <div>
            <label className="block text-white text-sm font-semibold mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe what you're looking for, your startup, and what you offer..."
              className="w-full px-4 py-3 bg-[#0A0A0A] text-white border border-[#27272A] rounded-xl focus:outline-none focus:border-[#6366F1] resize-none"
              rows={4}
              required
            />
          </div>

          <div>
            <label className="block text-white text-sm font-semibold mb-2">Skills Needed</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                placeholder="e.g., React, Python, Marketing"
                className="flex-1 px-4 py-3 bg-[#0A0A0A] text-white border border-[#27272A] rounded-xl focus:outline-none focus:border-[#6366F1]"
              />
              <button
                type="button"
                onClick={addSkill}
                className="px-4 py-3 bg-[#6366F1] text-white font-semibold rounded-xl hover:brightness-110 transition"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.skills_needed.map((skill, i) => (
                <span key={i} className="flex items-center gap-1 bg-[#27272A] text-white px-3 py-1 rounded-lg text-sm">
                  {skill}
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, skills_needed: formData.skills_needed.filter((_, idx) => idx !== i) })}
                    className="text-[#8E8E93] hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-white text-sm font-semibold mb-2">Commitment Level</label>
            <select
              value={formData.commitment_level}
              onChange={(e) => setFormData({ ...formData, commitment_level: e.target.value })}
              className="w-full px-4 py-3 bg-[#0A0A0A] text-white border border-[#27272A] rounded-xl focus:outline-none focus:border-[#6366F1]"
            >
              <option value="part_time">Part Time</option>
              <option value="full_time">Full Time</option>
              <option value="advisory">Advisory</option>
              <option value="flexible">Flexible</option>
            </select>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.equity_offered}
              onChange={(e) => setFormData({ ...formData, equity_offered: e.target.checked })}
              className="w-5 h-5"
            />
            <span className="text-white text-sm">Equity offered</span>
          </label>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-[#27272A] text-white rounded-xl hover:bg-[#3F3F46] transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="flex-1 px-4 py-3 bg-[#6366F1] text-white font-semibold rounded-xl hover:brightness-110 transition disabled:opacity-50"
            >
              {createMutation.isPending ? 'Posting...' : 'Post Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
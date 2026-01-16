import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Trash2, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';

export default function ManageTeam() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const pitchId = urlParams.get('pitchId');

  const [showForm, setShowForm] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    bio: '',
    photo_url: '',
    linkedin_url: '',
    twitter_url: ''
  });

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

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers', pitchId],
    queryFn: () => base44.entities.TeamMember.filter({ pitch_id: pitchId }),
    enabled: !!pitchId
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.TeamMember.create({ ...data, pitch_id: pitchId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
      resetForm();
      toast.success('Team member added!');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TeamMember.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
      resetForm();
      toast.success('Team member updated!');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.TeamMember.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
      toast.success('Team member removed');
    }
  });

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, photo_url: file_url });
      toast.success('Photo uploaded!');
    } catch (error) {
      toast.error('Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingMember) {
      updateMutation.mutate({ id: editingMember.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      role: '',
      bio: '',
      photo_url: '',
      linkedin_url: '',
      twitter_url: ''
    });
    setEditingMember(null);
    setShowForm(false);
  };

  const handleEdit = (member) => {
    setFormData({
      name: member.name,
      role: member.role,
      bio: member.bio || '',
      photo_url: member.photo_url || '',
      linkedin_url: member.linkedin_url || '',
      twitter_url: member.twitter_url || ''
    });
    setEditingMember(member);
    setShowForm(true);
  };

  if (!pitchId || !pitch) {
    return (
      <div className="min-h-screen bg-[#09090B] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-[#FAFAFA] text-[24px] font-bold mb-4">Pitch not found</h2>
          <button
            onClick={() => navigate(createPageUrl('Profile'))}
            className="px-6 py-3 bg-[#6366F1] text-white font-semibold rounded-lg hover:brightness-110 transition"
          >
            Back to Profile
          </button>
        </div>
      </div>
    );
  }

  if (pitch.founder_id !== user?.id) {
    return (
      <div className="min-h-screen bg-[#09090B] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-[#FAFAFA] text-[24px] font-bold mb-4">Access Denied</h2>
          <p className="text-[#A1A1AA] mb-4">You can only manage your own team</p>
          <button
            onClick={() => navigate(createPageUrl('Profile'))}
            className="px-6 py-3 bg-[#6366F1] text-white font-semibold rounded-lg hover:brightness-110 transition"
          >
            Back to Profile
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090B] pb-20">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 bg-[#09090B] z-20 px-4 py-4 flex items-center justify-between border-b border-[#27272A]">
        <button
          onClick={() => navigate(-1)}
          className="text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors duration-150"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-[#FAFAFA] text-[18px] font-semibold">Manage Team</h1>
        <button
          onClick={() => setShowForm(true)}
          className="text-[#6366F1] hover:brightness-110 transition-all"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      <div className="pt-20 px-6">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-[#FAFAFA] text-[20px] font-bold mb-2">{pitch.startup_name}</h2>
          <p className="text-[#A1A1AA] text-[14px] mb-8">Add co-founders and team members</p>

          {/* Team Members List */}
          {teamMembers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[#A1A1AA] mb-4">No team members yet</p>
              <button
                onClick={() => setShowForm(true)}
                className="px-6 py-3 bg-[#6366F1] text-white font-semibold rounded-lg hover:brightness-110 transition"
              >
                Add First Team Member
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {teamMembers.map((member) => (
                <div key={member.id} className="bg-[#18181B] border border-[#27272A] rounded-xl p-4 flex items-start gap-4">
                  {member.photo_url ? (
                    <img src={member.photo_url} alt={member.name} className="w-16 h-16 rounded-full object-cover" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-[#6366F1] flex items-center justify-center text-white font-bold text-[20px]">
                      {member.name[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="text-[#FAFAFA] text-[16px] font-bold">{member.name}</h3>
                    <p className="text-[#6366F1] text-[14px] mb-2">{member.role}</p>
                    {member.bio && <p className="text-[#A1A1AA] text-[13px]">{member.bio}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(member)}
                      className="px-3 py-2 bg-[#27272A] text-[#FAFAFA] text-[12px] rounded-lg hover:bg-[#3F3F46] transition"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteMutation.mutate(member.id)}
                      className="p-2 text-[#EF4444] hover:bg-[#27272A] rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/80 z-30 flex items-center justify-center p-4">
          <div className="bg-[#18181B] border border-[#27272A] rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-[#FAFAFA] text-[20px] font-bold mb-6">
              {editingMember ? 'Edit Team Member' : 'Add Team Member'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Photo Upload */}
              <div>
                <label className="block text-[#FAFAFA] text-[14px] mb-2">Photo</label>
                <div className="flex items-center gap-4">
                  {formData.photo_url ? (
                    <img src={formData.photo_url} alt="Preview" className="w-20 h-20 rounded-full object-cover" />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-[#27272A] flex items-center justify-center">
                      <Upload className="w-6 h-6 text-[#71717A]" />
                    </div>
                  )}
                  <label className="px-4 py-2 bg-[#27272A] text-[#FAFAFA] text-[14px] rounded-lg hover:bg-[#3F3F46] cursor-pointer transition">
                    {uploading ? 'Uploading...' : 'Upload Photo'}
                    <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" disabled={uploading} />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-[#FAFAFA] text-[14px] mb-2">Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-[#09090B] text-[#FAFAFA] border border-[#27272A] rounded-lg focus:outline-none focus:border-[#6366F1]"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-[#FAFAFA] text-[14px] mb-2">Role *</label>
                <input
                  type="text"
                  required
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-4 py-3 bg-[#09090B] text-[#FAFAFA] border border-[#27272A] rounded-lg focus:outline-none focus:border-[#6366F1]"
                  placeholder="Co-Founder & CTO"
                />
              </div>

              <div>
                <label className="block text-[#FAFAFA] text-[14px] mb-2">Bio</label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  className="w-full px-4 py-3 bg-[#09090B] text-[#FAFAFA] border border-[#27272A] rounded-lg focus:outline-none focus:border-[#6366F1]"
                  rows={3}
                  placeholder="Brief background..."
                />
              </div>

              <div>
                <label className="block text-[#FAFAFA] text-[14px] mb-2">LinkedIn URL</label>
                <input
                  type="url"
                  value={formData.linkedin_url}
                  onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                  className="w-full px-4 py-3 bg-[#09090B] text-[#FAFAFA] border border-[#27272A] rounded-lg focus:outline-none focus:border-[#6366F1]"
                  placeholder="https://linkedin.com/in/..."
                />
              </div>

              <div>
                <label className="block text-[#FAFAFA] text-[14px] mb-2">Twitter URL</label>
                <input
                  type="url"
                  value={formData.twitter_url}
                  onChange={(e) => setFormData({ ...formData, twitter_url: e.target.value })}
                  className="w-full px-4 py-3 bg-[#09090B] text-[#FAFAFA] border border-[#27272A] rounded-lg focus:outline-none focus:border-[#6366F1]"
                  placeholder="https://twitter.com/..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-3 bg-[#27272A] text-[#FAFAFA] rounded-lg hover:bg-[#3F3F46] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-[#6366F1] text-white font-semibold rounded-lg hover:brightness-110 transition"
                >
                  {editingMember ? 'Update' : 'Add Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
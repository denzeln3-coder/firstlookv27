import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Camera, Upload, X, Plus, Trash2, User, Briefcase, Building2, Users as UsersIcon, Award, Link as LinkIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';

export default function EditProfile() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const logoInputRef = useRef(null);
  const teamPhotoInputRef = useRef(null);

  const { data: user, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const [formData, setFormData] = useState({
    display_name: user?.display_name || '',
    username: user?.username?.replace('@', '') || '',
    bio: user?.bio || '',
    website_url: user?.website_url || '',
    twitter_url: user?.twitter_url || '',
    linkedin_url: user?.linkedin_url || '',
    rockz_url: user?.rockz_url || '',
    avatar_url: user?.avatar_url || '',
    company_logo: user?.company_logo || '',
    company_name: user?.company_name || '',
    company_about: user?.company_about || '',
    company_website: user?.company_website || '',
    company_twitter: user?.company_twitter || '',
    company_linkedin: user?.company_linkedin || '',
    previous_startups: user?.previous_startups || []
  });

  const [newStartup, setNewStartup] = useState({ name: '', role: '', year: '', outcome: '' });
  const [newTeamMember, setNewTeamMember] = useState({ name: '', role: '', bio: '', photo_url: '', linkedin_url: '', twitter_url: '' });
  const [uploading, setUploading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingTeamPhoto, setUploadingTeamPhoto] = useState(false);

  const updateProfileMutation = useMutation({
    mutationFn: async (data) => {
      await base44.auth.updateMe(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      toast.success('Profile updated successfully!');
      navigate(createPageUrl('Profile'));
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update profile');
    }
  });

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, avatar_url: result.file_url });
      toast.success('Avatar uploaded!');
    } catch (error) {
      toast.error('Failed to upload avatar');
    } finally {
      setUploading(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, company_logo: result.file_url });
      toast.success('Logo uploaded!');
    } catch (error) {
      toast.error('Failed to upload logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleTeamPhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingTeamPhoto(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setNewTeamMember({ ...newTeamMember, photo_url: result.file_url });
      toast.success('Photo uploaded!');
    } catch (error) {
      toast.error('Failed to upload photo');
    } finally {
      setUploadingTeamPhoto(false);
    }
  };

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers', user?.id],
    queryFn: () => base44.entities.UserTeamMember.filter({ user_id: user.id }, 'order'),
    enabled: !!user
  });

  const addTeamMemberMutation = useMutation({
    mutationFn: (member) => base44.entities.UserTeamMember.create({
      ...member,
      user_id: user.id,
      order: teamMembers.length
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
      setNewTeamMember({ name: '', role: '', bio: '', photo_url: '', linkedin_url: '', twitter_url: '' });
      toast.success('Team member added!');
    }
  });

  const deleteTeamMemberMutation = useMutation({
    mutationFn: (memberId) => base44.entities.UserTeamMember.delete(memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
      toast.success('Team member removed');
    }
  });

  const handleSave = () => {
    if (!formData.display_name.trim()) {
      toast.error('Display name is required');
      return;
    }

    const username = formData.username.trim() 
      ? (formData.username.startsWith('@') ? formData.username : `@${formData.username}`)
      : '';

    updateProfileMutation.mutate({ ...formData, username });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-[#6366F1]/20 border-t-[#6366F1] rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-white text-[24px] font-bold mb-4">Not Logged In</h2>
          <button
            onClick={() => base44.auth.redirectToLogin(createPageUrl('Profile'))}
            className="px-6 py-3 bg-[#6366F1] text-white font-semibold rounded-xl hover:brightness-110 transition"
          >
            Log In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000000]">
      {/* Fixed Header */}
      <div className="sticky top-0 bg-[#000000]/95 backdrop-blur-xl z-30 border-b border-[#18181B]">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate(createPageUrl('Profile'))}
            className="w-10 h-10 rounded-full bg-[#18181B] flex items-center justify-center text-[#8E8E93] hover:text-white hover:bg-[#27272A] transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-white text-[20px] font-bold">Edit Profile</h1>
          <button
            onClick={handleSave}
            disabled={updateProfileMutation.isPending}
            className="px-5 py-2 bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white text-[14px] font-semibold rounded-xl hover:brightness-110 transition disabled:opacity-50"
          >
            {updateProfileMutation.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Avatar Section */}
        <div className="flex flex-col items-center mb-12">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="relative group mb-4"
          >
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center text-white text-[48px] font-bold overflow-hidden border-4 border-[#18181B] shadow-xl">
              {formData.avatar_url ? (
                <img src={formData.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span>{(formData.display_name || user.email)?.[0]?.toUpperCase()}</span>
              )}
            </div>
            <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="w-10 h-10 text-white" />
            </div>
            {uploading && (
              <div className="absolute inset-0 bg-black/80 rounded-full flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              </div>
            )}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
          <p className="text-[#71717A] text-[13px]">Click to update profile picture</p>
        </div>

        {/* Form Sections */}
        <div className="space-y-8">
          {/* Personal Information */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[#6366F1]/10 flex items-center justify-center">
                <User className="w-5 h-5 text-[#6366F1]" />
              </div>
              <h2 className="text-white text-[20px] font-bold">Personal Information</h2>
            </div>
            
            <div className="space-y-4 bg-[#0A0A0A] border border-[#18181B] rounded-2xl p-6">
              <div>
                <label className="block text-[#8E8E93] text-[13px] font-medium mb-2">Display Name *</label>
                <input
                  type="text"
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  placeholder="Your name"
                  className="w-full px-4 py-3 bg-[#000000] text-white text-[15px] border border-[#18181B] rounded-xl focus:outline-none focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/20 placeholder:text-[#3F3F46] transition"
                />
              </div>

              <div>
                <label className="block text-[#8E8E93] text-[13px] font-medium mb-2">Username</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#71717A] text-[15px] font-medium">@</span>
                  <input
                    type="text"
                    value={formData.username.replace('@', '')}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value.replace('@', '') })}
                    placeholder="username"
                    className="w-full pl-9 pr-4 py-3 bg-[#000000] text-white text-[15px] border border-[#18181B] rounded-xl focus:outline-none focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/20 placeholder:text-[#3F3F46] transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#8E8E93] text-[13px] font-medium mb-2">Bio</label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Tell us about yourself..."
                  maxLength={150}
                  rows={3}
                  className="w-full px-4 py-3 bg-[#000000] text-white text-[15px] border border-[#18181B] rounded-xl focus:outline-none focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/20 placeholder:text-[#3F3F46] transition resize-none"
                />
                <div className="text-right text-[#3F3F46] text-[12px] mt-2">{formData.bio.length}/150</div>
              </div>
            </div>
          </section>

          {/* Social Links */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[#3B82F6]/10 flex items-center justify-center">
                <LinkIcon className="w-5 h-5 text-[#3B82F6]" />
              </div>
              <h2 className="text-white text-[20px] font-bold">Social Links</h2>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4 bg-[#0A0A0A] border border-[#18181B] rounded-2xl p-6">
              {[
                { key: 'website_url', label: 'Website', placeholder: 'https://yourwebsite.com' },
                { key: 'twitter_url', label: 'Twitter', placeholder: 'https://twitter.com/username' },
                { key: 'linkedin_url', label: 'LinkedIn', placeholder: 'https://linkedin.com/in/username' },
                { key: 'rockz_url', label: 'Rockz', placeholder: 'https://rockz.online/username' }
              ].map(field => (
                <div key={field.key}>
                  <label className="block text-[#8E8E93] text-[13px] font-medium mb-2">{field.label}</label>
                  <input
                    type="url"
                    value={formData[field.key]}
                    onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                    placeholder={field.placeholder}
                    className="w-full px-4 py-3 bg-[#000000] text-white text-[15px] border border-[#18181B] rounded-xl focus:outline-none focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/20 placeholder:text-[#3F3F46] transition"
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Company Details */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[#8B5CF6]/10 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-[#8B5CF6]" />
              </div>
              <h2 className="text-white text-[20px] font-bold">Company Details</h2>
            </div>
            
            <div className="space-y-6 bg-[#0A0A0A] border border-[#18181B] rounded-2xl p-6">
              {/* Logo Upload */}
              <div>
                <label className="block text-[#8E8E93] text-[13px] font-medium mb-3">Company Logo</label>
                <div className="flex items-center gap-4">
                  {formData.company_logo && (
                    <div className="relative w-20 h-20 rounded-xl bg-[#000000] border border-[#18181B] overflow-hidden">
                      <img src={formData.company_logo} alt="Logo" className="w-full h-full object-contain p-2" />
                      <button
                        onClick={() => setFormData({ ...formData, company_logo: '' })}
                        className="absolute -top-1 -right-1 w-6 h-6 bg-[#EF4444] rounded-full flex items-center justify-center text-white hover:brightness-110 transition shadow-lg"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                  <button
                    onClick={() => logoInputRef.current?.click()}
                    disabled={uploadingLogo}
                    className="px-5 py-3 bg-[#18181B] text-white text-[14px] font-medium border border-[#27272A] rounded-xl hover:bg-[#27272A] transition flex items-center gap-2 disabled:opacity-50"
                  >
                    <Upload className="w-4 h-4" />
                    {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
                  </button>
                  <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-[#8E8E93] text-[13px] font-medium mb-2">Company Name</label>
                  <input
                    type="text"
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    placeholder="Your Startup Inc."
                    className="w-full px-4 py-3 bg-[#000000] text-white text-[15px] border border-[#18181B] rounded-xl focus:outline-none focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/20 placeholder:text-[#3F3F46] transition"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[#8E8E93] text-[13px] font-medium mb-2">About Company</label>
                  <textarea
                    value={formData.company_about}
                    onChange={(e) => setFormData({ ...formData, company_about: e.target.value })}
                    placeholder="Tell us about your company..."
                    maxLength={500}
                    rows={4}
                    className="w-full px-4 py-3 bg-[#000000] text-white text-[15px] border border-[#18181B] rounded-xl focus:outline-none focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/20 placeholder:text-[#3F3F46] transition resize-none"
                  />
                  <div className="text-right text-[#3F3F46] text-[12px] mt-2">{(formData.company_about || '').length}/500</div>
                </div>

                <input
                  type="url"
                  value={formData.company_website}
                  onChange={(e) => setFormData({ ...formData, company_website: e.target.value })}
                  placeholder="Company website"
                  className="px-4 py-3 bg-[#000000] text-white text-[15px] border border-[#18181B] rounded-xl focus:outline-none focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/20 placeholder:text-[#3F3F46] transition"
                />
                
                <input
                  type="url"
                  value={formData.company_twitter}
                  onChange={(e) => setFormData({ ...formData, company_twitter: e.target.value })}
                  placeholder="Company Twitter"
                  className="px-4 py-3 bg-[#000000] text-white text-[15px] border border-[#18181B] rounded-xl focus:outline-none focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/20 placeholder:text-[#3F3F46] transition"
                />
                
                <input
                  type="url"
                  value={formData.company_linkedin}
                  onChange={(e) => setFormData({ ...formData, company_linkedin: e.target.value })}
                  placeholder="Company LinkedIn"
                  className="md:col-span-2 px-4 py-3 bg-[#000000] text-white text-[15px] border border-[#18181B] rounded-xl focus:outline-none focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/20 placeholder:text-[#3F3F46] transition"
                />
              </div>
            </div>
          </section>

          {/* Team Members */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[#22C55E]/10 flex items-center justify-center">
                <UsersIcon className="w-5 h-5 text-[#22C55E]" />
              </div>
              <h2 className="text-white text-[20px] font-bold">Team Members</h2>
            </div>
            
            <div className="space-y-4">
              {teamMembers.map((member) => (
                <div key={member.id} className="p-5 bg-[#0A0A0A] border border-[#18181B] rounded-2xl">
                  <div className="flex items-start gap-4">
                    {member.photo_url && (
                      <img src={member.photo_url} alt={member.name} className="w-16 h-16 rounded-xl object-cover" />
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-white text-[16px] font-semibold mb-1">{member.name}</h4>
                      <p className="text-[#8E8E93] text-[13px] mb-2">{member.role}</p>
                      {member.bio && <p className="text-[#71717A] text-[13px] leading-relaxed">{member.bio}</p>}
                    </div>
                    <button
                      onClick={() => deleteTeamMemberMutation.mutate(member.id)}
                      className="p-2 text-[#EF4444] hover:bg-[#EF4444]/10 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Add Team Member Form */}
              <div className="p-6 bg-[#0A0A0A] border-2 border-dashed border-[#27272A] rounded-2xl space-y-4">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => teamPhotoInputRef.current?.click()}
                    disabled={uploadingTeamPhoto}
                    className="w-20 h-20 rounded-xl bg-[#000000] border-2 border-dashed border-[#27272A] flex items-center justify-center hover:border-[#6366F1] transition overflow-hidden"
                  >
                    {newTeamMember.photo_url ? (
                      <img src={newTeamMember.photo_url} alt="" className="w-full h-full object-cover" />
                    ) : uploadingTeamPhoto ? (
                      <div className="w-5 h-5 border-2 border-[#6366F1]/20 border-t-[#6366F1] rounded-full animate-spin" />
                    ) : (
                      <Camera className="w-6 h-6 text-[#3F3F46]" />
                    )}
                  </button>
                  <input ref={teamPhotoInputRef} type="file" accept="image/*" onChange={handleTeamPhotoUpload} className="hidden" />
                  
                  <input
                    type="text"
                    value={newTeamMember.name}
                    onChange={(e) => setNewTeamMember({ ...newTeamMember, name: e.target.value })}
                    placeholder="Full name"
                    className="flex-1 px-4 py-3 bg-[#000000] text-white text-[15px] border border-[#18181B] rounded-xl focus:outline-none focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/20 placeholder:text-[#3F3F46] transition"
                  />
                </div>
                
                <input
                  type="text"
                  value={newTeamMember.role}
                  onChange={(e) => setNewTeamMember({ ...newTeamMember, role: e.target.value })}
                  placeholder="Role (e.g., Co-Founder & CEO)"
                  className="w-full px-4 py-3 bg-[#000000] text-white text-[15px] border border-[#18181B] rounded-xl focus:outline-none focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/20 placeholder:text-[#3F3F46] transition"
                />
                
                <textarea
                  value={newTeamMember.bio}
                  onChange={(e) => setNewTeamMember({ ...newTeamMember, bio: e.target.value })}
                  placeholder="Brief bio (optional)"
                  rows={2}
                  className="w-full px-4 py-3 bg-[#000000] text-white text-[15px] border border-[#18181B] rounded-xl focus:outline-none focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/20 placeholder:text-[#3F3F46] transition resize-none"
                />

                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="url"
                    value={newTeamMember.linkedin_url}
                    onChange={(e) => setNewTeamMember({ ...newTeamMember, linkedin_url: e.target.value })}
                    placeholder="LinkedIn URL"
                    className="px-4 py-3 bg-[#000000] text-white text-[15px] border border-[#18181B] rounded-xl focus:outline-none focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/20 placeholder:text-[#3F3F46] transition"
                  />
                  <input
                    type="url"
                    value={newTeamMember.twitter_url}
                    onChange={(e) => setNewTeamMember({ ...newTeamMember, twitter_url: e.target.value })}
                    placeholder="Twitter URL"
                    className="px-4 py-3 bg-[#000000] text-white text-[15px] border border-[#18181B] rounded-xl focus:outline-none focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/20 placeholder:text-[#3F3F46] transition"
                  />
                </div>

                <button
                  onClick={() => {
                    if (newTeamMember.name && newTeamMember.role) {
                      addTeamMemberMutation.mutate(newTeamMember);
                    } else {
                      toast.error('Please fill in name and role');
                    }
                  }}
                  disabled={addTeamMemberMutation.isPending}
                  className="w-full px-5 py-3 bg-gradient-to-r from-[#22C55E] to-[#10B981] text-white text-[14px] font-semibold rounded-xl hover:brightness-110 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Team Member
                </button>
              </div>
            </div>
          </section>

          {/* Previous Startups */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[#F59E0B]/10 flex items-center justify-center">
                <Award className="w-5 h-5 text-[#F59E0B]" />
              </div>
              <h2 className="text-white text-[20px] font-bold">Previous Startups</h2>
            </div>
            
            <div className="space-y-4">
              {formData.previous_startups.map((startup, index) => (
                <div key={index} className="p-5 bg-[#0A0A0A] border border-[#18181B] rounded-2xl">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-white text-[16px] font-semibold mb-1">{startup.name}</h4>
                      <p className="text-[#8E8E93] text-[13px] mb-2">{startup.role} • {startup.year}</p>
                      {startup.outcome && <p className="text-[#71717A] text-[13px]">{startup.outcome}</p>}
                    </div>
                    <button
                      onClick={() => {
                        const updated = formData.previous_startups.filter((_, i) => i !== index);
                        setFormData({ ...formData, previous_startups: updated });
                      }}
                      className="p-2 text-[#EF4444] hover:bg-[#EF4444]/10 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Add Startup Form */}
              <div className="p-6 bg-[#0A0A0A] border-2 border-dashed border-[#27272A] rounded-2xl space-y-4">
                <input
                  type="text"
                  value={newStartup.name}
                  onChange={(e) => setNewStartup({ ...newStartup, name: e.target.value })}
                  placeholder="Startup name"
                  className="w-full px-4 py-3 bg-[#000000] text-white text-[15px] border border-[#18181B] rounded-xl focus:outline-none focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/20 placeholder:text-[#3F3F46] transition"
                />
                
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={newStartup.role}
                    onChange={(e) => setNewStartup({ ...newStartup, role: e.target.value })}
                    placeholder="Role"
                    className="px-4 py-3 bg-[#000000] text-white text-[15px] border border-[#18181B] rounded-xl focus:outline-none focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/20 placeholder:text-[#3F3F46] transition"
                  />
                  <input
                    type="text"
                    value={newStartup.year}
                    onChange={(e) => setNewStartup({ ...newStartup, year: e.target.value })}
                    placeholder="Year"
                    className="px-4 py-3 bg-[#000000] text-white text-[15px] border border-[#18181B] rounded-xl focus:outline-none focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/20 placeholder:text-[#3F3F46] transition"
                  />
                </div>
                
                <input
                  type="text"
                  value={newStartup.outcome}
                  onChange={(e) => setNewStartup({ ...newStartup, outcome: e.target.value })}
                  placeholder="Outcome (acquired, raised $X, etc)"
                  className="w-full px-4 py-3 bg-[#000000] text-white text-[15px] border border-[#18181B] rounded-xl focus:outline-none focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/20 placeholder:text-[#3F3F46] transition"
                />
                
                <button
                  onClick={() => {
                    if (newStartup.name && newStartup.role) {
                      setFormData({ ...formData, previous_startups: [...formData.previous_startups, newStartup] });
                      setNewStartup({ name: '', role: '', year: '', outcome: '' });
                    } else {
                      toast.error('Please fill in startup name and role');
                    }
                  }}
                  className="w-full px-5 py-3 bg-gradient-to-r from-[#F59E0B] to-[#F97316] text-white text-[14px] font-semibold rounded-xl hover:brightness-110 transition flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Startup
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* Bottom Action Bar */}
        <div className="sticky bottom-0 left-0 right-0 bg-[#000000]/95 backdrop-blur-xl border-t border-[#18181B] py-6 mt-12 -mx-6 px-6">
          <div className="max-w-4xl mx-auto flex gap-4">
            <button
              onClick={() => navigate(createPageUrl('Profile'))}
              className="flex-1 px-6 py-4 bg-[#18181B] text-white text-[15px] font-semibold rounded-xl border border-[#27272A] hover:bg-[#27272A] transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={updateProfileMutation.isPending}
              className="flex-1 px-6 py-4 bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white text-[15px] font-semibold rounded-xl hover:brightness-110 transition disabled:opacity-50 shadow-lg shadow-[#6366F1]/20"
            >
              {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
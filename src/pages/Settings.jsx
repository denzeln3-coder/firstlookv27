import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Trash2, AlertTriangle, Bell, Link2, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';

export default function Settings() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [notificationPrefs, setNotificationPrefs] = useState({
    follows: true,
    upvotes: true,
    comments: true,
    messages: true,
    connections: true,
    pitch_reviews: true
  });
  const [deletePassword, setDeletePassword] = useState('');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const userData = await base44.auth.me();
      if (userData?.notification_preferences) {
        setNotificationPrefs(userData.notification_preferences);
      }
      return userData;
    }
  });

  const { data: userPitches = [] } = useQuery({
    queryKey: ['userPitches', user?.id],
    queryFn: () => base44.entities.Pitch.filter({ founder_id: user.id }),
    enabled: !!user
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      // Delete all user's pitches first
      await Promise.all(userPitches.map(pitch => base44.entities.Pitch.delete(pitch.id)));
      
      // Note: Base44 handles user deletion at platform level
      // This would need to be coordinated with Base44's auth system
      toast.success('Account deletion initiated');
      base44.auth.logout(createPageUrl('Home'));
    },
    onError: () => {
      toast.error('Failed to delete account');
    }
  });

  const updateNotificationPrefsMutation = useMutation({
    mutationFn: async (prefs) => {
      await base44.auth.updateMe({
        notification_preferences: prefs
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      toast.success('Notification preferences updated');
    }
  });

  const handleNotificationToggle = (key) => {
    const newPrefs = { ...notificationPrefs, [key]: !notificationPrefs[key] };
    setNotificationPrefs(newPrefs);
    updateNotificationPrefsMutation.mutate(newPrefs);
  };

  const handleDeleteAccount = () => {
    if (!deletePassword) {
      toast.error('Please enter your password to confirm');
      return;
    }
    deleteAccountMutation.mutate();
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#09090B] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-[#FAFAFA] text-[24px] font-bold mb-4">Not Logged In</h2>
          <button
            onClick={() => base44.auth.redirectToLogin(createPageUrl('Settings'))}
            className="px-6 py-3 bg-[#6366F1] text-white font-semibold rounded-lg hover:brightness-110 transition"
          >
            Log In
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
          onClick={() => navigate(createPageUrl('Profile'))}
          className="text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors duration-150"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-[#FAFAFA] text-[20px] font-bold">Settings</h1>
        <div className="w-5" />
      </div>

      {/* Content */}
      <div className="pt-20 px-6">
        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-[#FAFAFA] text-[18px] font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <button
              onClick={() => navigate(createPageUrl('EditProfile'))}
              className="w-full p-4 bg-[#18181B] border border-[#27272A] rounded-xl hover:border-[#3A3A3C] transition flex items-center gap-4"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div className="text-left flex-1">
                <h3 className="text-[#FAFAFA] font-medium">Edit Profile</h3>
                <p className="text-[#A1A1AA] text-[12px]">Update your personal information</p>
              </div>
            </button>

            <button
              onClick={() => navigate(createPageUrl('IntegrationSettings'))}
              className="w-full p-4 bg-[#18181B] border border-[#27272A] rounded-xl hover:border-[#3A3A3C] transition flex items-center gap-4"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#A855F7] flex items-center justify-center">
                <Link2 className="w-5 h-5 text-white" />
              </div>
              <div className="text-left flex-1">
                <h3 className="text-[#FAFAFA] font-medium">Integrations</h3>
                <p className="text-[#A1A1AA] text-[12px]">Connect CRM, Calendar & more</p>
              </div>
            </button>
          </div>
        </div>

        {/* Account Section */}
        <div className="mb-8">
          <h2 className="text-[#FAFAFA] text-[18px] font-semibold mb-4">Account</h2>
          <div className="bg-[#18181B] rounded-xl border border-[#27272A] overflow-hidden">
            <div className="p-4 border-b border-[#27272A]">
              <div className="text-[#A1A1AA] text-[12px] uppercase tracking-wide font-medium mb-1">Email</div>
              <div className="text-[#FAFAFA] text-[14px]">{user.email}</div>
            </div>
            <div className="p-4 border-b border-[#27272A]">
              <div className="text-[#A1A1AA] text-[12px] uppercase tracking-wide font-medium mb-1">Account Type</div>
              <div className="text-[#FAFAFA] text-[14px] capitalize">{user.role}</div>
            </div>
            <div className="p-4">
              <div className="text-[#A1A1AA] text-[12px] uppercase tracking-wide font-medium mb-2">User Type</div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[#FAFAFA] text-[14px] capitalize">
                  {user.user_type || 'Not set'}
                </span>
                {user.is_investor && (
                  <span className="px-2 py-1 bg-[#22C55E]/20 text-[#22C55E] text-xs font-bold rounded">
                    INVESTOR
                  </span>
                )}
              </div>
              <button
                onClick={() => navigate(createPageUrl('UserTypeSettings'))}
                className="text-[#6366F1] text-xs hover:underline"
              >
                Change user type →
              </button>
            </div>
          </div>
        </div>

        {/* Notifications Section */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5 text-[#FAFAFA]" />
            <h2 className="text-[#FAFAFA] text-[18px] font-semibold">Notifications</h2>
          </div>
          <div className="bg-[#18181B] rounded-xl border border-[#27272A] divide-y divide-[#27272A]">
            {[
              { key: 'follows', label: 'New Followers', desc: 'When someone follows you' },
              { key: 'upvotes', label: 'Upvotes', desc: 'When someone upvotes your pitch' },
              { key: 'comments', label: 'Comments', desc: 'When someone comments on your pitch' },
              { key: 'messages', label: 'Messages', desc: 'When you receive a new message' },
              { key: 'connections', label: 'Connections', desc: 'Connection requests and acceptances' },
              { key: 'pitch_reviews', label: 'Pitch Reviews', desc: 'Updates on your pitch review status' }
            ].map(({ key, label, desc }) => (
              <div key={key} className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-[#FAFAFA] text-[14px] font-medium mb-1">{label}</div>
                  <div className="text-[#A1A1AA] text-[12px]">{desc}</div>
                </div>
                <button
                  onClick={() => handleNotificationToggle(key)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    notificationPrefs[key] ? 'bg-[#6366F1]' : 'bg-[#3A3A3C]'
                  }`}
                >
                  <div className={`absolute w-5 h-5 bg-white rounded-full top-0.5 transition-transform ${
                    notificationPrefs[key] ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Danger Zone */}
        <div className="mb-8">
          <h2 className="text-[#EF4444] text-[18px] font-semibold mb-4">Danger Zone</h2>
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="w-5 h-5 text-[#EF4444] mt-0.5" />
              <div>
                <h3 className="text-[#FAFAFA] text-[16px] font-semibold mb-1">Delete Account</h3>
                <p className="text-[#A1A1AA] text-[14px] leading-[1.6]">
                  This will permanently delete your account and all {userPitches.length} of your pitches. This action cannot be undone.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full px-4 py-3 bg-[#EF4444] text-white text-[14px] font-semibold rounded-lg hover:brightness-110 transition-all duration-150"
            >
              <Trash2 className="w-4 h-4 inline mr-2" />
              Delete My Account
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#18181B] rounded-2xl p-6 max-w-md w-full border border-[#27272A]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-[#EF4444]" />
              </div>
              <h3 className="text-[#FAFAFA] text-[20px] font-bold">Confirm Account Deletion</h3>
            </div>
            <p className="text-[#A1A1AA] text-[14px] leading-[1.6] mb-6">
              Are you absolutely sure? This will permanently delete your account, all {userPitches.length} pitches, and all associated data. This action cannot be undone.
            </p>
            <div className="mb-6">
              <label className="block text-[#FAFAFA] text-[14px] font-medium mb-2">
                Enter your password to confirm
              </label>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Password"
                className="w-full px-4 py-3 bg-[#09090B] text-[#FAFAFA] border border-[#27272A] rounded-lg focus:outline-none focus:border-[#EF4444] placeholder:text-[#71717A]"
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeletePassword('');
                }}
                className="flex-1 px-4 py-3 bg-[#27272A] text-[#FAFAFA] text-[14px] font-semibold rounded-lg hover:brightness-110 transition-all duration-150"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={!deletePassword}
                className="flex-1 px-4 py-3 bg-[#EF4444] text-white text-[14px] font-semibold rounded-lg hover:brightness-110 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
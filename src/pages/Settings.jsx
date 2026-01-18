import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { createPageUrl } from '../utils';
import { ArrowLeft, User, Bell, Lock, Palette, HelpCircle, LogOut, ChevronRight, Moon, Sun, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Settings() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState({ email: true, push: true, messages: true, updates: false });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        setProfile(profile);
      } else {
        navigate('/Login');
      }
      setLoading(false);
    };
    getUser();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/Login');
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      // Delete user data
      await supabase.from('startups').delete().eq('founder_id', user.id);
      await supabase.from('profiles').delete().eq('id', user.id);
      await supabase.auth.signOut();
      toast.success('Account deleted');
      navigate('/Login');
    } catch (err) {
      toast.error('Failed to delete account');
    }
    setDeleting(false);
  };

  const settingsSections = [
    {
      title: 'Account',
      items: [
        { icon: User, label: 'Edit Profile', onClick: () => navigate(createPageUrl('EditProfile')) },
        { icon: Lock, label: 'Privacy', onClick: () => toast.info('Coming soon') },
      ]
    },
    {
      title: 'Notifications',
      items: [
        { icon: Bell, label: 'Email Notifications', toggle: true, value: notifications.email, onChange: (v) => setNotifications(p => ({ ...p, email: v })) },
        { icon: Bell, label: 'Push Notifications', toggle: true, value: notifications.push, onChange: (v) => setNotifications(p => ({ ...p, push: v })) },
        { icon: Bell, label: 'Message Notifications', toggle: true, value: notifications.messages, onChange: (v) => setNotifications(p => ({ ...p, messages: v })) },
      ]
    },
    {
      title: 'Support',
      items: [
        { icon: HelpCircle, label: 'Help Center', onClick: () => toast.info('Coming soon') },
        { icon: HelpCircle, label: 'Contact Support', onClick: () => toast.info('Coming soon') },
      ]
    },
    {
      title: 'Danger Zone',
      items: [
        { icon: Trash2, label: 'Delete Account', onClick: () => setShowDeleteModal(true), danger: true },
      ]
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-white/20 border-t-[#6366F1] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-black/95 backdrop-blur-lg border-b border-white/10">
        <div className="px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate(createPageUrl('Profile'))} className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-white font-semibold text-lg">Settings</h1>
        </div>
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center overflow-hidden">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-white text-2xl font-bold">{(profile?.display_name || user?.email || 'U')[0].toUpperCase()}</span>
            )}
          </div>
          <div>
            <h2 className="text-white font-semibold text-lg">{profile?.display_name || 'User'}</h2>
            <p className="text-gray-500 text-sm">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Settings Sections */}
      <div className="p-4 space-y-6">
        {settingsSections.map((section, idx) => (
          <div key={idx}>
            <h3 className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2 px-2">{section.title}</h3>
            <div className="bg-[#1C1C1E] rounded-xl overflow-hidden">
              {section.items.map((item, itemIdx) => {
                const Icon = item.icon;
                return (
                  <div key={itemIdx}>
                    {item.toggle ? (
                      <div className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Icon className="w-5 h-5 text-gray-400" />
                          <span className="text-white">{item.label}</span>
                        </div>
                        <button
                          onClick={() => item.onChange(!item.value)}
                          className={`w-12 h-7 rounded-full transition ${item.value ? 'bg-[#6366F1]' : 'bg-gray-600'}`}
                        >
                          <div className={`w-5 h-5 rounded-full bg-white shadow transition transform ${item.value ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={item.onClick}
                        className={`w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition ${item.danger ? 'text-red-500' : 'text-white'}`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className={`w-5 h-5 ${item.danger ? 'text-red-500' : 'text-gray-400'}`} />
                          <span>{item.label}</span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-600" />
                      </button>
                    )}
                    {itemIdx < section.items.length - 1 && <div className="h-px bg-white/10 ml-12" />}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-3 bg-[#1C1C1E] text-red-500 rounded-xl hover:bg-white/5 transition"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Log Out</span>
        </button>

        {/* Version */}
        <p className="text-center text-gray-600 text-sm">FirstLook v1.0.0</p>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowDeleteModal(false)}>
          <div className="bg-[#1C1C1E] rounded-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-white text-xl font-bold mb-2">Delete Account?</h2>
            <p className="text-gray-400 mb-6">This action cannot be undone. All your data, pitches, and connections will be permanently deleted.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-3 bg-[#2C2C2E] text-white rounded-xl font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="flex-1 py-3 bg-red-500 text-white rounded-xl font-medium disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Rocket, DollarSign, Search, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';

export default function UserTypeSettings() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: investorProfile } = useQuery({
    queryKey: ['investorProfile', user?.id],
    queryFn: async () => {
      const profiles = await base44.entities.Investor.filter({ user_id: user.id });
      return profiles[0] || null;
    },
    enabled: !!user
  });

  React.useEffect(() => {
    if (user?.user_type) {
      setSelectedType(user.user_type);
    }
  }, [user]);

  const updateUserTypeMutation = useMutation({
    mutationFn: async (userType) => {
      const updates = { user_type: userType };
      
      // If switching FROM investor, archive investor profile
      if (user.user_type === 'investor' && userType !== 'investor' && investorProfile) {
        await base44.entities.Investor.update(investorProfile.id, { is_active: false });
        updates.is_investor = false;
      }
      
      await base44.auth.updateMe(updates);
    },
    onSuccess: (_, userType) => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      queryClient.invalidateQueries({ queryKey: ['investorProfile'] });
      toast.success('User type updated');
      
      // If switching TO investor, go to investor profile setup
      if (userType === 'investor' && !investorProfile) {
        navigate(createPageUrl('InvestorProfile'));
      } else {
        navigate(createPageUrl('Settings'));
      }
    }
  });

  const handleSave = () => {
    if (!selectedType) {
      toast.error('Please select a user type');
      return;
    }

    if (selectedType === user.user_type) {
      navigate(createPageUrl('Settings'));
      return;
    }

    // If switching away from investor, show confirmation
    if (user.user_type === 'investor' && selectedType !== 'investor' && investorProfile?.is_active) {
      setShowConfirm(true);
      return;
    }

    updateUserTypeMutation.mutate(selectedType);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center">
        <button
          onClick={() => base44.auth.redirectToLogin(createPageUrl('UserTypeSettings'))}
          className="px-6 py-3 bg-[#6366F1] text-white font-semibold rounded-xl hover:brightness-110 transition"
        >
          Log In
        </button>
      </div>
    );
  }

  const userTypes = [
    {
      id: 'founder',
      icon: Rocket,
      title: 'Founder',
      description: 'I\'m building a startup and want to showcase my product',
      color: 'from-[#6366F1] to-[#8B5CF6]'
    },
    {
      id: 'investor',
      icon: DollarSign,
      title: 'Investor',
      description: 'I\'m looking for startups to invest in or advise',
      color: 'from-[#22C55E] to-[#10B981]'
    },
    {
      id: 'hunter',
      icon: Search,
      title: 'Hunter',
      description: 'I discover and try new products before anyone else',
      color: 'from-[#F59E0B] to-[#EAB308]'
    }
  ];

  return (
    <div className="min-h-screen bg-[#000000] pb-20">
      <div className="sticky top-0 bg-[#000000]/95 backdrop-blur-xl z-20 border-b border-[#18181B]">
        <div className="px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate(createPageUrl('Settings'))}
            className="w-10 h-10 rounded-full bg-[rgba(255,255,255,0.06)] flex items-center justify-center text-[#8E8E93] hover:text-white transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-white text-xl font-bold">Change User Type</h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="px-4 py-6 max-w-md mx-auto">
        <p className="text-[#8E8E93] text-center mb-6">
          Your current type: <span className="text-white font-semibold capitalize">{user.user_type || 'Not set'}</span>
        </p>

        <div className="space-y-3 mb-6">
          {userTypes.map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                className={`w-full p-4 rounded-xl border-2 transition text-left ${
                  selectedType === type.id
                    ? 'border-[#6366F1] bg-[#6366F1]/10'
                    : 'border-[#27272A] bg-[#0A0A0A] hover:border-[#3F3F46]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${type.color} flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-semibold mb-1">{type.title}</h3>
                    <p className="text-[#A1A1AA] text-sm">{type.description}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <button
          onClick={handleSave}
          disabled={updateUserTypeMutation.isPending}
          className="w-full px-6 py-3 bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white font-semibold rounded-xl hover:brightness-110 transition disabled:opacity-50"
        >
          {updateUserTypeMutation.isPending ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#18181B] rounded-2xl p-6 max-w-md w-full border border-[#27272A]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-[#F59E0B]/20 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-[#F59E0B]" />
              </div>
              <h3 className="text-white text-xl font-bold">Archive Investor Profile?</h3>
            </div>
            <p className="text-[#A1A1AA] text-sm leading-relaxed mb-6">
              Switching away from Investor will archive your investor profile. You can reactivate it later by switching back to Investor type.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-3 bg-[#27272A] text-white font-semibold rounded-xl hover:bg-[#3F3F46] transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowConfirm(false);
                  updateUserTypeMutation.mutate(selectedType);
                }}
                className="flex-1 px-4 py-3 bg-[#6366F1] text-white font-semibold rounded-xl hover:brightness-110 transition"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
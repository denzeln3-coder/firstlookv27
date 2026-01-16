import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Rocket, DollarSign, Search } from 'lucide-react';
import { toast } from 'sonner';

export default function UserTypeSelectionModal({ onComplete }) {
  const [selectedType, setSelectedType] = useState(null);
  const queryClient = useQueryClient();

  const updateUserTypeMutation = useMutation({
    mutationFn: async (userType) => {
      await base44.auth.updateMe({ user_type: userType });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      toast.success('Welcome to FirstLook!');
      onComplete();
    }
  });

  const handleContinue = () => {
    if (!selectedType) {
      toast.error('Please select how you\'ll use FirstLook');
      return;
    }
    updateUserTypeMutation.mutate(selectedType);
  };

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
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
      <div className="bg-[#18181B] rounded-2xl p-8 max-w-md w-full border border-[#27272A]">
        <h2 className="text-white text-2xl font-bold text-center mb-2">Welcome to FirstLook!</h2>
        <p className="text-[#A1A1AA] text-center mb-6">How will you use FirstLook?</p>

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
          onClick={handleContinue}
          disabled={updateUserTypeMutation.isPending}
          className="w-full px-6 py-3 bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white font-semibold rounded-xl hover:brightness-110 transition disabled:opacity-50"
        >
          {updateUserTypeMutation.isPending ? 'Saving...' : 'Continue →'}
        </button>
      </div>
    </div>
  );
}
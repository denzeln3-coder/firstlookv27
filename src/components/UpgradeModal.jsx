import React from 'react';
import { X, Check, Zap, Crown, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function UpgradeModal({ isOpen, onClose, feature = '' }) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const features = {
    free: [
      '15-second pitch recording',
      'Basic profile card',
      '2 gradient backgrounds',
      'Community access'
    ],
    pro: [
      'Everything in Free',
      '2-minute demo videos',
      'All gradient backgrounds',
      'All fonts',
      'AI captions',
      'Brand kit',
      'Thumbnail selector',
      'No watermark on exports',
      'Analytics dashboard'
    ],
    executive: [
      'Everything in Pro',
      'Custom brand colors',
      'Upload custom fonts',
      'Priority support',
      'Featured placement',
      'Sponsored content tools',
      'API access'
    ]
  };

  const handleUpgrade = (tier) => {
    onClose();
    navigate(createPageUrl('Pricing') + '?tier=' + tier);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#18181B] rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-[rgba(255,255,255,0.1)]">
        <div className="p-6 border-b border-[rgba(255,255,255,0.1)] flex items-center justify-between">
          <div>
            <h2 className="text-white text-xl font-bold">Upgrade to Unlock</h2>
            {feature && (
              <p className="text-[#8E8E93] text-sm mt-1">"{feature}" requires a Pro or Executive plan</p>
            )}
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-[#27272A] flex items-center justify-center text-[#8E8E93] hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#27272A] rounded-xl p-5 border border-[#3F3F46]">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-[#8E8E93]" />
              <h3 className="text-white font-semibold">Free</h3>
            </div>
            <div className="mb-4">
              <span className="text-3xl font-bold text-white">$0</span>
              <span className="text-[#8E8E93]">/month</span>
            </div>
            <ul className="space-y-2 mb-6">
              {features.free.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-[#A1A1AA]">
                  <Check className="w-4 h-4 text-[#8E8E93] mt-0.5 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <button className="w-full py-3 bg-[#3F3F46] text-[#8E8E93] rounded-xl font-medium cursor-not-allowed">
              Current Plan
            </button>
          </div>

          <div className="bg-gradient-to-b from-[#6366F1]/20 to-[#18181B] rounded-xl p-5 border border-[#6366F1] relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-[#6366F1] rounded-full text-xs font-semibold text-white">
              POPULAR
            </div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-[#6366F1]" />
              <h3 className="text-white font-semibold">Pro</h3>
            </div>
            <div className="mb-4">
              <span className="text-3xl font-bold text-white">$9</span>
              <span className="text-[#8E8E93]">/month</span>
            </div>
            <ul className="space-y-2 mb-6">
              {features.pro.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-[#E4E4E7]">
                  <Check className="w-4 h-4 text-[#6366F1] mt-0.5 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <button onClick={() => handleUpgrade('pro')} className="w-full py-3 bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white rounded-xl font-semibold hover:brightness-110 transition">
              Upgrade to Pro
            </button>
          </div>

          <div className="bg-gradient-to-b from-[#F59E0B]/20 to-[#18181B] rounded-xl p-5 border border-[#F59E0B]">
            <div className="flex items-center gap-2 mb-2">
              <Crown className="w-5 h-5 text-[#F59E0B]" />
              <h3 className="text-white font-semibold">Executive</h3>
            </div>
            <div className="mb-4">
              <span className="text-3xl font-bold text-white">$29</span>
              <span className="text-[#8E8E93]">/month</span>
            </div>
            <ul className="space-y-2 mb-6">
              {features.executive.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-[#E4E4E7]">
                  <Check className="w-4 h-4 text-[#F59E0B] mt-0.5 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <button onClick={() => handleUpgrade('executive')} className="w-full py-3 bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-white rounded-xl font-semibold hover:brightness-110 transition">
              Upgrade to Executive
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
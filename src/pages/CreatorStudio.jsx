import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Palette, Image, Type, Music, Sparkles, Video, Crown, Lock, Bell } from 'lucide-react';
import { useSubscription } from '../components/useSubscription';
import UpgradeModal from '@/components/UpgradeModal';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function CreatorStudio() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { tier, isPro, isExecutive } = useSubscription();
  const [showUpgrade, setShowUpgrade] = React.useState(false);
  const [lockedFeature, setLockedFeature] = React.useState('');
  const [comingSoonFeature, setComingSoonFeature] = React.useState(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const notifyMutation = useMutation({
    mutationFn: async (featureId) => {
      const currentNotifications = user?.notify_features || [];
      if (currentNotifications.includes(featureId)) {
        return;
      }
      await base44.auth.updateMe({
        notify_features: [...currentNotifications, featureId]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      toast.success("We'll let you know when this launches!");
      setComingSoonFeature(null);
    }
  });

  const tools = [
    {
      id: 'pitch-card',
      name: 'Pitch Card Creator',
      description: 'Design beautiful branded cards for social media',
      icon: Palette,
      color: '#6366F1',
      path: 'PitchCardCreator',
      tier: 'free',
      available: true
    },
    {
      id: 'thumbnail',
      name: 'Thumbnail Selector',
      description: 'Pick the perfect frame from your video',
      icon: Image,
      color: '#8B5CF6',
      path: 'ThumbnailSelector',
      tier: 'pro',
      available: true
    },
    {
      id: 'brand-kit',
      name: 'Brand Kit',
      description: 'Save your colors, logo, and fonts',
      icon: Type,
      color: '#EC4899',
      path: 'BrandKitEditor',
      tier: 'pro',
      available: true
    },
    {
      id: 'captions',
      name: 'AI Captions',
      description: 'Auto-generate captions for your videos',
      icon: Sparkles,
      color: '#F59E0B',
      path: null,
      tier: 'pro',
      available: false
    },
    {
      id: 'music',
      name: 'Background Music',
      description: 'Add royalty-free music to your pitch',
      icon: Music,
      color: '#10B981',
      path: null,
      tier: 'executive',
      available: false
    },
    {
      id: 'templates',
      name: 'Video Templates',
      description: 'Professional templates for your content',
      icon: Video,
      color: '#3B82F6',
      path: null,
      tier: 'executive',
      available: false
    }
  ];

  const handleToolClick = (tool) => {
    // Check if feature is available
    if (!tool.available) {
      setComingSoonFeature(tool);
      return;
    }

    const hasAccess = 
      tool.tier === 'free' || 
      (tool.tier === 'pro' && isPro) || 
      (tool.tier === 'executive' && isExecutive);

    if (hasAccess) {
      navigate(createPageUrl(tool.path));
    } else {
      setLockedFeature(tool.name);
      setShowUpgrade(true);
    }
  };

  const getTierBadge = (toolTier) => {
    if (toolTier === 'free') return null;
    if (toolTier === 'pro') {
      return (
        <span className="px-2 py-0.5 bg-[#6366F1]/20 text-[#6366F1] text-xs font-semibold rounded-full">
          PRO
        </span>
      );
    }
    if (toolTier === 'executive') {
      return (
        <span className="px-2 py-0.5 bg-[#F59E0B]/20 text-[#F59E0B] text-xs font-semibold rounded-full flex items-center gap-1">
          <Crown className="w-3 h-3" />
          EXEC
        </span>
      );
    }
  };

  const isLocked = (toolTier) => {
    if (toolTier === 'free') return false;
    if (toolTier === 'pro') return !isPro;
    if (toolTier === 'executive') return !isExecutive;
    return true;
  };

  return (
    <div className="min-h-screen bg-[#000000] pb-20">
      <div className="sticky top-0 bg-[#000000]/95 backdrop-blur-lg z-20 border-b border-[rgba(255,255,255,0.06)]">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(createPageUrl('Explore'))}
              className="w-10 h-10 rounded-full bg-[rgba(255,255,255,0.06)] flex items-center justify-center text-[#8E8E93] hover:text-white transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-white text-xl font-bold">Creator Studio</h1>
              <p className="text-[#8E8E93] text-sm">Build your brand, create content</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#8E8E93] text-sm">Your plan:</span>
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
              tier === 'executive' ? 'bg-[#F59E0B]/20 text-[#F59E0B]' :
              tier === 'pro' ? 'bg-[#6366F1]/20 text-[#6366F1]' :
              'bg-[#3F3F46] text-[#8E8E93]'
            }`}>
              {tier.charAt(0).toUpperCase() + tier.slice(1)}
            </span>
            {tier === 'free' && (
              <button
                onClick={() => navigate(createPageUrl('Pricing'))}
                className="px-4 py-2 bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white text-sm font-semibold rounded-xl hover:brightness-110 transition"
              >
                Upgrade
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tools.map((tool) => {
            const Icon = tool.icon;
            const locked = isLocked(tool.tier);
            const isComingSoon = !tool.available;
            
            return (
              <button
                key={tool.id}
                onClick={() => handleToolClick(tool)}
                className={`relative p-6 rounded-2xl border text-left transition-all ${
                  isComingSoon
                    ? 'bg-[#18181B]/30 border-[#27272A] opacity-60'
                    : locked
                    ? 'bg-[#18181B]/50 border-[#27272A] opacity-75'
                    : 'bg-[#18181B] border-[#3F3F46] hover:border-[#6366F1] hover:bg-[#1F1F23]'
                }`}
              >
                {isComingSoon ? (
                  <div className="absolute top-4 right-4">
                    <span className="px-2 py-1 bg-[#3F3F46] text-[#8E8E93] text-xs font-semibold rounded">
                      SOON
                    </span>
                  </div>
                ) : locked && (
                  <div className="absolute top-4 right-4">
                    <Lock className="w-5 h-5 text-[#71717A]" />
                  </div>
                )}
                
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: `${tool.color}20` }}
                >
                  <Icon className="w-6 h-6" style={{ color: tool.color }} />
                </div>
                
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-white font-semibold">{tool.name}</h3>
                  {!isComingSoon && getTierBadge(tool.tier)}
                </div>
                
                <p className="text-[#8E8E93] text-sm">{tool.description}</p>
              </button>
            );
          })}
        </div>

        <div className="mt-12 p-6 bg-gradient-to-r from-[#6366F1]/10 to-[#8B5CF6]/10 rounded-2xl border border-[#6366F1]/30">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#6366F1]/20 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-6 h-6 text-[#6366F1]" />
            </div>
            <div>
              <h3 className="text-white font-semibold mb-1">Coming Soon: AI Script Writer</h3>
              <p className="text-[#8E8E93] text-sm mb-3">
                Describe your product and let AI write your perfect 15-second pitch script.
              </p>
              <span className="text-[#6366F1] text-sm font-medium">Stay tuned →</span>
            </div>
          </div>
        </div>
      </div>

      <UpgradeModal
        isOpen={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        feature={lockedFeature}
      />

      {/* Coming Soon Modal */}
      {comingSoonFeature && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-start gap-4 mb-6">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${comingSoonFeature.color}20` }}
              >
                {React.createElement(comingSoonFeature.icon, {
                  className: "w-6 h-6",
                  style: { color: comingSoonFeature.color }
                })}
              </div>
              <div>
                <h3 className="text-white text-lg font-bold mb-1">{comingSoonFeature.name}</h3>
                <p className="text-[#8E8E93] text-sm">{comingSoonFeature.description}</p>
              </div>
            </div>

            <div className="p-4 bg-[#6366F1]/10 rounded-xl border border-[#6366F1]/30 mb-6">
              <p className="text-white text-sm font-medium mb-1">Coming Soon</p>
              <p className="text-[#8E8E93] text-xs">
                We're working hard to bring this feature to life. Get notified when it launches!
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setComingSoonFeature(null)}
                className="flex-1 px-4 py-3 bg-[#27272A] text-white text-sm font-semibold rounded-xl hover:bg-[#3F3F46] transition"
              >
                Close
              </button>
              <button
                onClick={() => notifyMutation.mutate(comingSoonFeature.id)}
                disabled={notifyMutation.isPending || user?.notify_features?.includes(comingSoonFeature.id)}
                className="flex-1 px-4 py-3 bg-[#6366F1] text-white text-sm font-semibold rounded-xl hover:brightness-110 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Bell className="w-4 h-4" />
                {user?.notify_features?.includes(comingSoonFeature.id) ? 'Notified' : 'Get Notified'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
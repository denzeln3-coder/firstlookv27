import React, { useState } from 'react';
import { Check, Zap, Sparkles, Crown, ArrowLeft } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function Pricing() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const highlightTier = searchParams.get('tier');
  const [isProcessing, setIsProcessing] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch {
        return null;
      }
    }
  });

  const { data: subscription } = useQuery({
    queryKey: ['subscription', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const subs = await base44.entities.Subscription.filter({ user_id: user.id });
      return subs[0] || null;
    },
    enabled: !!user?.id
  });

  const currentTier = subscription?.tier || 'free';

  const tiers = [
    {
      id: 'free',
      name: 'Free',
      price: 0,
      icon: Zap,
      color: '#8E8E93',
      description: 'Get started with the basics',
      features: [
        '15-second pitch recording',
        'Basic profile card',
        '2 gradient backgrounds',
        '1 font option',
        'Community access',
        'Watermark on exports'
      ]
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 9,
      icon: Sparkles,
      color: '#6366F1',
      popular: true,
      description: 'Everything you need to stand out',
      features: [
        'Everything in Free',
        '2-minute demo videos',
        'All gradient backgrounds',
        'All fonts',
        'AI-generated captions',
        'Brand kit (save colors, logo)',
        'Thumbnail selector',
        'No watermark on exports',
        'Analytics dashboard',
        'Priority in feed algorithm'
      ]
    },
    {
      id: 'executive',
      name: 'Executive',
      price: 29,
      icon: Crown,
      color: '#F59E0B',
      description: 'For serious founders and brands',
      features: [
        'Everything in Pro',
        'Custom brand colors',
        'Upload custom fonts',
        'Sponsored content tools',
        'Featured placement options',
        'Advanced analytics',
        'Priority support',
        'API access',
        'White-glove onboarding'
      ]
    }
  ];

  const handleSelectPlan = async (tierId) => {
    if (!user) {
      base44.auth.redirectToLogin(window.location.pathname);
      return;
    }

    if (tierId === currentTier) {
      toast.info('You are already on this plan');
      return;
    }

    if (tierId === 'free') {
      toast.info('Contact support to downgrade');
      return;
    }

    setIsProcessing(tierId);

    try {
      // For now, create/update subscription directly
      // In production, this would redirect to Stripe
      const now = new Date();
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1);

      if (subscription) {
        await base44.entities.Subscription.update(subscription.id, {
          tier: tierId,
          started_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
          is_active: true
        });
      } else {
        await base44.entities.Subscription.create({
          user_id: user.id,
          tier: tierId,
          started_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
          is_active: true
        });
      }

      toast.success(`Upgraded to ${tierId.charAt(0).toUpperCase() + tierId.slice(1)}!`);
      navigate(createPageUrl('CreatorStudio'));
    } catch (error) {
      console.error('Upgrade failed:', error);
      toast.error('Upgrade failed. Please try again.');
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#000000] py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[#8E8E93] hover:text-white transition mb-8"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>

        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">Choose Your Plan</h1>
          <p className="text-[#8E8E93] text-lg max-w-2xl mx-auto">
            Unlock powerful creator tools to make your startup stand out. Upgrade anytime.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {tiers.map((tier) => {
            const Icon = tier.icon;
            const isCurrentPlan = currentTier === tier.id;
            const isHighlighted = highlightTier === tier.id;
            
            return (
              <div
                key={tier.id}
                className={`relative rounded-2xl p-6 border transition-all ${
                  tier.popular
                    ? 'bg-gradient-to-b from-[#6366F1]/20 to-[#18181B] border-[#6366F1]'
                    : isHighlighted
                    ? 'bg-[#18181B] border-[#6366F1]'
                    : 'bg-[#18181B] border-[#3F3F46]'
                }`}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#6366F1] rounded-full text-xs font-semibold text-white">
                    MOST POPULAR
                  </div>
                )}

                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${tier.color}20` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: tier.color }} />
                  </div>
                  <h3 className="text-xl font-bold text-white">{tier.name}</h3>
                </div>

                <div className="mb-2">
                  <span className="text-4xl font-bold text-white">${tier.price}</span>
                  <span className="text-[#8E8E93]">/month</span>
                </div>

                <p className="text-[#8E8E93] text-sm mb-6">{tier.description}</p>

                <ul className="space-y-3 mb-8">
                  {tier.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check
                        className="w-5 h-5 mt-0.5 flex-shrink-0"
                        style={{ color: tier.color }}
                      />
                      <span className="text-[#E4E4E7] text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSelectPlan(tier.id)}
                  disabled={isProcessing || isCurrentPlan}
                  className={`w-full py-3 rounded-xl font-semibold transition ${
                    isCurrentPlan
                      ? 'bg-[#27272A] text-[#8E8E93] cursor-not-allowed'
                      : tier.popular
                      ? 'bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white hover:brightness-110'
                      : tier.id === 'executive'
                      ? 'bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-white hover:brightness-110'
                      : 'bg-[#27272A] text-white hover:bg-[#3F3F46]'
                  }`}
                >
                  {isProcessing === tier.id
                    ? 'Processing...'
                    : isCurrentPlan
                    ? 'Current Plan'
                    : tier.price === 0
                    ? 'Get Started'
                    : `Upgrade to ${tier.name}`}
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <p className="text-[#71717A] text-sm">
            All plans include a 7-day free trial. Cancel anytime.
          </p>
          <p className="text-[#71717A] text-sm mt-2">
            Questions? <a href="mailto:support@firstlook.app" className="text-[#6366F1] hover:underline">Contact us</a>
          </p>
        </div>
      </div>
    </div>
  );
}
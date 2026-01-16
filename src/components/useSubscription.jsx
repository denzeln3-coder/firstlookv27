import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export function useSubscription() {
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

  const { data: subscription, isLoading } = useQuery({
    queryKey: ['subscription', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      try {
        const subscriptions = await base44.entities.Subscription.filter({ user_id: user.id });
        if (subscriptions.length > 0) {
          const sub = subscriptions[0];
          if (sub.expires_at && new Date(sub.expires_at) < new Date()) {
            return { ...sub, tier: 'free', is_active: false };
          }
          return sub;
        }
        return null;
      } catch {
        return null;
      }
    },
    enabled: !!user?.id
  });

  // Admins automatically get executive access to all features
  const isAdmin = user?.role === 'admin';
  const tier = isAdmin ? 'executive' : (subscription?.tier || 'free');
  const isActive = isAdmin ? true : (subscription?.is_active !== false);

  return {
    user,
    subscription,
    tier,
    isLoading,
    isFree: !isAdmin && tier === 'free',
    isPro: isAdmin || tier === 'pro' || tier === 'executive',
    isExecutive: isAdmin || tier === 'executive',
    isActive,
    expiresAt: subscription?.expires_at ? new Date(subscription.expires_at) : null
  };
}
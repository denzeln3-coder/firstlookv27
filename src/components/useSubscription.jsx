import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useSubscription() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return null;
      const { data: profile } = await supabase.from('users').select('*').eq('id', authUser.id).single();
      return { ...authUser, ...profile };
    }
  });

  const { data: subscription, isLoading } = useQuery({
    queryKey: ['subscription', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase.from('subscriptions').select('*').eq('user_id', user.id).single();
      if (data) {
        if (data.expires_at && new Date(data.expires_at) < new Date()) {
          return { ...data, tier: 'free', is_active: false };
        }
        return data;
      }
      return null;
    },
    enabled: !!user?.id
  });

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

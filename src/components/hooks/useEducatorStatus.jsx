import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export function useEducatorStatus(userId) {
  const { data: educatorData, isLoading } = useQuery({
    queryKey: ['educatorStatus', userId],
    queryFn: async () => {
      if (!userId) return null;
      try {
        const educators = await base44.entities.EducatorPartner.filter({ 
          user_id: userId,
          status: 'approved'
        });
        return educators[0] || null;
      } catch {
        return null;
      }
    },
    enabled: !!userId
  });

  return {
    isEducator: !!educatorData,
    educatorData,
    badgeType: educatorData?.badge_type || null,
    isLoading
  };
}
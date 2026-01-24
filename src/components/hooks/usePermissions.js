import { useAuth } from '@/lib/AuthContext';

export const USER_TYPES = {
  FOUNDER: 'founder',
  HUNTER: 'hunter',
  INVESTOR: 'investor'
};

export function usePermissions() {
  const { user, isAuthenticated } = useAuth();
  
  const userType = user?.user_type || null;
  
  const isFounder = userType === USER_TYPES.FOUNDER;
  const isHunter = userType === USER_TYPES.HUNTER;
  const isInvestor = userType === USER_TYPES.INVESTOR;
  
  const permissions = {
    canRecordPitch: isFounder,
    canRecordDemo: isFounder,
    canPostStartup: isFounder,
    canViewFeed: true,
    canViewCommunity: isAuthenticated,
    canViewMessages: isAuthenticated,
    canUpvote: isAuthenticated,
    canBookmark: isAuthenticated,
    canAccessDealFlow: isInvestor,
    canSaveToPipeline: isInvestor,
  };
  
  return {
    user,
    userType,
    isAuthenticated,
    isFounder,
    isHunter,
    isInvestor,
    hasSelectedUserType: !!userType,
    ...permissions,
  };
}

export default usePermissions;

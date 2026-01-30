import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { 
  Home, 
  Users, 
  MessageCircle, 
  User, 
  Video, 
  TrendingUp, 
  Target,
  Compass,
  Bookmark
} from 'lucide-react';
import { createPageUrl } from '../utils';

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname.replace('/', '') || 'Explore';

  // Get current user
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', authUser.id)
            .single();
          return { ...authUser, ...profile };
        }
        return null;
      } catch {
        return null;
      }
    },
    staleTime: 60000,
    refetchOnWindowFocus: true
  });

  // Get unread messages count
  const { data: unreadMessagesCount = 0 } = useQuery({
    queryKey: ['unreadMessages', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count, error } = await supabase
        .from('direct_messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .eq('read', false);
      return error ? 0 : (count || 0);
    },
    enabled: !!user,
    staleTime: 15000,
    refetchOnWindowFocus: true,
    refetchInterval: 30000
  });

  const isFounder = user?.user_type === 'founder';
  const isInvestor = user?.user_type === 'investor';
  const isHunter = user?.user_type === 'hunter';

  const isActive = (page) => {
    if (page === 'Explore' && (currentPath === 'Explore' || currentPath === '')) return true;
    return currentPath === page;
  };

  const handleCenterButtonClick = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    if (isFounder) {
      navigate(createPageUrl('RecordPitch'));
    } else if (isInvestor) {
      navigate(createPageUrl('InvestorDashboard'));
    } else if (isHunter) {
      navigate(createPageUrl('HunterDashboard'));
    } else {
      navigate(createPageUrl('Settings'));
    }
  };

  const navItems = [
    {
      id: 'Explore',
      label: 'Home',
      icon: Home,
      onClick: () => navigate(createPageUrl('Explore'))
    },
    {
      id: 'Community',
      label: 'Community',
      icon: Users,
      onClick: () => navigate(createPageUrl('Community'))
    },
    {
      id: 'center',
      isCenter: true,
      onClick: handleCenterButtonClick
    },
    {
      id: 'Messages',
      label: 'Messages',
      icon: MessageCircle,
      onClick: () => user ? navigate(createPageUrl('Messages')) : navigate('/login'),
      badge: unreadMessagesCount,
      requiresAuth: true
    },
    {
      id: 'Profile',
      label: 'Profile',
      icon: User,
      onClick: () => user ? navigate(createPageUrl('Profile')) : navigate('/login')
    }
  ];

  // Replace Messages with Saved for logged out users
  const displayItems = navItems.map(item => {
    if (item.id === 'Messages' && !user) {
      return {
        id: 'Saved',
        label: 'Saved',
        icon: Bookmark,
        onClick: () => navigate(createPageUrl('Saved'))
      };
    }
    return item;
  });

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[#000000]/95 backdrop-blur-lg border-t border-[rgba(255,255,255,0.06)] z-50">
      <div className="flex items-center justify-around py-2 px-4 pb-safe">
        {displayItems.map((item) => {
          if (item.isCenter) {
            // Center button
            return (
              <button 
                key="center"
                onClick={item.onClick} 
                className="flex flex-col items-center gap-1 -mt-4 min-h-[44px] justify-center"
              >
                <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:brightness-110 transition-all duration-200 ${
                  isFounder 
                    ? 'bg-[#8B5CF6] shadow-[0_4px_20px_rgba(139,92,246,0.5)]' 
                    : isInvestor 
                      ? 'bg-[#10B981] shadow-[0_4px_20px_rgba(16,185,129,0.5)]'
                      : isHunter
                        ? 'bg-[#F59E0B] shadow-[0_4px_20px_rgba(245,158,11,0.5)]'
                        : 'bg-[#6366F1] shadow-[0_4px_20px_rgba(99,102,241,0.5)]'
                }`}>
                  {isFounder ? (
                    <Video className="w-6 h-6 text-white" />
                  ) : isInvestor ? (
                    <TrendingUp className="w-6 h-6 text-white" />
                  ) : isHunter ? (
                    <Target className="w-6 h-6 text-white" />
                  ) : (
                    <Compass className="w-6 h-6 text-white" />
                  )}
                </div>
              </button>
            );
          }

          const Icon = item.icon;
          const active = isActive(item.id);
          
          return (
            <button 
              key={item.id}
              onClick={item.onClick} 
              className={`relative flex flex-col items-center gap-1 min-h-[44px] justify-center transition-colors duration-200 ${
                active ? 'text-[#8B5CF6]' : 'text-[#52525B] hover:text-white'
              }`}
            >
              {active ? (
                <div className="w-8 h-8 rounded-full bg-[rgba(139,92,246,0.15)] flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </div>
              ) : (
                <Icon className="w-6 h-6" />
              )}
              
              {/* Unread badge */}
              {item.badge > 0 && (
                <div className="absolute top-0 right-2 w-4 h-4 bg-[#EF4444] rounded-full flex items-center justify-center">
                  <span className="text-white text-[9px] font-bold">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                </div>
              )}
              
              <span className={`text-[10px] font-semibold ${active ? 'text-[#8B5CF6]' : ''}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

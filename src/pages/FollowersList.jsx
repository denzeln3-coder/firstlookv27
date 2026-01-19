import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { ArrowLeft, UserPlus, UserCheck } from 'lucide-react';
import { toast } from 'sonner';

export default function FollowersList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const userId = urlParams.get('userId');
  const tab = urlParams.get('tab') || 'followers';
  const [activeTab, setActiveTab] = useState(tab);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return null;
      
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();
      
      return { ...authUser, ...profile };
    }
  });

  const { data: profileUser } = useQuery({
    queryKey: ['profileUser', userId],
    queryFn: async () => {
      if (!userId) return currentUser;
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) return null;
      return data;
    },
    enabled: !!currentUser || !!userId
  });

  const { data: followers = [] } = useQuery({
    queryKey: ['followers', profileUser?.id],
    queryFn: async () => {
      if (!profileUser) return [];
      
      const { data, error } = await supabase
        .from('follows')
        .select('*')
        .eq('following_id', profileUser.id);
      
      if (error) return [];
      return data;
    },
    enabled: !!profileUser
  });

  const { data: following = [] } = useQuery({
    queryKey: ['following', profileUser?.id],
    queryFn: async () => {
      if (!profileUser) return [];
      
      const { data, error } = await supabase
        .from('follows')
        .select('*')
        .eq('follower_id', profileUser.id);
      
      if (error) return [];
      return data;
    },
    enabled: !!profileUser
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*');
      
      if (error) return [];
      return data;
    }
  });

  const { data: currentUserFollowing = [] } = useQuery({
    queryKey: ['currentUserFollowing', currentUser?.id],
    queryFn: async () => {
      if (!currentUser) return [];
      
      const { data, error } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', currentUser.id);
      
      if (error) return [];
      return data.map(f => f.following_id);
    },
    enabled: !!currentUser
  });

  const followMutation = useMutation({
    mutationFn: async (targetUserId) => {
      if (!currentUser) return;
      
      // Check if already following
      const { data: existingFollow } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', currentUser.id)
        .eq('following_id', targetUserId)
        .single();

      if (existingFollow) {
        // Unfollow
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('id', existingFollow.id);
        
        if (error) throw error;
        return { action: 'unfollow' };
      } else {
        // Follow
        const { error } = await supabase
          .from('follows')
          .insert({
            follower_id: currentUser.id,
            following_id: targetUserId
          });
        
        if (error) throw error;
        return { action: 'follow' };
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['currentUserFollowing'] });
      queryClient.invalidateQueries({ queryKey: ['followers'] });
      queryClient.invalidateQueries({ queryKey: ['following'] });
      toast.success(data.action === 'follow' ? 'Following' : 'Unfollowed');
    }
  });

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}${createPageUrl('FollowersList')}`
      }
    });
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center">
        <button
          onClick={handleLogin}
          className="px-6 py-3 bg-[#6366F1] text-white font-semibold rounded-xl hover:brightness-110 transition"
        >
          Log In
        </button>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-white text-xl font-bold mb-4">User not found</h2>
          <button
            onClick={() => navigate(createPageUrl('Profile'))}
            className="px-6 py-3 bg-[#6366F1] text-white font-semibold rounded-xl hover:brightness-110 transition"
          >
            Back to Profile
          </button>
        </div>
      </div>
    );
  }

  const displayList = activeTab === 'followers' ? followers : following;
  const users = displayList.map(follow => {
    const targetUserId = activeTab === 'followers' ? follow.follower_id : follow.following_id;
    return allUsers.find(u => u.id === targetUserId);
  }).filter(Boolean);

  return (
    <div className="min-h-screen bg-[#000000] pb-20">
      <div className="sticky top-0 bg-[#000000]/95 backdrop-blur-xl z-20 border-b border-[#18181B]">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <button
            onClick={() => navigate(createPageUrl('Profile') + (userId ? `?userId=${userId}` : ''))}
            className="flex items-center gap-2 text-[#8E8E93] hover:text-white transition mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Back</span>
          </button>
          <h1 className="text-white text-2xl font-bold mb-4">
            {profileUser.display_name || profileUser.username || 'User'}
          </h1>
          
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('followers')}
              className={`flex-1 px-4 py-2 rounded-xl text-sm font-semibold transition ${
                activeTab === 'followers'
                  ? 'bg-[#6366F1] text-white'
                  : 'bg-[#18181B] text-[#8E8E93] hover:bg-[#27272A]'
              }`}
            >
              Followers ({followers.length})
            </button>
            <button
              onClick={() => setActiveTab('following')}
              className={`flex-1 px-4 py-2 rounded-xl text-sm font-semibold transition ${
                activeTab === 'following'
                  ? 'bg-[#6366F1] text-white'
                  : 'bg-[#18181B] text-[#8E8E93] hover:bg-[#27272A]'
              }`}
            >
              Following ({following.length})
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6">
        {users.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[#8E8E93] text-lg">
              {activeTab === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {users.map(user => {
              const isFollowing = currentUserFollowing.includes(user.id);
              const isCurrentUser = user.id === currentUser.id;

              return (
                <div key={user.id} className="bg-[#0A0A0A] border border-[#18181B] rounded-xl p-4 flex items-center gap-4">
                  <button
                    onClick={() => navigate(createPageUrl('Profile') + `?userId=${user.id}`)}
                    className="flex items-center gap-3 flex-1"
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center overflow-hidden flex-shrink-0">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-white font-bold">
                          {(user.display_name || user.username)?.[0]?.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="text-white font-semibold">
                        {user.display_name || user.username}
                      </div>
                      <div className="text-[#8E8E93] text-sm">
                        @{user.username || user.display_name}
                      </div>
                      {user.bio && (
                        <div className="text-[#636366] text-xs line-clamp-1 mt-1">
                          {user.bio}
                        </div>
                      )}
                    </div>
                  </button>
                  
                  {!isCurrentUser && (
                    <button
                      onClick={() => followMutation.mutate(user.id)}
                      disabled={followMutation.isPending}
                      className={`px-4 py-2 rounded-full text-sm font-semibold transition-all min-w-[100px] ${
                        isFollowing
                          ? 'bg-transparent border border-[#3F3F46] text-[#D4D4D8] hover:bg-red-500/20 hover:text-red-500 hover:border-red-500/50'
                          : 'bg-[#6366F1] text-white hover:brightness-110'
                      }`}
                    >
                      {isFollowing ? (
                        <>
                          <UserCheck className="w-4 h-4 inline mr-1" />
                          Following
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4 inline mr-1" />
                          Follow
                        </>
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, MoreVertical, Settings, Share2, LogOut, Grid3x3, Bookmark, Play, CheckCircle2, Globe, MessageCircle, BarChart3, Briefcase, Users, Trash2, MoreHorizontal, Send, ArrowUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';
import NotificationBell from '../components/NotificationBell';
import ConnectButton from '../components/ConnectButton';
import PitchModal from '../components/PitchModal';

export default function Profile() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showMenu, setShowMenu] = useState(false);
  const [activeTab, setActiveTab] = useState('pitches');
  const [savedTab, setSavedTab] = useState('bookmarked');
  const [drafts, setDrafts] = useState([]);
  const [selectedPitch, setSelectedPitch] = useState(null);
  const [showPitchMenu, setShowPitchMenu] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingPitch, setDeletingPitch] = useState(null);
  const urlParams = new URLSearchParams(window.location.search);
  const profileUserId = urlParams.get('userId');

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try {
        return (await supabase.auth.getUser()).data.user;
      } catch {
        return null;
      }
    },
    staleTime: 5 * 60 * 1000
  });

  const { data: profileUser, isLoading: userLoading } = useQuery({
    queryKey: ['profileUser', profileUserId],
    queryFn: async () => {
      if (!profileUserId) return currentUser;
      try {
        const users = (await supabase.from('profiles').select('*').eq('id', profileUserId)).data;
        return users[0] || null;
      } catch {
        return null;
      }
    },
    enabled: !!currentUser || !!profileUserId
  });

  const isOwnProfile = !profileUserId || profileUserId === currentUser?.id;

  // Load drafts from localStorage
  React.useEffect(() => {
    if (isOwnProfile) {
      const draft = localStorage.getItem('pitchDraft');
      if (draft) {
        try {
          const parsed = JSON.parse(draft);
          if (Object.values(parsed).some(v => v)) {
            setDrafts([{ ...parsed, id: 'draft-1', created_date: new Date().toISOString() }]);
          }
        } catch (err) {
          console.error('Failed to parse draft:', err);
        }
      }
    }
  }, [isOwnProfile]);

  const { data: userPitches = [], isLoading: pitchesLoading } = useQuery({
    queryKey: ['userPitches', profileUser?.id],
    queryFn: () => supabase.from('startups').select('*').eq('founder_id', profileUser.id).order('created_at', { ascending: false }).then(r => r.data || []),
    enabled: !!profileUser,
    staleTime: 2 * 60 * 1000
  });

  const { data: savedPitches = [], isLoading: savedLoading } = useQuery({
    queryKey: ['savedPitches', currentUser?.id],
    queryFn: async () => {
      if (!currentUser) return [];
      const bookmarks = (await supabase.from('bookmarks').select('*').eq('user_id', currentUser.id)).data || [];
      const pitchIds = bookmarks.map(b => b.pitch_id);
      if (pitchIds.length === 0) return [];
      const allPitches = (await supabase.from('startups').select('*')).data || [];
      return allPitches.filter(p => pitchIds.includes(p.id));
    },
    enabled: isOwnProfile && !!currentUser
  });

  const { data: upvotedPitches = [], isLoading: upvotedLoading } = useQuery({
    queryKey: ['upvotedPitches', currentUser?.id],
    queryFn: async () => {
      if (!currentUser) return [];
      const upvotes = (await supabase.from('upvotes').select('*').eq('user_id', currentUser.id)).data || [];
      const pitchIds = upvotes.map(u => u.pitch_id);
      if (pitchIds.length === 0) return [];
      const allPitches = (await supabase.from('startups').select('*')).data || [];
      return allPitches.filter(p => pitchIds.includes(p.id));
    },
    enabled: isOwnProfile && !!currentUser && activeTab === 'saved'
  });

  const { data: isFollowing = false } = useQuery({
    queryKey: ['isFollowing', currentUser?.id, profileUser?.id],
    queryFn: async () => {
      if (!currentUser || !profileUser || isOwnProfile) return false;
      const follows = (await supabase.from('follows').select('*').eq('follower_id', currentUser.id).eq('following_id', profileUser.id 
      )).data || [];
      return follows.length > 0;
    },
    enabled: !!currentUser && !!profileUser && !isOwnProfile
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers', profileUser?.id],
    queryFn: () => supabase.from('user_team_members').select('*').eq('user_id', profileUser.id).order('order').then(r => r.data || []),
    enabled: !!profileUser
  });

  const { data: followers = [] } = useQuery({
    queryKey: ['followers', profileUser?.id],
    queryFn: async () => {
      if (!profileUser) return [];
      const follows = (await supabase.from('follows').select('*').eq('following_id', profileUser.id)).data || [];
      return follows.slice(0, 6);
    },
    enabled: !!profileUser
  });

  const { data: following = [] } = useQuery({
    queryKey: ['following', profileUser?.id],
    queryFn: async () => {
      if (!profileUser) return [];
      const follows = (await supabase.from('follows').select('*').eq('follower_id', profileUser.id)).data || [];
      return follows.slice(0, 6);
    },
    enabled: !!profileUser
  });

  const { data: allViews = [] } = useQuery({
    queryKey: ['pitchViews'],
    queryFn: () => supabase.from('pitch_views').select('*').then(r => r.data || []),
    enabled: !!profileUser
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => supabase.from('profiles').select('*').then(r => r.data || []),
    enabled: !isOwnProfile && (followers.length > 0 || following.length > 0)
  });

  const { data: pinnedPitches = [] } = useQuery({
    queryKey: ['pinnedPitches', profileUser?.id],
    queryFn: async () => {
      if (!profileUser) return [];
      const pitches = (await supabase.from('startups').select('*').eq('founder_id', profileUser.id).eq('is_pinned', true)).data || [];
      return pitches;
    },
    enabled: !!profileUser
  });

  const topPitches = useMemo(() => {
    if (!userPitches.length) return [];

    // Calculate engagement score for each pitch
    const pitchesWithScores = userPitches.map(pitch => {
      const views = allViews.filter(v => v.pitch_id === pitch.id).length;
      const engagementScore = (pitch.upvote_count || 0) * 10 + views;
      return { ...pitch, views, engagementScore };
    });

    return pitchesWithScores
      .sort((a, b) => b.engagementScore - a.engagementScore)
      .slice(0, 3);
  }, [userPitches, allViews]);

  const updatePinMutation = useMutation({
    mutationFn: async (pitchId) => {
      const pitch = userPitches.find(p => p.id === pitchId);
      if (!pitch) return;

      await supabase.from('startups').update({
        is_pinned: !pitch.is_pinned
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userPitches'] });
      queryClient.invalidateQueries({ queryKey: ['pinnedPitches'] });
      toast.success('Pitch updated');
    }
  });

  const deletePitchMutation = useMutation({
    mutationFn: async (pitchId) => {
      const upvotes = (await supabase.from('upvotes').select('*').eq('startup_id', pitchId)).data || [];
      for (const upvote of upvotes) {
        await supabase.from('upvotes').delete().eq('id', upvote.id);
      }
      
      const comments = (await supabase.from('comments').select('*').eq('startup_id', pitchId)).data || [];
      for (const comment of comments) {
        await supabase.from('comments').delete().eq('id', comment.id);
      }
      
      const bookmarks = (await supabase.from('bookmarks').select('*').eq('startup_id', pitchId)).data || [];
      for (const bookmark of bookmarks) {
        await supabase.from('bookmarks').delete().eq('id', bookmark.id);
      }
      
      const views = (await supabase.from('pitch_views').select('*').eq('startup_id', pitchId)).data || [];
      for (const view of views) {
        await supabase.from('pitch_views').delete().eq('id', view.id);
      }
      
      await supabase.from('startups').delete().eq('id', pitchId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userPitches'] });
      queryClient.invalidateQueries({ queryKey: ['pitches'] });
      setShowDeleteConfirm(false);
      setDeletingPitch(null);
      toast.success('Pitch deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete pitch');
    }
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      if (!currentUser || !profileUser) return;
      
      const existingFollow = (await supabase.from('follows').select('*').eq('follower_id', currentUser.id).eq('following_id', profileUser.id
      )).data || [];

      if (existingFollow.length > 0) {
        await supabase.from('follows').delete().eq('id', existingFollow[0].id);
        await supabase.from('profiles').update( {
          following_count: Math.max(0, (currentUser.following_count || 0) - 1)
        });
        await supabase.from('profiles').update( {
          followers_count: Math.max(0, (profileUser.followers_count || 0) - 1)
        });
        toast.success('Unfollowed');
      } else {
        await supabase.from('follows').insert({
          follower_id: currentUser.id,
          following_id: profileUser.id
        });
        await supabase.from('profiles').update( {
          following_count: (currentUser.following_count || 0) + 1
        });
        await supabase.from('profiles').update( {
          followers_count: (profileUser.followers_count || 0) + 1
        });
        
        // Create notification
        /* notification disabled */ null;
        
        toast.success('Following');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['isFollowing'] });
      queryClient.invalidateQueries({ queryKey: ['profileUser'] });
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    }
  });

  const stats = useMemo(() => ({
    pitches: userPitches.length,
    followers: profileUser?.followers_count || 0,
    upvotes: userPitches.reduce((sum, p) => sum + (p.upvote_count || 0), 0)
  }), [userPitches, profileUser]);

  const handleLogout = () => {
    supabase.auth.signOut().then(() => window.location.href = '/Explore');
  };

  const handleShareProfile = () => {
    const profileUrl = profileUser 
      ? `${window.location.origin}${createPageUrl('Profile')}?userId=${profileUser.id}`
      : window.location.href;
    navigator.clipboard.writeText(profileUrl);
    toast.success('Profile link copied!');
    setShowMenu(false);
  };

  if (userLoading) {
    return (
      <div className="min-h-screen bg-[#09090B] flex items-center justify-center">
        <div className="text-[#FAFAFA]">Loading...</div>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="min-h-screen bg-[#09090B] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-[#FAFAFA] text-[24px] font-bold mb-4">User not found</h2>
          <button
            onClick={() => navigate(createPageUrl('Explore'))}
            className="px-6 py-3 bg-[#6366F1] text-white font-semibold rounded-lg hover:brightness-110 transition"
          >
            Back to Explore
          </button>
        </div>
      </div>
    );
  }

  if (!currentUser && isOwnProfile) {
    return (
      <div className="min-h-screen bg-[#09090B] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-[#FAFAFA] text-[24px] font-bold mb-4">Not Logged In</h2>
          <button
            onClick={() => window.location.href = '/login'}
            className="px-6 py-3 bg-[#6366F1] text-white font-semibold rounded-lg hover:brightness-110 transition"
          >
            Log In
          </button>
        </div>
      </div>
    );
  }

  const displayPitches = activeTab === 'pitches' 
    ? userPitches 
    : activeTab === 'saved' && savedTab === 'upvoted' 
      ? upvotedPitches 
      : savedPitches;
  const isLoading = activeTab === 'pitches' 
    ? pitchesLoading 
    : activeTab === 'saved' && savedTab === 'upvoted' 
      ? upvotedLoading 
      : savedLoading;

  return (
    <div className="min-h-screen bg-[#000000] pb-20">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 bg-[#000000]/80 backdrop-blur-xl z-20 px-4 py-4 flex items-center justify-between border-b border-[rgba(255,255,255,0.06)]">
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(createPageUrl('Explore'));
          }}
          className="text-[#8E8E93] hover:text-[#FFFFFF] transition-colors duration-200"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-[#FFFFFF] text-[18px] font-semibold tracking-[-0.01em]">
          {profileUser.display_name || profileUser.full_name || profileUser.username || 'Profile'}
        </h1>
        <div className="flex items-center gap-3">
          <NotificationBell />
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors duration-150"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
            {showMenu && (
              <div className="absolute top-full right-0 mt-2 bg-[#18181B] border border-[#27272A] rounded-lg shadow-xl overflow-hidden min-w-[160px]">
                {isOwnProfile && (
                  <>
                    <button
                      onClick={() => {
                        navigate(createPageUrl('Analytics'));
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-3 text-left text-[#FAFAFA] text-[14px] hover:bg-[#27272A] transition-colors flex items-center gap-2"
                    >
                      <BarChart3 className="w-4 h-4" />
                      Analytics
                    </button>
                    <button
                      onClick={() => {
                        navigate(createPageUrl('Settings'));
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-3 text-left text-[#FAFAFA] text-[14px] hover:bg-[#27272A] transition-colors flex items-center gap-2"
                    >
                      <Settings className="w-4 h-4" />
                      Settings
                    </button>
                  </>
                )}
                <button
                  onClick={handleShareProfile}
                  className="w-full px-4 py-3 text-left text-[#FAFAFA] text-[14px] hover:bg-[#27272A] transition-colors flex items-center gap-2"
                >
                  <Share2 className="w-4 h-4" />
                  Share Profile
                </button>
                {isOwnProfile && (
                  <button
                    onClick={() => {
                      handleLogout();
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-3 text-left text-[#EF4444] text-[14px] hover:bg-[#27272A] transition-colors flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Log Out
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Profile Section */}
      <div className="pt-16 px-6 pb-6">
        {/* Avatar */}
        <div className="flex justify-center mb-4">
          <div className="w-[100px] h-[100px] rounded-full bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center text-white text-[40px] font-bold overflow-hidden border-2 border-[rgba(255,255,255,0.1)] shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
            {profileUser.avatar_url ? (
              <img src={profileUser.avatar_url} alt={profileUser.display_name || profileUser.username} className="w-full h-full object-cover" />
            ) : (
              <span>{(profileUser.display_name || profileUser.full_name || profileUser.username || profileUser.email)?.[0]?.toUpperCase()}</span>
            )}
          </div>
        </div>

        {/* Username with verification */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <h2 className="text-[#FFFFFF] text-[18px] font-semibold tracking-[-0.01em]">
            {profileUser.username ? `@${profileUser.username.replace('@', '')}` : (profileUser.display_name || profileUser.full_name || 'User')}
          </h2>
          {profileUser.is_verified && (
            <CheckCircle2 className="w-5 h-5 text-[#3B82F6] fill-[#3B82F6]" />
          )}
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-0 mb-6 max-w-md mx-auto">
          <div className="text-center border-r border-[rgba(255,255,255,0.06)]">
            <div className="text-[#FFFFFF] text-[20px] font-bold leading-[1.2]">{stats.pitches}</div>
            <div className="text-[#636366] text-[12px] font-medium tracking-[0.02em] uppercase">Pitches</div>
          </div>
          <button
            onClick={() => navigate(createPageUrl('FollowersList') + `?userId=${profileUser.id}&tab=followers`)}
            className="text-center border-r border-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.03)] transition rounded-lg"
          >
            <div className="text-[#FFFFFF] text-[20px] font-bold leading-[1.2]">{stats.followers}</div>
            <div className="text-[#636366] text-[12px] font-medium tracking-[0.02em] uppercase">Followers</div>
          </button>
          <button
            onClick={() => navigate(createPageUrl('FollowersList') + `?userId=${profileUser.id}&tab=following`)}
            className="text-center hover:bg-[rgba(255,255,255,0.03)] transition rounded-lg"
          >
            <div className="text-[#FFFFFF] text-[20px] font-bold leading-[1.2]">{profileUser.following_count || 0}</div>
            <div className="text-[#636366] text-[12px] font-medium tracking-[0.02em] uppercase">Following</div>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mb-6 max-w-md mx-auto">
          {isOwnProfile ? (
            <>
              <button
                onClick={() => navigate(createPageUrl('EditProfile'))}
                className="flex-1 px-6 py-3 bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] text-white text-[14px] font-semibold rounded-xl hover:brightness-110 transition-all duration-200 shadow-[0_4px_12px_rgba(99,102,241,0.4)]"
              >
                Edit Profile
              </button>
              <button
                onClick={() => navigate(createPageUrl('Messages'))}
                className="px-4 py-3 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] rounded-xl hover:bg-[rgba(255,255,255,0.1)] transition-all duration-200"
              >
                <MessageCircle className="w-5 h-5 text-[#8E8E93]" />
              </button>
              {(currentUser?.user_type === 'investor' || !currentUser?.user_type || currentUser?.is_investor) && (
              <button
                onClick={() => {
                  if (currentUser.is_investor) {
                    navigate(createPageUrl('InvestorDashboard'));
                  } else {
                    navigate(createPageUrl('InvestorProfile'));
                  }
                }}
                className="px-4 py-3 bg-gradient-to-br from-[#6366F1]/20 to-[#8B5CF6]/20 border border-[#6366F1]/40 rounded-xl hover:from-[#6366F1]/30 hover:to-[#8B5CF6]/30 transition-all duration-200"
                title={currentUser.is_investor ? "Investor Dashboard" : "Create Investor Profile"}
              >
                <svg className="w-5 h-5 text-[#6366F1]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </button>
              )}
              <div className="relative">
                <button
                  disabled
                  className="px-4 py-3 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-xl opacity-50 cursor-not-allowed"
                  title="Coming Soon"
                >
                  <svg className="w-5 h-5 text-[#8E8E93]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </button>
                <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[8px] text-[#636366] whitespace-nowrap">Coming Soon</span>
              </div>
              <button
                onClick={() => navigate(createPageUrl('Settings'))}
                className="px-4 py-3 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] rounded-xl hover:bg-[rgba(255,255,255,0.1)] transition-all duration-200"
              >
                <Settings className="w-5 h-5 text-[#8E8E93]" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => followMutation.mutate()}
                disabled={followMutation.isPending}
                className={`flex-1 px-6 py-3 text-[14px] font-semibold rounded-xl transition-all duration-200 ${
                  isFollowing
                    ? 'bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] text-[#FFFFFF] hover:bg-[rgba(255,255,255,0.1)]'
                    : 'bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] text-white hover:brightness-110 shadow-[0_4px_12px_rgba(99,102,241,0.4)]'
                }`}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </button>
              <button
                onClick={() => navigate(createPageUrl('Messages') + `?userId=${profileUser.id}`)}
                className="px-4 py-3 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] rounded-xl hover:bg-[rgba(255,255,255,0.1)] transition-all duration-200"
              >
                <Send className="w-5 h-5 text-[#8E8E93]" />
              </button>
              <ConnectButton targetUserId={profileUser.id} currentUser={currentUser} />
            </>
          )}
        </div>

        {/* Bio */}
        {profileUser.bio && (
          <div className="text-center mb-4 max-w-md mx-auto">
            <p className="text-[#8E8E93] text-[14px] leading-[1.5] line-clamp-3">{profileUser.bio}</p>
          </div>
        )}

        {/* Company Section */}
        {(profileUser.company_name || profileUser.company_about || profileUser.company_logo) && (
          <div className="mb-6 max-w-md mx-auto p-4 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] rounded-xl">
            {profileUser.company_logo && (
              <div className="flex justify-center mb-3">
                <img src={profileUser.company_logo} alt={profileUser.company_name} className="h-12 object-contain" />
              </div>
            )}
            {profileUser.company_name && (
              <h3 className="text-[#FFFFFF] text-[16px] font-semibold text-center mb-2">{profileUser.company_name}</h3>
            )}
            {profileUser.company_about && (
              <p className="text-[#8E8E93] text-[13px] text-center leading-[1.5] mb-3">{profileUser.company_about}</p>
            )}
            {(profileUser.company_website || profileUser.company_twitter || profileUser.company_linkedin) && (
              <div className="flex items-center justify-center gap-4 pt-3 border-t border-[rgba(255,255,255,0.1)]">
                {profileUser.company_website && (
                  <a href={profileUser.company_website} target="_blank" rel="noopener noreferrer" className="text-[#8E8E93] hover:text-[#FFFFFF] transition">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                  </a>
                )}
                {profileUser.company_twitter && (
                  <a href={profileUser.company_twitter} target="_blank" rel="noopener noreferrer" className="text-[#8E8E93] hover:text-[#FFFFFF] transition">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  </a>
                )}
                {profileUser.company_linkedin && (
                  <a href={profileUser.company_linkedin} target="_blank" rel="noopener noreferrer" className="text-[#8E8E93] hover:text-[#FFFFFF] transition">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                  </a>
                )}
              </div>
            )}
          </div>
        )}

        {/* Team Section */}
        {teamMembers.length > 0 && (
          <div className="mb-6 max-w-md mx-auto">
            <h3 className="text-[#FFFFFF] text-[14px] font-semibold mb-3 text-center">Team</h3>
            <div className="grid grid-cols-2 gap-3">
              {teamMembers.map((member) => (
                <div key={member.id} className="p-3 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] rounded-lg">
                  {member.photo_url && (
                    <img src={member.photo_url} alt={member.name} className="w-12 h-12 rounded-full object-cover mx-auto mb-2" />
                  )}
                  <h4 className="text-[#FFFFFF] text-[13px] font-semibold text-center">{member.name}</h4>
                  <p className="text-[#8E8E93] text-[11px] text-center mb-1">{member.role}</p>
                  {member.bio && (
                    <p className="text-[#636366] text-[10px] text-center line-clamp-2 mb-2">{member.bio}</p>
                  )}
                  {(member.linkedin_url || member.twitter_url) && (
                    <div className="flex items-center justify-center gap-2 pt-2 border-t border-[rgba(255,255,255,0.1)]">
                      {member.linkedin_url && (
                        <a href={member.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-[#8E8E93] hover:text-[#FFFFFF] transition">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                          </svg>
                        </a>
                      )}
                      {member.twitter_url && (
                        <a href={member.twitter_url} target="_blank" rel="noopener noreferrer" className="text-[#8E8E93] hover:text-[#FFFFFF] transition">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                          </svg>
                        </a>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Expertise & Availability */}
        {((profileUser.expertise && profileUser.expertise.length > 0) || profileUser.open_to_collaborate) && (
          <div className="mb-6 max-w-md mx-auto space-y-3">
            {profileUser.expertise && profileUser.expertise.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2 justify-center">
                  <Briefcase className="w-4 h-4 text-[#8E8E93]" />
                  <span className="text-[#8E8E93] text-[12px] font-medium uppercase tracking-wide">Expertise</span>
                </div>
                <div className="flex flex-wrap gap-2 justify-center">
                  {profileUser.expertise.map((skill, idx) => (
                    <span key={idx} className="px-3 py-1 bg-[rgba(99,102,241,0.1)] border border-[rgba(99,102,241,0.2)] text-[#6366F1] text-[12px] font-medium rounded-full">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {profileUser.open_to_collaborate && (
              <div className="flex items-center justify-center gap-2 px-4 py-2 bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.2)] rounded-lg">
                <Users className="w-4 h-4 text-[#22C55E]" />
                <span className="text-[#22C55E] text-[13px] font-medium">Open to collaborate</span>
              </div>
            )}

            {profileUser.looking_for && profileUser.looking_for.length > 0 && (
              <div>
                <span className="text-[#8E8E93] text-[12px] font-medium uppercase tracking-wide">Looking for: </span>
                <span className="text-[#FFFFFF] text-[13px]">{profileUser.looking_for.join(', ')}</span>
              </div>
            )}
          </div>
        )}

        {/* Previous Startups */}
        {profileUser.previous_startups && profileUser.previous_startups.length > 0 && (
          <div className="mb-6 max-w-md mx-auto">
            <h3 className="text-[#FFFFFF] text-[14px] font-semibold mb-3 text-center">Previous Startups</h3>
            <div className="space-y-2">
              {profileUser.previous_startups.map((startup, index) => (
                <div key={index} className="p-3 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-[#FFFFFF] text-[13px] font-semibold">{startup.name}</h4>
                    <span className="text-[#8E8E93] text-[11px]">{startup.year}</span>
                  </div>
                  <p className="text-[#8E8E93] text-[12px]">{startup.role}</p>
                  {startup.outcome && (
                    <p className="text-[#6366F1] text-[11px] mt-1">{startup.outcome}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}



        {/* Connections Section */}
        {!isOwnProfile && (followers.length > 0 || following.length > 0) && (
          <div className="mb-6 max-w-md mx-auto">
            <div className="grid grid-cols-2 gap-3">
              {followers.length > 0 && (
                <div>
                  <h3 className="text-[#8E8E93] text-[11px] font-medium uppercase tracking-wide mb-2">
                    Recent Followers
                  </h3>
                  <div className="flex -space-x-2">
                    {followers.slice(0, 5).map((follow) => {
                      const follower = allUsers.find(u => u.id === follow.follower_id);
                      return (
                        <button
                          key={follow.id}
                          onClick={() => navigate(createPageUrl('Profile') + `?userId=${follower?.id}`)}
                          className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] border-2 border-[#000000] flex items-center justify-center overflow-hidden hover:scale-110 transition-transform"
                        >
                          {follower?.avatar_url ? (
                            <img src={follower.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-white text-xs font-bold">
                              {(follower?.display_name || follower?.username)?.[0]?.toUpperCase() || '?'}
                            </span>
                          )}
                        </button>
                      );
                    })}
                    {followers.length > 5 && (
                      <div className="w-8 h-8 rounded-full bg-[rgba(255,255,255,0.1)] border-2 border-[#000000] flex items-center justify-center">
                        <span className="text-[#8E8E93] text-xs font-bold">+{followers.length - 5}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {following.length > 0 && (
                <div>
                  <h3 className="text-[#8E8E93] text-[11px] font-medium uppercase tracking-wide mb-2">
                    Following
                  </h3>
                  <div className="flex -space-x-2">
                    {following.slice(0, 5).map((follow) => {
                      const followedUser = allUsers.find(u => u.id === follow.following_id);
                      return (
                        <button
                          key={follow.id}
                          onClick={() => navigate(createPageUrl('Profile') + `?userId=${followedUser?.id}`)}
                          className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] border-2 border-[#000000] flex items-center justify-center overflow-hidden hover:scale-110 transition-transform"
                        >
                          {followedUser?.avatar_url ? (
                            <img src={followedUser.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-white text-xs font-bold">
                              {(followedUser?.display_name || followedUser?.username)?.[0]?.toUpperCase() || '?'}
                            </span>
                          )}
                        </button>
                      );
                    })}
                    {following.length > 5 && (
                      <div className="w-8 h-8 rounded-full bg-[rgba(255,255,255,0.1)] border-2 border-[#000000] flex items-center justify-center">
                        <span className="text-[#8E8E93] text-xs font-bold">+{following.length - 5}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Social Links */}
        {(profileUser.twitter_url || profileUser.linkedin_url || profileUser.rockz_url || profileUser.website_url) && (
          <div className="flex items-center justify-center gap-4 mb-6">
            {profileUser.twitter_url && (
              <a
                href={profileUser.twitter_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#8E8E93] hover:text-[#FFFFFF] transition-colors duration-200"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
            )}
            {profileUser.linkedin_url && (
              <a
                href={profileUser.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors"
              >
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
            )}
            {profileUser.rockz_url && (
              <a
                href={profileUser.rockz_url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-[#A1A1AA] hover:bg-[#FAFAFA] text-[#09090B] flex items-center justify-center font-bold text-[16px] transition-colors"
              >
                R
              </a>
            )}
            {profileUser.website_url && (
              <a
                href={profileUser.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors"
              >
                <Globe className="w-8 h-8" />
              </a>
            )}
          </div>
        )}

        {profileUser.website_url && (
          <div className="text-center mb-6">
            <a
              href={profileUser.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#6366F1] text-[14px] hover:brightness-110 transition-all"
            >
              {profileUser.website_url.replace(/^https?:\/\//, '')}
            </a>
          </div>
        )}

        {/* Content Tabs */}
        <div className="flex border-b border-[rgba(255,255,255,0.06)] mb-4">
          <button
            onClick={() => setActiveTab('pitches')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 transition-all duration-200 ${
              activeTab === 'pitches'
                ? 'text-[#FFFFFF] border-b-2 border-[#6366F1]'
                : 'text-[#636366]'
            }`}
          >
            <Grid3x3 className="w-5 h-5" />
            <span className="text-[14px] font-medium">Pitches</span>
          </button>
          {isOwnProfile && (
            <>
              <button
                onClick={() => setActiveTab('drafts')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 transition-all duration-200 ${
                  activeTab === 'drafts'
                    ? 'text-[#FFFFFF] border-b-2 border-[#6366F1]'
                    : 'text-[#636366]'
                }`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-[14px] font-medium">Drafts</span>
                {drafts.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-[#6366F1] text-white text-[10px] font-bold rounded-full">
                    {drafts.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('saved')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 transition-all duration-200 ${
                  activeTab === 'saved'
                    ? 'text-[#FFFFFF] border-b-2 border-[#6366F1]'
                    : 'text-[#636366]'
                }`}
              >
                <Bookmark className="w-5 h-5" />
                <span className="text-[14px] font-medium">Saved</span>
              </button>
            </>
          )}
        </div>

        {/* Saved Tab Toggle */}
        {activeTab === 'saved' && (
          <div className="flex gap-2 mb-4 p-1 bg-[rgba(255,255,255,0.03)] rounded-xl border border-[rgba(255,255,255,0.06)]">
            <button
              onClick={() => setSavedTab('bookmarked')}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition ${
                savedTab === 'bookmarked'
                  ? 'bg-white text-black'
                  : 'bg-transparent text-[#636366] border border-[#3F3F46]'
              }`}
            >
              Bookmarked
            </button>
            <button
              onClick={() => setSavedTab('upvoted')}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition ${
                savedTab === 'upvoted'
                  ? 'bg-white text-black'
                  : 'bg-transparent text-[#636366] border border-[#3F3F46]'
              }`}
            >
              Upvoted
            </button>
          </div>
        )}

        {/* Content Display */}
        {activeTab === 'drafts' ? (
          drafts.length === 0 ? (
            <div className="text-center py-12 px-6">
              <svg className="w-16 h-16 text-[#636366] mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-[#8E8E93] mb-6 text-[16px]">No drafts yet</p>
              <button
                onClick={() => navigate(createPageUrl('RecordPitch'))}
                className="px-6 py-3 bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] text-white text-[14px] font-semibold rounded-xl hover:brightness-110 transition-all duration-200 shadow-[0_4px_12px_rgba(99,102,241,0.4)]"
              >
                Start a new pitch
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {drafts.map((draft) => (
                <div key={draft.id} className="bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] rounded-xl p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-[#FFFFFF] text-[16px] font-semibold mb-1">
                        {draft.startup_name || 'Untitled Pitch'}
                      </h3>
                      {draft.one_liner && (
                        <p className="text-[#8E8E93] text-[13px] line-clamp-2">{draft.one_liner}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-[#636366] text-[11px]">
                        <span>Draft saved</span>
                        {draft.category && (
                          <>
                            <span>•</span>
                            <span>{draft.category}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate(createPageUrl('RecordPitch'))}
                      className="flex-1 px-4 py-2.5 bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] text-white text-[13px] font-semibold rounded-lg hover:brightness-110 transition-all duration-200"
                    >
                      Continue
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm('Delete this draft? This cannot be undone.')) {
                          localStorage.removeItem('pitchDraft');
                          setDrafts([]);
                          toast.success('Draft deleted');
                        }
                      }}
                      className="px-4 py-2.5 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] text-[#EF4444] text-[13px] font-semibold rounded-lg hover:bg-[rgba(239,68,68,0.1)] transition-all duration-200"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : isLoading ? (
          <div className="grid grid-cols-3 gap-[2px]">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skeleton" style={{ aspectRatio: '4/5', width: '100%' }} />
            ))}
          </div>
        ) : displayPitches.length === 0 ? (
          <div className="text-center py-12 px-6">
            <p className="text-[#8E8E93] mb-6 text-[16px]">
              {activeTab === 'pitches' 
                ? "No pitches yet" 
                : activeTab === 'saved' && savedTab === 'upvoted'
                  ? "You haven't upvoted any pitches yet. Upvote pitches you love to save them here."
                  : "No saved pitches yet. Tap the bookmark icon on pitches you want to revisit."}
            </p>
            <button
              onClick={() => navigate(activeTab === 'pitches' ? createPageUrl('RecordPitch') : createPageUrl('Explore'))}
              className="px-6 py-3 bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] text-white text-[14px] font-semibold rounded-xl hover:brightness-110 transition-all duration-200 shadow-[0_4px_12px_rgba(99,102,241,0.4)]"
            >
              {activeTab === 'pitches' 
                ? "Record your first pitch" 
                : "Discover startups"}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-[2px]">
            {displayPitches.map((pitch, index) => (
              <div key={pitch.id} className="relative group">
                <button
                  onClick={() => setSelectedPitch(pitch)}
                  className="relative overflow-hidden transition-all duration-200 hover:brightness-80 active:scale-[0.98] w-full"
                  style={{ aspectRatio: '4/5', width: '100%' }}
                >
                  {pitch.thumbnail_url ? (
                    <img
                      src={pitch.thumbnail_url}
                      alt={pitch.startup_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#6366F1] to-[#8B5CF6]">
                      <span className="text-white text-[32px] font-bold">{pitch.startup_name?.[0]?.toUpperCase()}</span>
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
                    <Play className="w-3.5 h-3.5 text-white fill-white" />
                    <span className="text-white text-[10px] font-semibold tracking-[0.04em]" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                      {pitch.upvote_count || 0}
                    </span>
                  </div>
                  {index === 0 && activeTab === 'pitches' && (
                    <div className="absolute top-2 left-2 px-2 py-1 bg-[#6366F1] rounded text-white text-[10px] font-bold">
                      PINNED
                    </div>
                  )}
                </button>
                {isOwnProfile && activeTab === 'pitches' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(createPageUrl('PitchAnalytics') + `?pitchId=${pitch.id}`);
                    }}
                    className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 backdrop-blur-sm rounded text-white text-[10px] font-semibold hover:bg-black/80 transition flex items-center gap-1"
                  >
                    📊
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    localStorage.setItem('selectedPitchId', pitch.id);
                    navigate(createPageUrl('Demo'));
                  }}
                  className="absolute top-2 right-12 px-2 py-1 bg-[#6366F1]/90 backdrop-blur-sm rounded text-white text-[10px] font-semibold hover:bg-[#6366F1] transition flex items-center gap-1"
                >
                  🎬 Demo
                </button>
                {isOwnProfile && activeTab === 'pitches' && (
                  <div className="absolute top-2 right-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowPitchMenu(showPitchMenu === pitch.id ? null : pitch.id);
                      }}
                      className="w-8 h-8 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-black/80 transition"
                    >
                      <MoreHorizontal className="w-4 h-4 text-white" />
                    </button>
                    {showPitchMenu === pitch.id && (
                      <div className="absolute top-10 right-0 bg-[#18181B] border border-[#27272A] rounded-lg shadow-xl overflow-hidden min-w-[120px] z-10">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowPitchMenu(null);
                            updatePinMutation.mutate(pitch.id);
                          }}
                          className="w-full px-4 py-3 text-left text-white text-[14px] hover:bg-[#27272A] transition-colors flex items-center gap-2"
                        >
                          {pitch.is_pinned ? (
                            <>
                              <span className="text-lg">📌</span>
                              Unpin
                            </>
                          ) : (
                            <>
                              <span className="text-lg">📍</span>
                              Pin to Top
                            </>
                          )}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowPitchMenu(null);
                            setDeletingPitch(pitch);
                            setShowDeleteConfirm(true);
                          }}
                          className="w-full px-4 py-3 text-left text-[#EF4444] text-[14px] hover:bg-[#27272A] transition-colors flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && deletingPitch && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-6">
          <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-white text-[18px] font-bold mb-2">Delete this pitch?</h3>
            <p className="text-[#A1A1AA] text-[14px] mb-6">This cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeletingPitch(null);
                }}
                className="flex-1 px-6 py-3 bg-[#27272A] text-white text-[14px] font-semibold rounded-xl hover:bg-[#3A3A3D] transition"
              >
                Cancel
              </button>
              <button
                onClick={() => deletePitchMutation.mutate(deletingPitch.id)}
                disabled={deletePitchMutation.isPending}
                className="flex-1 px-6 py-3 bg-[#EF4444] text-white text-[14px] font-semibold rounded-xl hover:bg-[#DC2626] transition disabled:opacity-50"
              >
                {deletePitchMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pitch Modal */}
      {selectedPitch && (
        <PitchModal 
          key={selectedPitch.id}
          pitch={selectedPitch} 
          onClose={() => setSelectedPitch(null)} 
        />
      )}
    </div>
  );
}
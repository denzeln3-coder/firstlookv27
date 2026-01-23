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
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return null;
      
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();
      
      return { ...authUser, ...profile };
    },
    staleTime: 5 * 60 * 1000
  });

  const { data: profileUser, isLoading: userLoading } = useQuery({
    queryKey: ['profileUser', profileUserId],
    queryFn: async () => {
      if (!profileUserId) return currentUser;
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', profileUserId)
        .single();
      
      if (error) return null;
      return data;
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
    queryFn: async () => {
      const { data, error } = await supabase
        .from('startups')
        .select('*')
        .eq('founder_id', profileUser.id)
        .order('created_at', { ascending: false });
      
      if (error) return [];
      return data || [];
    },
    enabled: !!profileUser,
    staleTime: 2 * 60 * 1000
  });

  // FIXED: Use startup_id instead of pitch_id
  const { data: savedPitches = [], isLoading: savedLoading } = useQuery({
    queryKey: ['savedPitches', currentUser?.id],
    queryFn: async () => {
      if (!currentUser) return [];
      
      const { data: bookmarks } = await supabase
        .from('bookmarks')
        .select('startup_id')
        .eq('user_id', currentUser.id);
      
      if (!bookmarks || bookmarks.length === 0) return [];
      
      const pitchIds = bookmarks.map(b => b.startup_id);
      const { data: pitches } = await supabase
        .from('startups')
        .select('*')
        .in('id', pitchIds);
      
      return pitches || [];
    },
    enabled: isOwnProfile && !!currentUser
  });

  // FIXED: Use startup_id instead of pitch_id
  const { data: upvotedPitches = [], isLoading: upvotedLoading } = useQuery({
    queryKey: ['upvotedPitches', currentUser?.id],
    queryFn: async () => {
      if (!currentUser) return [];
      
      const { data: upvotes } = await supabase
        .from('upvotes')
        .select('startup_id')
        .eq('user_id', currentUser.id);
      
      if (!upvotes || upvotes.length === 0) return [];
      
      const pitchIds = upvotes.map(u => u.startup_id);
      const { data: pitches } = await supabase
        .from('startups')
        .select('*')
        .in('id', pitchIds);
      
      return pitches || [];
    },
    enabled: isOwnProfile && !!currentUser && activeTab === 'saved'
  });

  const { data: isFollowing = false } = useQuery({
    queryKey: ['isFollowing', currentUser?.id, profileUser?.id],
    queryFn: async () => {
      if (!currentUser || !profileUser || isOwnProfile) return false;
      
      const { data } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', currentUser.id)
        .eq('following_id', profileUser.id);
      
      return data && data.length > 0;
    },
    enabled: !!currentUser && !!profileUser && !isOwnProfile
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers', profileUser?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_team_members')
        .select('*')
        .eq('user_id', profileUser.id)
        .order('order', { ascending: true });
      
      if (error) return [];
      return data || [];
    },
    enabled: !!profileUser
  });

  const { data: followers = [] } = useQuery({
    queryKey: ['followers', profileUser?.id],
    queryFn: async () => {
      if (!profileUser) return [];
      
      const { data } = await supabase
        .from('follows')
        .select('*')
        .eq('following_id', profileUser.id)
        .limit(6);
      
      return data || [];
    },
    enabled: !!profileUser
  });

  const { data: following = [] } = useQuery({
    queryKey: ['following', profileUser?.id],
    queryFn: async () => {
      if (!profileUser) return [];
      
      const { data } = await supabase
        .from('follows')
        .select('*')
        .eq('follower_id', profileUser.id)
        .limit(6);
      
      return data || [];
    },
    enabled: !!profileUser
  });

  const { data: allViews = [] } = useQuery({
    queryKey: ['pitchViews'],
    queryFn: async () => {
      const { data } = await supabase.from('pitch_views').select('*');
      return data || [];
    },
    enabled: !!profileUser
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: async () => {
      const { data } = await supabase.from('users').select('*');
      return data || [];
    },
    enabled: !isOwnProfile && (followers.length > 0 || following.length > 0)
  });

  const { data: pinnedPitches = [] } = useQuery({
    queryKey: ['pinnedPitches', profileUser?.id],
    queryFn: async () => {
      if (!profileUser) return [];
      
      const { data } = await supabase
        .from('startups')
        .select('*')
        .eq('founder_id', profileUser.id)
        .eq('is_pinned', true);
      
      return data || [];
    },
    enabled: !!profileUser
  });

  const topPitches = useMemo(() => {
    if (!userPitches.length) return [];

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

      const { error } = await supabase
        .from('startups')
        .update({ is_pinned: !pitch.is_pinned })
        .eq('id', pitchId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userPitches'] });
      queryClient.invalidateQueries({ queryKey: ['pinnedPitches'] });
      toast.success('Pitch updated');
    }
  });

  const deletePitchMutation = useMutation({
    mutationFn: async (pitchId) => {
      // Delete related data first
      await supabase.from('upvotes').delete().eq('startup_id', pitchId);
      await supabase.from('comments').delete().eq('startup_id', pitchId);
      await supabase.from('bookmarks').delete().eq('startup_id', pitchId);
      await supabase.from('pitch_views').delete().eq('startup_id', pitchId);
      
      // Delete the pitch
      const { error } = await supabase.from('startups').delete().eq('id', pitchId);
      if (error) throw error;
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
      
      const { data: existingFollow } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', currentUser.id)
        .eq('following_id', profileUser.id)
        .single();

      if (existingFollow) {
        await supabase.from('follows').delete().eq('id', existingFollow.id);
        toast.success('Unfollowed');
      } else {
        await supabase.from('follows').insert({
          follower_id: currentUser.id,
          following_id: profileUser.id
        });
        toast.success('Following');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['isFollowing'] });
      queryClient.invalidateQueries({ queryKey: ['followers'] });
      queryClient.invalidateQueries({ queryKey: ['following'] });
    }
  });

  const stats = useMemo(() => ({
    pitches: userPitches.length,
    followers: followers.length,
    following: following.length
  }), [userPitches, followers, following]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/Explore';
  };

  const handleShareProfile = () => {
    const profileUrl = profileUser 
      ? `${window.location.origin}${createPageUrl('Profile')}?userId=${profileUser.id}`
      : window.location.href;
    navigator.clipboard.writeText(profileUrl);
    toast.success('Profile link copied!');
    setShowMenu(false);
  };

  // Helper to get display name
  const getDisplayName = (user) => {
    if (!user) return 'User';
    return user.display_name || user.full_name || user.username || user.email?.split('@')[0] || 'User';
  };

  // Helper to get username without double @
  const getUsername = (user) => {
    if (!user) return 'user';
    if (user.username) {
      return user.username.replace(/^@+/, ''); // Remove any leading @ symbols
    }
    return user.display_name || user.full_name || 'user';
  };

  // Helper to format website URL
  const formatWebsiteUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `https://${url}`;
  };

  // Helper to display website URL without protocol
  const displayWebsiteUrl = (url) => {
    if (!url) return '';
    return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
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
          {getDisplayName(profileUser)}
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
      <div className="pt-20 px-6 pb-6">
        {/* Avatar */}
        <div className="flex justify-center mb-4">
          <div className="w-[100px] h-[100px] rounded-full bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center text-white text-[40px] font-bold overflow-hidden border-2 border-[rgba(255,255,255,0.1)] shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
            {profileUser.avatar_url ? (
              <img src={profileUser.avatar_url} alt={getDisplayName(profileUser)} className="w-full h-full object-cover" />
            ) : (
              <span>{getDisplayName(profileUser)[0]?.toUpperCase()}</span>
            )}
          </div>
        </div>

        {/* Username with verification - FIXED: No double @ */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <h2 className="text-[#FFFFFF] text-[18px] font-semibold tracking-[-0.01em]">
            @{getUsername(profileUser)}
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
            <div className="text-[#FFFFFF] text-[20px] font-bold leading-[1.2]">{stats.following}</div>
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
                  <a href={formatWebsiteUrl(profileUser.company_website)} target="_blank" rel="noopener noreferrer" className="text-[#8E8E93] hover:text-[#FFFFFF] transition">
                    <Globe className="w-5 h-5" />
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
                </div>
              ))}
            </div>
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

        {/* Social Links */}
        {(profileUser.twitter_url || profileUser.linkedin_url || profileUser.rockz_url || profileUser.website_url) && (
          <div className="flex items-center justify-center gap-4 mb-6">
            {profileUser.website_url && (
              <a href={formatWebsiteUrl(profileUser.website_url)} target="_blank" rel="noopener noreferrer" className="text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors">
                <Globe className="w-6 h-6" />
              </a>
            )}
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
          {!isOwnProfile && (
            <>
              <button
                onClick={() => setActiveTab("demo")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 transition-all duration-200 ${
                  activeTab === "demo"
                    ? "text-[#FFFFFF] border-b-2 border-[#6366F1]"
                    : "text-[#636366]"
                }`}
              >
                <span className="text-[14px] font-medium">Demo</span>
              </button>
              <button
                onClick={() => setActiveTab("updates")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 transition-all duration-200 ${
                  activeTab === "updates"
                    ? "text-[#FFFFFF] border-b-2 border-[#6366F1]"
                    : "text-[#636366]"
                }`}
              >
                <span className="text-[14px] font-medium">Updates</span>
              </button>
              <button
                onClick={() => setActiveTab("about")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 transition-all duration-200 ${
                  activeTab === "about"
                    ? "text-[#FFFFFF] border-b-2 border-[#6366F1]"
                    : "text-[#636366]"
                }`}
              >
                <span className="text-[14px] font-medium">About</span>
              </button>
            </>
          )}
        </div>

        {/* Saved Tab Sub-navigation */}
        {activeTab === 'saved' && isOwnProfile && (
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setSavedTab('bookmarked')}
              className={`px-4 py-2 rounded-full text-[13px] font-medium transition-all ${
                savedTab === 'bookmarked'
                  ? 'bg-[#6366F1] text-white'
                  : 'bg-[rgba(255,255,255,0.06)] text-[#8E8E93]'
              }`}
            >
              Bookmarked
            </button>
            <button
              onClick={() => setSavedTab('upvoted')}
              className={`px-4 py-2 rounded-full text-[13px] font-medium transition-all ${
                savedTab === 'upvoted'
                  ? 'bg-[#6366F1] text-white'
                  : 'bg-[rgba(255,255,255,0.06)] text-[#8E8E93]'
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
              <p className="text-[#8E8E93] mb-6 text-[16px]">No drafts yet</p>
              <button
                onClick={() => navigate(createPageUrl('RecordPitch'))}
                className="px-6 py-3 bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] text-white text-[14px] font-semibold rounded-xl hover:brightness-110 transition-all duration-200"
              >
                Start a new pitch
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {drafts.map((draft) => (
                <div key={draft.id} className="bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] rounded-xl p-4">
                  <h3 className="text-[#FFFFFF] text-[16px] font-semibold mb-1">
                    {draft.startup_name || 'Untitled Pitch'}
                  </h3>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => navigate(createPageUrl('RecordPitch'))}
                      className="flex-1 px-4 py-2.5 bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] text-white text-[13px] font-semibold rounded-lg"
                    >
                      Continue
                    </button>
                    <button
                      onClick={() => {
                        localStorage.removeItem('pitchDraft');
                        setDrafts([]);
                        toast.success('Draft deleted');
                      }}
                      className="px-4 py-2.5 bg-[rgba(255,255,255,0.06)] text-[#EF4444] text-[13px] font-semibold rounded-lg"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : activeTab === 'pitches' || activeTab === 'saved' ? (
          isLoading ? (
            <div className="grid grid-cols-3 gap-1">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="skeleton rounded-lg" style={{ aspectRatio: '1/1', width: '100%' }} />
              ))}
            </div>
          ) : displayPitches.length === 0 ? (
            <div className="text-center py-12 px-6">
              <p className="text-[#8E8E93] mb-6 text-[16px]">
                {activeTab === 'pitches' ? "No pitches yet" : "No saved pitches yet"}
              </p>
              <button
                onClick={() => navigate(activeTab === 'pitches' ? createPageUrl('RecordPitch') : createPageUrl('Explore'))}
                className="px-6 py-3 bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] text-white text-[14px] font-semibold rounded-xl"
              >
                {activeTab === 'pitches' ? "Record your first pitch" : "Discover startups"}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1">
              {displayPitches.map((pitch) => (
                <div key={pitch.id} className="relative group">
                  <button
                    onClick={() => setSelectedPitch(pitch)}
                    className="relative overflow-hidden w-full rounded-lg"
                    style={{ aspectRatio: '1/1' }}
                  >
                    {pitch.thumbnail_url ? (
                      <img src={pitch.thumbnail_url} alt={pitch.startup_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#6366F1] to-[#8B5CF6]">
                        <span className="text-white text-[24px] font-bold">{pitch.startup_name?.[0]?.toUpperCase()}</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
                      <Play className="w-3 h-3 text-white fill-white" />
                      <span className="text-white text-[10px] font-semibold">{pitch.upvote_count || 0}</span>
                    </div>
                  </button>
                  {isOwnProfile && activeTab === 'pitches' && (
                    <div className="absolute top-2 right-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowPitchMenu(showPitchMenu === pitch.id ? null : pitch.id);
                        }}
                        className="w-8 h-8 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreHorizontal className="w-4 h-4 text-white" />
                      </button>
                      {showPitchMenu === pitch.id && (
                        <div className="absolute top-10 right-0 bg-[#18181B] border border-[#27272A] rounded-lg shadow-xl min-w-[120px] z-10">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowPitchMenu(null);
                              setDeletingPitch(pitch);
                              setShowDeleteConfirm(true);
                            }}
                            className="w-full px-4 py-3 text-left text-[#EF4444] text-[14px] hover:bg-[#27272A] flex items-center gap-2"
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
          )
        ) : null}

        {/* Demo Tab */}
        {activeTab === "demo" && (
          <div className="py-12">
            <div className="text-center">
              <p className="text-[#71717A] text-[14px]">No demo video yet</p>
            </div>
          </div>
        )}

        {/* Updates Tab */}
        {activeTab === "updates" && (
          <div className="py-12">
            <div className="text-center">
              <p className="text-[#71717A] text-[14px]">No updates yet</p>
            </div>
          </div>
        )}

        {/* About Tab */}
        {activeTab === "about" && (
          <div className="py-6">
            <div className="space-y-6">
              {profileUser?.bio && (
                <div>
                  <h4 className="text-[#71717A] text-[12px] uppercase tracking-wide mb-2">Bio</h4>
                  <p className="text-[#FAFAFA] text-[14px] leading-relaxed">{profileUser.bio}</p>
                </div>
              )}
              {profileUser?.website_url && (
                <div>
                  <h4 className="text-[#71717A] text-[12px] uppercase tracking-wide mb-2">Website</h4>
                  <a 
                    href={formatWebsiteUrl(profileUser.website_url)} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-[#6366F1] text-[14px] hover:underline"
                  >
                    {displayWebsiteUrl(profileUser.website_url)}
                  </a>
                </div>
              )}
              {profileUser?.collab_modes?.length > 0 && (
                <div>
                  <h4 className="text-[#71717A] text-[12px] uppercase tracking-wide mb-2">Looking For</h4>
                  <div className="flex flex-wrap gap-2">
                    {profileUser.collab_modes.map(mode => (
                      <span key={mode} className="px-3 py-1.5 bg-[#18181B] text-[#A1A1AA] text-[12px] rounded-full">{mode}</span>
                    ))}
                  </div>
                </div>
              )}
              {!profileUser?.bio && !profileUser?.website_url && !profileUser?.collab_modes?.length && (
                <p className="text-[#71717A] text-[14px] text-center py-8">No additional info available</p>
              )}
            </div>
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
                className="flex-1 px-6 py-3 bg-[#27272A] text-white text-[14px] font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={() => deletePitchMutation.mutate(deletingPitch.id)}
                disabled={deletePitchMutation.isPending}
                className="flex-1 px-6 py-3 bg-[#EF4444] text-white text-[14px] font-semibold rounded-xl disabled:opacity-50"
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
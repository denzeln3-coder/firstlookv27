import React, { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, MoreVertical, Settings, Share2, LogOut, Grid3x3, Bookmark, Play, CheckCircle2, Globe, MessageCircle, BarChart3, Briefcase, Users, Trash2, MoreHorizontal, Send, ArrowUp, ExternalLink, ChevronRight } from 'lucide-react';
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
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showStartupsModal, setShowStartupsModal] = useState(false);
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

  // Accurate count queries for stats display
  const { data: followerCount = 0 } = useQuery({
    queryKey: ['followerCount', profileUser?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', profileUser.id);
      return count || 0;
    },
    enabled: !!profileUser
  });

  const { data: followingCount = 0 } = useQuery({
    queryKey: ['followingCount', profileUser?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', profileUser.id);
      return count || 0;
    },
    enabled: !!profileUser
  });

  const deletePitchMutation = useMutation({
    mutationFn: async (pitchId) => {
      await supabase.from('early_access_requests').delete().eq('startup_id', pitchId);
      await supabase.from('intro_requests').delete().eq('pitch_id', pitchId);
      await supabase.from('upvotes').delete().eq('startup_id', pitchId);
      await supabase.from('comments').delete().eq('startup_id', pitchId);
      await supabase.from('bookmarks').delete().eq('pitch_id', pitchId);
      await supabase.from('pitch_views').delete().eq('pitch_id', pitchId);
      
      const { error } = await supabase.from('startups').delete().eq('id', pitchId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['userPitches'] });
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
        .maybeSingle();

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
      queryClient.invalidateQueries({ queryKey: ['followerCount'] });
      queryClient.invalidateQueries({ queryKey: ['followingCount'] });
    }
  });

  const stats = useMemo(() => ({
    pitches: userPitches.length,
    followers: followerCount,
    following: followingCount
  }), [userPitches, followerCount, followingCount]);

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

  const getDisplayName = (user) => {
    if (!user) return 'User';
    return user.display_name || user.full_name || user.username || user.email?.split('@')[0] || 'User';
  };

  const getUsername = (user) => {
    if (!user) return 'user';
    if (user.username) {
      return user.username.replace(/^@+/, '');
    }
    return user.display_name?.toLowerCase().replace(/\s+/g, '') || 'user';
  };

  const formatWebsiteUrl = (url) => {
    if (!url) return null;
    const trimmed = url.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
    return `https://${trimmed}`;
  };

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
      <div className="min-h-screen bg-[#09090B] flex items-center justify-center px-6">
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
      <div className="min-h-screen bg-[#09090B] flex items-center justify-center px-6">
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

  // Check if there's any profile info to show
  const hasWebsite = profileUser.website_url || profileUser.company_website;
  const hasTeam = teamMembers.length > 0;
  const hasPreviousStartups = profileUser.previous_startups && profileUser.previous_startups.length > 0;
  const hasCompany = profileUser.company_name || profileUser.company_about;

  return (
    <div className="min-h-screen bg-[#000000] pb-24">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 bg-[#000000]/80 backdrop-blur-xl z-20 px-4 py-3 flex items-center justify-between border-b border-[rgba(255,255,255,0.06)]">
        <button
          onClick={() => navigate(createPageUrl('Explore'))}
          className="text-[#8E8E93] hover:text-[#FFFFFF] transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-[#FFFFFF] text-[17px] font-semibold">
          {getDisplayName(profileUser)}
        </h1>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="text-[#A1A1AA] hover:text-[#FAFAFA] transition"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
            {showMenu && (
              <div className="absolute top-full right-0 mt-2 bg-[#18181B] border border-[#27272A] rounded-xl shadow-xl overflow-hidden min-w-[160px]">
                {isOwnProfile && (
                  <>
                    <button
                      onClick={() => { navigate(createPageUrl('Analytics')); setShowMenu(false); }}
                      className="w-full px-4 py-3 text-left text-[#FAFAFA] text-[14px] hover:bg-[#27272A] transition flex items-center gap-3"
                    >
                      <BarChart3 className="w-4 h-4" /> Analytics
                    </button>
                    <button
                      onClick={() => { navigate(createPageUrl('Settings')); setShowMenu(false); }}
                      className="w-full px-4 py-3 text-left text-[#FAFAFA] text-[14px] hover:bg-[#27272A] transition flex items-center gap-3"
                    >
                      <Settings className="w-4 h-4" /> Settings
                    </button>
                  </>
                )}
                <button
                  onClick={handleShareProfile}
                  className="w-full px-4 py-3 text-left text-[#FAFAFA] text-[14px] hover:bg-[#27272A] transition flex items-center gap-3"
                >
                  <Share2 className="w-4 h-4" /> Share Profile
                </button>
                {isOwnProfile && (
                  <button
                    onClick={() => { handleLogout(); setShowMenu(false); }}
                    className="w-full px-4 py-3 text-left text-[#EF4444] text-[14px] hover:bg-[#27272A] transition flex items-center gap-3"
                  >
                    <LogOut className="w-4 h-4" /> Log Out
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Profile Section - Compact */}
      <div className="pt-16 px-4">
        {/* Avatar + Name + Stats - Horizontal Layout */}
        <div className="flex items-center gap-4 py-4">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center text-white text-[28px] font-bold overflow-hidden border-2 border-[rgba(255,255,255,0.1)] flex-shrink-0">
            {profileUser.avatar_url ? (
              <img src={profileUser.avatar_url} alt={getDisplayName(profileUser)} className="w-full h-full object-cover" />
            ) : (
              <span>{getDisplayName(profileUser)[0]?.toUpperCase()}</span>
            )}
          </div>

          {/* Stats */}
          <div className="flex-1 grid grid-cols-3 gap-2">
            <div className="text-center">
              <div className="text-[#FFFFFF] text-[20px] font-bold">{stats.pitches}</div>
              <div className="text-[#636366] text-[11px] uppercase">Pitches</div>
            </div>
            <button
              onClick={() => navigate(createPageUrl('FollowersList') + `?userId=${profileUser.id}&tab=followers`)}
              className="text-center"
            >
              <div className="text-[#FFFFFF] text-[20px] font-bold">{stats.followers}</div>
              <div className="text-[#636366] text-[11px] uppercase">Followers</div>
            </button>
            <button
              onClick={() => navigate(createPageUrl('FollowersList') + `?userId=${profileUser.id}&tab=following`)}
              className="text-center"
            >
              <div className="text-[#FFFFFF] text-[20px] font-bold">{stats.following}</div>
              <div className="text-[#636366] text-[11px] uppercase">Following</div>
            </button>
          </div>
        </div>

        {/* Name & Username */}
        <div className="mb-3">
          <h2 className="text-[#FFFFFF] text-[16px] font-bold flex items-center gap-1.5">
            {getDisplayName(profileUser)}
            {profileUser.is_verified && (
              <CheckCircle2 className="w-4 h-4 text-[#3B82F6] fill-[#3B82F6]" />
            )}
          </h2>
          <p className="text-[#8E8E93] text-[13px]">@{getUsername(profileUser)}</p>
        </div>

        {/* Bio */}
        {profileUser.bio && (
          <p className="text-[#A1A1AA] text-[13px] leading-relaxed mb-3">{profileUser.bio}</p>
        )}

        {/* Quick Info Row - HORIZONTAL SCROLLABLE */}
        {(hasWebsite || hasTeam || hasPreviousStartups || hasCompany) && (
          <div className="flex gap-2 overflow-x-auto pb-3 -mx-4 px-4 scrollbar-hide">
            {hasWebsite && (
              <a
                href={formatWebsiteUrl(profileUser.website_url || profileUser.company_website)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#18181B] border border-[#27272A] rounded-full text-[#A1A1AA] text-[12px] whitespace-nowrap hover:bg-[#27272A] transition"
              >
                <Globe className="w-3.5 h-3.5" />
                {displayWebsiteUrl(profileUser.website_url || profileUser.company_website).substring(0, 20)}
              </a>
            )}
            {hasCompany && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#18181B] border border-[#27272A] rounded-full text-[#A1A1AA] text-[12px] whitespace-nowrap">
                <Briefcase className="w-3.5 h-3.5" />
                {profileUser.company_name}
              </div>
            )}
            {hasTeam && (
              <button
                onClick={() => setShowTeamModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#18181B] border border-[#27272A] rounded-full text-[#A1A1AA] text-[12px] whitespace-nowrap hover:bg-[#27272A] transition"
              >
                <Users className="w-3.5 h-3.5" />
                Team ({teamMembers.length})
                <ChevronRight className="w-3 h-3" />
              </button>
            )}
            {hasPreviousStartups && (
              <button
                onClick={() => setShowStartupsModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#18181B] border border-[#27272A] rounded-full text-[#A1A1AA] text-[12px] whitespace-nowrap hover:bg-[#27272A] transition"
              >
                <Briefcase className="w-3.5 h-3.5" />
                Past ({profileUser.previous_startups.length})
                <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 mb-4">
          {isOwnProfile ? (
            <>
              <button
                onClick={() => navigate(createPageUrl('EditProfile'))}
                className="flex-1 py-2.5 bg-[#27272A] text-white text-[13px] font-semibold rounded-lg hover:bg-[#3F3F46] transition"
              >
                Edit Profile
              </button>
              <button
                onClick={() => navigate(createPageUrl('Messages'))}
                className="w-11 h-11 bg-[#27272A] rounded-lg flex items-center justify-center hover:bg-[#3F3F46] transition"
              >
                <MessageCircle className="w-5 h-5 text-[#8E8E93]" />
              </button>
              <button
                onClick={() => navigate(createPageUrl('Settings'))}
                className="w-11 h-11 bg-[#27272A] rounded-lg flex items-center justify-center hover:bg-[#3F3F46] transition"
              >
                <Settings className="w-5 h-5 text-[#8E8E93]" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => followMutation.mutate()}
                disabled={followMutation.isPending}
                className={`flex-1 py-2.5 text-[13px] font-semibold rounded-lg transition ${
                  isFollowing
                    ? 'bg-[#27272A] text-white hover:bg-[#3F3F46]'
                    : 'bg-[#6366F1] text-white hover:brightness-110'
                }`}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </button>
              <button
                onClick={() => navigate(createPageUrl('Messages') + `?userId=${profileUser.id}`)}
                className="w-11 h-11 bg-[#27272A] rounded-lg flex items-center justify-center hover:bg-[#3F3F46] transition"
              >
                <Send className="w-5 h-5 text-[#8E8E93]" />
              </button>
              <ConnectButton targetUserId={profileUser.id} currentUser={currentUser} />
            </>
          )}
        </div>

        {/* Content Tabs */}
        <div className="flex border-b border-[#27272A] -mx-4 px-4">
          <button
            onClick={() => setActiveTab('pitches')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-[13px] font-medium transition ${
              activeTab === 'pitches' ? 'text-white border-b-2 border-[#6366F1]' : 'text-[#636366]'
            }`}
          >
            <Grid3x3 className="w-4 h-4" /> Pitches
          </button>
          {isOwnProfile && (
            <>
              <button
                onClick={() => setActiveTab('drafts')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-[13px] font-medium transition ${
                  activeTab === 'drafts' ? 'text-white border-b-2 border-[#6366F1]' : 'text-[#636366]'
                }`}
              >
                Drafts
              </button>
              <button
                onClick={() => setActiveTab('saved')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-[13px] font-medium transition ${
                  activeTab === 'saved' ? 'text-white border-b-2 border-[#6366F1]' : 'text-[#636366]'
                }`}
              >
                <Bookmark className="w-4 h-4" /> Saved
              </button>
            </>
          )}
          {!isOwnProfile && (
            <>
              <button
                onClick={() => setActiveTab("demo")}
                className={`flex-1 flex items-center justify-center py-3 text-[13px] font-medium transition ${
                  activeTab === "demo" ? "text-white border-b-2 border-[#6366F1]" : "text-[#636366]"
                }`}
              >
                Demo
              </button>
              <button
                onClick={() => setActiveTab("about")}
                className={`flex-1 flex items-center justify-center py-3 text-[13px] font-medium transition ${
                  activeTab === "about" ? "text-white border-b-2 border-[#6366F1]" : "text-[#636366]"
                }`}
              >
                About
              </button>
            </>
          )}
        </div>

        {/* Saved Tab Sub-navigation */}
        {activeTab === 'saved' && isOwnProfile && (
          <div className="flex gap-2 py-3">
            <button
              onClick={() => setSavedTab('bookmarked')}
              className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition ${
                savedTab === 'bookmarked' ? 'bg-[#6366F1] text-white' : 'bg-[#18181B] text-[#8E8E93]'
              }`}
            >
              Bookmarked
            </button>
            <button
              onClick={() => setSavedTab('upvoted')}
              className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition ${
                savedTab === 'upvoted' ? 'bg-[#6366F1] text-white' : 'bg-[#18181B] text-[#8E8E93]'
              }`}
            >
              Upvoted
            </button>
          </div>
        )}

        {/* Content Display */}
        <div className="pt-3">
          {activeTab === 'drafts' ? (
            drafts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-[#8E8E93] mb-4 text-[14px]">No drafts yet</p>
                <button
                  onClick={() => navigate(createPageUrl('RecordPitch'))}
                  className="px-5 py-2.5 bg-[#6366F1] text-white text-[13px] font-semibold rounded-lg"
                >
                  Start a new pitch
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {drafts.map((draft) => (
                  <div key={draft.id} className="bg-[#18181B] border border-[#27272A] rounded-xl p-4">
                    <h3 className="text-white text-[15px] font-semibold mb-3">
                      {draft.startup_name || 'Untitled Pitch'}
                    </h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(createPageUrl('RecordPitch'))}
                        className="flex-1 py-2 bg-[#6366F1] text-white text-[13px] font-semibold rounded-lg"
                      >
                        Continue
                      </button>
                      <button
                        onClick={() => {
                          localStorage.removeItem('pitchDraft');
                          setDrafts([]);
                          toast.success('Draft deleted');
                        }}
                        className="px-4 py-2 bg-[#27272A] text-[#EF4444] text-[13px] font-semibold rounded-lg"
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
              <div className="grid grid-cols-4 gap-1">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="bg-[#18181B] rounded-lg animate-pulse" style={{ aspectRatio: '9/16' }} />
                ))}
              </div>
            ) : displayPitches.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-[#8E8E93] mb-4 text-[14px]">
                  {activeTab === 'pitches' ? "No pitches yet" : "No saved pitches yet"}
                </p>
                <button
                  onClick={() => navigate(activeTab === 'pitches' ? createPageUrl('RecordPitch') : createPageUrl('Explore'))}
                  className="px-5 py-2.5 bg-[#6366F1] text-white text-[13px] font-semibold rounded-lg"
                >
                  {activeTab === 'pitches' ? "Record your first pitch" : "Discover startups"}
                </button>
              </div>
            ) : (
              /* 4-COLUMN GRID - Matches Explore page */
              <div className="grid grid-cols-4 gap-1">
                {displayPitches.map((pitch) => (
                  <div key={pitch.id} className="relative group">
                    <button
                      onClick={() => setSelectedPitch(pitch)}
                      className="relative overflow-hidden w-full rounded-lg bg-[#18181B]"
                      style={{ aspectRatio: '9/16' }}
                    >
                      {pitch.thumbnail_url ? (
                        <img src={pitch.thumbnail_url} alt={pitch.startup_name} className="w-full h-full object-cover" />
                      ) : pitch.video_url ? (
                        <video src={pitch.video_url} className="w-full h-full object-cover" muted />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#6366F1] to-[#8B5CF6]">
                          <span className="text-white text-[18px] font-bold">{pitch.startup_name?.[0]?.toUpperCase()}</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      
                      {/* Bottom info */}
                      <div className="absolute bottom-1 left-1 right-1">
                        <div className="flex items-center gap-1 text-white/80 text-[10px]">
                          <Play className="w-2.5 h-2.5 fill-current" />
                          <span>{pitch.upvote_count || 0}</span>
                        </div>
                      </div>
                    </button>
                    
                    {/* Menu for own pitches */}
                    {isOwnProfile && activeTab === 'pitches' && (
                      <div className="absolute top-1 right-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowPitchMenu(showPitchMenu === pitch.id ? null : pitch.id);
                          }}
                          className="w-6 h-6 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreHorizontal className="w-3 h-3 text-white" />
                        </button>
                        {showPitchMenu === pitch.id && (
                          <div className="absolute top-7 right-0 bg-[#18181B] border border-[#27272A] rounded-lg shadow-xl min-w-[100px] z-10">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowPitchMenu(null);
                                setDeletingPitch(pitch);
                                setShowDeleteConfirm(true);
                              }}
                              className="w-full px-3 py-2 text-left text-[#EF4444] text-[12px] hover:bg-[#27272A] flex items-center gap-2"
                            >
                              <Trash2 className="w-3 h-3" /> Delete
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
            <div className="py-12 text-center">
              <Play className="w-10 h-10 text-[#636366] mx-auto mb-3" />
              <p className="text-[#71717A] text-[14px]">No demo video yet</p>
            </div>
          )}

          {/* About Tab */}
          {activeTab === "about" && (
            <div className="py-4 space-y-4">
              {profileUser?.bio && (
                <div className="p-4 bg-[#18181B] border border-[#27272A] rounded-xl">
                  <h4 className="text-[#71717A] text-[11px] uppercase tracking-wider mb-2">Bio</h4>
                  <p className="text-[#FAFAFA] text-[13px] leading-relaxed">{profileUser.bio}</p>
                </div>
              )}
              {profileUser?.website_url && (
                <div className="p-4 bg-[#18181B] border border-[#27272A] rounded-xl">
                  <h4 className="text-[#71717A] text-[11px] uppercase tracking-wider mb-2">Website</h4>
                  <a 
                    href={formatWebsiteUrl(profileUser.website_url)} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-[#6366F1] text-[13px] hover:underline flex items-center gap-1"
                  >
                    {displayWebsiteUrl(profileUser.website_url)}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
              {!profileUser?.bio && !profileUser?.website_url && (
                <p className="text-[#71717A] text-[14px] text-center py-8">No additional info available</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Team Modal */}
      {showTeamModal && (
        <div className="fixed inset-0 bg-black/80 flex items-end sm:items-center justify-center z-50" onClick={() => setShowTeamModal(false)}>
          <div className="bg-[#18181B] rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[70vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-[#27272A] flex items-center justify-between">
              <h3 className="text-white text-[16px] font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 text-[#6366F1]" /> Team
              </h3>
              <button onClick={() => setShowTeamModal(false)} className="text-[#8E8E93]">✕</button>
            </div>
            <div className="p-4 space-y-3">
              {teamMembers.map((member) => (
                <div key={member.id} className="flex items-center gap-3 p-3 bg-[#27272A] rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6366F1]/20 to-[#8B5CF6]/20 flex items-center justify-center overflow-hidden">
                    {member.photo_url ? (
                      <img src={member.photo_url} alt={member.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[#6366F1] font-semibold text-[14px]">{member.name?.[0]?.toUpperCase()}</span>
                    )}
                  </div>
                  <div>
                    <h4 className="text-white text-[14px] font-semibold">{member.name}</h4>
                    <p className="text-[#8E8E93] text-[12px]">{member.role}</p>
                    {member.bio && <p className="text-[#636366] text-[11px] mt-0.5">{member.bio}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Previous Startups Modal */}
      {showStartupsModal && (
        <div className="fixed inset-0 bg-black/80 flex items-end sm:items-center justify-center z-50" onClick={() => setShowStartupsModal(false)}>
          <div className="bg-[#18181B] rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[70vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-[#27272A] flex items-center justify-between">
              <h3 className="text-white text-[16px] font-semibold flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-[#6366F1]" /> Previous Startups
              </h3>
              <button onClick={() => setShowStartupsModal(false)} className="text-[#8E8E93]">✕</button>
            </div>
            <div className="p-4 space-y-3">
              {profileUser.previous_startups?.map((startup, index) => (
                <div key={index} className="p-3 bg-[#27272A] rounded-xl">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-white text-[14px] font-semibold">{startup.name}</h4>
                    <span className="text-[#636366] text-[12px]">{startup.year}</span>
                  </div>
                  <p className="text-[#8E8E93] text-[13px]">{startup.role}</p>
                  {startup.outcome && (
                    <p className="text-[#6366F1] text-[12px] mt-1">{startup.outcome}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && deletingPitch && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-6">
          <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-5 max-w-sm w-full">
            <h3 className="text-white text-[17px] font-bold mb-2">Delete this pitch?</h3>
            <p className="text-[#A1A1AA] text-[13px] mb-5">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeletingPitch(null); }}
                className="flex-1 py-2.5 bg-[#27272A] text-white text-[13px] font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={() => deletePitchMutation.mutate(deletingPitch.id)}
                disabled={deletePitchMutation.isPending}
                className="flex-1 py-2.5 bg-[#EF4444] text-white text-[13px] font-semibold rounded-xl disabled:opacity-50"
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

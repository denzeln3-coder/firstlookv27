import React, { useState, useMemo, useRef, useEffect, memo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import {
  Play,
  Search,
  Home,
  Compass,
  Video,
  Bookmark,
  User,
  LogIn,
  X,
  TrendingUp,
  Trophy,
  Calendar,
  Palette,
  Users,
  MessageCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { getPrefetchStrategy, shouldPrefetch } from '../components/VideoQualityAdapter';
import PitchModal from '../components/PitchModal';
import NotificationBell from '../components/NotificationBell';
import InstallPrompt from '../components/InstallPrompt';
import OnboardingTour from '../components/OnboardingTour';
import FeatureTooltip from '../components/FeatureTooltip';
import WelcomeCTA from '../components/WelcomeCTA';
import AIRecommendationCard from '../components/AIRecommendationCard';

/**
 * Small hook: debounced value (prevents "typing feels laggy")
 */
function useDebouncedValue(value, delay = 250) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);

  return debounced;
}

/**
 * PERFORMANCE PITCH CARD:
 * - Always show thumbnail first
 * - Only load/play video when in view
 * - Enhanced error logging
 */
// Network and screen detection for adaptive loading
function useNetworkInfo() {
  const [connection, setConnection] = useState(null);

  useEffect(() => {
    const nav = navigator;
    if (nav.connection) {
      setConnection(nav.connection);
      const updateConnection = () => setConnection({...nav.connection});
      nav.connection.addEventListener('change', updateConnection);
      return () => nav.connection.removeEventListener('change', updateConnection);
    }
  }, []);

  return connection;
}

const PitchCard = memo(function PitchCard({ pitch, index, onClick }) {
  const containerRef = useRef(null);
  const videoRef = useRef(null);

  const [inView, setInView] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const hasLoadedRef = useRef(false);
  const errorLoggedRef = useRef(false);

  const connection = useNetworkInfo();
  const isMobile = window.innerWidth < 768;
  const isSlowConnection = connection?.effectiveType === '3g';
  const canPrefetch = shouldPrefetch();
  const { prefetchCount } = getPrefetchStrategy();

  const hasVideo = !!(pitch.video_url && pitch.video_url.trim());
  const hasThumbnail = !!(pitch.thumbnail_url && pitch.thumbnail_url.trim());

  // Determine if video should load based on visibility and network-aware prefetch
  const shouldLoad = hasVideo && canPrefetch && (inView || index < prefetchCount);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
      },
      { threshold: 0.25, rootMargin: '200px' }
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    if (shouldLoad) {
      if (!hasLoadedRef.current) {
        hasLoadedRef.current = true;
        try {
          v.load();
        } catch (error) {
          console.error(`[Pitch ${pitch.id}] Load error:`, error);
          logVideoError('load_exception', error.message);
        }
      }

      v.play().catch((error) => {
        if (error.name !== "NotAllowedError" && error.name !== "AbortError") {
          console.warn(`[Pitch ${pitch.id}] Playback error:`, error.message);
          logVideoError('playback_error', error.message);
        }
      });
    } else {
      // Aggressive resource cleanup when out of view
      v.pause();
      v.currentTime = 0;
      // Unload video source to free memory
      if (hasLoadedRef.current && !inView) {
        v.src = '';
        hasLoadedRef.current = false;
        setVideoReady(false);
      }
    }
  }, [shouldLoad, pitch.id, inView]);

  const logVideoError = async (errorType, errorMessage) => {
    if (errorLoggedRef.current) return;
    errorLoggedRef.current = true;

    try {
      await base44.functions.invoke('logVideoError', {
        pitch_id: pitch.id,
        error_type: errorType,
        error_message: errorMessage,
        user_agent: navigator.userAgent,
        video_url: pitch.video_url
      });
    } catch (err) {
      console.error('Failed to log video error:', err);
      // Reset errorLoggedRef if logging failed, to allow a retry
      errorLoggedRef.current = false;
    }
  };

  const handleVideoError = (e) => {
    const video = e.currentTarget;
    const error = video.error;
    
    let errorMessage = 'Unknown error';
    let errorType = 'unknown';

    if (error) {
      switch (error.code) {
        case MediaError.MEDIA_ERR_ABORTED:
          errorType = 'aborted';
          errorMessage = 'Video loading aborted';
          break;
        case MediaError.MEDIA_ERR_NETWORK:
          errorType = 'network';
          errorMessage = 'Network error loading video';
          break;
        case MediaError.MEDIA_ERR_DECODE:
          errorType = 'decode';
          errorMessage = 'Video decoding failed';
          break;
        case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
          errorType = 'format_unsupported';
          errorMessage = 'Video format not supported';
          break;
        default:
          errorMessage = error.message || `MediaError Code: ${error.code}`;
          break;
      }
    }

    console.error(`[Pitch ${pitch.id}] Video error (${errorType}):`, errorMessage);
    logVideoError(errorType, errorMessage);
    setVideoReady(false);
  };

  return (
    <button
      ref={containerRef}
      data-pitch-id={pitch.id}
      onClick={onClick}
      className="relative overflow-hidden rounded-lg bg-[#18181B]"
      style={{ aspectRatio: '4/5', width: '100%' }}
    >
      {/* Base layer: thumbnail (fast) OR fallback initial */}
      {hasThumbnail ? (
        <img
          src={pitch.thumbnail_url}
          alt={pitch.startup_name}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#6366F1] to-[#8B5CF6]">
          <span className="text-white text-[32px] font-bold">
            {pitch.startup_name?.[0]?.toUpperCase() || '?'}
          </span>
        </div>
      )}

      {/* Video fades in on top when ready */}
      {hasVideo && (
        <video
          ref={videoRef}
          // Only attach src when we intend to load (reduces network pressure)
          src={shouldLoad ? pitch.video_url : undefined}
          poster={hasThumbnail ? pitch.thumbnail_url : undefined}
          loop
          muted
          playsInline
          preload={index < prefetchCount ? 'metadata' : 'none'}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
            videoReady ? 'opacity-100' : 'opacity-0'
          }`}
          onLoadedMetadata={() => setVideoReady(true)}
          onError={handleVideoError}
        />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

      <div className="absolute bottom-0 left-0 right-0 p-2 z-10">
        <p
          className="text-white text-[11px] font-semibold truncate mb-1"
          style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}
        >
          {pitch.startup_name}
        </p>
        <div className="flex items-center gap-1">
          <Play className="w-3 h-3 text-white fill-white" />
          <span className="text-white/90 text-[10px] font-medium">
            {pitch.upvote_count || 0}
          </span>
        </div>
      </div>
    </button>
  );
});

export default function Explore() {
  const navigate = useNavigate();

  const [selectedPitch, setSelectedPitch] = useState(null);

  const [showSearch, setShowSearch] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearchTerm = useDebouncedValue(searchInput, 250);

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStage, setSelectedStage] = useState('all');
  const [sortBy, setSortBy] = useState('trending');
  const [showFilters, setShowFilters] = useState(false);

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currentTooltip, setCurrentTooltip] = useState(null);
  const [showWelcomeCTA, setShowWelcomeCTA] = useState(false);

  const [searchHistory, setSearchHistory] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showAIRecommendations, setShowAIRecommendations] = useState(false);

  useEffect(() => {
    const hasCompletedOnboarding = localStorage.getItem('onboardingCompleted');
    if (!hasCompletedOnboarding) {
      setShowOnboarding(true);
    } else {
      const lastShownCTA = localStorage.getItem('lastWelcomeCTA');
      const daysSinceLastShown = lastShownCTA
        ? (Date.now() - parseInt(lastShownCTA, 10)) / (1000 * 60 * 60 * 24)
        : 999;

      if (daysSinceLastShown > 7) {
        setTimeout(() => setShowWelcomeCTA(true), 3000);
      }
    }

    try {
      const history = JSON.parse(localStorage.getItem('searchHistory') || '[]');
      setSearchHistory(history.slice(0, 5));
    } catch {
      setSearchHistory([]);
    }
  }, []);

  useEffect(() => {
    const v = debouncedSearchTerm.trim();
    if (v) {
      setShowSearchResults(true);
      const history = JSON.parse(localStorage.getItem('searchHistory') || '[]');
      const updated = [v, ...history.filter((h) => h !== v)].slice(0, 5);
      localStorage.setItem('searchHistory', JSON.stringify(updated));
      setSearchHistory(updated);
    } else {
      setShowSearchResults(false);
    }
  }, [debouncedSearchTerm]);

  const handleCompleteOnboarding = () => {
    localStorage.setItem('onboardingCompleted', 'true');
    setShowOnboarding(false);

    setTimeout(() => {
      const shownTooltips = JSON.parse(localStorage.getItem('shownTooltips') || '[]');
      if (!shownTooltips.includes('upvote')) {
        setCurrentTooltip('upvote');
      }
    }, 2000);
  };

  const handleDismissTooltip = () => {
    if (!currentTooltip) return;
    const shownTooltips = JSON.parse(localStorage.getItem('shownTooltips') || '[]');
    shownTooltips.push(currentTooltip);
    localStorage.setItem('shownTooltips', JSON.stringify(shownTooltips));
    setCurrentTooltip(null);
  };

  // Current user
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch {
        return null;
      }
    },
    staleTime: 60000,
    refetchOnWindowFocus: false
  });

  // ✅ IMPORTANT: Stop constant polling. Cache results for 60s.
  const { data: rawPitches = [], isLoading: pitchesLoading } = useQuery({
    queryKey: ['pitches'],
    queryFn: async () => {
      const allPitches = await base44.entities.Pitch.list('-created_date');
      const published = allPitches.filter((p) => {
        const isPublished = p.is_published === true;
        const isApproved = p.review_status === 'approved';
        const hasVideo = p.video_url && p.video_url.trim() !== '';
        return isPublished && isApproved && hasVideo;
      });

      // Hard cap to keep DOM + videos light (tune as needed)
      return published.slice(0, 90);
    },
    staleTime: 60000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchInterval: false
  });

  const { data: unreadMessagesCount = 0 } = useQuery({
    queryKey: ['unreadMessages', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const messages = await base44.entities.Message.filter({
        recipient_id: user.id,
        is_read: false
      });
      return messages.length;
    },
    enabled: !!user,
    staleTime: 15000,
    refetchOnWindowFocus: false,
    refetchInterval: 30000
  });

  const { data: followingList = [] } = useQuery({
    queryKey: ['followingList', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const follows = await base44.entities.Follow.filter({ follower_id: user.id });
      return follows.map((f) => f.following_id);
    },
    enabled: !!user && sortBy === 'following',
    staleTime: 60000,
    refetchOnWindowFocus: false
  });

  const { data: sponsoredContent = [] } = useQuery({
    queryKey: ['sponsoredContent'],
    queryFn: async () => {
      try {
        const now = new Date().toISOString();
        const allSponsored = await base44.entities.SponsoredContent.filter({ is_active: true });
        return allSponsored.filter((s) => s.start_date <= now && s.end_date >= now);
      } catch {
        return [];
      }
    },
    enabled: false, // Disabled to improve performance
    staleTime: 60000,
    refetchOnWindowFocus: false
  });

  const { data: activeInvestorsCount = 0 } = useQuery({
    queryKey: ['activeInvestors'],
    queryFn: async () => {
      try {
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);
        const actions = await base44.entities.InvestorAction.list();
        const recentActions = actions.filter((a) => new Date(a.created_date) >= oneDayAgo);
        return new Set(recentActions.map((a) => a.investor_id)).size;
      } catch {
        return 0;
      }
    },
    enabled: false, // Disabled to improve performance
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const isLoading = pitchesLoading;

  // ✅ CHEAPER scoring: recency + upvotes only (no pulling huge views/comments tables)
  const pitches = useMemo(() => {
    if (!rawPitches.length) return [];

    let filtered = rawPitches;

    if (sortBy === 'following' && followingList.length > 0) {
      filtered = rawPitches.filter((p) => followingList.includes(p.founder_id));
    }

    const now = Date.now();

    const withScore = filtered.map((pitch) => {
      const upvotes = pitch.upvote_count || 0;
      const createdTime = new Date(pitch.created_date).getTime();
      const hoursSince = Math.max(0, (now - createdTime) / (1000 * 60 * 60));

      const engagementScore = upvotes * 3;
      const trendingScore = engagementScore / Math.pow(hoursSince + 2, 1.25);

      return { ...pitch, trendingScore };
    });

    if (sortBy === 'newest' || sortBy === 'following') {
      return withScore.sort(
        (a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime()
      );
    }
    if (sortBy === 'top') {
      return withScore.sort((a, b) => (b.upvote_count || 0) - (a.upvote_count || 0));
    }
    return withScore.sort((a, b) => b.trendingScore - a.trendingScore);
  }, [rawPitches, sortBy, followingList]);

  const filteredPitches = useMemo(() => {
    let list = pitches;

    if (selectedCategory !== 'all') {
      list = list.filter((p) => p.category === selectedCategory);
    }

    if (selectedStage !== 'all') {
      list = list.filter((p) => p.product_stage === selectedStage);
    }

    const term = debouncedSearchTerm.trim().toLowerCase();
    if (term) {
      list = list.filter((p) => {
        return (
          p.startup_name?.toLowerCase().includes(term) ||
          p.one_liner?.toLowerCase().includes(term) ||
          p.what_problem_do_you_solve?.toLowerCase().includes(term)
        );
      });
    }

    return list;
  }, [pitches, selectedCategory, selectedStage, debouncedSearchTerm]);

  const getPitchesWithSponsored = useMemo(() => {
    if (!sponsoredContent.length) return filteredPitches;

    const result = [...filteredPitches];
    let sponsorIndex = 0;

    for (let i = 9; i < result.length && sponsorIndex < sponsoredContent.length; i += 10) {
      const sponsored = sponsoredContent[sponsorIndex];
      const sponsoredPitch = pitches.find((p) => p.id === sponsored.pitch_id);
      if (sponsoredPitch) {
        result.splice(i, 0, { ...sponsoredPitch, isSponsored: true, sponsoredId: sponsored.id });
      }
      sponsorIndex++;
    }

    return result;
  }, [filteredPitches, sponsoredContent, pitches]);

  const handlePitchClick = async (pitch) => {
    if (pitch.isSponsored && pitch.sponsoredId) {
      try {
        const sponsored = sponsoredContent.find((s) => s.id === pitch.sponsoredId);
        if (sponsored) {
          await base44.entities.SponsoredContent.update(pitch.sponsoredId, {
            clicks: (sponsored.clicks || 0) + 1
          });
        }
      } catch {}
    }
    setSelectedPitch(pitch);
  };

  const clearSearchHistory = (item) => {
    const updated = searchHistory.filter((h) => h !== item);
    localStorage.setItem('searchHistory', JSON.stringify(updated));
    setSearchHistory(updated);
  };

  const handleRecordPitch = async () => {
    const isAuthenticated = await base44.auth.isAuthenticated();
    if (!isAuthenticated) {
      base44.auth.redirectToLogin(window.location.pathname);
    } else {
      navigate(createPageUrl('RecordPitch'));
    }
  };

  return (
    <div className="min-h-screen bg-[#000000] w-full pb-20">
      <div className="fixed top-0 left-0 right-0 bg-[#000000]/95 backdrop-blur-lg z-20 border-b border-[rgba(255,255,255,0.06)]">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex flex-col">
            <h1 className="brand-title text-[26px]">
              <span className="text-white">First</span>
              <span className="highlight">Look</span>
            </h1>
            <span className="text-[10px] text-[#636366] tracking-wide -mt-1">
              15-second pitches. Zero fluff.
            </span>
          </div>

          <div className="flex items-center gap-2 lg:gap-3">
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="w-9 h-9 rounded-full bg-[rgba(255,255,255,0.06)] flex items-center justify-center text-[#8E8E93] hover:text-[#FFFFFF] hover:bg-[rgba(255,255,255,0.1)] transition-all duration-200"
            >
              <Search className="w-4 h-4" />
            </button>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="w-9 h-9 rounded-full bg-[rgba(255,255,255,0.06)] flex items-center justify-center text-[#8E8E93] hover:text-[#FFFFFF] hover:bg-[rgba(255,255,255,0.1)] transition-all duration-200"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
            </button>

            <NotificationBell />

            {user && (
              <button
                onClick={() => navigate(createPageUrl('Messages'))}
                className="relative w-9 h-9 rounded-full bg-[rgba(255,255,255,0.06)] flex items-center justify-center text-[#8E8E93] hover:text-[#FFFFFF] hover:bg-[rgba(255,255,255,0.1)] transition-all duration-200"
              >
                <MessageCircle className="w-4 h-4" />
                {unreadMessagesCount > 0 && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#EF4444] rounded-full flex items-center justify-center">
                    <span className="text-white text-[9px] font-bold">
                      {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                    </span>
                  </div>
                )}
              </button>
            )}

            {user ? (
              <>
                {user.role === 'admin' && (
                  <div className="hidden lg:flex items-center gap-2">
                    <button
                      onClick={() => navigate(createPageUrl('AdminReview'))}
                      className="px-3 py-2 bg-[#FBBF24] text-[#000000] text-[12px] font-semibold rounded-xl hover:brightness-110 transition-all duration-200"
                    >
                      Review Queue
                    </button>
                    <button
                      onClick={() => navigate(createPageUrl('AdminVideoLibrary'))}
                      className="px-3 py-2 bg-[#8B5CF6] text-white text-[12px] font-semibold rounded-xl hover:brightness-110 transition-all duration-200"
                    >
                      Videos
                    </button>
                    <button
                      onClick={() => navigate(createPageUrl('AdminReports'))}
                      className="px-3 py-2 bg-[#EF4444] text-white text-[12px] font-semibold rounded-xl hover:brightness-110 transition-all duration-200"
                    >
                      Reports
                    </button>
                    <button
                      onClick={() => navigate(createPageUrl('AdminEducators'))}
                      className="px-3 py-2 bg-[#6366F1] text-white text-[12px] font-semibold rounded-xl hover:brightness-110 transition-all duration-200"
                    >
                      Educators
                    </button>
                  </div>
                )}

                <button
                  onClick={() => navigate(createPageUrl('CreatorStudio'))}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-[rgba(255,255,255,0.06)] text-white text-[12px] font-semibold rounded-xl hover:bg-[rgba(255,255,255,0.1)] transition-all duration-200 whitespace-nowrap"
                >
                  <Palette className="w-4 h-4" />
                  <span>Studio</span>
                </button>

                <button
                  onClick={handleRecordPitch}
                  className="flex items-center justify-center gap-1.5 px-2 sm:px-3 py-2 bg-gradient-to-r from-[#6366F1] via-[#8B5CF6] to-[#A855F7] text-white text-[12px] font-semibold rounded-xl hover:brightness-110 transition-all duration-200 shadow-[0_4px_20px_rgba(99,102,241,0.4)] whitespace-nowrap"
                >
                  <Video className="w-4 h-4" />
                  <span className="hidden sm:inline">Record</span>
                </button>

                <button
                  onClick={() => navigate(createPageUrl('Profile'))}
                  className="w-9 h-9 rounded-full bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center text-white font-semibold hover:brightness-110 transition-all duration-200 border-2 border-[rgba(255,255,255,0.1)] shadow-[0_2px_8px_rgba(0,0,0,0.3)] flex-shrink-0"
                >
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <span className="text-sm">
                      {(user.display_name || user.full_name || user.email)?.[0]?.toUpperCase()}
                    </span>
                  )}
                </button>
              </>
            ) : (
              <button
                onClick={() => base44.auth.redirectToLogin(window.location.pathname)}
                className="flex items-center gap-2 px-3 sm:px-5 py-2.5 bg-gradient-to-r from-[#6366F1] via-[#8B5CF6] to-[#A855F7] text-white text-[13px] font-semibold rounded-xl hover:brightness-110 transition-all duration-200 shadow-[0_4px_20px_rgba(99,102,241,0.4)]"
              >
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline">Log In</span>
              </button>
            )}
          </div>
        </div>

        {showSearch && (
          <div className="px-4 py-3 border-t border-[rgba(255,255,255,0.06)]">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#636366]" />
              <input
                type="text"
                placeholder="Search startups..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                autoFocus
                className="w-full pl-11 pr-10 py-3 bg-[#1C1C1E] text-[#FFFFFF] text-[14px] border border-[rgba(255,255,255,0.06)] rounded-xl focus:outline-none focus:border-[#6366F1] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)] placeholder:text-[#636366] transition-all duration-200"
              />
              <button
                onClick={() => {
                  setShowSearch(false);
                  setSearchInput('');
                  setShowSearchResults(false);
                  setSelectedCategory('all');
                  setSelectedStage('all');
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[rgba(255,255,255,0.1)] flex items-center justify-center text-[#8E8E93] hover:text-[#FFFFFF] hover:bg-[rgba(255,255,255,0.15)] transition-all duration-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {!debouncedSearchTerm && searchHistory.length > 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-[#636366] text-[11px] font-semibold uppercase tracking-wide">
                  Recent Searches
                </p>
                {searchHistory.map((item, i) => (
                  <div key={i} className="flex items-center justify-between group">
                    <button
                      onClick={() => setSearchInput(item)}
                      className="flex-1 text-left px-3 py-2 text-[#8E8E93] hover:text-white text-sm rounded-lg hover:bg-[rgba(255,255,255,0.05)] transition"
                    >
                      {item}
                    </button>
                    <button
                      onClick={() => clearSearchHistory(item)}
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[#636366] hover:text-white hover:bg-[rgba(255,255,255,0.1)] transition opacity-0 group-hover:opacity-100"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="px-4 py-3 border-t border-[rgba(255,255,255,0.06)] overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            {[
              { id: 'trending', label: 'Trending', icon: TrendingUp },
              { id: 'newest', label: 'Newest', icon: Calendar },
              { id: 'top', label: 'Top Rated', icon: Trophy },
              ...(user ? [{ id: 'following', label: 'Following', icon: Users }] : [])
            ].map((sort) => {
              const Icon = sort.icon;
              return (
                <button
                  key={sort.id}
                  onClick={() => setSortBy(sort.id)}
                  className={`filter-pill flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-semibold tracking-[0.02em] whitespace-nowrap ${
                    sortBy === sort.id
                      ? 'active text-white'
                      : 'bg-[rgba(255,255,255,0.04)] text-[#8E8E93]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {sort.label}
                </button>
              );
            })}
          </div>
        </div>

        {showFilters && (
          <div className="px-4 py-4 border-t border-[rgba(255,255,255,0.06)]">
            <div className="space-y-4">
              <div>
                <label className="block text-[#8E8E93] text-[11px] font-semibold tracking-[0.08em] uppercase mb-2">
                  Category
                </label>
                <div className="flex flex-wrap gap-2">
                  {['all', 'AI/ML', 'SaaS', 'Consumer', 'Fintech', 'Health', 'E-commerce', 'Developer Tools', 'Other'].map(
                    (cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`filter-pill px-3 py-1.5 rounded-full text-[12px] font-medium tracking-[0.02em] ${
                          selectedCategory === cat
                            ? 'active text-white'
                            : 'bg-[rgba(255,255,255,0.04)] text-[#8E8E93]'
                        }`}
                      >
                        {cat === 'all' ? 'All Categories' : cat}
                      </button>
                    )
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[#8E8E93] text-[11px] font-semibold tracking-[0.08em] uppercase mb-2">
                  Product Stage
                </label>
                <div className="flex flex-wrap gap-2">
                  {['all', 'MVP', 'Beta', 'Launched', 'Scaling'].map((stage) => (
                    <button
                      key={stage}
                      onClick={() => setSelectedStage(stage)}
                      className={`filter-pill px-3 py-1.5 rounded-full text-[12px] font-medium tracking-[0.02em] ${
                        selectedStage === stage
                          ? 'active text-white'
                          : 'bg-[rgba(255,255,255,0.04)] text-[#8E8E93]'
                      }`}
                    >
                      {stage === 'all' ? 'All Stages' : stage}
                    </button>
                  ))}
                </div>
              </div>

              {(selectedCategory !== 'all' || selectedStage !== 'all') && (
                <button
                  onClick={() => {
                    setSelectedCategory('all');
                    setSelectedStage('all');
                  }}
                  className="text-[#6366F1] hover:text-[#818CF8] text-[12px] font-semibold transition-colors duration-200"
                >
                  Clear all filters
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {showSearch && showSearchResults && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => {
            setShowSearchResults(false);
            setShowSearch(false);
            setSearchInput('');
          }}
        />
      )}

      <div className={showFilters ? 'pt-72' : 'pt-44'}>
        <div className="px-4 mb-4">
          {activeInvestorsCount > 0 && (
            <div className="mb-4 p-3 bg-gradient-to-r from-[#6366F1]/10 to-[#8B5CF6]/10 border border-[#6366F1]/20 rounded-xl flex items-center justify-center gap-2">
              <span className="text-lg">👀</span>
              <span className="text-white text-sm font-medium">
                {activeInvestorsCount} investor{activeInvestorsCount !== 1 ? 's' : ''} active today
              </span>
            </div>
          )}
          {user && showWelcomeCTA && (
            <WelcomeCTA
              onDismiss={() => {
                setShowWelcomeCTA(false);
                localStorage.setItem('lastWelcomeCTA', Date.now().toString());
              }}
            />
          )}
          {user && !showAIRecommendations && (
            <div className="relative mb-4 p-6 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-xl">
              <div className="flex items-center justify-center">
                <p className="text-white text-xl font-bold">Personalized For You - Coming Soon</p>
              </div>
            </div>
          )}
          {user && showAIRecommendations && <AIRecommendationCard />}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-1 px-1">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="skeleton rounded-lg" style={{ aspectRatio: '4/5', width: '100%' }} />
            ))}
          </div>
        ) : filteredPitches.length === 0 ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center px-6">
              <div className="w-20 h-20 rounded-full bg-[rgba(99,102,241,0.1)] flex items-center justify-center mx-auto mb-4">
                <Search className="w-10 h-10 text-[#6366F1]" />
              </div>
              <h3 className="text-white text-[18px] font-semibold mb-2">No startups found</h3>
              <p className="text-[#8E8E93] text-[14px] mb-6">Try adjusting your search or filters</p>
              <button
                onClick={() => {
                  setSearchInput('');
                  setShowSearch(false);
                }}
                className="px-6 py-3 bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white text-[14px] font-semibold rounded-xl hover:brightness-110 transition-all duration-200 shadow-[0_4px_20px_rgba(99,102,241,0.3)]"
              >
                Clear search
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-1 px-1">
            {getPitchesWithSponsored.map((pitch, index) => (
              <div key={pitch.isSponsored ? `sponsored-${pitch.id}-${index}` : pitch.id} className="relative">
                {pitch.isSponsored && (
                  <div className="absolute top-2 left-2 z-10 px-2 py-0.5 bg-[#F59E0B] text-black text-[9px] font-bold rounded-full">
                    SPONSORED
                  </div>
                )}
                <PitchCard pitch={pitch} index={index} onClick={() => handlePitchClick(pitch)} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div
        className="fixed bottom-0 left-0 right-0 bg-[#000000]/95 backdrop-blur-lg border-t border-[rgba(255,255,255,0.06)] z-50"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 8px)' }}
      >
        <div className="flex items-center justify-around py-2 px-4">
          <button onClick={() => navigate(createPageUrl('Explore'))} className="flex flex-col items-center gap-1 min-h-[44px] justify-center">
            <div className="w-8 h-8 rounded-full bg-[rgba(99,102,241,0.15)] flex items-center justify-center">
              <Home className="w-5 h-5 text-[#6366F1]" />
            </div>
            <span className="text-[10px] font-semibold tracking-[0.04em] uppercase text-[#6366F1]">Home</span>
          </button>

          <button onClick={() => navigate(createPageUrl('Discover'))} className="flex flex-col items-center gap-1 text-[#71717A] hover:text-[#FFFFFF] transition-colors duration-200 min-h-[44px] justify-center">
            <Compass className="w-6 h-6" />
            <span className="text-[10px] font-semibold tracking-[0.04em] uppercase">Discover</span>
          </button>

          <button onClick={handleRecordPitch} className="flex flex-col items-center gap-1 -mt-4 min-h-[44px] justify-center">
            <div className="w-14 h-14 rounded-full bg-gradient-to-r from-[#6366F1] via-[#8B5CF6] to-[#A855F7] flex items-center justify-center shadow-[0_4px_20px_rgba(99,102,241,0.5)]">
              <Video className="w-6 h-6 text-white" />
            </div>
          </button>

          {user ? (
            <button onClick={() => navigate(createPageUrl('Messages'))} className="relative flex flex-col items-center gap-1 text-[#71717A] hover:text-[#FFFFFF] transition-colors duration-200 min-h-[44px] justify-center">
              <MessageCircle className="w-6 h-6" />
              {unreadMessagesCount > 0 && (
                <div className="absolute top-0 right-2 w-4 h-4 bg-[#EF4444] rounded-full flex items-center justify-center">
                  <span className="text-white text-[9px] font-bold">{unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}</span>
                </div>
              )}
              <span className="text-[10px] font-semibold tracking-[0.04em] uppercase">Messages</span>
            </button>
          ) : (
            <button onClick={() => navigate(createPageUrl('Saved'))} className="flex flex-col items-center gap-1 text-[#71717A] hover:text-[#FFFFFF] transition-colors duration-200 min-h-[44px] justify-center">
              <Bookmark className="w-6 h-6" />
              <span className="text-[10px] font-semibold tracking-[0.04em] uppercase">Saved</span>
            </button>
          )}

          <button
            onClick={() => {
              if (user) navigate(createPageUrl('Profile'));
              else base44.auth.redirectToLogin(window.location.pathname);
            }}
            className="flex flex-col items-center gap-1 text-[#71717A] hover:text-[#FFFFFF] transition-colors duration-200 min-h-[44px] justify-center"
          >
            <User className="w-6 h-6" />
            <span className="text-[10px] font-semibold tracking-[0.04em] uppercase">Profile</span>
          </button>
        </div>
      </div>

      {selectedPitch && <PitchModal pitch={selectedPitch} onClose={() => setSelectedPitch(null)} />}

      <InstallPrompt />

      {showOnboarding && <OnboardingTour onComplete={handleCompleteOnboarding} />}

      {currentTooltip && <FeatureTooltip feature={currentTooltip} onDismiss={handleDismissTooltip} />}
    </div>
  );
}
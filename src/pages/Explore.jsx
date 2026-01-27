import React, { useState, useMemo, useRef, useEffect, memo } from 'react';
import { supabase } from '@/lib/supabase';
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
  MessageCircle,
  Target
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import PitchModal from '../components/PitchModal';
import NotificationBell from '../components/NotificationBell';

// Safe dynamic imports
let InstallPrompt, OnboardingTour, FeatureTooltip, WelcomeCTA, AIRecommendationCard;
try { InstallPrompt = require('../components/InstallPrompt').default; } catch { InstallPrompt = () => null; }
try { OnboardingTour = require('../components/OnboardingTour').default; } catch { OnboardingTour = () => null; }
try { FeatureTooltip = require('../components/FeatureTooltip').default; } catch { FeatureTooltip = () => null; }
try { WelcomeCTA = require('../components/WelcomeCTA').default; } catch { WelcomeCTA = () => null; }
try { AIRecommendationCard = require('../components/AIRecommendationCard').default; } catch { AIRecommendationCard = () => null; }

function useDebouncedValue(value, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function getPrefetchStrategy() {
  const connection = navigator.connection;
  if (connection) {
    if (connection.saveData) return { prefetchCount: 2 };
    if (connection.effectiveType === '4g') return { prefetchCount: 6 };
    if (connection.effectiveType === '3g') return { prefetchCount: 3 };
    return { prefetchCount: 2 };
  }
  return { prefetchCount: 4 };
}

function shouldPrefetch() {
  const connection = navigator.connection;
  if (connection?.saveData) return false;
  return true;
}

const PitchCard = memo(function PitchCard({ pitch, index, onClick }) {
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const [inView, setInView] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const hasLoadedRef = useRef(false);

  const canPrefetch = shouldPrefetch();
  const { prefetchCount } = getPrefetchStrategy();

  const hasVideo = !!(pitch.video_url && pitch.video_url.trim() && !videoError);
  const hasThumbnail = !!(pitch.thumbnail_url && pitch.thumbnail_url.trim());
  const shouldLoad = hasVideo && canPrefetch && (inView || index < prefetchCount);
  
  const displayName = pitch.startup_name || pitch.name || 'Untitled';

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.25, rootMargin: '200px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !hasVideo) return;

    if (shouldLoad) {
      if (!hasLoadedRef.current) {
        hasLoadedRef.current = true;
        try { v.load(); } catch (error) { console.error(`[Pitch ${pitch.id}] Load error:`, error); }
      }
      v.play().catch((error) => {
        if (error.name !== "NotAllowedError" && error.name !== "AbortError") {
          console.warn(`[Pitch ${pitch.id}] Playback error:`, error.message);
        }
      });
    } else {
      v.pause();
    }
  }, [shouldLoad, pitch.id, hasVideo]);

  const handleVideoError = () => {
    console.error(`[Pitch ${pitch.id}] Video error`);
    setVideoError(true);
    setVideoReady(false);
  };

  return (
    <button
      ref={containerRef}
      data-pitch-id={pitch.id}
      onClick={onClick}
      className="relative overflow-hidden rounded-sm bg-[#18181B] transition-all duration-200 hover:scale-[1.02] hover:brightness-110 hover:z-10 w-full"
    >
      <div className="relative w-full" style={{ paddingBottom: '125%' }}>
        {hasThumbnail ? (
          <img
            src={pitch.thumbnail_url}
            alt={displayName}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#6366F1] to-[#8B5CF6]">
            <span className="text-white text-[28px] font-bold">
              {displayName[0]?.toUpperCase() || '?'}
            </span>
          </div>
        )}

        {hasVideo && (
          <video
            ref={videoRef}
            src={shouldLoad ? pitch.video_url : undefined}
            poster={hasThumbnail ? pitch.thumbnail_url : undefined}
            loop
            muted
            playsInline
            preload={index < prefetchCount ? 'metadata' : 'none'}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${videoReady ? 'opacity-100' : 'opacity-0'}`}
            onLoadedMetadata={() => setVideoReady(true)}
            onError={handleVideoError}
          />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none" />

        <div className="absolute bottom-0 left-0 right-0 p-3 z-10">
          <p className="text-white text-[13px] font-semibold truncate mb-1 drop-shadow-lg">
            {displayName}
          </p>
          <div className="flex items-center gap-1.5">
            <Play className="w-3 h-3 text-white/80 fill-white/80" />
            <span className="text-white/70 text-[11px] font-medium">{pitch.view_count || 0}</span>
          </div>
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

  useEffect(() => {
    const hasCompletedOnboarding = localStorage.getItem('onboardingCompleted');
    if (!hasCompletedOnboarding) {
      setShowOnboarding(true);
    } else {
      const lastShownCTA = localStorage.getItem('lastWelcomeCTA');
      const daysSinceLastShown = lastShownCTA ? (Date.now() - parseInt(lastShownCTA, 10)) / (1000 * 60 * 60 * 24) : 999;
      if (daysSinceLastShown > 7) {
        setTimeout(() => setShowWelcomeCTA(true), 3000);
      }
    }
    try {
      const history = JSON.parse(localStorage.getItem('searchHistory') || '[]');
      setSearchHistory(history.slice(0, 5));
    } catch { setSearchHistory([]); }
  }, []);

  useEffect(() => {
    const v = debouncedSearchTerm.trim();
    if (v) {
      const history = JSON.parse(localStorage.getItem('searchHistory') || '[]');
      const updated = [v, ...history.filter((h) => h !== v)].slice(0, 5);
      localStorage.setItem('searchHistory', JSON.stringify(updated));
      setSearchHistory(updated);
    }
  }, [debouncedSearchTerm]);

  const handleCompleteOnboarding = () => {
    localStorage.setItem('onboardingCompleted', 'true');
    setShowOnboarding(false);
  };

  const handleDismissTooltip = () => {
    if (!currentTooltip) return;
    const shownTooltips = JSON.parse(localStorage.getItem('shownTooltips') || '[]');
    shownTooltips.push(currentTooltip);
    localStorage.setItem('shownTooltips', JSON.stringify(shownTooltips));
    setCurrentTooltip(null);
  };

  // Fetch user with user_type for role-based UI
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          const { data: profile } = await supabase.from('users').select('*').eq('id', authUser.id).single();
          return { ...authUser, ...profile };
        }
        return null;
      } catch { return null; }
    },
    staleTime: 60000,
    refetchOnWindowFocus: false
  });

  // Role-based permissions
  const isFounder = user?.user_type === 'founder';
  const isInvestor = user?.user_type === 'investor';
  const isHunter = user?.user_type === 'hunter';

  const { data: rawPitches = [], isLoading: pitchesLoading } = useQuery({
    queryKey: ['pitches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('startups')
        .select('*')
        .eq('is_published', true)
        .eq('review_status', 'approved')
        .not('video_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(90);
      
      if (error) {
        console.error('Error fetching startups:', error);
        return [];
      }
      return data || [];
    },
    staleTime: 60000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchInterval: false
  });

  // FIXED: Query direct_messages table with correct column names
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

  const { data: followingList = [] } = useQuery({
    queryKey: ['followingList', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);
      return error ? [] : (data || []).map((f) => f.following_id);
    },
    enabled: !!user && sortBy === 'following',
    staleTime: 60000,
    refetchOnWindowFocus: false
  });

  const isLoading = pitchesLoading;

  const filteredPitches = useMemo(() => {
    if (!rawPitches.length) return [];
    
    let list = [...rawPitches];
    
    if (selectedCategory !== 'all') {
      list = list.filter((p) => p.category === selectedCategory);
    }
    
    if (selectedStage !== 'all') {
      list = list.filter((p) => p.product_stage === selectedStage);
    }
    
    const term = debouncedSearchTerm.trim().toLowerCase();
    if (term) {
      list = list.filter((p) => {
        return (p.startup_name || p.name || '').toLowerCase().includes(term) ||
               (p.one_liner || '').toLowerCase().includes(term);
      });
    }
    
    if (sortBy === 'following') {
      if (user && followingList.length > 0) {
        list = list.filter((p) => followingList.includes(p.founder_id));
      } else {
        return [];
      }
    }
    
    const now = Date.now();
    switch (sortBy) {
      case 'newest':
        list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'top':
        list.sort((a, b) => (b.upvote_count || 0) - (a.upvote_count || 0));
        break;
      case 'following':
        list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'trending':
      default:
        list.sort((a, b) => {
          const aUpvotes = a.upvote_count || 0;
          const bUpvotes = b.upvote_count || 0;
          const aTime = new Date(a.created_at).getTime();
          const bTime = new Date(b.created_at).getTime();
          const aHours = Math.max(0, (now - aTime) / (1000 * 60 * 60));
          const bHours = Math.max(0, (now - bTime) / (1000 * 60 * 60));
          const aScore = (aUpvotes * 3) / Math.pow(aHours + 2, 1.25);
          const bScore = (bUpvotes * 3) / Math.pow(bHours + 2, 1.25);
          return bScore - aScore;
        });
        break;
    }
    
    return list;
  }, [rawPitches, selectedCategory, selectedStage, debouncedSearchTerm, sortBy, user, followingList]);

  const handlePitchClick = (pitch) => setSelectedPitch(pitch);

  const clearSearchHistory = (item) => {
    const updated = searchHistory.filter((h) => h !== item);
    localStorage.setItem('searchHistory', JSON.stringify(updated));
    setSearchHistory(updated);
  };

  const handleRecordPitch = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      navigate('/login');
    } else {
      navigate(createPageUrl('RecordPitch'));
    }
  };

  // Navigate to appropriate page based on user type for center button
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
      // Hunters go to HunterDashboard
      navigate(createPageUrl('HunterDashboard'));
    } else {
      // Fallback for users without a type set
      navigate(createPageUrl('Settings'));
    }
  };

  return (
    <div className="min-h-screen bg-[#000000] w-full pb-20">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 bg-[#000000]/95 backdrop-blur-lg z-20 border-b border-[rgba(255,255,255,0.06)]">
        <div className="px-4 py-3 flex items-center justify-between">
          <h1 className="text-[22px] font-bold">
            <span className="text-white">First</span>
            <span className="text-[#8B5CF6]">Look</span>
          </h1>

          <div className="flex items-center gap-2">
            <button onClick={() => setShowSearch(!showSearch)} className="p-2 rounded-full bg-[rgba(255,255,255,0.06)] text-[#8E8E93] hover:text-white transition-colors">
              <Search className="w-4 h-4" />
            </button>

            <button onClick={() => setShowFilters(!showFilters)} className="p-2 rounded-full bg-[rgba(255,255,255,0.06)] text-[#8E8E93] hover:text-white transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </button>

            <NotificationBell />

            {user && (
              <button onClick={() => navigate(createPageUrl('Messages'))} className="relative p-2 rounded-full bg-[rgba(255,255,255,0.06)] text-[#8E8E93] hover:text-white transition-colors">
                <MessageCircle className="w-4 h-4" />
                {unreadMessagesCount > 0 && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#EF4444] rounded-full flex items-center justify-center">
                    <span className="text-white text-[9px] font-bold">{unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}</span>
                  </div>
                )}
              </button>
            )}

            {user ? (
              <>
                {/* Only show Studio button for founders */}
                {isFounder && (
                  <button onClick={() => navigate(createPageUrl('CreatorStudio'))} className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-[rgba(255,255,255,0.06)] text-white text-[12px] font-semibold rounded-xl hover:bg-[rgba(255,255,255,0.1)] transition-all duration-200">
                    <Palette className="w-4 h-4" />
                    <span>Studio</span>
                  </button>
                )}

                {/* Show Record button for founders, Deal Flow for investors, Hunt for hunters */}
                {isFounder ? (
                  <button onClick={handleRecordPitch} className="flex items-center gap-1.5 px-3 py-2 bg-[#8B5CF6] text-white text-[12px] font-semibold rounded-xl hover:bg-[#9D6FFF] transition-all duration-200">
                    <Video className="w-4 h-4" />
                    <span className="hidden sm:inline">Record</span>
                  </button>
                ) : isInvestor ? (
                  <button onClick={() => navigate(createPageUrl('InvestorDashboard'))} className="flex items-center gap-1.5 px-3 py-2 bg-[#10B981] text-white text-[12px] font-semibold rounded-xl hover:bg-[#059669] transition-all duration-200">
                    <TrendingUp className="w-4 h-4" />
                    <span className="hidden sm:inline">Deal Flow</span>
                  </button>
                ) : isHunter ? (
                  <button onClick={() => navigate(createPageUrl('HunterDashboard'))} className="flex items-center gap-1.5 px-3 py-2 bg-[#F59E0B] text-white text-[12px] font-semibold rounded-xl hover:bg-[#D97706] transition-all duration-200">
                    <Target className="w-4 h-4" />
                    <span className="hidden sm:inline">Hunt</span>
                  </button>
                ) : null}

                <button onClick={() => navigate(createPageUrl('Profile'))} className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center text-white font-semibold hover:brightness-110 transition-all duration-200 overflow-hidden">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs">{(user.display_name || user.full_name || user.email)?.[0]?.toUpperCase()}</span>
                  )}
                </button>
              </>
            ) : (
              <button onClick={() => navigate('/login')} className="flex items-center gap-2 px-4 py-2 bg-[#8B5CF6] text-white text-[13px] font-semibold rounded-xl hover:bg-[#9D6FFF] transition-all duration-200">
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline">Log In</span>
              </button>
            )}
          </div>
        </div>

        {/* Search */}
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
                className="w-full pl-11 pr-10 py-3 bg-[#1C1C1E] text-white border border-[rgba(255,255,255,0.1)] rounded-xl focus:outline-none focus:border-[#6366F1]"
              />
              <button onClick={() => { setShowSearch(false); setSearchInput(''); }} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-[rgba(255,255,255,0.1)]">
                <X className="w-3.5 h-3.5 text-[#8E8E93]" />
              </button>
            </div>

            {!debouncedSearchTerm && searchHistory.length > 0 && (
              <div className="mt-3 space-y-1">
                <p className="text-[#636366] text-[11px] font-semibold uppercase tracking-wide px-1">Recent</p>
                {searchHistory.map((item, i) => (
                  <div key={i} className="flex items-center justify-between group">
                    <button onClick={() => setSearchInput(item)} className="flex-1 text-left px-3 py-2 text-[#8E8E93] hover:text-white text-sm rounded-lg hover:bg-[rgba(255,255,255,0.05)] transition">{item}</button>
                    <button onClick={() => clearSearchHistory(item)} className="p-1 rounded-full opacity-0 group-hover:opacity-100 hover:bg-[rgba(255,255,255,0.1)]">
                      <X className="w-3 h-3 text-[#8E8E93]" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Filter tabs */}
        <div className="px-4 py-2 overflow-x-auto">
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
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all ${
                    sortBy === sort.id 
                      ? 'bg-[#8B5CF6] text-white' 
                      : 'bg-[rgba(255,255,255,0.06)] text-[#8E8E93] hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {sort.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Category/Stage filters */}
        {showFilters && (
          <div className="px-4 py-4 border-t border-[rgba(255,255,255,0.06)]">
            <div className="space-y-4">
              <div>
                <label className="block text-[#8E8E93] text-[11px] font-semibold tracking-wide uppercase mb-2">Category</label>
                <div className="flex flex-wrap gap-2">
                  {['all', 'AI/ML', 'SaaS', 'Consumer', 'Fintech', 'Health', 'E-commerce', 'Developer Tools', 'Other'].map((cat) => (
                    <button 
                      key={cat} 
                      onClick={() => setSelectedCategory(cat)} 
                      className={`px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all ${
                        selectedCategory === cat 
                          ? 'bg-[#8B5CF6] text-white' 
                          : 'bg-[rgba(255,255,255,0.06)] text-[#8E8E93] hover:text-white'
                      }`}
                    >
                      {cat === 'all' ? 'All' : cat}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[#8E8E93] text-[11px] font-semibold tracking-wide uppercase mb-2">Stage</label>
                <div className="flex flex-wrap gap-2">
                  {['all', 'MVP', 'Beta', 'Launched', 'Scaling'].map((stage) => (
                    <button 
                      key={stage} 
                      onClick={() => setSelectedStage(stage)} 
                      className={`px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all ${
                        selectedStage === stage 
                          ? 'bg-[#8B5CF6] text-white' 
                          : 'bg-[rgba(255,255,255,0.06)] text-[#8E8E93] hover:text-white'
                      }`}
                    >
                      {stage === 'all' ? 'All' : stage}
                    </button>
                  ))}
                </div>
              </div>

              {(selectedCategory !== 'all' || selectedStage !== 'all') && (
                <button onClick={() => { setSelectedCategory('all'); setSelectedStage('all'); }} className="text-[#8B5CF6] hover:text-[#A78BFA] text-[12px] font-semibold transition-colors">
                  Clear filters
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className={showFilters ? 'pt-64' : 'pt-28'}>
        {user && showWelcomeCTA && WelcomeCTA && (
          <div className="px-4 mb-4">
            <WelcomeCTA onDismiss={() => { setShowWelcomeCTA(false); localStorage.setItem('lastWelcomeCTA', Date.now().toString()); }} />
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-0.5 px-0.5">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="relative w-full bg-[#18181B] rounded-sm animate-pulse" style={{ paddingBottom: '125%' }} />
            ))}
          </div>
        ) : filteredPitches.length === 0 ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center px-6">
              <div className="w-16 h-16 rounded-full bg-[rgba(139,92,246,0.1)] flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-[#8B5CF6]" />
              </div>
              <h3 className="text-white text-[17px] font-semibold mb-2">No startups found</h3>
              <p className="text-[#71717A] text-[14px] mb-6">Try adjusting your filters</p>
              <button 
                onClick={() => { setSearchInput(''); setShowSearch(false); setSelectedCategory('all'); setSelectedStage('all'); setSortBy('trending'); }} 
                className="px-6 py-2.5 bg-[#8B5CF6] text-white font-semibold rounded-xl hover:bg-[#9D6FFF] transition-all"
              >
                Clear all
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-0.5 px-0.5">
            {filteredPitches.map((pitch, index) => (
              <PitchCard key={pitch.id} pitch={pitch} index={index} onClick={() => handlePitchClick(pitch)} />
            ))}
          </div>
        )}
      </div>

      {/* Bottom Nav - Role-aware */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#000000]/95 backdrop-blur-lg border-t border-[rgba(255,255,255,0.06)] z-50">
        <div className="flex items-center justify-around py-2 px-4 pb-safe">
          <button onClick={() => navigate(createPageUrl('Explore'))} className="flex flex-col items-center gap-1 min-h-[44px] justify-center">
            <div className="w-8 h-8 rounded-full bg-[rgba(139,92,246,0.15)] flex items-center justify-center">
              <Home className="w-5 h-5 text-[#8B5CF6]" />
            </div>
            <span className="text-[10px] font-semibold text-[#8B5CF6]">Home</span>
          </button>

          <button onClick={() => navigate(createPageUrl('Community'))} className="flex flex-col items-center gap-1 text-[#52525B] hover:text-white transition-colors min-h-[44px] justify-center">
            <Users className="w-6 h-6" />
            <span className="text-[10px] font-semibold">Community</span>
          </button>

          {/* Center button - changes based on user type */}
          <button onClick={handleCenterButtonClick} className="flex flex-col items-center gap-1 -mt-4 min-h-[44px] justify-center">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:brightness-110 transition-colors ${
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

          {user ? (
            <button onClick={() => navigate(createPageUrl('Messages'))} className="relative flex flex-col items-center gap-1 text-[#52525B] hover:text-white transition-colors min-h-[44px] justify-center">
              <MessageCircle className="w-6 h-6" />
              {unreadMessagesCount > 0 && (
                <div className="absolute top-0 right-2 w-4 h-4 bg-[#EF4444] rounded-full flex items-center justify-center">
                  <span className="text-white text-[9px] font-bold">{unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}</span>
                </div>
              )}
              <span className="text-[10px] font-semibold">Messages</span>
            </button>
          ) : (
            <button onClick={() => navigate(createPageUrl('Saved'))} className="flex flex-col items-center gap-1 text-[#52525B] hover:text-white transition-colors min-h-[44px] justify-center">
              <Bookmark className="w-6 h-6" />
              <span className="text-[10px] font-semibold">Saved</span>
            </button>
          )}

          <button onClick={() => { if (user) navigate(createPageUrl('Profile')); else navigate('/login'); }} className="flex flex-col items-center gap-1 text-[#52525B] hover:text-white transition-colors min-h-[44px] justify-center">
            <User className="w-6 h-6" />
            <span className="text-[10px] font-semibold">Profile</span>
          </button>
        </div>
      </div>

      {selectedPitch && <PitchModal pitch={selectedPitch} onClose={() => setSelectedPitch(null)} />}
      {InstallPrompt && <InstallPrompt />}
      {showOnboarding && OnboardingTour && <OnboardingTour onComplete={handleCompleteOnboarding} />}
      {currentTooltip && FeatureTooltip && <FeatureTooltip feature={currentTooltip} onDismiss={handleDismissTooltip} />}
    </div>
  );
}

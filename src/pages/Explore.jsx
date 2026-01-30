import React, { useState, useMemo, useRef, useEffect, memo } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import {
  Play,
  Search,
  Video,
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
import PitchSkeleton from '../components/PitchSkeleton';

let InstallPrompt, OnboardingTour, FeatureTooltip, WelcomeCTA;
try { InstallPrompt = require('../components/InstallPrompt').default; } catch { InstallPrompt = () => null; }
try { OnboardingTour = require('../components/OnboardingTour').default; } catch { OnboardingTour = () => null; }
try { FeatureTooltip = require('../components/FeatureTooltip').default; } catch { FeatureTooltip = () => null; }
try { WelcomeCTA = require('../components/WelcomeCTA').default; } catch { WelcomeCTA = () => null; }

function useDebouncedValue(value, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

// Track which videos are currently playing (limit on mobile)
const activeVideos = new Set();
const MAX_MOBILE_VIDEOS = 2;
const MAX_DESKTOP_VIDEOS = 6;

const PitchCard = memo(function PitchCard({ pitch, index, onClick }) {
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const [inView, setInView] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const hasVideo = !!(pitch.video_url && pitch.video_url.trim() && !videoError);
  const hasThumbnail = !!(pitch.thumbnail_url && pitch.thumbnail_url.trim());
  const displayName = pitch.startup_name || pitch.name || 'Untitled';

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    
    const obs = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
      },
      { threshold: 0.5, rootMargin: '50px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !hasVideo) return;

    const maxVideos = isMobile ? MAX_MOBILE_VIDEOS : MAX_DESKTOP_VIDEOS;

    if (inView && activeVideos.size < maxVideos && !activeVideos.has(pitch.id)) {
      activeVideos.add(pitch.id);
      v.play().then(() => setIsPlaying(true)).catch(() => {
        activeVideos.delete(pitch.id);
      });
    } else if (!inView && activeVideos.has(pitch.id)) {
      activeVideos.delete(pitch.id);
      v.pause();
      setIsPlaying(false);
    }

    return () => {
      activeVideos.delete(pitch.id);
    };
  }, [inView, hasVideo, pitch.id]);

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
            loading={index < 8 ? "eager" : "lazy"}
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
            src={inView ? pitch.video_url : undefined}
            poster={hasThumbnail ? pitch.thumbnail_url : undefined}
            loop
            muted
            playsInline
            preload="none"
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${videoReady && isPlaying ? 'opacity-100' : 'opacity-0'}`}
            onLoadedData={() => setVideoReady(true)}
            onError={() => setVideoError(true)}
          />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none" />

        <div className="absolute bottom-0 left-0 right-0 p-3 z-10">
          <p className="text-white text-[14px] font-semibold truncate mb-1 drop-shadow-lg">
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

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      console.log('Fetching pitches...');
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          const { data: profile } = await supabase.from('users').select('*').eq('id', authUser.id).single();
          return { ...authUser, ...profile };
        }
        return null;
      } catch { return null; }
    },
    staleTime: 0,
    refetchOnWindowFocus: true
  });

  const isFounder = user?.user_type === 'founder';
  const isInvestor = user?.user_type === 'investor';
  const isHunter = user?.user_type === 'hunter';

  const { data: rawPitches = [], isLoading: pitchesLoading } = useQuery({
    queryKey: ['pitches'],
    queryFn: async () => {
      console.log('Fetching pitches...');
      const { data, error } = await supabase
        .from('startups')
        .select('id, startup_name, name, thumbnail_url, video_url, category, product_stage, view_count, upvote_count, created_at, founder_id, one_liner')
        .eq('is_published', true)
        .eq('review_status', 'approved')
        .not('video_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(30);
      
      if (error) return [];
      return data || [];
    },
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true
  });

  const { data: unreadMessagesCount = 0 } = useQuery({
    queryKey: ['unreadMessages', user?.id],
    queryFn: async () => {
      console.log('Fetching pitches...');
      if (!user) return 0;
      const { count, error } = await supabase
        .from('direct_messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .eq('read', false);
      return error ? 0 : (count || 0);
    },
    enabled: !!user,
    staleTime: 15000
  });

  const { data: followingList = [] } = useQuery({
    queryKey: ['followingList', user?.id],
    queryFn: async () => {
      console.log('Fetching pitches...');
      if (!user) return [];
      const { data, error } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);
      return error ? [] : (data || []).map((f) => f.following_id);
    },
    enabled: !!user && sortBy === 'following',
    staleTime: 60000
  });

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

  return (
    <div className="min-h-screen bg-[#000000] w-full">
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
                    <span className="text-white text-[11px] font-bold">{unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}</span>
                  </div>
                )}
              </button>
            )}

            {user ? (
              <>
                {isFounder && (
                  <button onClick={() => navigate(createPageUrl('CreatorStudio'))} className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-[rgba(255,255,255,0.06)] text-white text-[12px] font-semibold rounded-xl hover:bg-[rgba(255,255,255,0.1)] transition-all duration-200">
                    <Palette className="w-4 h-4" />
                    <span>Studio</span>
                  </button>
                )}

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
              <button onClick={() => navigate('/login')} className="flex items-center gap-2 px-4 py-2 bg-[#8B5CF6] text-white text-[14px] font-semibold rounded-xl hover:bg-[#9D6FFF] transition-all duration-200">
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline">Log In</span>
              </button>
            )}
          </div>
        </div>

        {showSearch && (
          <div className="px-4 py-3 border-t border-[rgba(255,255,255,0.06)] slide-up">
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

        <div className="px-4 py-2 overflow-x-auto scrollbar-hide">
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

        {showFilters && (
          <div className="px-4 py-4 border-t border-[rgba(255,255,255,0.06)] slide-up">
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

      <div className={showFilters ? 'pt-64' : 'pt-28'}>
        {user && showWelcomeCTA && WelcomeCTA && (
          <div className="px-4 mb-4">
            <WelcomeCTA onDismiss={() => { setShowWelcomeCTA(false); localStorage.setItem('lastWelcomeCTA', Date.now().toString()); }} />
          </div>
        )}

        {pitchesLoading ? (
          <PitchSkeleton />
        ) : filteredPitches.length === 0 ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center px-6">
              <div className="w-20 h-20 rounded-full bg-[rgba(139,92,246,0.15)] flex items-center justify-center mx-auto mb-5">
                <Video className="w-10 h-10 text-[#8B5CF6]" />
              </div>
              <h3 className="text-white text-[20px] font-bold mb-2">No pitches yet</h3>
              <p className="text-[#A1A1AA] text-[14px] mb-6 max-w-[280px] mx-auto">Be the first to share what you're building with the community</p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => navigate(createPageUrl("RecordPitch"))}
                  className="px-6 py-3 bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white font-semibold rounded-xl hover:brightness-110 transition-all"
                >
                  Record your pitch
                </button>
                <button
                  onClick={() => { setSearchInput(""); setShowSearch(false); setSelectedCategory("all"); setSelectedStage("all"); setSortBy("trending"); }}
                  className="px-6 py-2.5 text-[#A1A1AA] font-medium hover:text-white transition-all"
                >
                  Clear filters
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1 px-1">
            {filteredPitches.map((pitch, index) => (
              <PitchCard key={pitch.id} pitch={pitch} index={index} onClick={() => handlePitchClick(pitch)} />
            ))}
          </div>
        )}
      </div>

      {selectedPitch && <PitchModal pitch={selectedPitch} onClose={() => setSelectedPitch(null)} />}
      {InstallPrompt && <InstallPrompt />}
      {showOnboarding && OnboardingTour && <OnboardingTour onComplete={handleCompleteOnboarding} />}
      {currentTooltip && FeatureTooltip && <FeatureTooltip feature={currentTooltip} onDismiss={handleDismissTooltip} />}
    </div>
  );
}

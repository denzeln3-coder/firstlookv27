import React, { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { 
  ArrowLeft, Search, Compass, Bookmark, BookmarkPlus, 
  Clock, Sparkles, Filter, Eye, ThumbsUp, Zap, Trophy, Target, Play 
} from 'lucide-react';
import PitchModal from '../components/PitchModal';
import { toast } from 'sonner';

export default function HunterDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('discover');
  const [selectedPitch, setSelectedPitch] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stageFilter, setStageFilter] = useState('all');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    }
  });

  const { data: userProfile } = useQuery({
    queryKey: ['userProfile', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('users').select('*').eq('id', user.id).single();
      return data;
    },
    enabled: !!user
  });

  const { data: allStartups = [] } = useQuery({
    queryKey: ['startups'],
    queryFn: async () => {
      const { data } = await supabase.from('startups').select('*').eq('is_published', true).order('created_at', { ascending: false });
      return data || [];
    }
  });

  const { data: watchlist = [] } = useQuery({
    queryKey: ['hunterWatchlist', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('hunter_watchlist').select('*').eq('user_id', user.id);
      return data || [];
    },
    enabled: !!user
  });

  const { data: viewedPitches = [] } = useQuery({
    queryKey: ['viewedPitches', user?.id],
    // DEBUG
    onSuccess: (data) => console.log('viewedPitches loaded:', data?.length, 'for user:', user?.id),
    queryFn: async () => {
      const { data } = await supabase.from('pitch_views').select('pitch_id, created_at').eq('user_id', user.id).order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user
  });

  const { data: earlyAccessRequests = [] } = useQuery({
    queryKey: ['earlyAccessRequests', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('early_access_requests').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user
  });

  const { data: feedbackGiven = [] } = useQuery({
    queryKey: ['hunterFeedback', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('startup_feedback').select('*').eq('user_id', user.id);
      return data || [];
    },
    enabled: !!user
  });

  const saveMutation = useMutation({
    mutationFn: async (startupId) => {
      const existing = watchlist.find(w => w.startup_id === startupId);
      if (existing) {
        await supabase.from('hunter_watchlist').delete().eq('id', existing.id);
        toast.success('Removed from watchlist');
      } else {
        await supabase.from('hunter_watchlist').insert({ user_id: user.id, startup_id: startupId });
        toast.success('Added to watchlist');
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['hunterWatchlist', user?.id] })
  });

  const requestAccessMutation = useMutation({
    mutationFn: async (startupId) => {
      const existing = earlyAccessRequests.find(r => r.startup_id === startupId);
      if (existing) { toast.info('Already requested access'); return; }
      await supabase.from('early_access_requests').insert({ user_id: user.id, startup_id: startupId, status: 'pending' });
      toast.success('Early access requested!');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['earlyAccessRequests', user?.id] })
  });

  const viewedStartupIds = useMemo(() => [...new Set(viewedPitches.map(v => v.pitch_id))], [viewedPitches]);
  const watchlistIds = useMemo(() => watchlist.map(w => w.startup_id), [watchlist]);
  const earlyAccessIds = useMemo(() => earlyAccessRequests.map(r => r.startup_id), [earlyAccessRequests]);

  const filteredStartups = useMemo(() => {
    let filtered = allStartups;
    if (activeTab === 'discover') {
      filtered = filtered.filter(s => !viewedStartupIds.includes(s.id));
    } else if (activeTab === 'watchlist') {
      filtered = filtered.filter(s => watchlistIds.includes(s.id));
    } else if (activeTab === 'early_access') {
      filtered = filtered.filter(s => earlyAccessIds.includes(s.id));
    } else if (activeTab === 'history') {
      filtered = filtered.filter(s => viewedStartupIds.includes(s.id));
    }
    if (categoryFilter !== 'all') filtered = filtered.filter(s => s.category === categoryFilter);
    if (stageFilter !== 'all') filtered = filtered.filter(s => s.stage === stageFilter);
    return filtered;
  }, [allStartups, activeTab, viewedStartupIds, watchlistIds, earlyAccessIds, categoryFilter, stageFilter]);

  const stats = useMemo(() => ({
    discovered: viewedStartupIds.length,
    watchlist: watchlist.length,
    earlyAccess: earlyAccessRequests.length,
    feedbackGiven: feedbackGiven.length
  }), [viewedStartupIds, watchlist, earlyAccessRequests, feedbackGiven]);

  const isHunter = userProfile?.user_type === 'hunter';
  const tabs = [
    { id: 'discover', label: 'Discover', icon: Compass },
    { id: 'watchlist', label: 'Watchlist', icon: Bookmark, count: stats.watchlist },
    { id: 'early_access', label: 'Early Access', icon: Zap, count: stats.earlyAccess },
    { id: 'history', label: 'History', icon: Clock, count: stats.discovered }
  ];
  const categories = ['all', 'AI/ML', 'SaaS', 'Consumer', 'Fintech', 'Health', 'E-commerce', 'Developer Tools', 'Education'];
  const stages = ['all', 'Beta', 'Launched', 'MVP', 'Scaling'];

  const getEmptyMessage = () => {
    switch (activeTab) {
      case 'watchlist': return 'No startups in your watchlist yet';
      case 'early_access': return "You haven't requested early access yet";
      case 'history': return "You haven't discovered any startups yet";
      default: return 'No startups match your criteria';
    }
  };

  const getEarlyAccessStatus = (id) => earlyAccessRequests.find(r => r.startup_id === id)?.status || null;

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <button onClick={() => navigate('/login')} className="px-6 py-3 bg-amber-500 text-white font-semibold rounded-xl">Log In to Hunt</button>
      </div>
    );
  }

  if (!isHunter) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <Target className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-white text-xl font-bold mb-2">Hunter Access Required</h2>
          <p className="text-gray-400 mb-6">Switch to hunter mode to discover startups.</p>
          <button onClick={() => navigate(createPageUrl('Settings'))} className="px-6 py-3 bg-amber-500 text-white font-semibold rounded-xl">Go to Settings</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-20">
      <div className="sticky top-0 bg-black/95 backdrop-blur-xl z-20 border-b border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-gray-400 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-white text-xl font-bold">Hunt Startups</h1>
                <p className="text-gray-400 text-sm">Discover & try new products</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full">
              <Trophy className="w-4 h-4 text-amber-500" />
              <span className="text-amber-500 text-sm font-semibold">{stats.feedbackGiven} reviewed</span>
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap ${activeTab === tab.id ? 'bg-amber-500 text-white' : 'bg-zinc-800 text-gray-400'}`}>
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {tab.count > 0 && <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded-full text-xs">{tab.count}</span>}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { icon: Eye, value: stats.discovered, label: 'Discovered', tab: 'history' },
            { icon: Bookmark, value: stats.watchlist, label: 'Watchlist', tab: 'watchlist' },
            { icon: Zap, value: stats.earlyAccess, label: 'Early Access', tab: 'early_access' },
            { icon: ThumbsUp, value: stats.feedbackGiven, label: 'Feedback', tab: null }
          ].map((s, i) => (
            <button key={i} onClick={() => s.tab && setActiveTab(s.tab)} className={`bg-zinc-900 border rounded-xl p-4 text-left ${activeTab === s.tab ? 'border-amber-500' : 'border-zinc-800'}`}>
              <s.icon className="w-5 h-5 text-gray-400 mb-2" />
              <div className="text-white text-2xl font-bold">{s.value}</div>
              <div className="text-gray-400 text-sm">{s.label}</div>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-6">
          <Filter className="w-4 h-4 text-gray-400" />
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="px-3 py-2 bg-zinc-800 text-white border border-zinc-700 rounded-lg text-sm">
            {categories.map(c => <option key={c} value={c}>{c === 'all' ? 'All Categories' : c}</option>)}
          </select>
          <select value={stageFilter} onChange={e => setStageFilter(e.target.value)} className="px-3 py-2 bg-zinc-800 text-white border border-zinc-700 rounded-lg text-sm">
            {stages.map(s => <option key={s} value={s}>{s === 'all' ? 'All Stages' : s}</option>)}
          </select>
        </div>

        {filteredStartups.length === 0 ? (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-400 mb-4">{getEmptyMessage()}</p>
            {activeTab !== 'discover' && <button onClick={() => setActiveTab('discover')} className="px-6 py-3 bg-amber-500 text-white font-semibold rounded-xl">Discover Startups</button>}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredStartups.map(startup => {
              const isWatchlisted = watchlistIds.includes(startup.id);
              const status = getEarlyAccessStatus(startup.id);
              const name = startup.startup_name || startup.name;
              return (
                <div key={startup.id} className="relative rounded-xl bg-zinc-800 overflow-hidden" style={{ aspectRatio: '4/5' }}>
                  <button onClick={() => setSelectedPitch(startup)} className="w-full h-full">
                    {startup.thumbnail_url ? <img src={startup.thumbnail_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-500 to-yellow-500"><span className="text-white text-3xl font-bold">{name?.[0]}</span></div>}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    {startup.video_url && <div className="absolute top-2 left-2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center"><Play className="w-4 h-4 text-white fill-white" /></div>}
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <h3 className="text-white font-semibold text-sm mb-1 line-clamp-1">{name}</h3>
                      <p className="text-white/70 text-xs line-clamp-2 mb-2">{startup.one_liner}</p>
                      <div className="flex gap-2 flex-wrap">
                        {startup.category && <span className="px-2 py-0.5 bg-white/10 rounded-full text-white/60 text-xs">{startup.category}</span>}
                        {startup.product_stage && <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full text-xs">{startup.product_stage}</span>}
                        {status && <span className={`px-2 py-0.5 rounded-full text-xs ${status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>{status === 'approved' ? '✓ Access' : 'Pending'}</span>}
                      </div>
                    </div>
                  </button>
                  <div className="absolute top-2 right-2 flex flex-col gap-2">
                    <button onClick={e => { e.stopPropagation(); saveMutation.mutate(startup.id); }} className={`w-8 h-8 rounded-full flex items-center justify-center ${isWatchlisted ? 'bg-amber-500 text-white' : 'bg-black/50 text-white/70'}`}>
                      {isWatchlisted ? <Bookmark className="w-4 h-4 fill-current" /> : <BookmarkPlus className="w-4 h-4" />}
                    </button>
                    {!status && (startup.product_stage === 'Beta' || startup.product_stage === 'MVP') && (
                      <button onClick={e => { e.stopPropagation(); requestAccessMutation.mutate(startup.id); }} className="w-8 h-8 rounded-full bg-black/50 text-white/70 hover:bg-amber-500 flex items-center justify-center">
                        <Zap className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {selectedPitch && <PitchModal pitch={selectedPitch} onClose={() => setSelectedPitch(null)} isHunterView={true} />}
    </div>
  );
}

import React, { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { ArrowLeft, Filter, TrendingUp, Eye, Bookmark, BookmarkPlus, Sparkles, Bell } from 'lucide-react';
import PitchModal from '../components/PitchModal';
import { toast } from 'sonner';

export default function InvestorDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('for_you');
  const [selectedPitch, setSelectedPitch] = useState(null);
  const [stageFilter, setStageFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

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

  const { data: investorProfile } = useQuery({
    queryKey: ['investorProfile', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('investor_profiles').select('*').eq('user_id', user.id).single();
      return data;
    },
    enabled: !!user
  });

  const { data: allStartups = [] } = useQuery({
    queryKey: ['startups'],
    queryFn: async () => {
      const { data } = await supabase.from('startups').select('*').order('created_at', { ascending: false });
      return data || [];
    }
  });

  const { data: pipeline = [] } = useQuery({
    queryKey: ['investorPipeline', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('investor_pipeline').select('*').eq('investor_id', user.id);
      return data || [];
    },
    enabled: !!user
  });

  const { data: actions = [] } = useQuery({
    queryKey: ['investorActions', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('investor_actions').select('*').eq('investor_id', user.id);
      return data || [];
    },
    enabled: !!user
  });

  const saveMutation = useMutation({
    mutationFn: async (startupId) => {
      const existing = pipeline.find(p => p.startup_id === startupId);
      if (existing) {
        await supabase.from('investor_pipeline').delete().eq('id', existing.id);
        toast.success('Removed from pipeline');
      } else {
        await supabase.from('investor_pipeline').insert({ investor_id: user.id, startup_id: startupId, status: 'saved' });
        toast.success('Saved to pipeline');
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['investorPipeline', user?.id] })
  });

  const filteredStartups = useMemo(() => {
    let filtered = allStartups;
    if (activeTab === 'for_you' && investorProfile) {
      filtered = filtered.filter(s => {
        const catMatch = !investorProfile.preferred_categories?.length || investorProfile.preferred_categories.includes(s.category);
        const stgMatch = !investorProfile.preferred_stages?.length || investorProfile.preferred_stages.includes(s.stage);
        const passed = actions.some(a => a.startup_id === s.id && a.action_type === 'passed');
        return catMatch && stgMatch && !passed;
      });
    } else if (activeTab === 'new') {
      const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
      filtered = filtered.filter(s => new Date(s.created_at) >= weekAgo);
    } else if (activeTab === 'saved') {
      const savedIds = pipeline.map(p => p.startup_id);
      filtered = filtered.filter(s => savedIds.includes(s.id));
    }
    if (stageFilter !== 'all') filtered = filtered.filter(s => s.stage === stageFilter);
    if (categoryFilter !== 'all') filtered = filtered.filter(s => s.category === categoryFilter);
    return filtered;
  }, [allStartups, investorProfile, actions, pipeline, activeTab, stageFilter, categoryFilter]);

  const stats = useMemo(() => ({
    viewed: new Set(actions.filter(a => a.action_type === 'viewed').map(a => a.startup_id)).size,
    saved: pipeline.length,
    contacted: actions.filter(a => a.action_type === 'contacted').length
  }), [actions, pipeline]);

  const isInvestor = userProfile?.user_type === 'investor';

  if (!user) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <button onClick={() => navigate('/login')} className="px-6 py-3 bg-[#6366F1] text-white font-semibold rounded-xl">Log In</button>
    </div>
  );

  if (!isInvestor) return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <Sparkles className="w-12 h-12 text-[#6366F1] mx-auto mb-4" />
        <h2 className="text-white text-xl font-bold mb-2">Investor Access Required</h2>
        <p className="text-[#8E8E93] mb-6">Switch to investor mode to access deal flow.</p>
        <button onClick={() => navigate(createPageUrl('Settings'))} className="px-6 py-3 bg-[#6366F1] text-white font-semibold rounded-xl">Go to Settings</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black pb-20">
      <div className="sticky top-0 bg-black/95 backdrop-blur-xl z-20 border-b border-[#18181B]">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-[#18181B] flex items-center justify-center text-[#8E8E93] hover:text-white"><ArrowLeft className="w-5 h-5" /></button>
              <div><h1 className="text-white text-xl font-bold">Deal Flow</h1><p className="text-[#8E8E93] text-sm">Discover startups</p></div>
            </div>
            <button onClick={() => navigate(createPageUrl('InvestorProfile'))} className="flex items-center gap-2 px-4 py-2 bg-[#18181B] text-white text-sm font-semibold rounded-xl hover:bg-[#27272A]"><Bell className="w-4 h-4" />Preferences</button>
          </div>
          <div className="flex gap-2">
            {[{ id: 'for_you', label: 'For You', icon: TrendingUp }, { id: 'new', label: 'New', icon: Eye }, { id: 'saved', label: 'Saved', icon: Bookmark }].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold ${activeTab === tab.id ? 'bg-[#6366F1] text-white' : 'bg-[#18181B] text-[#8E8E93] hover:bg-[#27272A]'}`}>
                <tab.icon className="w-4 h-4" />{tab.label}{tab.id === 'saved' && pipeline.length > 0 && <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded-full text-xs">{pipeline.length}</span>}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {!investorProfile && activeTab === 'for_you' && (
          <div className="mb-6 p-4 bg-gradient-to-r from-[#6366F1]/10 to-[#8B5CF6]/10 border border-[#6366F1]/20 rounded-xl">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-[#6366F1] mt-0.5" />
              <div><h3 className="text-white font-semibold mb-1">Set up your preferences</h3><p className="text-[#8E8E93] text-sm mb-3">Tell us what you're looking for to get personalized recommendations.</p>
                <button onClick={() => navigate(createPageUrl('InvestorProfile'))} className="px-4 py-2 bg-[#6366F1] text-white text-sm font-semibold rounded-lg">Set Preferences</button>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 mb-6">
          <Filter className="w-4 h-4 text-[#8E8E93]" />
          <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)} className="px-3 py-2 bg-[#18181B] text-white border border-[#27272A] rounded-lg text-sm">
            <option value="all">All Stages</option><option value="Idea">Idea</option><option value="MVP">MVP</option><option value="Beta">Beta</option><option value="Launched">Launched</option><option value="Scaling">Scaling</option>
          </select>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="px-3 py-2 bg-[#18181B] text-white border border-[#27272A] rounded-lg text-sm">
            <option value="all">All Categories</option><option value="AI/ML">AI/ML</option><option value="SaaS">SaaS</option><option value="Consumer">Consumer</option><option value="Fintech">Fintech</option><option value="Health">Health</option><option value="E-commerce">E-commerce</option><option value="Developer Tools">Developer Tools</option><option value="Education">Education</option>
          </select>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-[#0A0A0A] border border-[#18181B] rounded-xl p-4"><div className="text-[#8E8E93] text-sm mb-1">Viewed</div><div className="text-white text-2xl font-bold">{stats.viewed}</div></div>
          <div className="bg-[#0A0A0A] border border-[#18181B] rounded-xl p-4"><div className="text-[#8E8E93] text-sm mb-1">Saved</div><div className="text-white text-2xl font-bold">{stats.saved}</div></div>
          <div className="bg-[#0A0A0A] border border-[#18181B] rounded-xl p-4"><div className="text-[#8E8E93] text-sm mb-1">Contacted</div><div className="text-white text-2xl font-bold">{stats.contacted}</div></div>
        </div>

        {filteredStartups.length === 0 ? (
          <div className="text-center py-12"><p className="text-[#8E8E93] mb-4">{activeTab === 'saved' ? 'No saved startups yet' : 'No startups match your criteria'}</p>
            {activeTab === 'saved' && <button onClick={() => setActiveTab('for_you')} className="px-6 py-3 bg-[#6366F1] text-white font-semibold rounded-xl">Discover Startups</button>}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredStartups.map(startup => {
              const isSaved = pipeline.some(p => p.startup_id === startup.id);
              return (
                <div key={startup.id} className="relative overflow-hidden rounded-xl bg-[#18181B] group" style={{ aspectRatio: '4/5' }}>
                  <button onClick={() => setSelectedPitch(startup)} className="w-full h-full">
                    {startup.thumbnail_url ? <img src={startup.thumbnail_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#6366F1] to-[#8B5CF6]"><span className="text-white text-3xl font-bold">{(startup.startup_name || startup.name)?.[0]?.toUpperCase()}</span></div>}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <h3 className="text-white font-semibold text-sm mb-1 line-clamp-1">{startup.startup_name || startup.name}</h3>
                      <p className="text-white/70 text-xs line-clamp-2">{startup.one_liner || startup.tagline}</p>
                      <div className="flex items-center gap-2 mt-2">
                        {startup.category && <span className="px-2 py-0.5 bg-white/10 rounded-full text-white/60 text-xs">{startup.category}</span>}
                        {startup.stage && <span className="px-2 py-0.5 bg-[#6366F1]/20 rounded-full text-[#6366F1] text-xs">{startup.stage}</span>}
                      </div>
                    </div>
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); saveMutation.mutate(startup.id); }} className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center ${isSaved ? 'bg-[#6366F1] text-white' : 'bg-black/50 text-white/70 hover:bg-black/70'}`}>
                    {isSaved ? <Bookmark className="w-4 h-4 fill-current" /> : <BookmarkPlus className="w-4 h-4" />}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedPitch && <PitchModal pitch={selectedPitch} onClose={() => setSelectedPitch(null)} isInvestorView={true} />}
    </div>
  );
}

import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { ArrowLeft, Filter, TrendingUp, Eye, Bookmark, Send, Sparkles, Bell } from 'lucide-react';
import AIMatchScore from '../components/AIMatchScore';
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
    queryFn: () => base44.auth.me()
  });

  const { data: investorProfile } = useQuery({
    queryKey: ['investorProfile', user?.id],
    queryFn: async () => {
      const profiles = await base44.entities.Investor.filter({ user_id: user.id });
      return profiles[0] || null;
    },
    enabled: !!user
  });

  const { data: allPitches = [] } = useQuery({
    queryKey: ['pitches'],
    queryFn: () => base44.entities.Pitch.filter({ is_published: true, review_status: 'approved' }, '-created_date')
  });

  const { data: pipeline = [] } = useQuery({
    queryKey: ['investorPipeline', user?.id],
    queryFn: () => base44.entities.InvestorPipeline.filter({ investor_id: user.id }),
    enabled: !!user
  });

  const { data: actions = [] } = useQuery({
    queryKey: ['investorActions', user?.id],
    queryFn: () => base44.entities.InvestorAction.filter({ investor_id: user.id }),
    enabled: !!user
  });

  const { data: views = [] } = useQuery({
    queryKey: ['pitchViews'],
    queryFn: () => base44.entities.PitchView.list()
  });

  const { data: aiRecommendations = [] } = useQuery({
    queryKey: ['aiRecommendations', user?.id],
    queryFn: async () => {
      if (!investorProfile) return [];
      
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a venture capital analyst. Based on this investor profile, identify the TOP 5 most relevant startup pitches from the list.

Investor Profile:
- Investment Thesis: ${investorProfile.investment_thesis || 'Not specified'}
- Preferred Categories: ${investorProfile.preferred_categories?.join(', ') || 'All'}
- Preferred Stages: ${investorProfile.preferred_stages?.join(', ') || 'All'}
- Check Size: $${investorProfile.ticket_size_min || 0} - $${investorProfile.ticket_size_max || 0}
- Looking For: ${investorProfile.looking_for || 'Not specified'}

Available Pitches:
${allPitches.slice(0, 30).map((p, i) => `${i + 1}. ${p.startup_name} - ${p.one_liner} | Category: ${p.category} | Stage: ${p.product_stage} | ID: ${p.id}`).join('\n')}

For each of the TOP 5 matches, provide:
- pitch_id
- match_score (0-100)
- reasons (array of 2-3 short bullet points explaining why it matches)`,
        response_json_schema: {
          type: "object",
          properties: {
            recommendations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  pitch_id: { type: "string" },
                  match_score: { type: "number" },
                  reasons: { type: "array", items: { type: "string" } }
                }
              }
            }
          }
        }
      });

      return result.recommendations || [];
    },
    enabled: !!user && !!investorProfile && allPitches.length > 0 && activeTab === 'for_you',
    staleTime: 30 * 60 * 1000 // Cache for 30 minutes
  });

  const filteredPitches = useMemo(() => {
    if (!investorProfile) return [];

    let filtered = allPitches;

    // Tab filtering
    if (activeTab === 'for_you') {
      // Match investor preferences
      filtered = filtered.filter(pitch => {
        const categoryMatch = !investorProfile.preferred_categories?.length || 
          investorProfile.preferred_categories.includes(pitch.category);
        const stageMatch = !investorProfile.preferred_stages?.length || 
          investorProfile.preferred_stages.includes(pitch.product_stage);
        
        // Exclude passed pitches
        const hasPassed = actions.some(a => a.pitch_id === pitch.id && a.action_type === 'passed');
        
        return categoryMatch && stageMatch && !hasPassed;
      });

      // Sort by AI match score if available
      if (aiRecommendations.length > 0) {
        const scoreMap = new Map(aiRecommendations.map(r => [r.pitch_id, r.match_score]));
        filtered = filtered.sort((a, b) => {
          const aScore = scoreMap.get(a.id) || 0;
          const bScore = scoreMap.get(b.id) || 0;
          return bScore - aScore;
        });
      } else {
        // Fallback: boost new pitches (< 7 days)
        const now = new Date();
        filtered = filtered.sort((a, b) => {
          const aDate = new Date(a.created_date);
          const bDate = new Date(b.created_date);
          const aDaysOld = (now - aDate) / (1000 * 60 * 60 * 24);
          const bDaysOld = (now - bDate) / (1000 * 60 * 60 * 24);
          
          const aScore = (a.upvote_count || 0) * 10 + (aDaysOld < 7 ? 50 : 0);
          const bScore = (b.upvote_count || 0) * 10 + (bDaysOld < 7 ? 50 : 0);
          
          return bScore - aScore;
        });
      }
    } else if (activeTab === 'new') {
      // Last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      filtered = filtered.filter(p => new Date(p.created_date) >= sevenDaysAgo);
    } else if (activeTab === 'saved') {
      // Only saved pitches
      const savedIds = pipeline.map(p => p.pitch_id);
      filtered = filtered.filter(p => savedIds.includes(p.id));
    }

    // Additional filters
    if (stageFilter !== 'all') {
      filtered = filtered.filter(p => p.product_stage === stageFilter);
    }
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(p => p.category === categoryFilter);
    }

    return filtered;
  }, [allPitches, investorProfile, actions, pipeline, activeTab, stageFilter, categoryFilter, aiRecommendations]);

  const stats = useMemo(() => {
    const viewed = new Set(actions.filter(a => a.action_type === 'viewed').map(a => a.pitch_id)).size;
    const saved = pipeline.length;
    const contacted = actions.filter(a => a.action_type === 'contacted').length;
    
    return { viewed, saved, contacted };
  }, [actions, pipeline]);

  if (!user) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center">
        <button
          onClick={() => base44.auth.redirectToLogin(createPageUrl('InvestorDashboard'))}
          className="px-6 py-3 bg-[#6366F1] text-white font-semibold rounded-xl hover:brightness-110 transition"
        >
          Log In
        </button>
      </div>
    );
  }

  if (!user.is_investor) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center p-6">
        <div className="text-center">
          <h2 className="text-white text-xl font-bold mb-4">Investor Access Required</h2>
          <p className="text-[#8E8E93] mb-6">Create an investor profile to access the deal flow dashboard.</p>
          <button
            onClick={() => navigate(createPageUrl('InvestorProfile'))}
            className="px-6 py-3 bg-[#6366F1] text-white font-semibold rounded-xl hover:brightness-110 transition"
          >
            Create Investor Profile
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000000] pb-20">
      <div className="sticky top-0 bg-[#000000]/95 backdrop-blur-xl z-20 border-b border-[#18181B]">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(createPageUrl('Profile'))}
                className="w-10 h-10 rounded-full bg-[#18181B] flex items-center justify-center text-[#8E8E93] hover:text-white transition"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-white text-xl font-bold">Deal Flow Dashboard</h1>
                <p className="text-[#8E8E93] text-sm">Discover and track startup opportunities</p>
              </div>
            </div>
            <button
              onClick={() => navigate(createPageUrl('DealFlowSettings'))}
              className="flex items-center gap-2 px-4 py-2 bg-[#18181B] text-white text-sm font-semibold rounded-xl hover:bg-[#27272A] transition"
            >
              <Bell className="w-4 h-4" />
              Alerts
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            {[
              { id: 'for_you', label: 'For You', icon: TrendingUp },
              { id: 'new', label: 'New This Week', icon: Eye },
              { id: 'saved', label: 'Saved', icon: Bookmark }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${
                    activeTab === tab.id
                      ? 'bg-[#6366F1] text-white'
                      : 'bg-[#18181B] text-[#8E8E93] hover:bg-[#27272A]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* AI Recommendations Banner */}
        {activeTab === 'for_you' && aiRecommendations.length > 0 && (
          <div className="mb-6 p-4 bg-gradient-to-r from-[#6366F1]/10 to-[#8B5CF6]/10 border border-[#6366F1]/20 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-[#6366F1]" />
              <h3 className="text-white font-semibold">AI-Powered Recommendations</h3>
            </div>
            <p className="text-[#8E8E93] text-sm">
              Showing {aiRecommendations.length} highly matched startups based on your investment thesis
            </p>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-3 mb-6">
          <Filter className="w-4 h-4 text-[#8E8E93]" />
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="px-3 py-2 bg-[#18181B] text-white border border-[#27272A] rounded-lg text-sm focus:outline-none focus:border-[#6366F1]"
          >
            <option value="all">All Stages</option>
            <option value="MVP">MVP</option>
            <option value="Beta">Beta</option>
            <option value="Launched">Launched</option>
            <option value="Scaling">Scaling</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-[#18181B] text-white border border-[#27272A] rounded-lg text-sm focus:outline-none focus:border-[#6366F1]"
          >
            <option value="all">All Categories</option>
            <option value="AI/ML">AI/ML</option>
            <option value="SaaS">SaaS</option>
            <option value="Consumer">Consumer</option>
            <option value="Fintech">Fintech</option>
            <option value="Health">Health</option>
            <option value="E-commerce">E-commerce</option>
            <option value="Developer Tools">Developer Tools</option>
          </select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-[#0A0A0A] border border-[#18181B] rounded-xl p-4">
            <div className="text-[#8E8E93] text-sm mb-1">Pitches Viewed</div>
            <div className="text-white text-2xl font-bold">{stats.viewed}</div>
          </div>
          <div className="bg-[#0A0A0A] border border-[#18181B] rounded-xl p-4">
            <div className="text-[#8E8E93] text-sm mb-1">Saved</div>
            <div className="text-white text-2xl font-bold">{stats.saved}</div>
          </div>
          <div className="bg-[#0A0A0A] border border-[#18181B] rounded-xl p-4">
            <div className="text-[#8E8E93] text-sm mb-1">Reached Out</div>
            <div className="text-white text-2xl font-bold">{stats.contacted}</div>
          </div>
        </div>

        {/* Pitches Grid */}
        {filteredPitches.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[#8E8E93] mb-4">No pitches match your criteria</p>
            {activeTab === 'for_you' && !investorProfile?.preferred_categories?.length && (
              <button
                onClick={() => navigate(createPageUrl('InvestorProfile'))}
                className="px-6 py-3 bg-[#6366F1] text-white font-semibold rounded-xl hover:brightness-110 transition"
              >
                Update Preferences
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {filteredPitches.map(pitch => {
              const recommendation = aiRecommendations.find(r => r.pitch_id === pitch.id);
              
              return (
                <button
                  key={pitch.id}
                  onClick={() => setSelectedPitch(pitch)}
                  className="relative overflow-hidden rounded-xl bg-[#18181B] hover:brightness-110 transition group"
                  style={{ aspectRatio: '4/5' }}
                >
                  {pitch.thumbnail_url ? (
                    <img src={pitch.thumbnail_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#6366F1] to-[#8B5CF6]">
                      <span className="text-white text-4xl font-bold">{pitch.startup_name?.[0]?.toUpperCase()}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <h3 className="text-white font-semibold text-sm mb-1">{pitch.startup_name}</h3>
                    <p className="text-white/70 text-xs line-clamp-2">{pitch.one_liner}</p>
                  </div>
                  {pipeline.some(p => p.pitch_id === pitch.id) && (
                    <div className="absolute top-2 left-2">
                      <Bookmark className="w-5 h-5 text-[#6366F1] fill-[#6366F1]" />
                    </div>
                  )}
                  {recommendation && (
                    <AIMatchScore 
                      score={recommendation.match_score} 
                      reasons={recommendation.reasons}
                    />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selectedPitch && (
        <PitchModal
          key={selectedPitch.id}
          pitch={selectedPitch}
          onClose={() => setSelectedPitch(null)}
          isInvestorView={true}
        />
      )}
    </div>
  );
}
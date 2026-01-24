import React, { useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { ArrowLeft, Eye, ArrowUp, Clock, ExternalLink, Users, Mail, TrendingUp } from 'lucide-react';

export default function PitchAnalytics() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const pitchId = urlParams.get('pitchId');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return null;
      const { data: profile } = await supabase.from('users').select('*').eq('id', authUser.id).single();
      return { ...authUser, ...profile };
    }
  });

  const { data: pitch } = useQuery({
    queryKey: ['pitch', pitchId],
    queryFn: async () => {
      const { data } = await supabase.from('startups').select('*').eq('id', pitchId).single();
      return data;
    },
    enabled: !!pitchId
  });

  const { data: views = [] } = useQuery({
    queryKey: ['pitchViews', pitchId],
    queryFn: async () => {
      const { data } = await supabase.from('pitch_views').select('*').eq('pitch_id', pitchId);
      return data || [];
    },
    enabled: !!pitchId
  });

  const { data: investorActions = [] } = useQuery({
    queryKey: ['investorActions', pitchId],
    queryFn: async () => {
      const { data } = await supabase.from('investor_actions').select('*').eq('startup_id', pitchId);
      return data || [];
    },
    enabled: !!pitchId
  });

  const { data: investorPipeline = [] } = useQuery({
    queryKey: ['investorPipeline', pitchId],
    queryFn: async () => {
      const { data } = await supabase.from('investor_pipeline').select('*').eq('startup_id', pitchId);
      return data || [];
    },
    enabled: !!pitchId
  });

  const { data: introRequests = [] } = useQuery({
    queryKey: ['introRequests', pitchId],
    queryFn: async () => {
      const { data } = await supabase.from('intro_requests').select('*').eq('pitch_id', pitchId);
      return data || [];
    },
    enabled: !!pitchId
  });

  const stats = useMemo(() => {
    const totalViews = views.length;
    const avgWatchTime = views.reduce((sum, v) => sum + (v.watch_time_seconds || 0), 0) / (views.length || 1);
    const completionRate = (views.filter(v => v.completed).length / (views.length || 1)) * 100;

    const investorViews = new Set(investorActions.filter(a => a.action_type === 'viewed').map(a => a.investor_id)).size;
    const investorSaved = investorPipeline.length;
    const pendingIntros = introRequests.filter(r => r.status === 'pending').length;

    const now = new Date();
    const viewsByDay = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(now);
      date.setDate(date.getDate() - (6 - i));
      date.setHours(0, 0, 0, 0);
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      const dayViews = views.filter(v => {
        const viewDate = new Date(v.created_at);
        return viewDate >= date && viewDate < nextDay;
      }).length;
      return { date: date.toLocaleDateString('en-US', { weekday: 'short' }), views: dayViews };
    });

    return { totalViews, avgWatchTime, completionRate, investorViews, investorSaved, pendingIntros, viewsByDay };
  }, [views, investorActions, investorPipeline, introRequests]);

  if (!user || !pitch || pitch.founder_id !== user.id) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-white text-xl font-bold mb-4">Access Denied</h2>
          <button onClick={() => navigate(createPageUrl('Profile'))} className="px-6 py-3 bg-[#6366F1] text-white font-semibold rounded-xl hover:brightness-110 transition">Back to Profile</button>
        </div>
      </div>
    );
  }

  const maxViews = Math.max(...stats.viewsByDay.map(d => d.views), 1);

  return (
    <div className="min-h-screen bg-[#000000] pb-20">
      <div className="sticky top-0 bg-[#000000]/95 backdrop-blur-xl z-20 border-b border-[#18181B]">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <button onClick={() => navigate(createPageUrl('Profile'))} className="flex items-center gap-2 text-[#8E8E93] hover:text-white transition mb-4"><ArrowLeft className="w-5 h-5" /><span className="text-sm font-medium">Back</span></button>
          <h1 className="text-white text-2xl font-bold">{pitch.startup_name || pitch.name} Analytics</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#0A0A0A] border border-[#18181B] rounded-xl p-4">
            <div className="flex items-center gap-2 text-[#8E8E93] text-sm mb-2"><Eye className="w-4 h-4" />Views</div>
            <div className="text-white text-3xl font-bold">{stats.totalViews}</div>
          </div>
          <div className="bg-[#0A0A0A] border border-[#18181B] rounded-xl p-4">
            <div className="flex items-center gap-2 text-[#8E8E93] text-sm mb-2"><ArrowUp className="w-4 h-4" />Upvotes</div>
            <div className="text-white text-3xl font-bold">{pitch.upvote_count || 0}</div>
          </div>
          <div className="bg-[#0A0A0A] border border-[#18181B] rounded-xl p-4">
            <div className="flex items-center gap-2 text-[#8E8E93] text-sm mb-2"><Clock className="w-4 h-4" />Avg Watch</div>
            <div className="text-white text-3xl font-bold">{stats.avgWatchTime.toFixed(1)}s</div>
            <div className="text-[#8E8E93] text-xs mt-1">{stats.completionRate.toFixed(0)}% completion</div>
          </div>
          <div className="bg-[#0A0A0A] border border-[#18181B] rounded-xl p-4">
            <div className="flex items-center gap-2 text-[#8E8E93] text-sm mb-2"><Users className="w-4 h-4" />Investors</div>
            <div className="text-white text-3xl font-bold">{stats.investorViews}</div>
          </div>
        </div>

        <div className="bg-[#0A0A0A] border border-[#18181B] rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4"><Users className="w-5 h-5 text-[#6366F1]" /><h2 className="text-white text-lg font-bold">Investor Engagement</h2></div>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div><div className="text-[#8E8E93] text-sm mb-1">Investors Viewed</div><div className="text-white text-2xl font-bold">👀 {stats.investorViews}</div></div>
            <div><div className="text-[#8E8E93] text-sm mb-1">Saved to Pipeline</div><div className="text-white text-2xl font-bold">💾 {stats.investorSaved}</div></div>
            <div><div className="text-[#8E8E93] text-sm mb-1">Intro Requests</div><div className="text-white text-2xl font-bold">📧 {stats.pendingIntros}</div></div>
          </div>
          {stats.pendingIntros > 0 && (
            <button onClick={() => navigate(createPageUrl('IntroRequests'))} className="w-full px-4 py-3 bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white font-semibold rounded-xl hover:brightness-110 transition flex items-center justify-center gap-2"><Mail className="w-4 h-4" />View {stats.pendingIntros} Intro Request{stats.pendingIntros > 1 ? 's' : ''}</button>
          )}
        </div>

        <div className="bg-[#0A0A0A] border border-[#18181B] rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4"><TrendingUp className="w-5 h-5 text-[#6366F1]" /><h2 className="text-white text-lg font-bold">Views Over Time</h2></div>
          <div className="flex items-end justify-between gap-2 h-40">
            {stats.viewsByDay.map((day, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div className="flex-1 flex items-end w-full"><div className="w-full bg-gradient-to-t from-[#6366F1] to-[#8B5CF6] rounded-t-lg transition-all hover:brightness-110" style={{ height: `${(day.views / maxViews) * 100}%`, minHeight: day.views > 0 ? '8px' : '0' }} /></div>
                <div className="text-[#8E8E93] text-xs">{day.date}</div>
                <div className="text-white text-sm font-semibold">{day.views}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

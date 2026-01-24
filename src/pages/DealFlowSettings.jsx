import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { ArrowLeft, Plus, Trash2, Bell, BellOff, X } from 'lucide-react';
import { toast } from 'sonner';

const CATEGORIES = ['AI/ML', 'SaaS', 'Consumer', 'Fintech', 'Health', 'E-commerce', 'Developer Tools', 'Other'];
const STAGES = ['MVP', 'Beta', 'Launched', 'Scaling'];

export default function DealFlowSettings() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showNewAlert, setShowNewAlert] = useState(false);
  const [newAlert, setNewAlert] = useState({ name: '', categories: [], stages: [], keywords: [], min_upvotes: 0, notification_frequency: 'instant' });
  const [keywordInput, setKeywordInput] = useState('');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return null;
      const { data: profile } = await supabase.from('users').select('*').eq('id', authUser.id).single();
      return { ...authUser, ...profile };
    }
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ['dealFlowAlerts', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('deal_flow_alerts').select('*').eq('investor_id', user.id).order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user
  });

  const createAlertMutation = useMutation({
    mutationFn: async (alertData) => {
      const { error } = await supabase.from('deal_flow_alerts').insert({ ...alertData, investor_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dealFlowAlerts'] });
      setShowNewAlert(false);
      setNewAlert({ name: '', categories: [], stages: [], keywords: [], min_upvotes: 0, notification_frequency: 'instant' });
      toast.success('Alert created!');
    }
  });

  const deleteAlertMutation = useMutation({
    mutationFn: async (alertId) => {
      const { error } = await supabase.from('deal_flow_alerts').delete().eq('id', alertId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dealFlowAlerts'] });
      toast.success('Alert deleted');
    }
  });

  const toggleAlertMutation = useMutation({
    mutationFn: async ({ alertId, isActive }) => {
      const { error } = await supabase.from('deal_flow_alerts').update({ is_active: isActive }).eq('id', alertId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dealFlowAlerts'] });
    }
  });

  if (!user || user.user_type !== 'investor') {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-white text-xl font-bold mb-4">Investor Access Required</h2>
          <button onClick={() => navigate(createPageUrl('Explore'))} className="px-6 py-3 bg-[#6366F1] text-white font-semibold rounded-xl hover:brightness-110 transition">Back to Explore</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000000] pb-20">
      <div className="sticky top-0 bg-[#000000]/95 backdrop-blur-xl z-20 border-b border-[#18181B]">
        <div className="px-4 py-4 flex items-center justify-between">
          <button onClick={() => navigate(createPageUrl('InvestorDashboard'))} className="w-10 h-10 rounded-full bg-[rgba(255,255,255,0.06)] flex items-center justify-center text-[#8E8E93] hover:text-white transition"><ArrowLeft className="w-5 h-5" /></button>
          <h1 className="text-white text-xl font-bold">Deal Flow Alerts</h1>
          <button onClick={() => setShowNewAlert(true)} className="w-10 h-10 rounded-full bg-[#6366F1] flex items-center justify-center text-white hover:brightness-110 transition"><Plus className="w-5 h-5" /></button>
        </div>
      </div>

      <div className="px-4 py-6 max-w-2xl mx-auto">
        {alerts.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="w-16 h-16 text-[#3F3F46] mx-auto mb-4" />
            <h3 className="text-white font-semibold mb-2">No alerts yet</h3>
            <p className="text-[#8E8E93] mb-6">Create alerts to get notified about new pitches</p>
            <button onClick={() => setShowNewAlert(true)} className="px-6 py-3 bg-[#6366F1] text-white font-semibold rounded-xl hover:brightness-110 transition">Create Alert</button>
          </div>
        ) : (
          <div className="space-y-4">
            {alerts.map(alert => (
              <div key={alert.id} className="p-4 bg-[#0A0A0A] border border-[#18181B] rounded-xl">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-white font-semibold">{alert.name}</h3>
                    <p className="text-[#8E8E93] text-sm">{alert.notification_frequency} notifications</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleAlertMutation.mutate({ alertId: alert.id, isActive: !alert.is_active })} className={`p-2 rounded-lg transition ${alert.is_active ? 'bg-[#22C55E]/20 text-[#22C55E]' : 'bg-[#3F3F46] text-[#8E8E93]'}`}>{alert.is_active ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}</button>
                    <button onClick={() => deleteAlertMutation.mutate(alert.id)} className="p-2 rounded-lg bg-[#EF4444]/20 text-[#EF4444] hover:bg-[#EF4444]/30 transition"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {alert.categories?.map(cat => <span key={cat} className="px-2 py-1 bg-[#6366F1]/20 text-[#6366F1] text-xs rounded">{cat}</span>)}
                  {alert.stages?.map(stage => <span key={stage} className="px-2 py-1 bg-[#22C55E]/20 text-[#22C55E] text-xs rounded">{stage}</span>)}
                  {alert.keywords?.map(kw => <span key={kw} className="px-2 py-1 bg-[#F59E0B]/20 text-[#F59E0B] text-xs rounded">{kw}</span>)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showNewAlert && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0A0A0A] border border-[#18181B] rounded-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white text-lg font-bold">New Alert</h3>
              <button onClick={() => setShowNewAlert(false)} className="text-[#8E8E93] hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[#8E8E93] text-sm mb-2">Alert Name</label>
                <input type="text" value={newAlert.name} onChange={(e) => setNewAlert({ ...newAlert, name: e.target.value })} placeholder="e.g., AI Startups" className="w-full px-4 py-2 bg-[#18181B] text-white rounded-lg border border-[#27272A] focus:outline-none focus:border-[#6366F1]" />
              </div>
              <div>
                <label className="block text-[#8E8E93] text-sm mb-2">Categories</label>
                <div className="flex flex-wrap gap-2">{CATEGORIES.map(cat => <button key={cat} onClick={() => setNewAlert({ ...newAlert, categories: newAlert.categories.includes(cat) ? newAlert.categories.filter(c => c !== cat) : [...newAlert.categories, cat] })} className={`px-3 py-1 rounded-lg text-sm transition ${newAlert.categories.includes(cat) ? 'bg-[#6366F1] text-white' : 'bg-[#18181B] text-[#8E8E93]'}`}>{cat}</button>)}</div>
              </div>
              <div>
                <label className="block text-[#8E8E93] text-sm mb-2">Stages</label>
                <div className="flex flex-wrap gap-2">{STAGES.map(stage => <button key={stage} onClick={() => setNewAlert({ ...newAlert, stages: newAlert.stages.includes(stage) ? newAlert.stages.filter(s => s !== stage) : [...newAlert.stages, stage] })} className={`px-3 py-1 rounded-lg text-sm transition ${newAlert.stages.includes(stage) ? 'bg-[#22C55E] text-white' : 'bg-[#18181B] text-[#8E8E93]'}`}>{stage}</button>)}</div>
              </div>
              <div>
                <label className="block text-[#8E8E93] text-sm mb-2">Keywords</label>
                <div className="flex gap-2 mb-2">
                  <input type="text" value={keywordInput} onChange={(e) => setKeywordInput(e.target.value)} onKeyPress={(e) => { if (e.key === 'Enter' && keywordInput.trim()) { setNewAlert({ ...newAlert, keywords: [...newAlert.keywords, keywordInput.trim()] }); setKeywordInput(''); } }} placeholder="Add keyword" className="flex-1 px-4 py-2 bg-[#18181B] text-white rounded-lg border border-[#27272A] focus:outline-none focus:border-[#6366F1]" />
                </div>
                <div className="flex flex-wrap gap-2">{newAlert.keywords.map((kw, i) => <span key={i} className="px-2 py-1 bg-[#F59E0B]/20 text-[#F59E0B] text-xs rounded flex items-center gap-1">{kw}<button onClick={() => setNewAlert({ ...newAlert, keywords: newAlert.keywords.filter((_, idx) => idx !== i) })}><X className="w-3 h-3" /></button></span>)}</div>
              </div>
              <div>
                <label className="block text-[#8E8E93] text-sm mb-2">Frequency</label>
                <select value={newAlert.notification_frequency} onChange={(e) => setNewAlert({ ...newAlert, notification_frequency: e.target.value })} className="w-full px-4 py-2 bg-[#18181B] text-white rounded-lg border border-[#27272A] focus:outline-none focus:border-[#6366F1]">
                  <option value="instant">Instant</option>
                  <option value="daily">Daily Digest</option>
                  <option value="weekly">Weekly Digest</option>
                </select>
              </div>
              <button onClick={() => createAlertMutation.mutate(newAlert)} disabled={!newAlert.name || createAlertMutation.isPending} className="w-full py-3 bg-[#6366F1] text-white font-semibold rounded-xl hover:brightness-110 transition disabled:opacity-50">{createAlertMutation.isPending ? 'Creating...' : 'Create Alert'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

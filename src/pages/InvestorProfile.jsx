import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { ArrowLeft, Save, Building2, DollarSign, Target, Briefcase, Check } from 'lucide-react';
import { toast } from 'sonner';

const CATEGORIES = ['AI/ML', 'SaaS', 'Consumer', 'Fintech', 'Health', 'E-commerce', 'Developer Tools', 'Education', 'Climate', 'Web3', 'Other'];
const STAGES = ['Idea', 'MVP', 'Beta', 'Launched', 'Scaling'];

export default function InvestorProfile() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    firm_name: '',
    firm_website: '',
    linkedin_url: '',
    investment_thesis: '',
    preferred_categories: [],
    preferred_stages: [],
    ticket_size_min: '',
    ticket_size_max: '',
    looking_for: ''
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    }
  });

  const { data: existingProfile, isLoading } = useQuery({
    queryKey: ['investorProfile', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('investor_profiles').select('*').eq('user_id', user.id).single();
      return data;
    },
    enabled: !!user
  });

  useEffect(() => {
    if (existingProfile) {
      setFormData({
        firm_name: existingProfile.firm_name || '',
        firm_website: existingProfile.firm_website || '',
        linkedin_url: existingProfile.linkedin_url || '',
        investment_thesis: existingProfile.investment_thesis || '',
        preferred_categories: existingProfile.preferred_categories || [],
        preferred_stages: existingProfile.preferred_stages || [],
        ticket_size_min: existingProfile.ticket_size_min || '',
        ticket_size_max: existingProfile.ticket_size_max || '',
        looking_for: existingProfile.looking_for || ''
      });
    }
  }, [existingProfile]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        user_id: user.id,
        ...formData,
        ticket_size_min: formData.ticket_size_min ? parseInt(formData.ticket_size_min) : null,
        ticket_size_max: formData.ticket_size_max ? parseInt(formData.ticket_size_max) : null,
        updated_at: new Date().toISOString()
      };

      if (existingProfile) {
        const { error } = await supabase.from('investor_profiles').update(payload).eq('id', existingProfile.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('investor_profiles').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investorProfile', user?.id] });
      toast.success('Preferences saved!');
      navigate(createPageUrl('InvestorDashboard'));
    },
    onError: (err) => toast.error('Failed to save: ' + err.message)
  });

  const toggleCategory = (cat) => {
    setFormData(prev => ({
      ...prev,
      preferred_categories: prev.preferred_categories.includes(cat)
        ? prev.preferred_categories.filter(c => c !== cat)
        : [...prev.preferred_categories, cat]
    }));
  };

  const toggleStage = (stage) => {
    setFormData(prev => ({
      ...prev,
      preferred_stages: prev.preferred_stages.includes(stage)
        ? prev.preferred_stages.filter(s => s !== stage)
        : [...prev.preferred_stages, stage]
    }));
  };

  if (!user) return null;
  if (isLoading) return <div className="min-h-screen bg-black flex items-center justify-center"><div className="text-white">Loading...</div></div>;

  return (
    <div className="min-h-screen bg-black pb-20">
      <div className="sticky top-0 bg-black/95 backdrop-blur-xl z-20 border-b border-[#18181B]">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-[#18181B] flex items-center justify-center text-[#8E8E93] hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-white text-xl font-bold">Investor Preferences</h1>
          </div>
          <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="flex items-center gap-2 px-4 py-2 bg-[#6366F1] text-white text-sm font-semibold rounded-xl hover:brightness-110 disabled:opacity-50">
            <Save className="w-4 h-4" />{saveMutation.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Firm Info */}
        <div className="bg-[#0A0A0A] border border-[#18181B] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-5 h-5 text-[#6366F1]" />
            <h2 className="text-white font-semibold">Firm Information</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-[#8E8E93] text-sm mb-1 block">Firm Name (optional)</label>
              <input type="text" value={formData.firm_name} onChange={(e) => setFormData(p => ({ ...p, firm_name: e.target.value }))} placeholder="Sequoia Capital" className="w-full px-4 py-3 bg-[#18181B] border border-[#27272A] rounded-xl text-white focus:outline-none focus:border-[#6366F1]" />
            </div>
            <div>
              <label className="text-[#8E8E93] text-sm mb-1 block">Website</label>
              <input type="url" value={formData.firm_website} onChange={(e) => setFormData(p => ({ ...p, firm_website: e.target.value }))} placeholder="https://sequoiacap.com" className="w-full px-4 py-3 bg-[#18181B] border border-[#27272A] rounded-xl text-white focus:outline-none focus:border-[#6366F1]" />
            </div>
            <div>
              <label className="text-[#8E8E93] text-sm mb-1 block">LinkedIn</label>
              <input type="url" value={formData.linkedin_url} onChange={(e) => setFormData(p => ({ ...p, linkedin_url: e.target.value }))} placeholder="https://linkedin.com/in/yourprofile" className="w-full px-4 py-3 bg-[#18181B] border border-[#27272A] rounded-xl text-white focus:outline-none focus:border-[#6366F1]" />
            </div>
          </div>
        </div>

        {/* Investment Thesis */}
        <div className="bg-[#0A0A0A] border border-[#18181B] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-[#6366F1]" />
            <h2 className="text-white font-semibold">Investment Thesis</h2>
          </div>
          <textarea value={formData.investment_thesis} onChange={(e) => setFormData(p => ({ ...p, investment_thesis: e.target.value }))} placeholder="Describe what you look for in startups..." rows={4} className="w-full px-4 py-3 bg-[#18181B] border border-[#27272A] rounded-xl text-white focus:outline-none focus:border-[#6366F1] resize-none" />
        </div>

        {/* Categories */}
        <div className="bg-[#0A0A0A] border border-[#18181B] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Briefcase className="w-5 h-5 text-[#6366F1]" />
            <h2 className="text-white font-semibold">Preferred Categories</h2>
          </div>
          <p className="text-[#8E8E93] text-sm mb-3">Select all that interest you (leave empty for all)</p>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => toggleCategory(cat)} className={`px-4 py-2 rounded-full text-sm font-medium transition ${formData.preferred_categories.includes(cat) ? 'bg-[#6366F1] text-white' : 'bg-[#18181B] text-[#8E8E93] hover:bg-[#27272A]'}`}>
                {formData.preferred_categories.includes(cat) && <Check className="w-3 h-3 inline mr-1" />}{cat}
              </button>
            ))}
          </div>
        </div>

        {/* Stages */}
        <div className="bg-[#0A0A0A] border border-[#18181B] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-[#6366F1]" />
            <h2 className="text-white font-semibold">Preferred Stages</h2>
          </div>
          <p className="text-[#8E8E93] text-sm mb-3">Select stages you invest in (leave empty for all)</p>
          <div className="flex flex-wrap gap-2">
            {STAGES.map(stage => (
              <button key={stage} onClick={() => toggleStage(stage)} className={`px-4 py-2 rounded-full text-sm font-medium transition ${formData.preferred_stages.includes(stage) ? 'bg-[#6366F1] text-white' : 'bg-[#18181B] text-[#8E8E93] hover:bg-[#27272A]'}`}>
                {formData.preferred_stages.includes(stage) && <Check className="w-3 h-3 inline mr-1" />}{stage}
              </button>
            ))}
          </div>
        </div>

        {/* Check Size */}
        <div className="bg-[#0A0A0A] border border-[#18181B] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-5 h-5 text-[#6366F1]" />
            <h2 className="text-white font-semibold">Check Size (USD)</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[#8E8E93] text-sm mb-1 block">Minimum</label>
              <input type="number" value={formData.ticket_size_min} onChange={(e) => setFormData(p => ({ ...p, ticket_size_min: e.target.value }))} placeholder="10000" className="w-full px-4 py-3 bg-[#18181B] border border-[#27272A] rounded-xl text-white focus:outline-none focus:border-[#6366F1]" />
            </div>
            <div>
              <label className="text-[#8E8E93] text-sm mb-1 block">Maximum</label>
              <input type="number" value={formData.ticket_size_max} onChange={(e) => setFormData(p => ({ ...p, ticket_size_max: e.target.value }))} placeholder="100000" className="w-full px-4 py-3 bg-[#18181B] border border-[#27272A] rounded-xl text-white focus:outline-none focus:border-[#6366F1]" />
            </div>
          </div>
        </div>

        {/* Looking For */}
        <div className="bg-[#0A0A0A] border border-[#18181B] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-[#6366F1]" />
            <h2 className="text-white font-semibold">What Are You Looking For?</h2>
          </div>
          <textarea value={formData.looking_for} onChange={(e) => setFormData(p => ({ ...p, looking_for: e.target.value }))} placeholder="Strong founding teams, unique market insights, clear path to profitability..." rows={3} className="w-full px-4 py-3 bg-[#18181B] border border-[#27272A] rounded-xl text-white focus:outline-none focus:border-[#6366F1] resize-none" />
        </div>
      </div>
    </div>
  );
}

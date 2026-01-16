import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Building2, TrendingUp, DollarSign, Globe, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';

const CATEGORIES = ['AI/ML', 'SaaS', 'Consumer', 'Fintech', 'Health', 'E-commerce', 'Developer Tools', 'Other'];
const STAGES = ['MVP', 'Beta', 'Launched', 'Scaling'];
const INVESTOR_TYPES = [
  { value: 'angel', label: 'Angel Investor' },
  { value: 'vc_fund', label: 'VC Fund' },
  { value: 'corporate_vc', label: 'Corporate VC' },
  { value: 'accelerator', label: 'Accelerator' },
  { value: 'family_office', label: 'Family Office' }
];

export default function InvestorProfile() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: investorProfile, isLoading } = useQuery({
    queryKey: ['investorProfile', user?.id],
    queryFn: async () => {
      const profiles = await base44.entities.Investor.filter({ user_id: user.id });
      return profiles[0] || null;
    },
    enabled: !!user
  });

  const [formData, setFormData] = useState({
    investor_type: investorProfile?.investor_type || 'angel',
    investment_thesis: investorProfile?.investment_thesis || '',
    preferred_categories: investorProfile?.preferred_categories || [],
    preferred_stages: investorProfile?.preferred_stages || [],
    ticket_size_min: investorProfile?.ticket_size_min || 25000,
    ticket_size_max: investorProfile?.ticket_size_max || 250000,
    geographic_focus: investorProfile?.geographic_focus || [],
    portfolio_companies: investorProfile?.portfolio_companies || [],
    key_criteria: investorProfile?.key_criteria || [],
    looking_for: investorProfile?.looking_for || '',
    linkedin_url: investorProfile?.linkedin_url || '',
    website_url: investorProfile?.website_url || '',
    is_active: investorProfile?.is_active ?? true
  });

  const saveProfileMutation = useMutation({
    mutationFn: async (data) => {
      if (investorProfile) {
        await base44.entities.Investor.update(investorProfile.id, data);
      } else {
        await base44.entities.Investor.create({ ...data, user_id: user.id });
      }
      await base44.auth.updateMe({ is_investor: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investorProfile'] });
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      toast.success('Investor profile created!');
      navigate(createPageUrl('Profile'));
    }
  });

  const handleSave = () => {
    if (!formData.investment_thesis.trim()) {
      toast.error('Please provide your investment thesis');
      return;
    }
    if (formData.preferred_categories.length === 0) {
      toast.error('Please select at least one category');
      return;
    }
    saveProfileMutation.mutate(formData);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center">
        <button
          onClick={() => base44.auth.redirectToLogin(createPageUrl('InvestorProfile'))}
          className="px-6 py-3 bg-[#6366F1] text-white font-semibold rounded-xl hover:brightness-110 transition"
        >
          Log In
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000000] pb-20">
      <div className="sticky top-0 bg-[#000000]/95 backdrop-blur-xl z-20 border-b border-[#18181B]">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate(createPageUrl('Profile'))}
            className="w-10 h-10 rounded-full bg-[#18181B] flex items-center justify-center text-[#8E8E93] hover:text-white transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-white text-[20px] font-bold">Investor Profile</h1>
          <button
            onClick={handleSave}
            disabled={saveProfileMutation.isPending}
            className="px-5 py-2 bg-[#6366F1] text-white text-[14px] font-semibold rounded-xl hover:brightness-110 transition disabled:opacity-50"
          >
            {saveProfileMutation.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12 space-y-8">
        <section>
          <div className="flex items-center gap-3 mb-6">
            <Building2 className="w-5 h-5 text-[#6366F1]" />
            <h2 className="text-white text-[20px] font-bold">Investor Type</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {INVESTOR_TYPES.map(type => (
              <button
                key={type.value}
                onClick={() => setFormData({ ...formData, investor_type: type.value })}
                className={`p-4 rounded-xl border text-left transition ${
                  formData.investor_type === type.value
                    ? 'border-[#6366F1] bg-[#6366F1]/10 text-white'
                    : 'border-[#27272A] bg-[#0A0A0A] text-[#8E8E93] hover:border-[#3F3F46]'
                }`}
              >
                <span className="text-sm font-medium">{type.label}</span>
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center gap-3 mb-6">
            <TrendingUp className="w-5 h-5 text-[#6366F1]" />
            <h2 className="text-white text-[20px] font-bold">Investment Thesis</h2>
          </div>
          <textarea
            value={formData.investment_thesis}
            onChange={(e) => setFormData({ ...formData, investment_thesis: e.target.value })}
            placeholder="Describe your investment focus, what you look for in startups, your edge, and what excites you..."
            rows={6}
            className="w-full px-4 py-3 bg-[#0A0A0A] text-white border border-[#18181B] rounded-xl focus:outline-none focus:border-[#6366F1] placeholder:text-[#3F3F46] resize-none"
          />
        </section>

        <section>
          <h3 className="text-white text-[16px] font-semibold mb-4">Preferred Categories</h3>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => {
                  const categories = formData.preferred_categories.includes(cat)
                    ? formData.preferred_categories.filter(c => c !== cat)
                    : [...formData.preferred_categories, cat];
                  setFormData({ ...formData, preferred_categories: categories });
                }}
                className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                  formData.preferred_categories.includes(cat)
                    ? 'bg-[#6366F1] text-white'
                    : 'bg-[#18181B] text-[#8E8E93] hover:bg-[#27272A]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-white text-[16px] font-semibold mb-4">Preferred Stages</h3>
          <div className="flex flex-wrap gap-2">
            {STAGES.map(stage => (
              <button
                key={stage}
                onClick={() => {
                  const stages = formData.preferred_stages.includes(stage)
                    ? formData.preferred_stages.filter(s => s !== stage)
                    : [...formData.preferred_stages, stage];
                  setFormData({ ...formData, preferred_stages: stages });
                }}
                className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                  formData.preferred_stages.includes(stage)
                    ? 'bg-[#6366F1] text-white'
                    : 'bg-[#18181B] text-[#8E8E93] hover:bg-[#27272A]'
                }`}
              >
                {stage}
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center gap-3 mb-6">
            <DollarSign className="w-5 h-5 text-[#6366F1]" />
            <h2 className="text-white text-[20px] font-bold">Check Size</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[#8E8E93] text-sm mb-2">Minimum ($)</label>
              <input
                type="number"
                value={formData.ticket_size_min}
                onChange={(e) => setFormData({ ...formData, ticket_size_min: parseInt(e.target.value) })}
                className="w-full px-4 py-3 bg-[#0A0A0A] text-white border border-[#18181B] rounded-xl focus:outline-none focus:border-[#6366F1]"
              />
            </div>
            <div>
              <label className="block text-[#8E8E93] text-sm mb-2">Maximum ($)</label>
              <input
                type="number"
                value={formData.ticket_size_max}
                onChange={(e) => setFormData({ ...formData, ticket_size_max: parseInt(e.target.value) })}
                className="w-full px-4 py-3 bg-[#0A0A0A] text-white border border-[#18181B] rounded-xl focus:outline-none focus:border-[#6366F1]"
              />
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-white text-[16px] font-semibold mb-4">What I'm Looking For Right Now</h3>
          <textarea
            value={formData.looking_for}
            onChange={(e) => setFormData({ ...formData, looking_for: e.target.value })}
            placeholder="e.g., 'AI companies with product-market fit' or 'B2B SaaS with $50K+ MRR'"
            rows={3}
            className="w-full px-4 py-3 bg-[#0A0A0A] text-white border border-[#18181B] rounded-xl focus:outline-none focus:border-[#6366F1] placeholder:text-[#3F3F46] resize-none"
          />
        </section>

        <section>
          <div className="flex items-center gap-3 mb-6">
            <Globe className="w-5 h-5 text-[#6366F1]" />
            <h2 className="text-white text-[20px] font-bold">Links</h2>
          </div>
          <div className="space-y-3">
            <input
              type="url"
              value={formData.linkedin_url}
              onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
              placeholder="LinkedIn URL"
              className="w-full px-4 py-3 bg-[#0A0A0A] text-white border border-[#18181B] rounded-xl focus:outline-none focus:border-[#6366F1] placeholder:text-[#3F3F46]"
            />
            <input
              type="url"
              value={formData.website_url}
              onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
              placeholder="Website or Firm URL"
              className="w-full px-4 py-3 bg-[#0A0A0A] text-white border border-[#18181B] rounded-xl focus:outline-none focus:border-[#6366F1] placeholder:text-[#3F3F46]"
            />
          </div>
        </section>

        <div className="flex items-center gap-3 p-4 bg-[#0A0A0A] border border-[#18181B] rounded-xl">
          <button
            onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
            className={`w-12 h-6 rounded-full transition ${
              formData.is_active ? 'bg-[#22C55E]' : 'bg-[#3F3F46]'
            }`}
          >
            <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
              formData.is_active ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
          <div className="flex-1">
            <div className="text-white text-sm font-medium">Actively Investing</div>
            <div className="text-[#636366] text-xs">Show my profile to founders</div>
          </div>
          {formData.is_active && <CheckCircle2 className="w-5 h-5 text-[#22C55E]" />}
        </div>

        <button
          onClick={handleSave}
          disabled={saveProfileMutation.isPending}
          className="w-full py-4 bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white font-semibold rounded-xl hover:brightness-110 transition disabled:opacity-50"
        >
          {saveProfileMutation.isPending ? 'Saving...' : 'Save & Find Matches'}
        </button>
      </div>
    </div>
  );
}
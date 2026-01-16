import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
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
  const [newAlert, setNewAlert] = useState({
    name: '',
    categories: [],
    stages: [],
    keywords: [],
    min_upvotes: 0,
    notification_frequency: 'instant'
  });
  const [keywordInput, setKeywordInput] = useState('');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ['dealFlowAlerts', user?.id],
    queryFn: () => base44.entities.DealFlowAlert.filter({ investor_id: user.id }),
    enabled: !!user
  });

  const createAlertMutation = useMutation({
    mutationFn: (alertData) => base44.entities.DealFlowAlert.create({
      ...alertData,
      investor_id: user.id
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dealFlowAlerts'] });
      setShowNewAlert(false);
      setNewAlert({
        name: '',
        categories: [],
        stages: [],
        keywords: [],
        min_upvotes: 0,
        notification_frequency: 'instant'
      });
      setKeywordInput('');
      toast.success('Alert created!');
    }
  });

  const deleteAlertMutation = useMutation({
    mutationFn: (alertId) => base44.entities.DealFlowAlert.delete(alertId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dealFlowAlerts'] });
      toast.success('Alert deleted');
    }
  });

  const toggleAlertMutation = useMutation({
    mutationFn: ({ id, isActive }) => 
      base44.entities.DealFlowAlert.update(id, { is_active: !isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dealFlowAlerts'] });
    }
  });

  const handleAddKeyword = () => {
    if (keywordInput.trim() && !newAlert.keywords.includes(keywordInput.trim())) {
      setNewAlert({
        ...newAlert,
        keywords: [...newAlert.keywords, keywordInput.trim()]
      });
      setKeywordInput('');
    }
  };

  const handleRemoveKeyword = (keyword) => {
    setNewAlert({
      ...newAlert,
      keywords: newAlert.keywords.filter(k => k !== keyword)
    });
  };

  if (!user?.is_investor) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-white text-xl font-bold mb-4">Investor Access Only</h2>
          <button
            onClick={() => navigate(createPageUrl('Profile'))}
            className="px-6 py-3 bg-[#6366F1] text-white font-semibold rounded-xl hover:brightness-110 transition"
          >
            Back to Profile
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000000] pb-20">
      <div className="sticky top-0 bg-[#000000]/95 backdrop-blur-xl z-20 border-b border-[#18181B]">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate(createPageUrl('InvestorDashboard'))}
            className="w-10 h-10 rounded-full bg-[#18181B] flex items-center justify-center text-[#8E8E93] hover:text-white transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-white text-[20px] font-bold">Deal Flow Alerts</h1>
          <button
            onClick={() => setShowNewAlert(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#6366F1] text-white text-sm font-semibold rounded-xl hover:brightness-110 transition"
          >
            <Plus className="w-4 h-4" />
            New Alert
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <p className="text-[#8E8E93] text-sm mb-6">
          Get notified when startups matching your criteria post on FirstLook
        </p>

        {alerts.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-[#18181B] rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8 text-[#8E8E93]" />
            </div>
            <h3 className="text-white text-lg font-semibold mb-2">No alerts yet</h3>
            <p className="text-[#8E8E93] mb-6">Create custom alerts to never miss relevant deals</p>
            <button
              onClick={() => setShowNewAlert(true)}
              className="px-6 py-3 bg-[#6366F1] text-white font-semibold rounded-xl hover:brightness-110 transition"
            >
              Create Your First Alert
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {alerts.map(alert => (
              <div key={alert.id} className="bg-[#0A0A0A] border border-[#18181B] rounded-2xl p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-white text-lg font-bold mb-2">{alert.name}</h3>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {alert.categories?.map(cat => (
                        <span key={cat} className="px-2 py-1 bg-[#6366F1]/20 text-[#6366F1] text-xs font-medium rounded-full">
                          {cat}
                        </span>
                      ))}
                      {alert.stages?.map(stage => (
                        <span key={stage} className="px-2 py-1 bg-[#8B5CF6]/20 text-[#8B5CF6] text-xs font-medium rounded-full">
                          {stage}
                        </span>
                      ))}
                      {alert.keywords?.map(keyword => (
                        <span key={keyword} className="px-2 py-1 bg-[#22C55E]/20 text-[#22C55E] text-xs font-medium rounded-full">
                          "{keyword}"
                        </span>
                      ))}
                    </div>
                    <div className="text-[#8E8E93] text-sm">
                      Notify: {alert.notification_frequency}
                      {alert.min_upvotes > 0 && ` • Min ${alert.min_upvotes} upvotes`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleAlertMutation.mutate({ id: alert.id, isActive: alert.is_active })}
                      className="w-10 h-10 rounded-full bg-[#18181B] flex items-center justify-center hover:bg-[#27272A] transition"
                    >
                      {alert.is_active ? (
                        <Bell className="w-5 h-5 text-[#6366F1]" />
                      ) : (
                        <BellOff className="w-5 h-5 text-[#636366]" />
                      )}
                    </button>
                    <button
                      onClick={() => deleteAlertMutation.mutate(alert.id)}
                      className="w-10 h-10 rounded-full bg-[#18181B] flex items-center justify-center hover:bg-[#EF4444]/20 transition"
                    >
                      <Trash2 className="w-5 h-5 text-[#EF4444]" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Alert Modal */}
      {showNewAlert && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-30 p-4">
          <div className="bg-[#0A0A0A] border border-[#18181B] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-[#0A0A0A] border-b border-[#18181B] px-6 py-4 flex items-center justify-between">
              <h2 className="text-white text-xl font-bold">Create Deal Flow Alert</h2>
              <button
                onClick={() => setShowNewAlert(false)}
                className="w-8 h-8 rounded-full bg-[#18181B] flex items-center justify-center hover:bg-[#27272A] transition"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-white text-sm font-semibold mb-2">Alert Name</label>
                <input
                  type="text"
                  value={newAlert.name}
                  onChange={(e) => setNewAlert({ ...newAlert, name: e.target.value })}
                  placeholder="e.g., 'AI SaaS Early Stage'"
                  className="w-full px-4 py-3 bg-[#18181B] text-white border border-[#27272A] rounded-xl focus:outline-none focus:border-[#6366F1] placeholder:text-[#636366]"
                />
              </div>

              <div>
                <label className="block text-white text-sm font-semibold mb-2">Categories</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => {
                        const cats = newAlert.categories.includes(cat)
                          ? newAlert.categories.filter(c => c !== cat)
                          : [...newAlert.categories, cat];
                        setNewAlert({ ...newAlert, categories: cats });
                      }}
                      className={`px-3 py-2 rounded-full text-sm font-medium transition ${
                        newAlert.categories.includes(cat)
                          ? 'bg-[#6366F1] text-white'
                          : 'bg-[#18181B] text-[#8E8E93] hover:bg-[#27272A]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-white text-sm font-semibold mb-2">Product Stages</label>
                <div className="flex flex-wrap gap-2">
                  {STAGES.map(stage => (
                    <button
                      key={stage}
                      onClick={() => {
                        const stages = newAlert.stages.includes(stage)
                          ? newAlert.stages.filter(s => s !== stage)
                          : [...newAlert.stages, stage];
                        setNewAlert({ ...newAlert, stages });
                      }}
                      className={`px-3 py-2 rounded-full text-sm font-medium transition ${
                        newAlert.stages.includes(stage)
                          ? 'bg-[#8B5CF6] text-white'
                          : 'bg-[#18181B] text-[#8E8E93] hover:bg-[#27272A]'
                      }`}
                    >
                      {stage}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-white text-sm font-semibold mb-2">Keywords (Optional)</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddKeyword()}
                    placeholder="e.g., 'automation', 'enterprise'"
                    className="flex-1 px-4 py-2 bg-[#18181B] text-white border border-[#27272A] rounded-xl focus:outline-none focus:border-[#6366F1] placeholder:text-[#636366]"
                  />
                  <button
                    onClick={handleAddKeyword}
                    className="px-4 py-2 bg-[#6366F1] text-white font-semibold rounded-xl hover:brightness-110 transition"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {newAlert.keywords.map(keyword => (
                    <div key={keyword} className="flex items-center gap-2 px-3 py-1 bg-[#22C55E]/20 text-[#22C55E] rounded-full">
                      <span className="text-sm">"{keyword}"</span>
                      <button
                        onClick={() => handleRemoveKeyword(keyword)}
                        className="hover:text-white transition"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-white text-sm font-semibold mb-2">Minimum Upvotes</label>
                <input
                  type="number"
                  value={newAlert.min_upvotes}
                  onChange={(e) => setNewAlert({ ...newAlert, min_upvotes: parseInt(e.target.value) || 0 })}
                  min="0"
                  className="w-full px-4 py-3 bg-[#18181B] text-white border border-[#27272A] rounded-xl focus:outline-none focus:border-[#6366F1]"
                />
              </div>

              <div>
                <label className="block text-white text-sm font-semibold mb-2">Notification Frequency</label>
                <div className="flex gap-2">
                  {['instant', 'daily', 'weekly'].map(freq => (
                    <button
                      key={freq}
                      onClick={() => setNewAlert({ ...newAlert, notification_frequency: freq })}
                      className={`flex-1 px-4 py-2 rounded-xl text-sm font-medium transition ${
                        newAlert.notification_frequency === freq
                          ? 'bg-[#6366F1] text-white'
                          : 'bg-[#18181B] text-[#8E8E93] hover:bg-[#27272A]'
                      }`}
                    >
                      {freq.charAt(0).toUpperCase() + freq.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowNewAlert(false)}
                  className="flex-1 px-6 py-3 bg-[#18181B] text-white font-semibold rounded-xl hover:bg-[#27272A] transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => createAlertMutation.mutate(newAlert)}
                  disabled={!newAlert.name.trim() || createAlertMutation.isPending}
                  className="flex-1 px-6 py-3 bg-[#6366F1] text-white font-semibold rounded-xl hover:brightness-110 transition disabled:opacity-50"
                >
                  {createAlertMutation.isPending ? 'Creating...' : 'Create Alert'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
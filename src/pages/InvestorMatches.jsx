import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Sparkles, TrendingUp, Send, Eye, Loader2, Copy, Check, Edit3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';

export default function InvestorMatches() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [viewType, setViewType] = useState('for_me'); // 'for_me' or 'for_them'
  const [expandedMatch, setExpandedMatch] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

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

  const { data: founderPitches = [] } = useQuery({
    queryKey: ['founderPitches', user?.id],
    queryFn: () => base44.entities.Pitch.filter({ founder_id: user.id }),
    enabled: !!user && !investorProfile
  });

  const { data: matches = [], isLoading } = useQuery({
    queryKey: ['investorMatches', user?.id, viewType],
    queryFn: async () => {
      if (investorProfile) {
        // Investor viewing founders
        return await base44.entities.InvestorMatch.filter({ 
          investor_id: investorProfile.id 
        });
      } else if (founderPitches.length > 0) {
        // Founder viewing investors
        return await base44.entities.InvestorMatch.filter({ 
          founder_id: user.id 
        });
      }
      return [];
    },
    enabled: !!user && (!!investorProfile || founderPitches.length > 0)
  });

  const { data: allInvestors = [] } = useQuery({
    queryKey: ['allInvestors'],
    queryFn: () => base44.entities.Investor.filter({ is_active: true })
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list()
  });

  const { data: allPitches = [] } = useQuery({
    queryKey: ['allPitches'],
    queryFn: () => base44.entities.Pitch.filter({ is_published: true })
  });

  const generateMatchesMutation = useMutation({
    mutationFn: async () => {
      return await base44.functions.invoke('generateInvestorMatches', {
        userId: user.id,
        isInvestor: !!investorProfile
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investorMatches'] });
      toast.success('Matches generated!');
    },
    onError: () => {
      toast.error('Failed to generate matches');
    }
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center">
        <button
          onClick={() => base44.auth.redirectToLogin(createPageUrl('InvestorMatches'))}
          className="px-6 py-3 bg-[#6366F1] text-white font-semibold rounded-xl hover:brightness-110 transition"
        >
          Log In
        </button>
      </div>
    );
  }

  if (!investorProfile && founderPitches.length === 0) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <h2 className="text-white text-xl font-bold mb-4">Get Started with Investor Matching</h2>
          <p className="text-[#8E8E93] mb-6">
            {investorProfile === null 
              ? 'Create your investor profile to discover promising startups'
              : 'Create a pitch to get matched with relevant investors'}
          </p>
          <button
            onClick={() => navigate(investorProfile === null ? createPageUrl('InvestorProfile') : createPageUrl('RecordPitch'))}
            className="px-6 py-3 bg-[#6366F1] text-white font-semibold rounded-xl hover:brightness-110 transition"
          >
            {investorProfile === null ? 'Create Investor Profile' : 'Record Pitch'}
          </button>
        </div>
      </div>
    );
  }

  const updateOutreachMutation = useMutation({
    mutationFn: async ({ matchId, status, notes }) => {
      const updates = {
        outreach_status: status
      };
      if (status === 'sent') {
        updates.outreach_sent_at = new Date().toISOString();
      }
      if (status === 'responded') {
        updates.response_received_at = new Date().toISOString();
        updates.response_notes = notes;
      }
      return await base44.entities.InvestorMatch.update(matchId, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investorMatches'] });
      toast.success('Status updated');
    }
  });

  const handleCopyTemplate = (matchId, template) => {
    navigator.clipboard.writeText(template);
    setCopiedId(matchId);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success('Template copied to clipboard!');
  };

  const enrichedMatches = matches.map(match => {
    if (investorProfile) {
      const founder = allUsers.find(u => u.id === match.founder_id);
      const pitch = allPitches.find(p => p.id === match.pitch_id);
      return { ...match, founder, pitch };
    } else {
      const investor = allInvestors.find(inv => inv.id === match.investor_id);
      const investorUser = allUsers.find(u => u.id === investor?.user_id);
      return { ...match, investor, investorUser };
    }
  }).sort((a, b) => b.match_score - a.match_score);

  const statusColors = {
    not_started: 'bg-[#64748B]/20 text-[#64748B]',
    drafted: 'bg-[#3B82F6]/20 text-[#3B82F6]',
    sent: 'bg-[#F59E0B]/20 text-[#F59E0B]',
    responded: 'bg-[#22C55E]/20 text-[#22C55E]',
    declined: 'bg-[#EF4444]/20 text-[#EF4444]'
  };

  return (
    <div className="min-h-screen bg-[#000000] pb-20">
      <div className="sticky top-0 bg-[#000000]/95 backdrop-blur-xl z-20 border-b border-[#18181B]">
        <div className="px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate(createPageUrl('Profile'))}
            className="w-10 h-10 rounded-full bg-[rgba(255,255,255,0.06)] flex items-center justify-center text-[#8E8E93] hover:text-white transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#6366F1]" />
            <h1 className="text-white text-xl font-bold">
              {investorProfile ? 'Startup Matches' : 'Investor Matches'}
            </h1>
          </div>
          <button
            onClick={() => generateMatchesMutation.mutate()}
            disabled={generateMatchesMutation.isPending}
            className="px-4 py-2 bg-[#6366F1] text-white text-sm font-semibold rounded-lg hover:brightness-110 transition disabled:opacity-50 flex items-center gap-2"
          >
            {generateMatchesMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Refresh
              </>
            )}
          </button>
        </div>
      </div>

      <div className="px-4 py-6 max-w-4xl mx-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-[#6366F1] animate-spin" />
          </div>
        ) : enrichedMatches.length === 0 ? (
          <div className="text-center py-12">
            <TrendingUp className="w-16 h-16 text-[#636366] mx-auto mb-4" />
            <p className="text-[#8E8E93] mb-6">No matches yet. Click "Refresh" to generate matches.</p>
            <button
              onClick={() => generateMatchesMutation.mutate()}
              disabled={generateMatchesMutation.isPending}
              className="px-6 py-3 bg-[#6366F1] text-white font-semibold rounded-xl hover:brightness-110 transition disabled:opacity-50"
            >
              Generate Matches
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {enrichedMatches.map((match) => (
              <div
                key={match.id}
                className="bg-[#0A0A0A] border border-[#18181B] rounded-xl p-4 hover:border-[#27272A] transition"
              >
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {investorProfile ? (
                      match.founder?.avatar_url ? (
                        <img src={match.founder.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-white text-xl font-bold">
                          {match.founder?.display_name?.[0]?.toUpperCase() || '?'}
                        </span>
                      )
                    ) : (
                      match.investorUser?.avatar_url ? (
                        <img src={match.investorUser.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-white text-xl font-bold">
                          {match.investorUser?.display_name?.[0]?.toUpperCase() || '?'}
                        </span>
                      )
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-white font-semibold text-lg">
                        {investorProfile 
                          ? (match.pitch?.startup_name || match.founder?.display_name || 'Founder')
                          : (match.investorUser?.display_name || 'Investor')}
                      </h3>
                      <div className="flex items-center gap-1 px-2 py-0.5 bg-[#6366F1]/20 rounded-full">
                        <TrendingUp className="w-3 h-3 text-[#6366F1]" />
                        <span className="text-[#6366F1] text-xs font-bold">{match.match_score}% Match</span>
                      </div>
                    </div>

                    {investorProfile ? (
                      <p className="text-[#8E8E93] text-sm mb-3 line-clamp-2">
                        {match.pitch?.one_liner || match.founder?.bio || 'No description'}
                      </p>
                    ) : (
                      <p className="text-[#8E8E93] text-sm mb-3 line-clamp-2">
                        {match.investor?.investment_thesis || 'No description'}
                      </p>
                    )}

                    <div className="p-3 bg-[#18181B] rounded-lg mb-3">
                      <div className="flex items-start gap-2">
                        <Sparkles className="w-4 h-4 text-[#6366F1] flex-shrink-0 mt-0.5" />
                        <p className="text-[#A1A1AA] text-sm leading-relaxed">{match.match_reason}</p>
                      </div>
                    </div>

                    {match.key_alignments && match.key_alignments.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {match.key_alignments.map((alignment, idx) => (
                          <span key={idx} className="px-2 py-1 bg-[#6366F1]/10 text-[#6366F1] text-xs rounded">
                            {alignment}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Outreach Template Section - Only for founders */}
                    {!investorProfile && match.outreach_template && (
                      <div className="p-4 bg-[#18181B] rounded-xl border border-[#27272A] mb-3">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-[#EC4899]" />
                            <h4 className="text-white text-sm font-semibold">Outreach Template</h4>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 text-xs font-bold rounded ${statusColors[match.outreach_status]}`}>
                              {match.outreach_status.replace('_', ' ')}
                            </span>
                            <button
                              onClick={() => setExpandedMatch(expandedMatch === match.id ? null : match.id)}
                              className="text-[#6366F1] text-xs font-medium hover:underline"
                            >
                              {expandedMatch === match.id ? 'Hide' : 'Show'}
                            </button>
                          </div>
                        </div>

                        {expandedMatch === match.id && (
                          <>
                            <div className="p-3 bg-[#0A0A0A] rounded-lg mb-3 max-h-48 overflow-y-auto">
                              <p className="text-[#A1A1AA] text-sm leading-relaxed whitespace-pre-wrap">
                                {match.outreach_template}
                              </p>
                            </div>

                            <div className="flex gap-2 mb-3">
                              <button
                                onClick={() => handleCopyTemplate(match.id, match.outreach_template)}
                                className="flex-1 px-3 py-2 bg-[#27272A] text-white text-xs font-medium rounded-lg hover:bg-[#3F3F46] transition flex items-center justify-center gap-2"
                              >
                                {copiedId === match.id ? (
                                  <>
                                    <Check className="w-3 h-3" />
                                    Copied!
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" />
                                    Copy
                                  </>
                                )}
                              </button>
                              <button
                                onClick={() => {
                                  handleCopyTemplate(match.id, match.outreach_template);
                                  navigate(createPageUrl('Messages') + `?userId=${match.investorUser?.id}`);
                                }}
                                className="flex-1 px-3 py-2 bg-[#6366F1] text-white text-xs font-semibold rounded-lg hover:brightness-110 transition flex items-center justify-center gap-2"
                              >
                                <Edit3 className="w-3 h-3" />
                                Use & Customize
                              </button>
                            </div>

                            <div className="flex gap-2">
                              {['drafted', 'sent', 'responded', 'declined'].map(status => (
                                <button
                                  key={status}
                                  onClick={() => updateOutreachMutation.mutate({ 
                                    matchId: match.id, 
                                    status,
                                    notes: status === 'responded' ? 'Response received' : undefined
                                  })}
                                  disabled={updateOutreachMutation.isPending}
                                  className={`flex-1 px-2 py-1 text-xs font-medium rounded transition ${
                                    match.outreach_status === status
                                      ? statusColors[status]
                                      : 'bg-[#27272A] text-[#636366] hover:text-white'
                                  }`}
                                >
                                  {status.replace('_', ' ')}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(createPageUrl('Profile') + `?userId=${investorProfile ? match.founder_id : match.investorUser?.id}`)}
                        className="flex-1 px-4 py-2 bg-[#18181B] text-white text-sm font-medium rounded-lg hover:bg-[#27272A] transition flex items-center justify-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        View Profile
                      </button>
                      <button
                        onClick={() => navigate(createPageUrl('Messages') + `?userId=${investorProfile ? match.founder_id : match.investorUser?.id}`)}
                        className="flex-1 px-4 py-2 bg-[#6366F1] text-white text-sm font-semibold rounded-lg hover:brightness-110 transition flex items-center justify-center gap-2"
                      >
                        <Send className="w-4 h-4" />
                        Connect
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
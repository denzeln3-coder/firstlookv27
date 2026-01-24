import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { ArrowLeft, CheckCircle2, X, DollarSign, Target } from 'lucide-react';
import { toast } from 'sonner';

export default function IntroRequests() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [respondingTo, setRespondingTo] = useState(null);
  const [response, setResponse] = useState('');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return null;
      const { data: profile } = await supabase.from('users').select('*').eq('id', authUser.id).single();
      return { ...authUser, ...profile };
    }
  });

  const { data: requests = [] } = useQuery({
    queryKey: ['introRequests', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('intro_requests').select('*').eq('founder_id', user.id).order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user
  });

  const { data: investors = [] } = useQuery({
    queryKey: ['investors'],
    queryFn: async () => {
      const { data } = await supabase.from('users').select('*').eq('user_type', 'investor');
      return data || [];
    }
  });

  const { data: investorProfiles = [] } = useQuery({
    queryKey: ['investorProfiles'],
    queryFn: async () => {
      const { data } = await supabase.from('investor_profiles').select('*');
      return data || [];
    }
  });

  const { data: pitches = [] } = useQuery({
    queryKey: ['pitches'],
    queryFn: async () => {
      const { data } = await supabase.from('startups').select('*');
      return data || [];
    }
  });

  const respondMutation = useMutation({
    mutationFn: async ({ requestId, status, founderResponse }) => {
      const { error } = await supabase.from('intro_requests').update({ status, founder_response: founderResponse }).eq('id', requestId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['introRequests'] });
      setRespondingTo(null);
      setResponse('');
      toast.success('Response sent');
    }
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center">
        <button onClick={() => navigate('/login')} className="px-6 py-3 bg-[#6366F1] text-white font-semibold rounded-xl hover:brightness-110 transition">Log In</button>
      </div>
    );
  }

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const respondedRequests = requests.filter(r => r.status !== 'pending');

  return (
    <div className="min-h-screen bg-[#000000] pb-20">
      <div className="sticky top-0 bg-[#000000]/95 backdrop-blur-xl z-20 border-b border-[#18181B]">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <button onClick={() => navigate(createPageUrl('Profile'))} className="flex items-center gap-2 text-[#8E8E93] hover:text-white transition mb-4"><ArrowLeft className="w-5 h-5" /><span className="text-sm font-medium">Back</span></button>
          <h1 className="text-white text-2xl font-bold">Intro Requests</h1>
          <p className="text-[#8E8E93] text-sm">Investors want to connect with you</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6">
        {pendingRequests.length === 0 && respondedRequests.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[#8E8E93] text-lg">No intro requests yet</p>
            <p className="text-[#636366] text-sm mt-2">Investors will reach out when they're interested</p>
          </div>
        ) : (
          <div className="space-y-6">
            {pendingRequests.length > 0 && (
              <div>
                <h2 className="text-white text-lg font-bold mb-4">Pending ({pendingRequests.length})</h2>
                <div className="space-y-4">
                  {pendingRequests.map(request => {
                    const investor = investors.find(u => u.id === request.investor_id);
                    const investorProfile = investorProfiles.find(p => p.user_id === request.investor_id);
                    const pitch = pitches.find(p => p.id === request.pitch_id);

                    return (
                      <div key={request.id} className="bg-[#0A0A0A] border border-[#18181B] rounded-2xl p-6">
                        <div className="flex items-start gap-4 mb-4">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center overflow-hidden flex-shrink-0">
                            {investor?.avatar_url ? <img src={investor.avatar_url} alt="" className="w-full h-full object-cover" /> : <span className="text-white font-bold">{investor?.display_name?.[0]?.toUpperCase() || '?'}</span>}
                          </div>
                          <div className="flex-1">
                            <h3 className="text-white font-semibold">{investor?.display_name || investor?.full_name || 'Investor'}</h3>
                            {investorProfile && <p className="text-[#8E8E93] text-sm">Investor</p>}
                            <p className="text-[#636366] text-xs mt-1">Re: {pitch?.startup_name || pitch?.name || 'Your startup'}</p>
                          </div>
                        </div>

                        {investorProfile && (
                          <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-[#18181B] rounded-xl">
                            <div className="flex items-center gap-2">
                              <DollarSign className="w-4 h-4 text-[#8E8E93]" />
                              <div>
                                <div className="text-[#8E8E93] text-xs">Check Size</div>
                                <div className="text-white text-sm font-medium">${((investorProfile.check_size_min || 25000) / 1000).toFixed(0)}K - ${((investorProfile.check_size_max || 100000) / 1000).toFixed(0)}K</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Target className="w-4 h-4 text-[#8E8E93]" />
                              <div>
                                <div className="text-[#8E8E93] text-xs">Focus</div>
                                <div className="text-white text-sm font-medium">{investorProfile.preferred_categories?.[0] || 'Multiple'}</div>
                              </div>
                            </div>
                          </div>
                        )}

                        {request.message && (
                          <div className="mb-4 p-3 bg-[#18181B] rounded-xl">
                            <p className="text-white text-sm">{request.message}</p>
                          </div>
                        )}

                        {respondingTo === request.id ? (
                          <div className="space-y-3">
                            <textarea value={response} onChange={(e) => setResponse(e.target.value)} placeholder="Share your email, LinkedIn, or how they can reach you..." className="w-full px-3 py-2 bg-[#18181B] text-white border border-[#27272A] rounded-xl focus:outline-none focus:border-[#6366F1] resize-none" rows={3} />
                            <div className="flex gap-3">
                              <button onClick={() => { setRespondingTo(null); setResponse(''); }} className="flex-1 px-4 py-2 bg-[#27272A] text-white rounded-xl hover:bg-[#3F3F46] transition">Cancel</button>
                              <button onClick={() => respondMutation.mutate({ requestId: request.id, status: 'accepted', founderResponse: response })} disabled={!response.trim()} className="flex-1 px-4 py-2 bg-[#22C55E] text-white font-semibold rounded-xl hover:brightness-110 transition disabled:opacity-50">Accept & Share</button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-3">
                            <button onClick={() => respondMutation.mutate({ requestId: request.id, status: 'declined' })} className="flex-1 px-4 py-2 bg-[#27272A] text-white rounded-xl hover:bg-[#3F3F46] transition flex items-center justify-center gap-2"><X className="w-4 h-4" />Decline</button>
                            <button onClick={() => setRespondingTo(request.id)} className="flex-1 px-4 py-2 bg-[#22C55E] text-white font-semibold rounded-xl hover:brightness-110 transition flex items-center justify-center gap-2"><CheckCircle2 className="w-4 h-4" />Accept</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {respondedRequests.length > 0 && (
              <div>
                <h2 className="text-white text-lg font-bold mb-4">Previous ({respondedRequests.length})</h2>
                <div className="space-y-3">
                  {respondedRequests.map(request => {
                    const investor = investors.find(u => u.id === request.investor_id);
                    const pitch = pitches.find(p => p.id === request.pitch_id);

                    return (
                      <div key={request.id} className="bg-[#0A0A0A] border border-[#18181B] rounded-xl p-4 opacity-60">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center overflow-hidden">
                              {investor?.avatar_url ? <img src={investor.avatar_url} alt="" className="w-full h-full object-cover" /> : <span className="text-white text-sm font-bold">{investor?.display_name?.[0]?.toUpperCase() || '?'}</span>}
                            </div>
                            <div>
                              <div className="text-white text-sm font-semibold">{investor?.display_name || 'Investor'}</div>
                              <div className="text-[#636366] text-xs">Re: {pitch?.startup_name || pitch?.name || 'Startup'}</div>
                            </div>
                          </div>
                          <div className={`px-3 py-1 rounded-full text-xs font-semibold ${request.status === 'accepted' ? 'bg-[#22C55E]/20 text-[#22C55E]' : 'bg-[#EF4444]/20 text-[#EF4444]'}`}>{request.status}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

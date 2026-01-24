import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { ArrowLeft, Star, Plus, X } from 'lucide-react';
import { toast } from 'sonner';

export default function InvestorFeedback() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const pitchId = urlParams.get('pitchId');

  const [rating, setRating] = useState(0);
  const [strengths, setStrengths] = useState([]);
  const [improvements, setImprovements] = useState([]);
  const [detailedFeedback, setDetailedFeedback] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [shareWithFounder, setShareWithFounder] = useState(true);
  const [strengthInput, setStrengthInput] = useState('');
  const [improvementInput, setImprovementInput] = useState('');

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

  const submitFeedbackMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('investor_feedback').insert({
        pitch_id: pitchId,
        investor_id: user.id,
        rating,
        strengths,
        areas_for_improvement: improvements,
        detailed_feedback: detailedFeedback,
        is_anonymous: isAnonymous,
        shared_with_founder: shareWithFounder
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investorFeedback'] });
      toast.success('Feedback submitted!');
      navigate(createPageUrl('InvestorDashboard'));
    }
  });

  const addStrength = () => {
    if (strengthInput.trim() && !strengths.includes(strengthInput.trim())) {
      setStrengths([...strengths, strengthInput.trim()]);
      setStrengthInput('');
    }
  };

  const addImprovement = () => {
    if (improvementInput.trim() && !improvements.includes(improvementInput.trim())) {
      setImprovements([...improvements, improvementInput.trim()]);
      setImprovementInput('');
    }
  };

  if (user && user.user_type !== 'investor') {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-white text-xl font-bold mb-4">Investor Access Required</h2>
          <p className="text-[#8E8E93] mb-6">Only investors can provide feedback on pitches.</p>
          <button onClick={() => navigate(createPageUrl('Explore'))} className="px-6 py-3 bg-[#6366F1] text-white font-semibold rounded-xl hover:brightness-110 transition">Back to Explore</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000000] pb-20">
      <div className="sticky top-0 bg-[#000000]/95 backdrop-blur-xl z-20 border-b border-[#18181B]">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-[#18181B] flex items-center justify-center text-[#8E8E93] hover:text-white transition"><ArrowLeft className="w-5 h-5" /></button>
            <div>
              <h1 className="text-white text-xl font-bold">Provide Feedback</h1>
              <p className="text-[#8E8E93] text-sm">{pitch?.startup_name || pitch?.name || 'Startup'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">
        {/* Rating */}
        <div className="bg-[#0A0A0A] border border-[#18181B] rounded-xl p-6">
          <h3 className="text-white font-bold mb-3">Overall Rating</h3>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map(value => (
              <button key={value} onClick={() => setRating(value)} className="transition-transform hover:scale-110">
                <Star className={`w-10 h-10 ${rating >= value ? 'text-[#F59E0B] fill-[#F59E0B]' : 'text-[#3F3F46]'}`} />
              </button>
            ))}
          </div>
        </div>

        {/* Strengths */}
        <div className="bg-[#0A0A0A] border border-[#18181B] rounded-xl p-6">
          <h3 className="text-white font-bold mb-3">What's Working Well</h3>
          <div className="flex gap-2 mb-3">
            <input type="text" value={strengthInput} onChange={(e) => setStrengthInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addStrength())} placeholder="e.g., Clear value proposition, strong team" className="flex-1 px-4 py-3 bg-[#18181B] text-white border border-[#27272A] rounded-xl focus:outline-none focus:border-[#6366F1]" />
            <button onClick={addStrength} className="px-4 py-3 bg-[#22C55E] text-white font-semibold rounded-xl hover:brightness-110 transition"><Plus className="w-5 h-5" /></button>
          </div>
          <div className="flex flex-wrap gap-2">
            {strengths.map((strength, i) => (
              <span key={i} className="flex items-center gap-2 bg-[#22C55E]/10 text-[#22C55E] px-3 py-2 rounded-lg text-sm border border-[#22C55E]/20">
                {strength}
                <button onClick={() => setStrengths(strengths.filter((_, idx) => idx !== i))}><X className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
        </div>

        {/* Areas for Improvement */}
        <div className="bg-[#0A0A0A] border border-[#18181B] rounded-xl p-6">
          <h3 className="text-white font-bold mb-3">Areas for Improvement</h3>
          <div className="flex gap-2 mb-3">
            <input type="text" value={improvementInput} onChange={(e) => setImprovementInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addImprovement())} placeholder="e.g., Market size unclear, pricing needs work" className="flex-1 px-4 py-3 bg-[#18181B] text-white border border-[#27272A] rounded-xl focus:outline-none focus:border-[#6366F1]" />
            <button onClick={addImprovement} className="px-4 py-3 bg-[#F59E0B] text-white font-semibold rounded-xl hover:brightness-110 transition"><Plus className="w-5 h-5" /></button>
          </div>
          <div className="flex flex-wrap gap-2">
            {improvements.map((improvement, i) => (
              <span key={i} className="flex items-center gap-2 bg-[#F59E0B]/10 text-[#F59E0B] px-3 py-2 rounded-lg text-sm border border-[#F59E0B]/20">
                {improvement}
                <button onClick={() => setImprovements(improvements.filter((_, idx) => idx !== i))}><X className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
        </div>

        {/* Detailed Feedback */}
        <div className="bg-[#0A0A0A] border border-[#18181B] rounded-xl p-6">
          <h3 className="text-white font-bold mb-3">Detailed Feedback (Optional)</h3>
          <textarea value={detailedFeedback} onChange={(e) => setDetailedFeedback(e.target.value)} placeholder="Share more detailed thoughts, suggestions, or insights..." className="w-full px-4 py-3 bg-[#18181B] text-white border border-[#27272A] rounded-xl focus:outline-none focus:border-[#6366F1] resize-none" rows={6} />
        </div>

        {/* Options */}
        <div className="bg-[#0A0A0A] border border-[#18181B] rounded-xl p-6 space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={shareWithFounder} onChange={(e) => setShareWithFounder(e.target.checked)} className="w-5 h-5" />
            <div>
              <div className="text-white font-semibold">Share with founder</div>
              <div className="text-[#8E8E93] text-sm">Allow the founder to see this feedback</div>
            </div>
          </label>

          {shareWithFounder && (
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)} className="w-5 h-5" />
              <div>
                <div className="text-white font-semibold">Submit anonymously</div>
                <div className="text-[#8E8E93] text-sm">Hide your identity from the founder</div>
              </div>
            </label>
          )}
        </div>

        {/* Submit */}
        <button onClick={() => submitFeedbackMutation.mutate()} disabled={rating === 0 || submitFeedbackMutation.isPending} className="w-full py-4 bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white font-bold rounded-xl hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed">
          {submitFeedbackMutation.isPending ? 'Submitting...' : 'Submit Feedback'}
        </button>
      </div>
    </div>
  );
}

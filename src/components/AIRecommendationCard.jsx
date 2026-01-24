cat > src/components/AIRecommendationCard.jsx << 'ENDOFFILE'
import React from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { Sparkles, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';

export default function AIRecommendationCard() {
  const navigate = useNavigate();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return null;
      const { data: profile } = await supabase.from('users').select('*').eq('id', authUser.id).single();
      return { ...authUser, ...profile };
    }
  });

  if (!user) return null;

  return (
    <button
      onClick={() => navigate(createPageUrl('Recommendations'))}
      className="w-full bg-gradient-to-br from-[#6366F1]/20 to-[#8B5CF6]/20 border-2 border-[#6366F1]/40 rounded-2xl p-4 hover:from-[#6366F1]/30 hover:to-[#8B5CF6]/30 transition-all text-left mb-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#6366F1] flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-white text-sm font-semibold mb-0.5">Personalized For You</h3>
            <p className="text-[#A1A1AA] text-xs">AI-curated pitches and connections</p>
          </div>
        </div>
        <ArrowRight className="w-5 h-5 text-[#6366F1]" />
      </div>
    </button>
  );
}
ENDOFFILE
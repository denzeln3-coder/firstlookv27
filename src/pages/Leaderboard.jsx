import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Trophy, TrendingUp, Calendar, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';

export default function Leaderboard() {
  const navigate = useNavigate();
  const [timeframe, setTimeframe] = useState('week'); // week, month, all-time

  const { data: allPitches = [], isLoading } = useQuery({
    queryKey: ['pitches'],
    queryFn: async () => {
      const pitches = await base44.entities.Pitch.list('-upvote_count');
      return pitches.filter(p => p.is_published === true || !p.review_status);
    }
  });

  const { data: founderData = {} } = useQuery({
    queryKey: ['leaderboardFounders'],
    queryFn: async () => {
      const users = await base44.entities.User.list();
      return users.reduce((acc, u) => ({ ...acc, [u.id]: u }), {});
    }
  });

  const getFilteredPitches = () => {
    const now = new Date();
    const cutoffDate = new Date();

    if (timeframe === 'week') {
      cutoffDate.setDate(now.getDate() - 7);
    } else if (timeframe === 'month') {
      cutoffDate.setMonth(now.getMonth() - 1);
    } else {
      return allPitches;
    }

    return allPitches.filter(p => new Date(p.created_date) >= cutoffDate);
  };

  const topPitches = getFilteredPitches().slice(0, 50);

  return (
    <div className="min-h-screen bg-[#000000] pb-20">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 bg-[#000000]/80 backdrop-blur-xl z-20 border-b border-[rgba(255,255,255,0.06)]">
        <div className="px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate(createPageUrl('Explore'))}
            className="text-[#8E8E93] hover:text-[#FFFFFF] transition-colors duration-200"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-[#FFFFFF] text-[20px] font-bold tracking-[-0.01em]">Leaderboard</h1>
          <div className="w-5" />
        </div>

        {/* Timeframe Selector */}
        <div className="px-4 pb-4 flex gap-2">
          <button
            onClick={() => setTimeframe('week')}
            className={`flex-1 px-4 py-2 rounded-xl text-[14px] font-semibold transition-all duration-200 ${
              timeframe === 'week'
                ? 'bg-[#6366F1] text-white'
                : 'bg-[rgba(255,255,255,0.06)] text-[#8E8E93] hover:bg-[rgba(255,255,255,0.1)]'
            }`}
          >
            This Week
          </button>
          <button
            onClick={() => setTimeframe('month')}
            className={`flex-1 px-4 py-2 rounded-xl text-[14px] font-semibold transition-all duration-200 ${
              timeframe === 'month'
                ? 'bg-[#6366F1] text-white'
                : 'bg-[rgba(255,255,255,0.06)] text-[#8E8E93] hover:bg-[rgba(255,255,255,0.1)]'
            }`}
          >
            This Month
          </button>
          <button
            onClick={() => setTimeframe('all-time')}
            className={`flex-1 px-4 py-2 rounded-xl text-[14px] font-semibold transition-all duration-200 ${
              timeframe === 'all-time'
                ? 'bg-[#6366F1] text-white'
                : 'bg-[rgba(255,255,255,0.06)] text-[#8E8E93] hover:bg-[rgba(255,255,255,0.1)]'
            }`}
          >
            All Time
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="pt-32 px-4">
        {isLoading ? (
          <div className="space-y-3 max-w-2xl mx-auto">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="skeleton h-20 rounded-xl" />
            ))}
          </div>
        ) : topPitches.length === 0 ? (
          <div className="text-center py-12">
            <Trophy className="w-16 h-16 text-[#636366] mx-auto mb-4" />
            <p className="text-[#8E8E93] text-[16px]">No pitches yet</p>
          </div>
        ) : (
          <div className="space-y-2 max-w-2xl mx-auto">
            {topPitches.map((pitch, index) => {
              const founder = founderData[pitch.founder_id];
              const isTopThree = index < 3;
              
              return (
                <button
                  key={pitch.id}
                  onClick={() => {
                    localStorage.setItem('selectedPitchId', pitch.id);
                    navigate(createPageUrl('Demo'));
                  }}
                  className="w-full flex items-center gap-4 p-4 bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] rounded-2xl hover:bg-[#141414] transition-all duration-200 active:scale-[0.98]"
                  style={{
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 50%), #0A0A0A',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.5)'
                  }}
                >
                  {/* Rank */}
                  <div className="flex-shrink-0 w-8 text-center">
                    {isTopThree ? (
                      <Trophy
                        className="w-6 h-6 mx-auto"
                        style={{
                          color: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : '#CD7F32'
                        }}
                      />
                    ) : (
                      <span className="text-[#636366] text-[16px] font-bold">#{index + 1}</span>
                    )}
                  </div>

                  {/* Thumbnail */}
                  <div className="flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden">
                    {pitch.thumbnail_url ? (
                      <img
                        src={pitch.thumbnail_url}
                        alt={pitch.startup_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#6366F1] to-[#8B5CF6]">
                        <span className="text-white text-[20px] font-bold">{pitch.startup_name?.[0]?.toUpperCase()}</span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 text-left min-w-0">
                    <h3 className="text-[#FFFFFF] text-[16px] font-semibold tracking-[-0.01em] truncate">
                      {pitch.startup_name}
                    </h3>
                    <p className="text-[#8E8E93] text-[12px] truncate">
                      {founder?.display_name || founder?.username || 'Founder'}
                    </p>
                  </div>

                  {/* Upvotes */}
                  <div className="flex-shrink-0 text-right">
                    <div className="text-[#FFFFFF] text-[20px] font-bold tracking-[-0.01em]">
                      {pitch.upvote_count || 0}
                    </div>
                    <div className="text-[#636366] text-[10px] font-medium tracking-[0.04em] uppercase">
                      Upvotes
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
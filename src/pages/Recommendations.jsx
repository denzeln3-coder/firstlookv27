import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Sparkles, TrendingUp, Users, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import PitchModal from '../components/PitchModal';

export default function Recommendations() {
  const navigate = useNavigate();
  const [selectedPitch, setSelectedPitch] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch {
        return null;
      }
    }
  });

  const { data: userPitches = [] } = useQuery({
    queryKey: ['userPitches', user?.id],
    queryFn: () => base44.entities.Pitch.filter({ founder_id: user.id }),
    enabled: !!user
  });

  const { data: allPitches = [] } = useQuery({
    queryKey: ['allPitches'],
    queryFn: () => base44.entities.Pitch.filter({ is_published: true })
  });

  const { data: following = [] } = useQuery({
    queryKey: ['following', user?.id],
    queryFn: () => base44.entities.Follow.filter({ follower_id: user.id }),
    enabled: !!user
  });

  const { data: upvotes = [] } = useQuery({
    queryKey: ['userUpvotes', user?.id],
    queryFn: () => base44.entities.Upvote.filter({ user_id: user.id }),
    enabled: !!user
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list()
  });

  const { data: recommendations, isLoading: recommendationsLoading } = useQuery({
    queryKey: ['aiRecommendations', user?.id],
    queryFn: async () => {
      const userCategories = userPitches.map(p => p.category);
      const upvotedPitches = allPitches.filter(p => upvotes.some(u => u.pitch_id === p.id));
      const upvotedCategories = upvotedPitches.map(p => p.category);
      const followedUserIds = following.map(f => f.following_id);

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze user behavior and generate personalized recommendations for a startup discovery platform.

User Profile:
- Bio: ${user.bio || 'N/A'}
- Expertise: ${user.expertise?.join(', ') || 'N/A'}
- Looking for: ${user.looking_for?.join(', ') || 'N/A'}
- Created pitches in categories: ${userCategories.join(', ') || 'None'}
- Upvoted pitches in categories: ${upvotedCategories.join(', ') || 'None'}
- Following ${followedUserIds.length} users

Available Pitches (${allPitches.length} total):
${allPitches.slice(0, 20).map(p => `- ${p.startup_name} (${p.category}): ${p.one_liner}`).join('\n')}

Available Users (${allUsers.length} total):
${allUsers.slice(0, 20).map(u => `- ${u.display_name || u.username} - ${u.bio || 'No bio'} - Expertise: ${u.expertise?.join(', ') || 'N/A'}`).join('\n')}

Provide:
1. Top 5 pitch IDs to recommend (from the available pitches)
2. Top 5 user IDs to connect with (from the available users, exclude the current user and those already followed)
3. Brief reasoning for each recommendation

Consider:
- User's interests and expertise
- Complementary skills for collaboration
- Similar or related categories
- Engagement patterns`,
        response_json_schema: {
          type: "object",
          properties: {
            recommended_pitches: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  pitch_id: { type: "string" },
                  reason: { type: "string" }
                }
              }
            },
            recommended_users: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  user_id: { type: "string" },
                  reason: { type: "string" }
                }
              }
            }
          }
        }
      });

      return result;
    },
    enabled: !!user && allPitches.length > 0 && allUsers.length > 0,
    staleTime: 10 * 60 * 1000
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-white text-xl font-bold mb-4">Log in to see recommendations</h2>
          <button
            onClick={() => base44.auth.redirectToLogin(createPageUrl('Recommendations'))}
            className="px-6 py-3 bg-[#6366F1] text-white font-semibold rounded-xl hover:brightness-110 transition"
          >
            Log In
          </button>
        </div>
      </div>
    );
  }

  const recommendedPitches = recommendations?.recommended_pitches
    ?.map(rec => ({ ...allPitches.find(p => p.id === rec.pitch_id), reason: rec.reason }))
    .filter(p => p.id) || [];

  const recommendedUsers = recommendations?.recommended_users
    ?.map(rec => ({ ...allUsers.find(u => u.id === rec.user_id), reason: rec.reason }))
    .filter(u => u.id && u.id !== user.id) || [];

  return (
    <div className="min-h-screen bg-[#000000] pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-[#000000]/95 backdrop-blur-lg z-20 border-b border-[rgba(255,255,255,0.06)]">
        <div className="px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate(createPageUrl('Explore'))}
            className="w-10 h-10 rounded-full bg-[rgba(255,255,255,0.06)] flex items-center justify-center text-[#8E8E93] hover:text-white transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#6366F1]" />
            <h1 className="text-white text-xl font-bold">For You</h1>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 max-w-4xl mx-auto">
        {recommendationsLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-[#6366F1] animate-spin mb-4" />
            <p className="text-[#8E8E93] text-sm">AI is analyzing your profile...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Recommended Pitches */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-[#6366F1]" />
                <h2 className="text-white text-lg font-bold">Pitches You Might Like</h2>
              </div>
              
              {recommendedPitches.length === 0 ? (
                <p className="text-[#8E8E93] text-sm">No recommendations yet. Keep exploring!</p>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {recommendedPitches.map((pitch) => (
                    <button
                      key={pitch.id}
                      onClick={() => setSelectedPitch(pitch)}
                      className="bg-[#18181B] border border-[rgba(255,255,255,0.1)] rounded-xl p-4 hover:bg-[rgba(255,255,255,0.06)] transition text-left"
                    >
                      <div className="flex gap-3">
                        <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {pitch.thumbnail_url ? (
                            <img src={pitch.thumbnail_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-white text-xl font-bold">{pitch.startup_name?.[0]?.toUpperCase()}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-white font-semibold mb-1 line-clamp-1">{pitch.startup_name}</h3>
                          <p className="text-[#8E8E93] text-sm line-clamp-2 mb-2">{pitch.one_liner}</p>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-0.5 bg-[#6366F1]/20 text-[#6366F1] text-xs rounded">{pitch.category}</span>
                            <span className="text-[#636366] text-xs">{pitch.upvote_count || 0} upvotes</span>
                          </div>
                          {pitch.reason && (
                            <p className="text-[#6366F1] text-xs line-clamp-2">💡 {pitch.reason}</p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>

            {/* Recommended Users */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-[#6366F1]" />
                <h2 className="text-white text-lg font-bold">People to Connect With</h2>
              </div>
              
              {recommendedUsers.length === 0 ? (
                <p className="text-[#8E8E93] text-sm">No recommendations yet. Keep exploring!</p>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {recommendedUsers.map((recUser) => (
                    <button
                      key={recUser.id}
                      onClick={() => navigate(createPageUrl('Profile') + `?userId=${recUser.id}`)}
                      className="bg-[#18181B] border border-[rgba(255,255,255,0.1)] rounded-xl p-4 hover:bg-[rgba(255,255,255,0.06)] transition text-left"
                    >
                      <div className="flex gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {recUser.avatar_url ? (
                            <img src={recUser.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-white text-sm font-bold">
                              {(recUser.display_name || recUser.username)?.[0]?.toUpperCase() || '?'}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-white font-semibold mb-1">{recUser.display_name || recUser.username}</h3>
                          {recUser.bio && (
                            <p className="text-[#8E8E93] text-sm line-clamp-2 mb-2">{recUser.bio}</p>
                          )}
                          {recUser.expertise && recUser.expertise.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {recUser.expertise.slice(0, 3).map((skill, idx) => (
                                <span key={idx} className="px-2 py-0.5 bg-[#6366F1]/20 text-[#6366F1] text-xs rounded">
                                  {skill}
                                </span>
                              ))}
                            </div>
                          )}
                          {recUser.reason && (
                            <p className="text-[#6366F1] text-xs line-clamp-2">💡 {recUser.reason}</p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      {selectedPitch && (
        <PitchModal pitch={selectedPitch} onClose={() => setSelectedPitch(null)} />
      )}
    </div>
  );
}
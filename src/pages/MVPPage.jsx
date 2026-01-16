import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ExternalLink, Globe, Linkedin, Twitter, Users, Edit } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { AnimatedTestimonials } from '../components/ui/animated-testimonials';

export default function MVPPage() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const pitchId = urlParams.get('pitchId');

  const { data: pitch, isLoading: pitchLoading } = useQuery({
    queryKey: ['pitch', pitchId],
    queryFn: async () => {
      const pitches = await base44.entities.Pitch.list();
      return pitches.find(p => p.id === pitchId);
    },
    enabled: !!pitchId
  });

  const { data: teamMembers = [], isLoading: teamLoading } = useQuery({
    queryKey: ['teamMembers', pitchId],
    queryFn: () => base44.entities.TeamMember.filter({ pitch_id: pitchId }),
    enabled: !!pitchId
  });

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

  const isOwner = user && pitch && pitch.founder_id === user.id;

  if (pitchLoading || teamLoading) {
    return (
      <div className="min-h-screen bg-[#09090B] flex items-center justify-center">
        <div className="text-[#FAFAFA]">Loading...</div>
      </div>
    );
  }

  if (!pitch) {
    return (
      <div className="min-h-screen bg-[#09090B] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-[#FAFAFA] text-[24px] font-bold mb-4">MVP not found</h2>
          <button
            onClick={() => navigate(createPageUrl('Explore'))}
            className="px-6 py-3 bg-[#6366F1] text-white font-semibold rounded-lg hover:brightness-110 transition"
          >
            Back to Explore
          </button>
        </div>
      </div>
    );
  }

  const testimonialData = teamMembers.map(member => ({
    name: member.name,
    designation: member.role,
    quote: member.bio || `${member.role} at ${pitch.startup_name}`,
    src: member.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&size=500&background=6366F1&color=fff`
  }));

  return (
    <div className="min-h-screen bg-[#09090B]">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 bg-[#09090B]/95 backdrop-blur-sm z-20 px-4 py-4 flex items-center justify-between border-b border-[#27272A]">
        <button
          onClick={() => navigate(-1)}
          className="text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors duration-150"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-[#FAFAFA] text-[18px] font-semibold">{pitch.startup_name}</h1>
        {isOwner && (
          <button
            onClick={() => navigate(createPageUrl('ManageTeam') + `?pitchId=${pitch.id}`)}
            className="text-[#6366F1] hover:brightness-110 transition-all"
          >
            <Edit className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Hero Section */}
      <div className="pt-20 px-6">
        <div className="max-w-4xl mx-auto">
          {/* MVP Video/Thumbnail */}
          {pitch.video_url && (
            <div className="mb-8 rounded-2xl overflow-hidden">
              <video
                src={pitch.video_url}
                poster={pitch.thumbnail_url}
                controls
                className="w-full max-h-[500px] object-cover"
              />
            </div>
          )}

          {/* MVP Info */}
          <div className="mb-12">
            <h2 className="text-[#FAFAFA] text-[32px] font-bold mb-4">{pitch.startup_name}</h2>
            <p className="text-[#A1A1AA] text-[18px] mb-6">{pitch.one_liner}</p>
            
            <div className="flex flex-wrap gap-3 mb-6">
              <span className="px-3 py-1 bg-[#6366F1]/20 text-[#6366F1] rounded-full text-[12px] font-semibold">
                {pitch.category}
              </span>
              <span className="px-3 py-1 bg-[#22C55E]/20 text-[#22C55E] rounded-full text-[12px] font-semibold">
                {pitch.product_stage}
              </span>
            </div>

            {pitch.what_problem_do_you_solve && (
              <div className="mb-6">
                <h3 className="text-[#FAFAFA] text-[20px] font-bold mb-2">Problem We Solve</h3>
                <p className="text-[#A1A1AA] text-[16px] leading-relaxed">{pitch.what_problem_do_you_solve}</p>
              </div>
            )}

            {pitch.product_url && (
              <a
                href={pitch.product_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#6366F1] text-white font-semibold rounded-lg hover:brightness-110 transition"
              >
                <Globe className="w-5 h-5" />
                Visit Website
              </a>
            )}
          </div>

          {/* Team Section */}
          {teamMembers.length > 0 && (
            <div className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-[#FAFAFA] text-[24px] font-bold flex items-center gap-2">
                    <Users className="w-6 h-6 text-[#6366F1]" />
                    Meet Our Team
                  </h3>
                  <p className="text-[#A1A1AA] text-[14px] mt-1">
                    {teamMembers.length} {teamMembers.length === 1 ? 'member' : 'members'}
                  </p>
                </div>
                {isOwner && (
                  <button
                    onClick={() => navigate(createPageUrl('ManageTeam') + `?pitchId=${pitch.id}`)}
                    className="px-4 py-2 bg-[#27272A] text-[#FAFAFA] text-[14px] rounded-lg hover:bg-[#3F3F46] transition"
                  >
                    Manage Team
                  </button>
                )}
              </div>

              {/* Animated Team Showcase */}
              <AnimatedTestimonials testimonials={testimonialData} autoplay />

              {/* Team Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
                {teamMembers.map((member) => (
                  <div key={member.id} className="bg-[#18181B] border border-[#27272A] rounded-xl p-6">
                    <div className="flex items-start gap-4">
                      {member.photo_url ? (
                        <img src={member.photo_url} alt={member.name} className="w-16 h-16 rounded-full object-cover" />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-[#6366F1] flex items-center justify-center text-white font-bold text-[20px]">
                          {member.name[0]?.toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1">
                        <h4 className="text-[#FAFAFA] text-[18px] font-bold">{member.name}</h4>
                        <p className="text-[#6366F1] text-[14px] mb-2">{member.role}</p>
                        {member.bio && <p className="text-[#A1A1AA] text-[13px] mb-3">{member.bio}</p>}
                        <div className="flex gap-2">
                          {member.linkedin_url && (
                            <a
                              href={member.linkedin_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#A1A1AA] hover:text-[#6366F1] transition"
                            >
                              <Linkedin className="w-5 h-5" />
                            </a>
                          )}
                          {member.twitter_url && (
                            <a
                              href={member.twitter_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#A1A1AA] hover:text-[#6366F1] transition"
                            >
                              <Twitter className="w-5 h-5" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isOwner && teamMembers.length === 0 && (
            <div className="text-center py-12 bg-[#18181B] border border-[#27272A] rounded-xl">
              <Users className="w-12 h-12 text-[#71717A] mx-auto mb-4" />
              <h3 className="text-[#FAFAFA] text-[18px] font-bold mb-2">No team members yet</h3>
              <p className="text-[#A1A1AA] text-[14px] mb-4">Showcase your co-founders and team</p>
              <button
                onClick={() => navigate(createPageUrl('ManageTeam') + `?pitchId=${pitch.id}`)}
                className="px-6 py-3 bg-[#6366F1] text-white font-semibold rounded-lg hover:brightness-110 transition"
              >
                Add Team Members
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
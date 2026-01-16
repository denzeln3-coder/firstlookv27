import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, GraduationCap, Check, Clock, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const SPECIALTIES = [
  'Branding & Design',
  'Video Production',
  'Pitch Coaching',
  'Marketing Strategy',
  'Growth Hacking',
  'Fundraising',
  'Product Development',
  'Content Creation',
  'Social Media',
  'Other'
];

export default function EducatorApplication() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [specialty, setSpecialty] = useState('');
  const [bio, setBio] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const { data: existingApplication, isLoading } = useQuery({
    queryKey: ['educatorApplication', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const applications = await base44.entities.EducatorPartner.filter({ user_id: user.id });
      return applications[0] || null;
    },
    enabled: !!user?.id
  });

  const handleSubmit = async () => {
    if (!user) {
      toast.error('Please log in to apply');
      return;
    }

    if (!specialty || !bio) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (bio.length < 50) {
      toast.error('Bio must be at least 50 characters');
      return;
    }

    setIsSubmitting(true);
    try {
      await base44.entities.EducatorPartner.create({
        user_id: user.id,
        specialty: specialty,
        bio: bio.trim(),
        portfolio_url: portfolioUrl.trim(),
        status: 'pending',
        badge_type: 'educator',
        applied_at: new Date().toISOString()
      });

      queryClient.invalidateQueries({ queryKey: ['educatorApplication'] });
      toast.success('Application submitted! We\'ll review it soon.');
    } catch (error) {
      console.error('Application failed:', error);
      toast.error('Failed to submit application');
    }
    setIsSubmitting(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#6366F1] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center p-4">
        <div className="text-center">
          <GraduationCap className="w-16 h-16 text-[#6366F1] mx-auto mb-4" />
          <h1 className="text-white text-xl font-bold mb-2">Become an Educator</h1>
          <p className="text-[#8E8E93] mb-6">Please log in to apply for the Educator Partner program.</p>
          <button
            onClick={() => base44.auth.redirectToLogin(window.location.pathname)}
            className="px-6 py-3 bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white font-semibold rounded-xl hover:brightness-110 transition"
          >
            Log In to Apply
          </button>
        </div>
      </div>
    );
  }

  if (existingApplication) {
    const statusConfig = {
      pending: {
        icon: Clock,
        color: '#F59E0B',
        title: 'Application Under Review',
        message: 'We\'re reviewing your application. You\'ll hear back from us soon!'
      },
      approved: {
        icon: Check,
        color: '#10B981',
        title: 'You\'re an Educator Partner!',
        message: 'Congratulations! You can now create educational content and help other founders.'
      },
      rejected: {
        icon: X,
        color: '#EF4444',
        title: 'Application Not Approved',
        message: 'Unfortunately, your application wasn\'t approved this time. You can reapply in 30 days.'
      }
    };

    const config = statusConfig[existingApplication.status];
    const Icon = config.icon;

    return (
      <div className="min-h-screen bg-[#000000] pb-20">
        <div className="sticky top-0 bg-[#000000]/95 backdrop-blur-lg z-20 border-b border-[rgba(255,255,255,0.06)]">
          <div className="px-4 py-4 flex items-center gap-4">
            <button
              onClick={() => navigate(createPageUrl('Profile'))}
              className="w-10 h-10 rounded-full bg-[rgba(255,255,255,0.06)] flex items-center justify-center text-[#8E8E93] hover:text-white transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-white text-xl font-bold">Educator Program</h1>
          </div>
        </div>

        <div className="px-4 py-12 max-w-md mx-auto text-center">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ backgroundColor: `${config.color}20` }}
          >
            <Icon className="w-10 h-10" style={{ color: config.color }} />
          </div>
          <h2 className="text-white text-2xl font-bold mb-3">{config.title}</h2>
          <p className="text-[#8E8E93] mb-8">{config.message}</p>

          <div className="bg-[#18181B] rounded-xl p-6 text-left">
            <h3 className="text-white font-semibold mb-4">Your Application</h3>
            <div className="space-y-3">
              <div>
                <span className="text-[#8E8E93] text-sm">Specialty</span>
                <p className="text-white">{existingApplication.specialty}</p>
              </div>
              <div>
                <span className="text-[#8E8E93] text-sm">Bio</span>
                <p className="text-white">{existingApplication.bio}</p>
              </div>
              {existingApplication.portfolio_url && (
                <div>
                  <span className="text-[#8E8E93] text-sm">Portfolio</span>
                  <a
                    href={existingApplication.portfolio_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#6366F1] hover:underline block"
                  >
                    {existingApplication.portfolio_url}
                  </a>
                </div>
              )}
              <div>
                <span className="text-[#8E8E93] text-sm">Applied</span>
                <p className="text-white">
                  {new Date(existingApplication.applied_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000000] pb-20">
      <div className="sticky top-0 bg-[#000000]/95 backdrop-blur-lg z-20 border-b border-[rgba(255,255,255,0.06)]">
        <div className="px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate(createPageUrl('Profile'))}
            className="w-10 h-10 rounded-full bg-[rgba(255,255,255,0.06)] flex items-center justify-center text-[#8E8E93] hover:text-white transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-white text-xl font-bold">Become an Educator</h1>
        </div>
      </div>

      <div className="px-4 py-6 max-w-xl mx-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-[#6366F1]/20 flex items-center justify-center mx-auto mb-4">
            <GraduationCap className="w-8 h-8 text-[#6366F1]" />
          </div>
          <h2 className="text-white text-2xl font-bold mb-2">Educator Partner Program</h2>
          <p className="text-[#8E8E93]">
            Share your expertise and help founders create better content
          </p>
        </div>

        <div className="bg-[#18181B] rounded-xl p-6 mb-6">
          <h3 className="text-white font-semibold mb-4">Benefits</h3>
          <ul className="space-y-3">
            {[
              'Verified educator badge on your profile',
              'Featured placement in the Discover section',
              'Post educational tip content',
              'Help founders improve their pitches',
              'Build your reputation in the startup community'
            ].map((benefit, i) => (
              <li key={i} className="flex items-start gap-3">
                <Check className="w-5 h-5 text-[#10B981] flex-shrink-0 mt-0.5" />
                <span className="text-[#E4E4E7]">{benefit}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-[#8E8E93] text-sm font-medium mb-2">
              Specialty <span className="text-[#EF4444]">*</span>
            </label>
            <select
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              className="w-full px-4 py-3 bg-[#18181B] border border-[#3F3F46] rounded-xl text-white focus:outline-none focus:border-[#6366F1]"
            >
              <option value="">Select your specialty...</option>
              {SPECIALTIES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[#8E8E93] text-sm font-medium mb-2">
              Bio <span className="text-[#EF4444]">*</span>
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about your experience and why you'd be a great educator..."
              rows={4}
              className="w-full px-4 py-3 bg-[#18181B] border border-[#3F3F46] rounded-xl text-white focus:outline-none focus:border-[#6366F1] placeholder:text-[#71717A] resize-none"
            />
            <p className="text-[#71717A] text-xs mt-1">{bio.length}/500 characters (minimum 50)</p>
          </div>

          <div>
            <label className="block text-[#8E8E93] text-sm font-medium mb-2">
              Portfolio URL <span className="text-[#71717A]">(optional)</span>
            </label>
            <input
              type="url"
              value={portfolioUrl}
              onChange={(e) => setPortfolioUrl(e.target.value)}
              placeholder="https://your-portfolio.com"
              className="w-full px-4 py-3 bg-[#18181B] border border-[#3F3F46] rounded-xl text-white focus:outline-none focus:border-[#6366F1] placeholder:text-[#71717A]"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !specialty || bio.length < 50}
            className="w-full py-4 bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white font-semibold rounded-xl hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Application'}
          </button>
        </div>
      </div>
    </div>
  );
}
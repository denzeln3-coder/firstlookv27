import React, { useState, useEffect } from 'react';
import { Check, Twitter, Copy, Star, TrendingUp, AlertCircle, Video, FileText, HelpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';

export default function SuccessScreen({ pitchId }) {
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState(null);
  const [showFullFeedback, setShowFullFeedback] = useState(false);

  useEffect(() => {
    const storedAnalysis = localStorage.getItem('pitchAnalysis');
    if (storedAnalysis) {
      setAnalysis(JSON.parse(storedAnalysis));
      localStorage.removeItem('pitchAnalysis');
    }
  }, []);

  const requestManualReviewMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Pitch.update(pitchId, {
        manual_review_requested: true,
        manual_review_requested_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      toast.success('Manual review requested! Our team will review your pitch soon.');
    },
    onError: () => {
      toast.error('Failed to request manual review');
    }
  });

  const pitchUrl = `${window.location.origin}${createPageUrl('Explore')}?pitch=${pitchId}`;

  const handleShareTwitter = () => {
    const text = `Just submitted my startup pitch on FirstLook! Check it out:`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(pitchUrl)}`;
    window.open(twitterUrl, '_blank');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(pitchUrl);
    toast.success('Link copied!');
  };

  return (
    <div className="min-h-screen bg-[#09090B] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        {/* Success Icon */}
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#22C55E] to-[#16A34A] flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(34,197,94,0.4)]">
          <Check className="w-12 h-12 text-white" strokeWidth={3} />
        </div>

        {/* Success Message */}
        <h1 className="text-[32px] font-bold text-white mb-3">
          {analysis?.is_published ? 'Pitch Live!' : 'Pitch Submitted!'}
        </h1>
        <p className="text-[16px] text-[#A1A1AA] mb-6">
          {analysis?.is_published 
            ? 'Your pitch is now live on FirstLook!'
            : 'Your pitch has been submitted and is under review.'}
        </p>

        {/* AI Analysis Results */}
        {analysis && (
          <div className="bg-[#18181B] border border-[rgba(255,255,255,0.1)] rounded-xl p-6 mb-6 text-left">
            {/* Quality Score */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-[#FBBF24]" fill="#FBBF24" />
                <span className="text-white font-semibold">Quality Score</span>
              </div>
              <span className="text-[32px] font-bold text-white">{analysis.overall_score}</span>
            </div>

            {/* Score Breakdown */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              <div className="text-center p-2 bg-[#09090B] rounded-lg">
                <div className="text-[16px] font-bold text-white">{analysis.clarity_score}</div>
                <div className="text-[9px] text-[#A1A1AA] uppercase tracking-wide">Clarity</div>
              </div>
              <div className="text-center p-2 bg-[#09090B] rounded-lg">
                <div className="text-[16px] font-bold text-white">{analysis.completeness_score}</div>
                <div className="text-[9px] text-[#A1A1AA] uppercase tracking-wide">Complete</div>
              </div>
              <div className="text-center p-2 bg-[#09090B] rounded-lg">
                <div className="text-[16px] font-bold text-white">{analysis.market_fit_score}</div>
                <div className="text-[9px] text-[#A1A1AA] uppercase tracking-wide">Market</div>
              </div>
              {analysis.demo_effectiveness_score > 0 && (
                <div className="text-center p-2 bg-[#09090B] rounded-lg">
                  <div className="text-[16px] font-bold text-white">{analysis.demo_effectiveness_score}</div>
                  <div className="text-[9px] text-[#A1A1AA] uppercase tracking-wide">Demo</div>
                </div>
              )}
            </div>

            {/* Strengths */}
            {analysis.strengths && analysis.strengths.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-[#22C55E]" />
                  <h3 className="text-[14px] font-semibold text-white">Strengths</h3>
                </div>
                <ul className="space-y-1">
                  {analysis.strengths.slice(0, 3).map((strength, idx) => (
                    <li key={idx} className="text-[13px] text-[#A1A1AA] flex items-start gap-2">
                      <span className="text-[#22C55E] mt-1">•</span>
                      <span>{strength}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Improvements */}
            {analysis.improvements && analysis.improvements.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-[#FBBF24]" />
                  <h3 className="text-[14px] font-semibold text-white">Areas to Improve</h3>
                </div>
                <ul className="space-y-1">
                  {analysis.improvements.slice(0, 3).map((improvement, idx) => (
                    <li key={idx} className="text-[13px] text-[#A1A1AA] flex items-start gap-2">
                      <span className="text-[#FBBF24] mt-1">•</span>
                      <span>{improvement}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Pitch Description Improvements */}
            {analysis.pitch_description_improvements && analysis.pitch_description_improvements.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-[#8B5CF6]" />
                  <h3 className="text-[14px] font-semibold text-white">Pitch Description Tips</h3>
                </div>
                <ul className="space-y-1">
                  {analysis.pitch_description_improvements.slice(0, showFullFeedback ? undefined : 2).map((tip, idx) => (
                    <li key={idx} className="text-[13px] text-[#A1A1AA] flex items-start gap-2">
                      <span className="text-[#8B5CF6] mt-1">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Demo Feedback */}
            {analysis.demo_feedback && analysis.demo_feedback.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Video className="w-4 h-4 text-[#06B6D4]" />
                  <h3 className="text-[14px] font-semibold text-white">Demo Video Feedback</h3>
                </div>
                <ul className="space-y-1">
                  {analysis.demo_feedback.slice(0, showFullFeedback ? undefined : 2).map((feedback, idx) => (
                    <li key={idx} className="text-[13px] text-[#A1A1AA] flex items-start gap-2">
                      <span className="text-[#06B6D4] mt-1">•</span>
                      <span>{feedback}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Show More/Less Toggle */}
            {((analysis.pitch_description_improvements && analysis.pitch_description_improvements.length > 2) ||
              (analysis.demo_feedback && analysis.demo_feedback.length > 2) ||
              (analysis.strengths && analysis.strengths.length > 3) ||
              (analysis.improvements && analysis.improvements.length > 3)) && (
              <button
                onClick={() => setShowFullFeedback(!showFullFeedback)}
                className="text-[#6366F1] text-[12px] font-medium hover:brightness-110 transition-all mb-4"
              >
                {showFullFeedback ? 'Show Less' : 'Show All Feedback'}
              </button>
            )}

            {/* AI Message */}
            {analysis.message && (
              <div className="pt-4 border-t border-[rgba(255,255,255,0.06)]">
                <p className="text-[13px] text-[#A1A1AA] italic">"{analysis.message}"</p>
              </div>
            )}

            {/* Request Manual Review */}
            {!analysis.is_published && (
              <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.06)]">
                <button
                  onClick={() => requestManualReviewMutation.mutate()}
                  disabled={requestManualReviewMutation.isPending}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] text-white text-[13px] font-medium rounded-lg hover:bg-[rgba(255,255,255,0.1)] transition-all disabled:opacity-50"
                >
                  <HelpCircle className="w-4 h-4" />
                  Request Manual Review
                </button>
              </div>
            )}
          </div>
        )}

        {/* Share Buttons */}
        <div className="space-y-3 mb-8">
          <button
            onClick={handleShareTwitter}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-[#1DA1F2] text-white text-[16px] font-semibold rounded-xl hover:brightness-110 transition"
          >
            <Twitter className="w-5 h-5" fill="white" />
            Share on Twitter
          </button>

          <button
            onClick={handleCopyLink}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-[#18181B] border border-[rgba(255,255,255,0.1)] text-white text-[16px] font-semibold rounded-xl hover:bg-[rgba(255,255,255,0.06)] transition"
          >
            <Copy className="w-5 h-5" />
            Copy Link
          </button>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={() => navigate(createPageUrl('Profile'))}
            className="w-full py-4 bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] text-white text-[16px] font-semibold rounded-xl hover:brightness-110 transition-all duration-200 shadow-[0_4px_12px_rgba(99,102,241,0.4)]"
          >
            View My Pitch
          </button>

          <button
            onClick={() => navigate(createPageUrl('Explore'))}
            className="w-full py-4 text-[#A1A1AA] hover:text-white text-[16px] font-medium transition"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
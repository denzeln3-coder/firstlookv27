import React, { useState } from 'react';
import { ArrowLeft, Play, ExternalLink } from 'lucide-react';

export default function FinalReviewScreen({ formData, pitchBlob, demoBlob, onSubmit, onReRecordPitch, onReRecordDemo, onSkipDemo, onBack }) {
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showPitchModal, setShowPitchModal] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);

  const handleSubmit = () => {
    if (!agreedToTerms) {
      alert('Please confirm that your pitch follows FirstLook content guidelines.');
      return;
    }
    onSubmit();
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-white">
      {/* Progress */}
      <div className="h-1 bg-[#18181B]">
        <div className="h-full bg-[#6366F1]" style={{ width: '100%' }} />
      </div>

      {/* Header */}
      <div className="px-6 py-4 flex items-center justify-between border-b border-[rgba(255,255,255,0.06)]">
        <button onClick={onBack} className="text-[#A1A1AA] hover:text-white transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="text-[14px] text-[#71717A]">Step 8 of 8</span>
      </div>

      {/* Content */}
      <div className="px-6 py-8 max-w-3xl mx-auto">
        <h1 className="text-[32px] font-bold tracking-[-0.02em] mb-2">Final review</h1>
        <p className="text-[#A1A1AA] text-[16px] mb-8">Review your pitch before submitting</p>

        {/* Pitch Summary Card */}
        <div className="bg-[#18181B] border border-[rgba(255,255,255,0.1)] rounded-xl p-6 mb-6">
          <h2 className="text-[24px] font-bold mb-2">{formData.startup_name}</h2>
          <p className="text-[#A1A1AA] text-[16px] mb-4">{formData.one_liner}</p>
          <div className="flex items-center gap-4 flex-wrap">
            <span className="px-3 py-1.5 bg-[#6366F1]/20 text-[#6366F1] rounded-full text-[12px] font-medium">
              {formData.category}
            </span>
            <a
              href={formData.product_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[#6366F1] hover:text-[#818CF8] text-[14px] transition"
            >
              <span>{formData.product_url}</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Videos */}
        <div className={`grid gap-6 mb-8 ${demoBlob ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
          {/* 15-Second Pitch */}
          <div className="bg-[#18181B] border border-[rgba(255,255,255,0.1)] rounded-xl p-5">
            <h3 className="text-[16px] font-semibold mb-3">15-Second Pitch</h3>
            <button
              onClick={() => setShowPitchModal(true)}
              className="relative w-full bg-black rounded-lg overflow-hidden mb-3 group"
              style={{ aspectRatio: '9/16' }}
            >
              <video
                src={URL.createObjectURL(pitchBlob)}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/60 transition">
                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Play className="w-6 h-6 text-white ml-0.5" fill="white" />
                </div>
              </div>
            </button>
            <button
              onClick={onReRecordPitch}
              className="text-[#6366F1] hover:text-[#818CF8] text-[14px] font-medium transition"
            >
              Re-record
            </button>
          </div>

          {/* 2-Minute Demo - Optional */}
          {demoBlob && (
            <div className="bg-[#18181B] border border-[rgba(255,255,255,0.1)] rounded-xl p-5">
              <h3 className="text-[16px] font-semibold mb-3">2-Minute Demo</h3>
              <button
                onClick={() => setShowDemoModal(true)}
                className="relative w-full bg-black rounded-lg overflow-hidden mb-3 group"
                style={{ aspectRatio: '16/9' }}
              >
                <video
                  src={URL.createObjectURL(demoBlob)}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/60 transition">
                  <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Play className="w-6 h-6 text-white ml-0.5" fill="white" />
                  </div>
                </div>
              </button>
              <button
                onClick={onReRecordDemo}
                className="text-[#6366F1] hover:text-[#818CF8] text-[14px] font-medium transition"
              >
                Re-record
              </button>
            </div>
          )}

          {/* Demo Optional Notice */}
          {!demoBlob && (
            <div className="bg-[#18181B] border border-[#27272A] rounded-xl p-5 flex flex-col items-center justify-center text-center">
              <div className="text-[#636366] mb-4">
                <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-[16px] font-semibold text-white mb-1">Demo Skipped</h3>
              <p className="text-[13px] text-[#A1A1AA] mb-4">You can add a demo later from your profile</p>
              <button
                onClick={onSkipDemo}
                className="text-[#6366F1] hover:text-[#818CF8] text-[13px] font-medium transition"
              >
                Add Demo Now
              </button>
            </div>
          )}
        </div>

        {/* Terms Checkbox */}
        <label className="flex items-start gap-3 cursor-pointer mb-8 p-4 bg-[#18181B] border border-[rgba(255,255,255,0.1)] rounded-xl">
          <input
            type="checkbox"
            checked={agreedToTerms}
            onChange={(e) => setAgreedToTerms(e.target.checked)}
            className="mt-0.5 w-5 h-5 rounded border-[#3F3F46] bg-transparent accent-[#6366F1]"
          />
          <span className="text-[14px] text-[#A1A1AA]">
            I confirm this pitch follows{' '}
            <a href="#" className="text-[#6366F1] hover:text-[#818CF8] transition">
              FirstLook's content guidelines
            </a>
          </span>
        </label>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={!agreedToTerms}
          className="w-full py-4 bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] text-white text-[18px] font-semibold rounded-xl hover:brightness-110 transition-all duration-200 shadow-[0_4px_12px_rgba(99,102,241,0.4)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:brightness-100"
        >
          Submit Pitch
        </button>
      </div>

      {/* Pitch Preview Modal */}
      {showPitchModal && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-6" onClick={() => setShowPitchModal(false)}>
          <div className="relative max-w-md w-full" style={{ aspectRatio: '9/16' }} onClick={(e) => e.stopPropagation()}>
            <video
              src={URL.createObjectURL(pitchBlob)}
              controls
              autoPlay
              className="w-full h-full rounded-lg"
            />
            <button
              onClick={() => setShowPitchModal(false)}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/80 transition"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Demo Preview Modal */}
      {showDemoModal && demoBlob && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-6" onClick={() => setShowDemoModal(false)}>
          <div className="relative max-w-4xl w-full" style={{ aspectRatio: '16/9' }} onClick={(e) => e.stopPropagation()}>
            <video
              src={URL.createObjectURL(demoBlob)}
              controls
              autoPlay
              className="w-full h-full rounded-lg"
            />
            <button
              onClick={() => setShowDemoModal(false)}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/80 transition"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Palette, Clock, Sparkles } from 'lucide-react';

export default function BrandKitEditor() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#000000]">
      {/* Header */}
      <div className="sticky top-0 bg-[#000000]/95 backdrop-blur-lg z-20 border-b border-[rgba(255,255,255,0.06)]">
        <div className="px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-[rgba(255,255,255,0.06)] flex items-center justify-center text-[#8E8E93] hover:text-white transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-white text-xl font-bold">Brand Kit</h1>
            <p className="text-[#8E8E93] text-sm">Save your brand identity</p>
          </div>
        </div>
      </div>

      {/* Coming Soon Content */}
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-6">
        <div className="text-center max-w-md">
          {/* Icon */}
          <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-[#8B5CF6]/20 to-[#EC4899]/20 flex items-center justify-center">
            <Palette className="w-12 h-12 text-[#8B5CF6]" />
          </div>
          
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 rounded-full mb-6">
            <Sparkles className="w-4 h-4 text-[#8B5CF6]" />
            <span className="text-[#8B5CF6] text-sm font-semibold">Coming Soon</span>
          </div>
          
          {/* Title */}
          <h2 className="text-white text-2xl font-bold mb-3">
            Brand Kit Editor
          </h2>
          
          {/* Description */}
          <p className="text-[#8E8E93] text-base mb-8 leading-relaxed">
            Soon you'll be able to save your brand colors, fonts, and logo to create 
            consistent, professional-looking content across all your pitches.
          </p>

          {/* Features Preview */}
          <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-6 mb-8">
            <h3 className="text-white font-semibold mb-4 text-left">What's coming:</h3>
            <ul className="space-y-3 text-left">
              {[
                'Upload your company logo',
                'Save primary & secondary brand colors',
                'Choose from premium fonts',
                'Preview your brand in real-time',
                'Apply brand kit to all your pitches'
              ].map((feature, i) => (
                <li key={i} className="flex items-center gap-3 text-[#A1A1AA] text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6]" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {/* Color Preview Mockup */}
          <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-4 mb-8">
            <div className="flex items-center gap-3 justify-center">
              <div className="w-10 h-10 rounded-lg bg-[#6366F1]" />
              <div className="w-10 h-10 rounded-lg bg-[#8B5CF6]" />
              <div className="w-10 h-10 rounded-lg bg-[#EC4899]" />
              <div className="w-10 h-10 rounded-lg bg-[#F59E0B]" />
              <div className="w-10 h-10 rounded-lg bg-[#10B981]" />
            </div>
            <p className="text-[#636366] text-xs mt-3">Your brand colors will appear here</p>
          </div>

          {/* Go Back Button */}
          <div className="flex flex-col gap-3">
            <button 
              onClick={() => navigate(-1)}
              className="w-full py-3 bg-[#8B5CF6] text-white rounded-xl font-semibold hover:brightness-110 transition"
            >
              Go Back
            </button>
            <p className="text-[#636366] text-xs flex items-center justify-center gap-1">
              <Clock className="w-3 h-3" />
              We'll notify you when it's ready
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

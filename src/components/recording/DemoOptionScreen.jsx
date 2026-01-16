import React from 'react';
import { Video, Upload, SkipForward } from 'lucide-react';

export default function DemoOptionScreen({ onRecordDemo, onUploadDemo, onSkipDemo, onBack }) {
  return (
    <div className="min-h-screen bg-[#09090B] flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        <button
          onClick={onBack}
          className="mb-8 text-[#8E8E93] hover:text-white text-[14px] font-semibold flex items-center gap-2 transition"
        >
          ← Back
        </button>

        <div className="bg-[#18181B] border border-[rgba(255,255,255,0.06)] rounded-2xl p-8">
          <h1 className="text-[32px] font-bold text-white mb-2">Demo Video (Optional)</h1>
          <p className="text-[#8E8E93] text-[16px] mb-8">
            Recommended but not required. Show your product in action to boost engagement.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {/* Record Demo */}
            <button
              onClick={() => onRecordDemo('video')}
              className="p-6 bg-[rgba(99,102,241,0.1)] border border-[#6366F1]/30 rounded-xl hover:bg-[rgba(99,102,241,0.2)] hover:border-[#6366F1]/50 transition group"
            >
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-[#6366F1]/20 flex items-center justify-center group-hover:bg-[#6366F1]/30 transition">
                  <Video className="w-6 h-6 text-[#6366F1]" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-[16px] mb-1">Record Demo</h3>
                  <p className="text-[#A1A1AA] text-[13px]">Record a fresh demo video</p>
                </div>
              </div>
            </button>

            {/* Upload Demo */}
            <button
              onClick={() => onUploadDemo()}
              className="p-6 bg-[rgba(139,92,246,0.1)] border border-[#8B5CF6]/30 rounded-xl hover:bg-[rgba(139,92,246,0.2)] hover:border-[#8B5CF6]/50 transition group"
            >
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-[#8B5CF6]/20 flex items-center justify-center group-hover:bg-[#8B5CF6]/30 transition">
                  <Upload className="w-6 h-6 text-[#8B5CF6]" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-[16px] mb-1">Upload Demo</h3>
                  <p className="text-[#A1A1AA] text-[13px]">Upload existing demo video</p>
                </div>
              </div>
            </button>
          </div>

          {/* Skip Demo */}
          <button
            onClick={onSkipDemo}
            className="w-full py-3 bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)] rounded-xl text-white font-semibold hover:bg-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.15)] transition flex items-center justify-center gap-2"
          >
            <SkipForward className="w-4 h-4" />
            Skip Demo & Submit Pitch
          </button>

          <p className="text-center text-[#636366] text-[12px] mt-6">
            You can always add a demo later from your profile
          </p>
        </div>
      </div>
    </div>
  );
}
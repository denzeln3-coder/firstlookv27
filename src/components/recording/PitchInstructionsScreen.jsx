import React, { useState } from 'react';
import { ArrowLeft, Video, Clock } from 'lucide-react';

export default function PitchInstructionsScreen({ onStart, onBack, onSkip }) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleStart = () => {
    if (dontShowAgain) {
      localStorage.setItem('hidePitchInstructions', 'true');
    }
    onStart();
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-white overflow-auto pb-20">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 bg-[#09090B]/80 backdrop-blur-xl z-10 px-4 py-4 flex items-center justify-between border-b border-[rgba(255,255,255,0.06)]">
        <button onClick={onBack} className="text-[#A1A1AA] hover:text-white transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
        {onSkip && (
          <button onClick={onSkip} className="text-[#6366F1] hover:text-[#818CF8] text-[14px] font-medium transition">
            Skip to Demo
          </button>
        )}
      </div>

      {/* Content */}
      <div className="pt-20 px-6 max-w-2xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="text-[48px] mb-3">🎬</div>
          <h1 className="text-[28px] font-bold tracking-[-0.02em] mb-2">Record Your 15-Second Pitch</h1>
          <p className="text-[#A1A1AA] text-[16px]">This is your hook — make them want to learn more</p>
        </div>

        {/* Format Box */}
        <div className="bg-[#18181B] border border-[rgba(255,255,255,0.1)] rounded-xl p-4 mb-8">
          <div className="flex items-center justify-around text-center">
            <div>
              <Video className="w-6 h-6 text-[#A1A1AA] mx-auto mb-2" />
              <div className="text-[12px] text-[#A1A1AA]">Front Camera</div>
            </div>
            <div className="w-px h-10 bg-[rgba(255,255,255,0.1)]" />
            <div>
              <div className="text-[18px] font-bold mb-1">9:16</div>
              <div className="text-[12px] text-[#A1A1AA]">Vertical Video</div>
            </div>
            <div className="w-px h-10 bg-[rgba(255,255,255,0.1)]" />
            <div>
              <Clock className="w-6 h-6 text-[#A1A1AA] mx-auto mb-2" />
              <div className="text-[12px] text-[#A1A1AA]">15 seconds max</div>
            </div>
          </div>
        </div>

        {/* Structure Section */}
        <div className="mb-8">
          <h2 className="text-[20px] font-semibold mb-4">What to cover:</h2>
          
          <div className="space-y-3">
            {/* Card 1 */}
            <div className="bg-[#18181B] border border-[rgba(255,255,255,0.1)] rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#6366F1] flex items-center justify-center text-[14px] font-bold flex-shrink-0">1</div>
                <div className="flex-1">
                  <div className="text-[12px] text-[#6366F1] font-medium mb-1">0-5 sec</div>
                  <div className="text-[16px] font-semibold mb-2">What is it?</div>
                  <div className="text-[14px] text-[#A1A1AA] mb-2">State your product name and what it does in one sentence.</div>
                  <div className="text-[13px] text-[#71717A] italic">"I'm building FirstLook — TikTok for startup discovery."</div>
                </div>
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-[#18181B] border border-[rgba(255,255,255,0.1)] rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#8B5CF6] flex items-center justify-center text-[14px] font-bold flex-shrink-0">2</div>
                <div className="flex-1">
                  <div className="text-[12px] text-[#8B5CF6] font-medium mb-1">5-10 sec</div>
                  <div className="text-[16px] font-semibold mb-2">What problem do you solve?</div>
                  <div className="text-[14px] text-[#A1A1AA] mb-2">Explain the pain point you're addressing.</div>
                  <div className="text-[13px] text-[#71717A] italic">"Founders post everywhere but get lost in the noise."</div>
                </div>
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-[#18181B] border border-[rgba(255,255,255,0.1)] rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#EC4899] flex items-center justify-center text-[14px] font-bold flex-shrink-0">3</div>
                <div className="flex-1">
                  <div className="text-[12px] text-[#EC4899] font-medium mb-1">10-15 sec</div>
                  <div className="text-[16px] font-semibold mb-2">Why should I care?</div>
                  <div className="text-[14px] text-[#A1A1AA] mb-2">Give them a reason to watch your demo.</div>
                  <div className="text-[13px] text-[#71717A] italic">"We help the best startups get discovered."</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tips Section */}
        <div className="mb-8">
          <h2 className="text-[20px] font-semibold mb-4">Pro tips:</h2>
          <div className="bg-[#18181B] border border-[rgba(255,255,255,0.1)] rounded-xl p-5 space-y-3">
            <div className="flex items-start gap-3">
              <span className="text-[#22C55E] text-[18px]">✓</span>
              <span className="text-[14px] text-[#A1A1AA]">Look directly at the camera</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-[#22C55E] text-[18px]">✓</span>
              <span className="text-[14px] text-[#A1A1AA]">Good lighting (face a window)</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-[#22C55E] text-[18px]">✓</span>
              <span className="text-[14px] text-[#A1A1AA]">Speak clearly and confidently</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-[#22C55E] text-[18px]">✓</span>
              <span className="text-[14px] text-[#A1A1AA]">Show energy — you're selling your vision</span>
            </div>
            <div className="w-full h-px bg-[rgba(255,255,255,0.06)] my-2" />
            <div className="flex items-start gap-3">
              <span className="text-[#EF4444] text-[18px]">✗</span>
              <span className="text-[14px] text-[#A1A1AA]">Don't read from a script (sounds robotic)</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-[#EF4444] text-[18px]">✗</span>
              <span className="text-[14px] text-[#A1A1AA]">Don't include logos or graphics (this is about YOU)</span>
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <button
          onClick={handleStart}
          className="w-full py-4 bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] text-white text-[16px] font-semibold rounded-xl hover:brightness-110 transition-all duration-200 shadow-[0_4px_12px_rgba(99,102,241,0.4)] mb-4"
        >
          Start Recording
        </button>

        {/* Checkbox */}
        <label className="flex items-center gap-3 justify-center cursor-pointer mb-8">
          <input
            type="checkbox"
            checked={dontShowAgain}
            onChange={(e) => setDontShowAgain(e.target.checked)}
            className="w-4 h-4 rounded border-[#3F3F46] bg-transparent accent-[#6366F1]"
          />
          <span className="text-[14px] text-[#71717A]">Don't show this again</span>
        </label>
      </div>
    </div>
  );
}
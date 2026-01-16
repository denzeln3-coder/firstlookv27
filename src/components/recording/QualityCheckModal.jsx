import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

export default function QualityCheckModal({ type, onReRecord, onContinue }) {
  const pitchChecks = [
    'Is your face clearly visible?',
    'Is the audio clear?',
    'Did you cover all 3 sections?'
  ];

  const demoChecks = [
    'Is the screen content readable?',
    'Is your voiceover clear?',
    'Did you show the core product flow?'
  ];

  const checks = type === 'pitch' ? pitchChecks : demoChecks;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#18181B] border border-[rgba(255,255,255,0.1)] rounded-2xl p-6 max-w-md w-full">
        <h3 className="text-[22px] font-bold text-white mb-2">Quick Quality Check</h3>
        <p className="text-[14px] text-[#A1A1AA] mb-6">
          Make sure your {type === 'pitch' ? 'pitch' : 'demo'} meets these requirements:
        </p>

        <div className="space-y-4 mb-8">
          {checks.map((check, idx) => (
            <div key={idx} className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-[#22C55E] flex-shrink-0 mt-0.5" />
              <span className="text-[15px] text-white">{check}</span>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onReRecord}
            className="flex-1 py-3 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] text-white text-[14px] font-semibold rounded-xl hover:bg-[rgba(255,255,255,0.1)] transition"
          >
            Re-record
          </button>
          <button
            onClick={onContinue}
            className="flex-1 py-3 bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] text-white text-[14px] font-semibold rounded-xl hover:brightness-110 transition"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
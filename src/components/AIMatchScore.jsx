import React from 'react';
import { Sparkles } from 'lucide-react';

export default function AIMatchScore({ score, reasons }) {
  if (!score || score < 60) return null;

  const getScoreColor = (score) => {
    if (score >= 90) return 'from-[#22C55E] to-[#10B981]';
    if (score >= 75) return 'from-[#6366F1] to-[#8B5CF6]';
    return 'from-[#8B5CF6] to-[#A855F7]';
  };

  return (
    <div className="absolute top-2 right-2 z-10">
      <div className={`px-3 py-1.5 rounded-full bg-gradient-to-r ${getScoreColor(score)} flex items-center gap-1.5 shadow-lg`}>
        <Sparkles className="w-3.5 h-3.5 text-white" />
        <span className="text-white text-xs font-bold">{score}% Match</span>
      </div>
      {reasons && reasons.length > 0 && (
        <div className="absolute top-full right-0 mt-2 bg-black/90 backdrop-blur-sm border border-[#27272A] rounded-lg p-3 min-w-[200px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <p className="text-white text-xs font-semibold mb-2">Why this matches:</p>
          <ul className="space-y-1">
            {reasons.map((reason, i) => (
              <li key={i} className="text-[#8E8E93] text-xs flex items-start gap-1">
                <span className="text-[#6366F1]">•</span>
                {reason}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
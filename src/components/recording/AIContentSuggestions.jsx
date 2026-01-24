import React, { useState } from 'react';
import { Lightbulb, X, RefreshCw } from 'lucide-react';

export default function AIContentSuggestions({ script, pitchData }) {
  const [suggestions, setSuggestions] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const analyzePitch = async () => {
    setIsLoading(true);
    // AI analysis coming soon - using placeholder suggestions
    setTimeout(() => {
      setSuggestions({
        suggestions: [
          { type: 'Hook', suggestion: 'Start with a compelling question or surprising statistic to grab attention immediately.', priority: 'high' },
          { type: 'Value Proposition', suggestion: 'Clearly state the unique benefit your product offers in the first 5 seconds.', priority: 'high' },
          { type: 'Call to Action', suggestion: 'End with a clear, specific ask - what do you want viewers to do next?', priority: 'medium' }
        ],
        overall_score: 7
      });
      setShowSuggestions(true);
      setIsLoading(false);
    }, 1000);
  };

  if (isLoading) {
    return (
      <div className="bg-[#18181B] border border-[#27272A] rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-[#6366F1]/20 border-t-[#6366F1] rounded-full animate-spin" />
          <span className="text-[#71717A] text-[13px]">Analyzing your pitch...</span>
        </div>
      </div>
    );
  }

  if (!suggestions || !showSuggestions) {
    return (
      <button onClick={analyzePitch} className="w-full py-3 bg-[#18181B] border border-[#27272A] rounded-xl text-[#6366F1] text-sm font-medium hover:bg-[#27272A] transition flex items-center justify-center gap-2">
        <Lightbulb className="w-4 h-4" />Get AI Suggestions
      </button>
    );
  }

  const getPriorityColor = (priority) => {
    if (priority === 'high') return 'text-[#EF4444]';
    if (priority === 'medium') return 'text-[#F59E0B]';
    return 'text-[#22C55E]';
  };

  return (
    <div className="bg-gradient-to-br from-[#6366F1]/10 to-[#8B5CF6]/10 border border-[#6366F1]/20 rounded-xl p-5 relative">
      <button onClick={() => setShowSuggestions(false)} className="absolute top-4 right-4 text-[#71717A] hover:text-white transition"><X className="w-4 h-4" /></button>

      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="w-5 h-5 text-[#6366F1]" />
        <h3 className="text-[#FAFAFA] text-[16px] font-semibold">AI Suggestions</h3>
        {suggestions.overall_score && <span className="ml-auto text-[#6366F1] text-[14px] font-bold">Score: {suggestions.overall_score}/10</span>}
      </div>

      <div className="space-y-3">
        {suggestions.suggestions?.map((suggestion, idx) => (
          <div key={idx} className="bg-[#18181B]/50 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <span className={`text-[10px] font-bold uppercase ${getPriorityColor(suggestion.priority)}`}>{suggestion.priority}</span>
              <div className="flex-1">
                <div className="text-[#8B5CF6] text-[12px] font-semibold mb-1">{suggestion.type}</div>
                <p className="text-[#A1A1AA] text-[13px] leading-relaxed">{suggestion.suggestion}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button onClick={analyzePitch} className="mt-4 w-full py-2 bg-[#27272A] text-[#6366F1] text-[13px] font-medium rounded-lg hover:bg-[#3F3F46] transition flex items-center justify-center gap-2">
        <RefreshCw className="w-4 h-4" />Re-analyze
      </button>
    </div>
  );
}

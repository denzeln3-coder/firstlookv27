import React, { useState } from 'react';
import { Wand2, Loader2, Volume2, Scissors, Maximize2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AIEnhancementPanel({ project, onUpdate }) {
  const [processing, setProcessing] = useState(null);

  const enhancements = [
    { id: 'auto_reframe', icon: Maximize2, title: 'Auto Reframe', description: 'AI reframes to keep subjects centered', color: '#6366F1' },
    { id: 'noise_reduction', icon: Volume2, title: 'Noise Reduction', description: 'Remove background noise from audio', color: '#8B5CF6' },
    { id: 'silence_removal', icon: Scissors, title: 'Remove Silences', description: 'Cut out pauses and dead air', color: '#A855F7' },
    { id: 'text_suggestions', icon: Wand2, title: 'Text Overlay AI', description: 'Suggest optimal text placements & styles', color: '#EC4899' }
  ];

  const handleEnhance = async (enhancementId) => {
    setProcessing(enhancementId);
    toast.info('Processing video...');
    // AI enhancement functionality coming soon
    setTimeout(() => {
      toast.success('Enhancement feature coming soon!');
      setProcessing(null);
    }, 1000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Wand2 className="w-5 h-5 text-[#6366F1]" />
        <h3 className="text-white font-semibold">AI Enhancements</h3>
      </div>
      <div className="space-y-3">
        {enhancements.map((enhancement) => {
          const Icon = enhancement.icon;
          const isProcessing = processing === enhancement.id;
          return (
            <button key={enhancement.id} onClick={() => handleEnhance(enhancement.id)} disabled={isProcessing} className="w-full p-4 bg-[#18181B] border border-[#27272A] rounded-xl hover:border-[#3F3F46] transition text-left disabled:opacity-50">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${enhancement.color}20` }}>
                  {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" style={{ color: enhancement.color }} /> : <Icon className="w-5 h-5" style={{ color: enhancement.color }} />}
                </div>
                <div className="flex-1">
                  <div className="text-white font-medium text-sm mb-1">{enhancement.title}</div>
                  <div className="text-[#636366] text-xs">{enhancement.description}</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
      <div className="p-3 bg-[#6366F1]/10 border border-[#6366F1]/20 rounded-lg">
        <div className="text-[#6366F1] text-xs font-medium mb-1">✨ Pro Tip</div>
        <div className="text-[#A1A1AA] text-xs">Apply enhancements before exporting for best results. Processing may take 1-2 minutes per enhancement.</div>
      </div>
    </div>
  );
}

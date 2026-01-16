import React, { useState, useEffect } from 'react';
import { Sparkles, CheckCircle2, AlertCircle, Info } from 'lucide-react';

export default function RealtimeAIFeedback({ timeLeft, recordingState, recordingType }) {
  const [currentTip, setCurrentTip] = useState(null);
  const [tipType, setTipType] = useState('info'); // info, success, warning

  useEffect(() => {
    if (recordingState !== 'recording') return;

    const elapsed = recordingType === 'pitch' ? 15 - timeLeft : 120 - timeLeft;
    
    if (recordingType === 'pitch') {
      // 15-second pitch tips
      if (elapsed === 2) {
        setCurrentTip('Start with your product name');
        setTipType('info');
      } else if (elapsed === 5) {
        setCurrentTip('Great start! Now explain the problem');
        setTipType('success');
      } else if (elapsed === 10) {
        setCurrentTip('Make it clear why they should care');
        setTipType('info');
      } else if (timeLeft === 3) {
        setCurrentTip('Strong finish - call to action!');
        setTipType('warning');
      }
    } else {
      // 2-minute demo tips
      if (elapsed === 5) {
        setCurrentTip('Good pace - make sure audio is clear');
        setTipType('success');
      } else if (elapsed === 20) {
        setCurrentTip('Highlight the key problem now');
        setTipType('info');
      } else if (elapsed === 60) {
        setCurrentTip('Show your solution - this is the core!');
        setTipType('info');
      } else if (elapsed === 90) {
        setCurrentTip('Emphasize what makes you different');
        setTipType('info');
      } else if (timeLeft === 20) {
        setCurrentTip('Wrap up with a strong call to action');
        setTipType('warning');
      }
    }
  }, [timeLeft, recordingState, recordingType]);

  if (!currentTip || recordingState !== 'recording') return null;

  const icons = {
    info: <Info className="w-4 h-4" />,
    success: <CheckCircle2 className="w-4 h-4" />,
    warning: <AlertCircle className="w-4 h-4" />
  };

  const colors = {
    info: 'bg-[#6366F1]/90 border-[#818CF8]/50',
    success: 'bg-[#22C55E]/90 border-[#34D399]/50',
    warning: 'bg-[#FBBF24]/90 border-[#FCD34D]/50'
  };

  return (
    <div 
      className={`px-4 py-2.5 rounded-xl border backdrop-blur-xl flex items-center gap-2 ${colors[tipType]} shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-300`}
      style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
    >
      <Sparkles className="w-4 h-4 text-white" />
      {icons[tipType]}
      <span className="text-white text-[13px] font-medium">{currentTip}</span>
    </div>
  );
}
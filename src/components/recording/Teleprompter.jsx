import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronUp, ChevronDown, Settings, RotateCcw } from 'lucide-react';

const SCRIPT_TEMPLATES = {
  standard: {
    name: 'Standard Pitch',
    sections: [
      { time: 5, label: 'Hook', prompt: "Hi, I'm [Name], founder of [Startup].\nWe're building [one-liner]." },
      { time: 5, label: 'Problem', prompt: "The problem is [specific pain point].\n[Who] struggles with [what] every day." },
      { time: 5, label: 'Solution', prompt: "We solve this by [your solution].\nUnlike [alternatives], we [key differentiator]." }
    ]
  },
  traction: {
    name: 'Traction Focus',
    sections: [
      { time: 4, label: 'Intro', prompt: "I'm [Name] from [Startup].\nWe help [audience] do [outcome]." },
      { time: 4, label: 'Problem', prompt: "[X%] of [market] face [problem].\nThis costs them [time/money]." },
      { time: 4, label: 'Solution', prompt: "Our platform [key feature].\nIn just [time], users can [benefit]." },
      { time: 3, label: 'Traction', prompt: "We've grown to [metric] in [time].\n[Social proof or milestone]." }
    ]
  },
  investor: {
    name: 'Investor Pitch',
    sections: [
      { time: 3, label: 'Hook', prompt: "[Startup] is [category] for [audience]." },
      { time: 4, label: 'Market', prompt: "The [market] is worth $[X]B.\n[Trend] is driving growth." },
      { time: 4, label: 'Solution', prompt: "We're the only platform that [unique value].\nOur tech [competitive advantage]." },
      { time: 4, label: 'Traction', prompt: "[Revenue/Users] growing [X]% MoM.\nBacked by [investors/advisors]." }
    ]
  },
  storyteller: {
    name: 'Story Format',
    sections: [
      { time: 5, label: 'Story', prompt: "Last year, I faced [personal problem].\nI tried everything but nothing worked." },
      { time: 5, label: 'Discovery', prompt: "That's when I built [Startup].\nNow [outcome] is possible for everyone." },
      { time: 5, label: 'Vision', prompt: "Join [X] others who [benefit].\nCheck us out at [website]." }
    ]
  }
};

export default function Teleprompter({ 
  isVisible, 
  onClose, 
  timeLeft, 
  maxTime = 15,
  isRecording,
  startupName = '',
  oneLiner = ''
}) {
  const [selectedTemplate, setSelectedTemplate] = useState('standard');
  const [scrollSpeed, setScrollSpeed] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [customScript, setCustomScript] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const scrollRef = useRef(null);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);

  const template = SCRIPT_TEMPLATES[selectedTemplate];
  
  // Calculate current section based on time
  useEffect(() => {
    if (!isRecording) {
      setCurrentSectionIndex(0);
      return;
    }
    
    const elapsed = maxTime - timeLeft;
    let accumulatedTime = 0;
    
    for (let i = 0; i < template.sections.length; i++) {
      accumulatedTime += template.sections[i].time;
      if (elapsed < accumulatedTime) {
        setCurrentSectionIndex(i);
        return;
      }
    }
    setCurrentSectionIndex(template.sections.length - 1);
  }, [timeLeft, isRecording, template, maxTime]);

  // Auto-scroll effect
  useEffect(() => {
    if (!scrollRef.current || !isRecording) return;
    
    const container = scrollRef.current;
    const progress = (maxTime - timeLeft) / maxTime;
    const maxScroll = container.scrollHeight - container.clientHeight;
    
    container.scrollTo({
      top: maxScroll * progress * scrollSpeed,
      behavior: 'smooth'
    });
  }, [timeLeft, isRecording, scrollSpeed, maxTime]);

  // Replace placeholders with actual data
  const processScript = (text) => {
    return text
      .replace(/\[Startup\]/g, startupName || '[Startup]')
      .replace(/\[one-liner\]/g, oneLiner || '[one-liner]');
  };

  if (!isVisible) return null;

  const currentSection = template.sections[currentSectionIndex];

  return (
    <div className="absolute inset-x-4 top-48 bottom-48 z-30 pointer-events-auto">
      <div className="relative h-full bg-black/70 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-white/60 text-[12px] uppercase tracking-wider">Teleprompter</span>
            {isRecording && (
              <span className="px-2 py-0.5 bg-[#6366F1] text-white text-[10px] font-bold rounded-full">
                {currentSection?.label}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:bg-white/20 hover:text-white transition"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:bg-white/20 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && !isRecording && (
          <div className="p-4 border-b border-white/10 bg-black/40">
            <div className="mb-4">
              <label className="text-white/60 text-[11px] uppercase tracking-wider mb-2 block">Template</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(SCRIPT_TEMPLATES).map(([key, tmpl]) => (
                  <button
                    key={key}
                    onClick={() => { setSelectedTemplate(key); setUseCustom(false); }}
                    className={`px-3 py-2 rounded-lg text-[12px] font-medium transition ${
                      selectedTemplate === key && !useCustom
                        ? 'bg-[#6366F1] text-white'
                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                  >
                    {tmpl.name}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="mb-4">
              <label className="text-white/60 text-[11px] uppercase tracking-wider mb-2 block">Scroll Speed</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={scrollSpeed}
                  onChange={(e) => setScrollSpeed(parseFloat(e.target.value))}
                  className="flex-1 accent-[#6366F1]"
                />
                <span className="text-white text-[12px] w-8">{scrollSpeed}x</span>
              </div>
            </div>

            <button
              onClick={() => setUseCustom(!useCustom)}
              className={`w-full px-3 py-2 rounded-lg text-[12px] font-medium transition ${
                useCustom ? 'bg-[#6366F1] text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              {useCustom ? '✓ Using Custom Script' : 'Write Custom Script'}
            </button>
          </div>
        )}

        {/* Script Content */}
        <div ref={scrollRef} className="h-full overflow-y-auto p-4 pb-20 scroll-smooth">
          {useCustom ? (
            <textarea
              value={customScript}
              onChange={(e) => setCustomScript(e.target.value)}
              placeholder="Write your own script here..."
              className="w-full h-full bg-transparent text-white text-[18px] leading-relaxed resize-none focus:outline-none placeholder:text-white/30"
              disabled={isRecording}
            />
          ) : (
            <div className="space-y-6">
              {template.sections.map((section, idx) => (
                <div
                  key={idx}
                  className={`transition-all duration-300 ${
                    isRecording && idx === currentSectionIndex
                      ? 'scale-105 opacity-100'
                      : isRecording && idx < currentSectionIndex
                        ? 'opacity-30'
                        : isRecording
                          ? 'opacity-50'
                          : 'opacity-100'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      isRecording && idx === currentSectionIndex
                        ? 'bg-[#6366F1] text-white'
                        : 'bg-white/20 text-white/60'
                    }`}>
                      {section.label}
                    </span>
                    <span className="text-white/40 text-[10px]">{section.time}s</span>
                  </div>
                  <p className={`whitespace-pre-line leading-relaxed ${
                    isRecording && idx === currentSectionIndex
                      ? 'text-white text-[20px] font-medium'
                      : 'text-white/80 text-[16px]'
                  }`}>
                    {processScript(section.prompt)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Progress indicator */}
        {isRecording && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
            <div 
              className="h-full bg-[#6366F1] transition-all duration-1000"
              style={{ width: `${((maxTime - timeLeft) / maxTime) * 100}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

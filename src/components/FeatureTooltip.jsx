import React, { useState, useEffect } from 'react';
import { X, Sparkles } from 'lucide-react';

export default function FeatureTooltip({ feature, onDismiss }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShow(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setShow(false);
    setTimeout(onDismiss, 300);
  };

  if (!show) return null;

  const tooltips = {
    upvote: {
      title: 'Upvote Pitches',
      description: 'Tap the arrow to show support for great startups!',
      position: 'bottom-right'
    },
    bookmark: {
      title: 'Save for Later',
      description: 'Bookmark pitches to find them easily later.',
      position: 'bottom-right'
    },
    comment: {
      title: 'Join the Discussion',
      description: 'Leave comments and connect with founders.',
      position: 'bottom-right'
    }
  };

  const config = tooltips[feature];
  if (!config) return null;

  return (
    <div className="fixed inset-0 z-40 pointer-events-none">
      <div className="absolute bottom-32 right-20 pointer-events-auto animate-in slide-in-from-bottom fade-in duration-300">
        <div className="bg-[#6366F1] text-white rounded-xl p-4 shadow-2xl max-w-[240px] relative">
          {/* Sparkles Icon */}
          <div className="absolute -top-3 -right-3 w-8 h-8 bg-[#FFD700] rounded-full flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-[#6366F1]" />
          </div>

          <button
            onClick={handleDismiss}
            className="absolute top-2 right-2 text-white/70 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>

          <h3 className="text-[14px] font-bold mb-1 pr-6">{config.title}</h3>
          <p className="text-[13px] text-white/90 leading-relaxed">
            {config.description}
          </p>

          <button
            onClick={handleDismiss}
            className="mt-3 text-[12px] font-semibold underline"
          >
            Got it!
          </button>

          {/* Arrow */}
          <div className="absolute -bottom-2 right-8 w-4 h-4 bg-[#6366F1] transform rotate-45" />
        </div>
      </div>
    </div>
  );
}
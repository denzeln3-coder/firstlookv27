import React from 'react';
import { X, Clock, Sparkles } from 'lucide-react';

export default function UpgradeModal({ isOpen, onClose, feature = '' }) {
  if (!isOpen) return null;

  // Instead of showing upgrade options, show "Coming Soon" message
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-[#18181B] rounded-2xl w-full max-w-md border border-[rgba(255,255,255,0.1)]"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 text-center">
          {/* Icon */}
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#6366F1]/20 to-[#8B5CF6]/20 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-[#6366F1]" />
          </div>
          
          {/* Title */}
          <h2 className="text-white text-xl font-bold mb-2">Coming Soon!</h2>
          
          {/* Message */}
          <p className="text-[#8E8E93] text-sm mb-6">
            {feature ? (
              <>
                <span className="text-white font-medium">"{feature}"</span> is coming soon. 
                We're working hard to bring you this feature!
              </>
            ) : (
              "Premium features are coming soon. We're working hard to bring you an amazing upgrade experience!"
            )}
          </p>

          {/* Coming Soon Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#27272A] rounded-full mb-6">
            <Clock className="w-4 h-4 text-[#6366F1]" />
            <span className="text-[#A1A1AA] text-sm font-medium">Stay tuned for updates</span>
          </div>

          {/* Close Button */}
          <button 
            onClick={onClose} 
            className="w-full py-3 bg-[#27272A] text-white rounded-xl font-semibold hover:bg-[#3F3F46] transition"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

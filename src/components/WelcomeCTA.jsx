import React from 'react';
import { Video, Compass, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';

export default function WelcomeCTA({ onDismiss }) {
  const navigate = useNavigate();

  return (
    <div className="fixed top-20 left-4 right-4 z-30 animate-in slide-in-from-top fade-in duration-300">
      <div className="bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] rounded-2xl p-6 max-w-2xl mx-auto relative shadow-2xl">
        <button
          onClick={onDismiss}
          className="absolute top-3 right-3 text-white/70 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-white text-[20px] font-bold mb-2">
          Welcome to FirstLook! 🚀
        </h2>
        <p className="text-white/90 text-[14px] mb-4">
          Discover amazing startups or share your own pitch
        </p>

        <div className="flex gap-3">
          <button
            onClick={() => {
              onDismiss();
              navigate(createPageUrl('Discover'));
            }}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white/20 backdrop-blur-sm text-white rounded-xl hover:bg-white/30 transition-all font-semibold"
          >
            <Compass className="w-5 h-5" />
            Explore Pitches
          </button>
          <button
            onClick={() => {
              onDismiss();
              navigate(createPageUrl('RecordPitch'));
            }}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white text-[#6366F1] rounded-xl hover:brightness-95 transition-all font-semibold shadow-lg"
          >
            <Video className="w-5 h-5" />
            Record Pitch
          </button>
        </div>
      </div>
    </div>
  );
}
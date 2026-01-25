import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Palette, ArrowLeft, Sparkles } from 'lucide-react';

export default function CreatorStudio() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Palette className="w-10 h-10 text-white" />
        </div>
        
        <div className="flex items-center justify-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-[#F59E0B]" />
          <span className="text-[#F59E0B] text-sm font-semibold uppercase tracking-wide">Coming Soon</span>
          <Sparkles className="w-5 h-5 text-[#F59E0B]" />
        </div>
        
        <h1 className="text-white text-3xl font-bold mb-3">Creator Studio</h1>
        <p className="text-[#A1A1AA] text-lg mb-8">
          Powerful tools to create, edit, and optimize your pitch content. Coming in 2026.
        </p>
        
        <button 
          onClick={() => navigate('/')}
          className="flex items-center gap-2 px-6 py-3 bg-[#6366F1] text-white font-semibold rounded-xl hover:brightness-110 transition mx-auto"
        >
          <ArrowLeft className="w-5 h-5" />
          Go Home
        </button>
      </div>
    </div>
  );
}

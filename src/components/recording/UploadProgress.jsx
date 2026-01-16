import React from 'react';

export default function UploadProgress({ progress, stage }) {
  const getStageText = () => {
    // Handle string stages (like "Compressing...")
    if (typeof stage === 'string' && stage.includes('Compressing')) {
      return stage;
    }
    
    switch (stage) {
      case 'pitch':
        return 'Uploading pitch video...';
      case 'demo':
        return 'Uploading demo video...';
      case 'creating':
        return 'Creating your pitch...';
      default:
        return 'Uploading...';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
      <div className="bg-[#18181B] border border-[rgba(255,255,255,0.1)] rounded-2xl p-8 max-w-md w-full mx-6">
        <h2 className="text-[24px] font-bold text-white mb-6 text-center">Submitting your pitch</h2>
        
        {/* Progress Bar */}
        <div className="relative w-full h-2 bg-[#27272A] rounded-full overflow-hidden mb-4">
          <div 
            className="absolute left-0 top-0 h-full bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Percentage */}
        <div className="text-center mb-6">
          <span className="text-[32px] font-bold text-white">{progress}%</span>
        </div>

        {/* Stage Text */}
        <p className="text-[14px] text-[#A1A1AA] text-center mb-2">{getStageText()}</p>
        <p className="text-[12px] text-[#71717A] text-center">Please don't close this page</p>

        {/* Animation */}
        <div className="flex justify-center gap-2 mt-6">
          <div className="w-2 h-2 rounded-full bg-[#6366F1] animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 rounded-full bg-[#6366F1] animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 rounded-full bg-[#6366F1] animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}
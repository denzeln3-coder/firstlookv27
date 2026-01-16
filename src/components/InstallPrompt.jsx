import React, { useState, useEffect } from 'react';
import { X, Download } from 'lucide-react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Show prompt after 30 seconds or on second visit
      const hasSeenPrompt = localStorage.getItem('installPromptSeen');
      if (!hasSeenPrompt) {
        setTimeout(() => setShowPrompt(true), 30000);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted install');
    }
    
    setDeferredPrompt(null);
    setShowPrompt(false);
    localStorage.setItem('installPromptSeen', 'true');
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('installPromptSeen', 'true');
  };

  if (!showPrompt || !deferredPrompt) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-in slide-in-from-bottom duration-300">
      <div className="bg-[#18181B] border border-[#27272A] rounded-xl p-4 shadow-2xl max-w-md mx-auto">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 text-[#71717A] hover:text-[#FAFAFA] transition"
        >
          <X className="w-4 h-4" />
        </button>
        
        <div className="flex items-start gap-3 mb-3">
          <div className="w-12 h-12 bg-[#6366F1] rounded-xl flex items-center justify-center flex-shrink-0">
            <Download className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-[#FAFAFA] text-[16px] font-bold mb-1">
              Install FirstLook
            </h3>
            <p className="text-[#A1A1AA] text-[13px]">
              Get quick access and work offline
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleDismiss}
            className="flex-1 px-4 py-2 bg-[#09090B] text-[#FAFAFA] border border-[#27272A] rounded-lg hover:bg-[#27272A] transition text-[14px] font-medium"
          >
            Not now
          </button>
          <button
            onClick={handleInstall}
            className="flex-1 px-4 py-2 bg-[#6366F1] text-white rounded-lg hover:brightness-110 transition text-[14px] font-semibold"
          >
            Install
          </button>
        </div>
      </div>
    </div>
  );
}
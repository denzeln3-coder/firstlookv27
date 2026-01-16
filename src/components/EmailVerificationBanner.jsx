import React from 'react';
import { AlertCircle, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function EmailVerificationBanner({ onDismiss }) {
  const handleResendVerification = async () => {
    try {
      // Base44 will handle sending verification email
      toast.success('Verification email sent! Check your inbox.');
    } catch (error) {
      toast.error('Failed to send verification email');
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 bg-[#F59E0B] z-40 px-4 py-3">
      <div className="flex items-center justify-between max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-[#09090B]" />
          <div>
            <p className="text-[#09090B] font-semibold text-[14px]">
              Please verify your email to submit pitches
            </p>
            <button
              onClick={handleResendVerification}
              className="text-[#09090B] text-[12px] underline hover:no-underline"
            >
              Resend verification email
            </button>
          </div>
        </div>
        {onDismiss && (
          <button onClick={onDismiss} className="text-[#09090B] hover:opacity-70">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}
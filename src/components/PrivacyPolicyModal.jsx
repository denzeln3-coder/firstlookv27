import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function PrivacyPolicyModal({ onAccept }) {
  const [agreedPrivacy, setAgreedPrivacy] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('privacy');

  const handleAccept = async () => {
    if (!agreedPrivacy || !agreedTerms) {
      toast.error('Please agree to both the Privacy Policy and Terms & Conditions');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({
          privacy_policy_accepted: true,
          privacy_policy_accepted_date: new Date().toISOString(),
          terms_accepted: true,
          terms_accepted_date: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;
      onAccept();
    } catch (error) {
      toast.error('Failed to accept policies: ' + error.message);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Welcome to FirstLook</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('privacy')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
                activeTab === 'privacy' ? 'bg-[#6366F1] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Privacy Policy
            </button>
            <button
              onClick={() => setActiveTab('terms')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
                activeTab === 'terms' ? 'bg-[#6366F1] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Terms & Conditions
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {activeTab === 'privacy' ? (
            <div>
              <div className="text-2xl font-bold text-gray-900 mb-2">PRIVACY NOTICE</div>
              <div className="text-sm text-gray-500 mb-4">Last updated January 06, 2026</div>
              <div className="space-y-4 text-sm text-gray-700">
                <p>This Privacy Notice for FirstLook ("we," "us," or "our"), describes how and why we might collect, store, use, and/or share your personal information when you use our services.</p>
                <h3 className="font-semibold text-gray-900">What personal information do we process?</h3>
                <p>We collect names, email addresses, usernames, and content you create (videos, profiles).</p>
                <h3 className="font-semibold text-gray-900">Do we process any sensitive personal information?</h3>
                <p>We do not process sensitive personal information.</p>
                <h3 className="font-semibold text-gray-900">How do we process your information?</h3>
                <p>We process your information to provide, improve, and administer our Services, communicate with you, for security and fraud prevention, and to comply with law.</p>
                <h3 className="font-semibold text-gray-900">Contact</h3>
                <p>For questions, email us at <a href="mailto:denzeln3@gmail.com" className="text-[#6366F1]">denzeln3@gmail.com</a></p>
              </div>
            </div>
          ) : (
            <div>
              <div className="text-2xl font-bold text-gray-900 mb-2">Terms & Conditions</div>
              <div className="text-sm text-gray-500 mb-4">Last updated January 06, 2026</div>
              <div className="space-y-4 text-sm text-gray-700">
                <h3 className="font-semibold text-gray-900">1. Acceptance of Terms</h3>
                <p>By accessing and using FirstLook, you accept and agree to be bound by these Terms and Conditions.</p>
                <h3 className="font-semibold text-gray-900">2. Use of Service</h3>
                <p>FirstLook is a platform for founders to share startup pitches and demos.</p>
                <h3 className="font-semibold text-gray-900">3. Content Ownership</h3>
                <p>You retain all rights to the content you submit. By posting on FirstLook, you grant us a worldwide, non-exclusive, royalty-free license to use, display, and distribute your content on the platform.</p>
                <h3 className="font-semibold text-gray-900">4. User Conduct</h3>
                <p>You agree not to post false, misleading, or fraudulent information, harass other users, or violate any laws.</p>
                <h3 className="font-semibold text-gray-900">5. Contact</h3>
                <p>For questions, contact us at <a href="mailto:denzeln3@gmail.com" className="text-[#6366F1]">denzeln3@gmail.com</a></p>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="space-y-3 mb-4">
            <div className="flex items-start gap-3">
              <button onClick={() => setAgreedPrivacy(!agreedPrivacy)} className="mt-0.5 flex-shrink-0">
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition ${agreedPrivacy ? 'bg-[#6366F1] border-[#6366F1]' : 'border-gray-300 bg-white'}`}>
                  {agreedPrivacy && <CheckCircle2 className="w-4 h-4 text-white" />}
                </div>
              </button>
              <label className="text-sm text-gray-700 cursor-pointer flex-1" onClick={() => setAgreedPrivacy(!agreedPrivacy)}>
                I have read and agree to the <button onClick={(e) => { e.stopPropagation(); setActiveTab('privacy'); }} className="text-[#6366F1] hover:underline">Privacy Policy</button>
              </label>
            </div>
            <div className="flex items-start gap-3">
              <button onClick={() => setAgreedTerms(!agreedTerms)} className="mt-0.5 flex-shrink-0">
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition ${agreedTerms ? 'bg-[#6366F1] border-[#6366F1]' : 'border-gray-300 bg-white'}`}>
                  {agreedTerms && <CheckCircle2 className="w-4 h-4 text-white" />}
                </div>
              </button>
              <label className="text-sm text-gray-700 cursor-pointer flex-1" onClick={() => setAgreedTerms(!agreedTerms)}>
                I have read and agree to the <button onClick={(e) => { e.stopPropagation(); setActiveTab('terms'); }} className="text-[#6366F1] hover:underline">Terms & Conditions</button>
              </label>
            </div>
          </div>
          <button
            onClick={handleAccept}
            disabled={!agreedPrivacy || !agreedTerms || isSubmitting}
            className="w-full py-3 bg-[#6366F1] text-white font-semibold rounded-xl hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Processing...' : 'Continue to FirstLook'}
          </button>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, Circle } from 'lucide-react';
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
      await base44.auth.updateMe({
        privacy_policy_accepted: true,
        privacy_policy_accepted_date: new Date().toISOString(),
        terms_accepted: true,
        terms_accepted_date: new Date().toISOString()
      });
      onAccept();
    } catch (error) {
      toast.error('Failed to accept policies');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header with Tabs */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Welcome to FirstLook</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('privacy')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
                activeTab === 'privacy'
                  ? 'bg-[#6366F1] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Privacy Policy
            </button>
            <button
              onClick={() => setActiveTab('terms')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
                activeTab === 'terms'
                  ? 'bg-[#6366F1] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Terms & Conditions
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {activeTab === 'privacy' ? (
            <div>
              <style>{`
                [data-custom-class='body'], [data-custom-class='body'] * {
                  background: transparent !important;
                }
                [data-custom-class='title'], [data-custom-class='title'] * {
                  font-family: Arial !important;
                  font-size: 26px !important;
                  color: #000000 !important;
                }
                [data-custom-class='subtitle'], [data-custom-class='subtitle'] * {
                  font-family: Arial !important;
                  color: #595959 !important;
                  font-size: 14px !important;
                }
                [data-custom-class='heading_1'], [data-custom-class='heading_1'] * {
                  font-family: Arial !important;
                  font-size: 19px !important;
                  color: #000000 !important;
                }
                [data-custom-class='heading_2'], [data-custom-class='heading_2'] * {
                  font-family: Arial !important;
                  font-size: 17px !important;
                  color: #000000 !important;
                }
                [data-custom-class='body_text'], [data-custom-class='body_text'] * {
                  color: #595959 !important;
                  font-size: 14px !important;
                  font-family: Arial !important;
                }
                [data-custom-class='link'], [data-custom-class='link'] * {
                  color: #3030F1 !important;
                  font-size: 14px !important;
                  font-family: Arial !important;
                  word-break: break-word !important;
                }
              `}</style>
              
              <div data-custom-class="body">
                <div><strong><span style={{fontSize: '26px'}}><span data-custom-class="title">PRIVACY NOTICE</span></span></strong></div>
                <div><span style={{color: 'rgb(127, 127, 127)'}}><strong><span style={{fontSize: '15px'}}><span data-custom-class="subtitle">Last updated January 06, 2026</span></span></strong></span></div>
                <div><br/></div>
                <div style={{lineHeight: 1.5}}><span style={{fontSize: '15px'}}><span data-custom-class="body_text">This Privacy Notice for FirstLook ("<strong>we</strong>," "<strong>us</strong>," or "<strong>our</strong>"), describes how and why we might collect, store, use, and/or share your personal information when you use our services.</span></span></div>
                <div style={{lineHeight: 1.5}}><br/></div>
                <div style={{lineHeight: 1.5}}><strong><span style={{fontSize: '15px'}}><span data-custom-class="heading_1">SUMMARY OF KEY POINTS</span></span></strong></div>
                <div style={{lineHeight: 1.5}}><br/></div>
                <div style={{lineHeight: 1.5}}><span style={{fontSize: '15px'}}><span data-custom-class="body_text"><strong>What personal information do we process?</strong> We collect names, email addresses, usernames, and content you create (videos, profiles).</span></span></div>
                <div style={{lineHeight: 1.5}}><br/></div>
                <div style={{lineHeight: 1.5}}><span style={{fontSize: '15px'}}><span data-custom-class="body_text"><strong>Do we process any sensitive personal information?</strong> We do not process sensitive personal information.</span></span></div>
                <div style={{lineHeight: 1.5}}><br/></div>
                <div style={{lineHeight: 1.5}}><span style={{fontSize: '15px'}}><span data-custom-class="body_text"><strong>How do we process your information?</strong> We process your information to provide, improve, and administer our Services, communicate with you, for security and fraud prevention, and to comply with law.</span></span></div>
                <div style={{lineHeight: 1.5}}><br/></div>
                <div style={{lineHeight: 1.5}}><span style={{fontSize: '15px'}}><span data-custom-class="body_text"><strong>How do we keep your information safe?</strong> We have organizational and technical processes in place to protect your personal information.</span></span></div>
                <div style={{lineHeight: 1.5}}><br/></div>
                <div style={{lineHeight: 1.5}}><span style={{fontSize: '15px'}}><span data-custom-class="body_text"><strong>What are your rights?</strong> Depending on your location, you may have certain rights regarding your personal information, including access, correction, and deletion.</span></span></div>
                <div style={{lineHeight: 1.5}}><br/></div>
                <div style={{lineHeight: 1.5}}><span style={{fontSize: '15px'}}><span data-custom-class="body_text"><strong>Contact:</strong> For questions, email us at <a target="_blank" data-custom-class="link" href="mailto:denzeln3@gmail.com">denzeln3@gmail.com</a></span></span></div>
              </div>
            </div>
          ) : (
            <div>
              <div className="text-2xl font-bold text-gray-900 mb-4">Terms & Conditions</div>
              <div className="text-sm text-gray-600 mb-4">Last updated January 06, 2026</div>
              
              <div className="space-y-6 text-sm text-gray-700">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">1. Acceptance of Terms</h3>
                  <p>By accessing and using FirstLook, you accept and agree to be bound by these Terms and Conditions.</p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">2. Use of Service</h3>
                  <p>FirstLook is a platform for founders to share startup pitches and demos. You may use the service to:</p>
                  <ul className="list-disc ml-6 mt-2 space-y-1">
                    <li>Create and share video pitches</li>
                    <li>Browse and discover startups</li>
                    <li>Connect with other founders and users</li>
                    <li>Provide feedback and engage with content</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">3. Content Ownership & License</h3>
                  <p className="mb-2">You retain all rights to the content you submit. By posting on FirstLook, you grant us a worldwide, non-exclusive, royalty-free license to use, display, and distribute your content on the platform.</p>
                  <p className="font-semibold text-gray-900">This is an open platform - other users may view, learn from, and be inspired by your ideas. By using FirstLook, you acknowledge that your pitches are public and may inspire others.</p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">4. User Conduct</h3>
                  <p>You agree not to:</p>
                  <ul className="list-disc ml-6 mt-2 space-y-1">
                    <li>Post false, misleading, or fraudulent information</li>
                    <li>Harass, abuse, or harm other users</li>
                    <li>Violate any laws or regulations</li>
                    <li>Spam or use automated systems without permission</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">5. Intellectual Property</h3>
                  <p>The FirstLook platform, design, and code are protected by intellectual property laws. While ideas shared on the platform are public and can inspire others, you may not copy the FirstLook platform itself without permission.</p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">6. Disclaimer of Warranties</h3>
                  <p>FirstLook is provided "as is" without warranties of any kind. We do not guarantee the accuracy, completeness, or usefulness of any content on the platform.</p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">7. Limitation of Liability</h3>
                  <p>We are not liable for any damages arising from your use of FirstLook, including but not limited to business losses, data loss, or other intangible losses.</p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">8. Termination</h3>
                  <p>We reserve the right to suspend or terminate your account for violations of these terms or for any other reason at our discretion.</p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">9. Changes to Terms</h3>
                  <p>We may update these terms from time to time. Continued use of the service after changes constitutes acceptance of the new terms.</p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">10. Contact</h3>
                  <p>For questions about these terms, contact us at <a href="mailto:denzeln3@gmail.com" className="text-[#6366F1] hover:underline">denzeln3@gmail.com</a></p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer with Agreements */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="space-y-3 mb-4">
            <div className="flex items-start gap-3">
              <button
                onClick={() => setAgreedPrivacy(!agreedPrivacy)}
                className="mt-0.5 flex-shrink-0"
              >
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition ${
                  agreedPrivacy 
                    ? 'bg-[#6366F1] border-[#6366F1]' 
                    : 'border-gray-300 bg-white'
                }`}>
                  {agreedPrivacy && <CheckCircle2 className="w-4 h-4 text-white" />}
                </div>
              </button>
              <label className="text-sm text-gray-700 cursor-pointer flex-1" onClick={() => setAgreedPrivacy(!agreedPrivacy)}>
                I have read and agree to the <button onClick={(e) => { e.stopPropagation(); setActiveTab('privacy'); }} className="text-[#6366F1] hover:underline">Privacy Policy</button>
              </label>
            </div>

            <div className="flex items-start gap-3">
              <button
                onClick={() => setAgreedTerms(!agreedTerms)}
                className="mt-0.5 flex-shrink-0"
              >
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition ${
                  agreedTerms 
                    ? 'bg-[#6366F1] border-[#6366F1]' 
                    : 'border-gray-300 bg-white'
                }`}>
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
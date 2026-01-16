import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Code, Copy, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';

export default function EmbedGenerator() {
  const navigate = useNavigate();
  const [selectedPitch, setSelectedPitch] = useState('');
  const [copied, setCopied] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: userPitches = [] } = useQuery({
    queryKey: ['userPitches', user?.id],
    queryFn: () => base44.entities.Pitch.filter({ founder_id: user.id, is_published: true }),
    enabled: !!user
  });

  const getEmbedCode = () => {
    if (!selectedPitch) return '';
    const baseUrl = window.location.origin;
    return `<iframe src="${baseUrl}${createPageUrl('Explore')}?pitch=${selectedPitch}" width="400" height="711" frameborder="0" allowfullscreen></iframe>`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getEmbedCode());
    setCopied(true);
    toast.success('Embed code copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#09090B] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-[#FAFAFA] text-[24px] font-bold mb-4">Not Logged In</h2>
          <button
            onClick={() => base44.auth.redirectToLogin(createPageUrl('EmbedGenerator'))}
            className="px-6 py-3 bg-[#6366F1] text-white font-semibold rounded-lg hover:brightness-110 transition"
          >
            Log In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090B] pb-20">
      <div className="fixed top-0 left-0 right-0 bg-[#09090B] z-20 px-4 py-4 flex items-center justify-between border-b border-[#27272A]">
        <button
          onClick={() => navigate(createPageUrl('Profile'))}
          className="text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors duration-150"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-[#FAFAFA] text-[20px] font-bold">Embed Widget</h1>
        <div className="w-5" />
      </div>

      <div className="pt-20 px-6 max-w-2xl mx-auto">
        <div className="bg-[#18181B] border border-[#27272A] rounded-xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Code className="w-6 h-6 text-[#6366F1]" />
            <h2 className="text-[#FAFAFA] text-[18px] font-bold">Generate Embed Code</h2>
          </div>
          <p className="text-[#A1A1AA] text-[14px] mb-6">
            Add your pitch to your website with a simple embed code
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-[#A1A1AA] text-[12px] uppercase tracking-wide font-medium mb-2">
                Select Your Pitch
              </label>
              <select
                value={selectedPitch}
                onChange={(e) => setSelectedPitch(e.target.value)}
                className="w-full px-4 py-3 bg-[#09090B] text-[#FAFAFA] text-[14px] border border-[#27272A] rounded-lg focus:outline-none focus:border-[#6366F1]"
              >
                <option value="">Choose a pitch...</option>
                {userPitches.map((pitch) => (
                  <option key={pitch.id} value={pitch.id}>
                    {pitch.startup_name}
                  </option>
                ))}
              </select>
            </div>

            {selectedPitch && (
              <>
                <div>
                  <label className="block text-[#A1A1AA] text-[12px] uppercase tracking-wide font-medium mb-2">
                    Embed Code
                  </label>
                  <div className="relative">
                    <pre className="bg-[#09090B] text-[#22C55E] text-[12px] p-4 rounded-lg border border-[#27272A] overflow-x-auto font-mono">
                      {getEmbedCode()}
                    </pre>
                    <button
                      onClick={handleCopy}
                      className="absolute top-2 right-2 px-3 py-2 bg-[#6366F1] text-white rounded-lg hover:brightness-110 transition flex items-center gap-2"
                    >
                      {copied ? (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="bg-[#09090B] p-4 rounded-lg border border-[#27272A]">
                  <h3 className="text-[#FAFAFA] text-[14px] font-semibold mb-2">Preview</h3>
                  <div className="flex justify-center">
                    <div className="w-[200px] h-[356px] bg-[#27272A] rounded-lg flex items-center justify-center">
                      <p className="text-[#71717A] text-[12px]">Pitch Preview</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {userPitches.length === 0 && (
          <div className="text-center py-8">
            <p className="text-[#A1A1AA] text-[14px] mb-4">No published pitches yet</p>
            <button
              onClick={() => navigate(createPageUrl('RecordPitch'))}
              className="px-6 py-3 bg-[#6366F1] text-white font-semibold rounded-lg hover:brightness-110 transition"
            >
              Record Your First Pitch
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
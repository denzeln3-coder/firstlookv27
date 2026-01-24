import React, { useState } from 'react';
import { X, Flag, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

const REPORT_REASONS = [
  { id: 'spam', label: 'Spam or misleading', description: 'Fake engagement, clickbait, or scams' },
  { id: 'inappropriate', label: 'Inappropriate content', description: 'Offensive, hateful, or explicit content' },
  { id: 'misleading', label: 'Misleading information', description: 'False claims about the product' },
  { id: 'idea_only', label: 'Idea only (no product)', description: 'No working product or MVP exists' },
  { id: 'course_content', label: 'Course or info-product', description: 'Selling courses, not a real startup' },
  { id: 'other', label: 'Other', description: 'Something else not listed above' }
];

export default function ReportModal({ pitch, isOpen, onClose }) {
  const [selectedReason, setSelectedReason] = useState('');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return null;
      const { data: profile } = await supabase.from('users').select('*').eq('id', authUser.id).single();
      return { ...authUser, ...profile };
    }
  });

  if (!isOpen || !pitch) return null;

  const handleSubmit = async () => {
    if (!selectedReason) { toast.error('Please select a reason'); return; }
    if (!user) { toast.error('Please log in to report content'); return; }

    setIsSubmitting(true);
    try {
      const { data: existingReports } = await supabase.from('reports').select('*').eq('reporter_id', user.id).eq('pitch_id', pitch.id);
      if (existingReports && existingReports.length > 0) { toast.error('You have already reported this pitch'); onClose(); return; }

      await supabase.from('reports').insert({ reporter_id: user.id, pitch_id: pitch.id, reason: selectedReason, details: details.trim(), status: 'pending' });

      const { data: allReports } = await supabase.from('reports').select('*').eq('pitch_id', pitch.id);
      if (allReports && allReports.length >= 3) {
        await supabase.from('startups').update({ is_published: false, review_status: 'flagged' }).eq('id', pitch.id);
      }

      toast.success('Report submitted. Thank you for helping keep FirstLook safe.');
      onClose();
    } catch (error) {
      console.error('Report failed:', error);
      toast.error('Failed to submit report. Please try again.');
    }
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#18181B] rounded-2xl w-full max-w-md border border-[rgba(255,255,255,0.1)]">
        <div className="p-6 border-b border-[rgba(255,255,255,0.1)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#EF4444]/20 flex items-center justify-center"><Flag className="w-5 h-5 text-[#EF4444]" /></div>
            <div><h2 className="text-white text-lg font-bold">Report Pitch</h2><p className="text-[#8E8E93] text-sm">{pitch.startup_name || pitch.name}</p></div>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-[#27272A] flex items-center justify-center text-[#8E8E93] hover:text-white transition"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          <p className="text-[#A1A1AA] text-sm">Why are you reporting this pitch? Your report is anonymous.</p>
          <div className="space-y-2">
            {REPORT_REASONS.map((reason) => (
              <button key={reason.id} onClick={() => setSelectedReason(reason.id)} className={`w-full p-4 rounded-xl border text-left transition ${selectedReason === reason.id ? 'border-[#EF4444] bg-[#EF4444]/10' : 'border-[#3F3F46] bg-[#27272A] hover:border-[#52525B]'}`}>
                <div className="font-medium text-white">{reason.label}</div>
                <div className="text-sm text-[#8E8E93]">{reason.description}</div>
              </button>
            ))}
          </div>

          {selectedReason && (
            <div>
              <label className="block text-[#8E8E93] text-sm font-medium mb-2">Additional details (optional)</label>
              <textarea value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Provide any additional context..." rows={3} className="w-full px-4 py-3 bg-[#27272A] border border-[#3F3F46] rounded-xl text-white focus:outline-none focus:border-[#EF4444] placeholder:text-[#71717A] resize-none" />
            </div>
          )}

          {selectedReason === 'idea_only' && (
            <div className="flex items-start gap-3 p-4 bg-[#F59E0B]/10 border border-[#F59E0B]/30 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-[#F59E0B] flex-shrink-0 mt-0.5" />
              <div className="text-sm text-[#F59E0B]"><strong>Note:</strong> If this founder is still in idea stage, they may benefit from <a href="https://rockz.online" target="_blank" rel="noopener noreferrer" className="underline ml-1">Rockz.online</a> for idea validation.</div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-[rgba(255,255,255,0.1)] flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-3 bg-[#27272A] text-white rounded-xl hover:bg-[#3F3F46] transition font-medium">Cancel</button>
          <button onClick={handleSubmit} disabled={!selectedReason || isSubmitting} className="flex-1 px-4 py-3 bg-[#EF4444] text-white rounded-xl hover:brightness-110 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed">{isSubmitting ? 'Submitting...' : 'Submit Report'}</button>
        </div>
      </div>
    </div>
  );
}

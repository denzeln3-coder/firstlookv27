import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';

export default function AdminReview() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedPitch, setSelectedPitch] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [revisionNotes, setRevisionNotes] = useState('');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch {
        return null;
      }
    }
  });

  const { data: pendingPitches = [], isLoading } = useQuery({
    queryKey: ['pendingPitches'],
    queryFn: () => base44.entities.Pitch.filter({ review_status: 'pending' }, '-created_date')
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ pitchId, status, reason, notes }) => {
      await base44.entities.Pitch.update(pitchId, {
        review_status: status,
        rejection_reason: reason || null,
        review_notes: notes || null,
        is_published: status === 'approved',
        reviewed_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingPitches'] });
      setSelectedPitch(null);
      setRejectionReason('');
      setRevisionNotes('');
      toast.success('Review submitted');
    }
  });

  const handleApprove = (pitch) => {
    reviewMutation.mutate({ pitchId: pitch.id, status: 'approved' });
  };

  const handleReject = (pitch) => {
    if (!rejectionReason) {
      toast.error('Please select a rejection reason');
      return;
    }
    reviewMutation.mutate({ pitchId: pitch.id, status: 'rejected', reason: rejectionReason });
  };

  const handleRequestRevision = (pitch) => {
    if (!revisionNotes) {
      toast.error('Please provide feedback');
      return;
    }
    reviewMutation.mutate({ pitchId: pitch.id, status: 'needs_revision', notes: revisionNotes });
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-white text-center">
          <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
          <p className="text-gray-400">This page is only accessible to admin users.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-20">
      <div className="fixed top-0 left-0 right-0 bg-[#0a0a0a] z-20 px-4 py-4 flex items-center justify-between border-b border-gray-900">
        <button
          onClick={() => navigate(createPageUrl('Explore'))}
          className="text-gray-400 hover:text-white transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-white text-xl font-bold">Review Queue</h1>
        <div className="w-5" />
      </div>

      <div className="pt-20 px-6">
        {isLoading ? (
          <div className="text-white text-center py-8">Loading...</div>
        ) : pendingPitches.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <p className="text-gray-400">No pending reviews!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingPitches.map((pitch) => (
              <div key={pitch.id} className="bg-[#1a1a1a] rounded-xl p-6 border border-gray-800">
                <div className="flex gap-4 mb-4">
                  {pitch.thumbnail_url && (
                    <img src={pitch.thumbnail_url} alt={pitch.startup_name} className="w-24 h-24 object-cover rounded-lg" />
                  )}
                  <div className="flex-1">
                    <h3 className="text-white text-xl font-bold mb-1">{pitch.startup_name}</h3>
                    <p className="text-gray-400 text-sm mb-2">{pitch.one_liner}</p>
                    {pitch.quality_score && (
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-white font-semibold">Quality Score:</span>
                        <span className={`font-bold ${pitch.quality_score >= 70 ? 'text-green-500' : pitch.quality_score >= 40 ? 'text-yellow-500' : 'text-red-500'}`}>
                          {pitch.quality_score}/100
                        </span>
                      </div>
                    )}
                    {pitch.flags && pitch.flags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {pitch.flags.map((flag, idx) => (
                          <span key={idx} className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded">
                            {flag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2 mb-4 text-sm">
                  <div>
                    <span className="text-gray-400">Product URL:</span>
                    <a href={pitch.product_url} target="_blank" rel="noopener noreferrer" className="ml-2 text-blue-400 hover:underline">
                      {pitch.product_url}
                    </a>
                  </div>
                  <div>
                    <span className="text-gray-400">Category:</span>
                    <span className="ml-2 text-white">{pitch.category}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Stage:</span>
                    <span className="ml-2 text-white">{pitch.product_stage}</span>
                  </div>
                  {pitch.what_problem_do_you_solve && (
                    <div>
                      <span className="text-gray-400">Problem:</span>
                      <p className="text-white mt-1">{pitch.what_problem_do_you_solve}</p>
                    </div>
                  )}
                </div>

                {selectedPitch?.id === pitch.id ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-white mb-2">Rejection Reason</label>
                      <select
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        className="w-full px-4 py-2 bg-[#252525] text-white rounded-lg"
                      >
                        <option value="">Select reason...</option>
                        <option value="No live product - please submit once you have an MVP">No live product</option>
                        <option value="Product URL does not work or is not accessible">Product URL not working</option>
                        <option value="Video quality too low - please re-record with better lighting/audio">Video quality too low</option>
                        <option value="Description is unclear - please explain what your product does">Description unclear</option>
                        <option value="Content violates our guidelines">Violates guidelines</option>
                        <option value="Spam or duplicate submission">Spam/duplicate</option>
                        <option value="Not a startup product">Not a startup</option>
                        <option value="Other (see notes)">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-white mb-2">Revision Notes</label>
                      <textarea
                        value={revisionNotes}
                        onChange={(e) => setRevisionNotes(e.target.value)}
                        className="w-full px-4 py-2 bg-[#252525] text-white rounded-lg"
                        rows={3}
                        placeholder="Provide feedback for revision..."
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleApprove(pitch)}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleRequestRevision(pitch)}
                        className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition"
                      >
                        Request Revision
                      </button>
                      <button
                        onClick={() => handleReject(pitch)}
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                      >
                        Reject
                      </button>
                    </div>
                    <button
                      onClick={() => setSelectedPitch(null)}
                      className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setSelectedPitch(pitch)}
                    className="w-full px-4 py-2 bg-[#6366F1] text-white font-semibold rounded-lg hover:bg-[#5558E3] transition"
                  >
                    Review This Pitch
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
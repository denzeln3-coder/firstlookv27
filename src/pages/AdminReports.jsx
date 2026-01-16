import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Flag, Check, X, Eye, ExternalLink, AlertTriangle, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const STATUS_COLORS = {
  pending: 'bg-[#F59E0B]/20 text-[#F59E0B]',
  reviewed: 'bg-[#3B82F6]/20 text-[#3B82F6]',
  dismissed: 'bg-[#8E8E93]/20 text-[#8E8E93]',
  action_taken: 'bg-[#EF4444]/20 text-[#EF4444]'
};

const REASON_LABELS = {
  spam: 'Spam or misleading',
  inappropriate: 'Inappropriate content',
  misleading: 'Misleading information',
  idea_only: 'Idea only (no product)',
  course_content: 'Course or info-product',
  other: 'Other'
};

export default function AdminReports() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('pending');
  const [processingId, setProcessingId] = useState(null);

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

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['adminReports', filter],
    queryFn: async () => {
      const allReports = await base44.entities.Report.list('-created_date');
      if (filter === 'all') return allReports;
      return allReports.filter(r => r.status === filter);
    }
  });

  const { data: pitches = [] } = useQuery({
    queryKey: ['allPitches'],
    queryFn: () => base44.entities.Pitch.list()
  });

  const { data: users = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list()
  });

  const getPitch = (pitchId) => pitches.find(p => p.id === pitchId);
  const getUser = (userId) => users.find(u => u.id === userId);

  const handleDismiss = async (report) => {
    setProcessingId(report.id);
    try {
      await base44.entities.Report.update(report.id, {
        status: 'dismissed',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString()
      });
      queryClient.invalidateQueries({ queryKey: ['adminReports'] });
      toast.success('Report dismissed');
    } catch (error) {
      toast.error('Failed to dismiss report');
    }
    setProcessingId(null);
  };

  const handleTakeAction = async (report) => {
    setProcessingId(report.id);
    try {
      // Update report status
      await base44.entities.Report.update(report.id, {
        status: 'action_taken',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString()
      });

      // Hide the pitch
      await base44.entities.Pitch.update(report.pitch_id, {
        is_published: false,
        review_status: 'rejected'
      });

      queryClient.invalidateQueries({ queryKey: ['adminReports'] });
      queryClient.invalidateQueries({ queryKey: ['pitches'] });
      toast.success('Action taken - pitch hidden');
    } catch (error) {
      toast.error('Failed to take action');
    }
    setProcessingId(null);
  };

  const handleDeletePitch = async (pitchId) => {
    if (!confirm('Are you sure you want to permanently delete this pitch?')) return;
    
    setProcessingId(pitchId);
    try {
      await base44.entities.Pitch.delete(pitchId);
      
      // Delete all reports for this pitch
      const pitchReports = reports.filter(r => r.pitch_id === pitchId);
      for (const report of pitchReports) {
        await base44.entities.Report.delete(report.id);
      }

      queryClient.invalidateQueries({ queryKey: ['adminReports'] });
      queryClient.invalidateQueries({ queryKey: ['pitches'] });
      toast.success('Pitch permanently deleted');
    } catch (error) {
      toast.error('Failed to delete pitch');
    }
    setProcessingId(null);
  };

  const handleRestorePitch = async (pitchId) => {
    setProcessingId(pitchId);
    try {
      await base44.entities.Pitch.update(pitchId, {
        is_published: true,
        review_status: 'approved'
      });

      queryClient.invalidateQueries({ queryKey: ['pitches'] });
      toast.success('Pitch restored');
    } catch (error) {
      toast.error('Failed to restore pitch');
    }
    setProcessingId(null);
  };

  // Check if user is admin
  if (user && user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-[#F59E0B] mx-auto mb-4" />
          <h1 className="text-white text-xl font-bold mb-2">Access Denied</h1>
          <p className="text-[#8E8E93]">You don't have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000000] pb-20">
      <div className="sticky top-0 bg-[#000000]/95 backdrop-blur-lg z-20 border-b border-[rgba(255,255,255,0.06)]">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(createPageUrl('Explore'))}
              className="w-10 h-10 rounded-full bg-[rgba(255,255,255,0.06)] flex items-center justify-center text-[#8E8E93] hover:text-white transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-white text-xl font-bold">Report Review</h1>
              <p className="text-[#8E8E93] text-sm">{reports.length} reports</p>
            </div>
          </div>
        </div>

        <div className="px-4 py-3 border-t border-[rgba(255,255,255,0.06)] overflow-x-auto">
          <div className="flex gap-2">
            {['pending', 'reviewed', 'action_taken', 'dismissed', 'all'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
                  filter === status
                    ? 'bg-[#6366F1] text-white'
                    : 'bg-[rgba(255,255,255,0.06)] text-[#8E8E93] hover:bg-[rgba(255,255,255,0.1)]'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-[#6366F1] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-12">
            <Flag className="w-12 h-12 text-[#3F3F46] mx-auto mb-4" />
            <h3 className="text-white font-semibold mb-2">No reports found</h3>
            <p className="text-[#8E8E93]">No reports match the current filter.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => {
              const pitch = getPitch(report.pitch_id);
              const reporter = getUser(report.reporter_id);
              const isProcessing = processingId === report.id || processingId === report.pitch_id;

              return (
                <div
                  key={report.id}
                  className="bg-[#18181B] rounded-xl border border-[#3F3F46] overflow-hidden"
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center text-white font-bold">
                          {pitch?.startup_name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <h3 className="text-white font-semibold">{pitch?.startup_name || 'Unknown Pitch'}</h3>
                          <p className="text-[#8E8E93] text-sm">
                            Reported by {reporter?.full_name || reporter?.email || 'Unknown'}
                          </p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[report.status]}`}>
                        {report.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="mb-4">
                      <div className="text-[#EF4444] text-sm font-medium mb-1">
                        {REASON_LABELS[report.reason] || report.reason}
                      </div>
                      {report.details && (
                        <p className="text-[#A1A1AA] text-sm">{report.details}</p>
                      )}
                    </div>

                    <div className="text-[#71717A] text-xs">
                      Reported {new Date(report.created_date).toLocaleDateString()} at {new Date(report.created_date).toLocaleTimeString()}
                    </div>
                  </div>

                  {report.status === 'pending' && (
                    <div className="px-4 py-3 bg-[#27272A] border-t border-[#3F3F46] flex items-center justify-between">
                      <button
                        onClick={() => pitch && navigate(createPageUrl('Explore') + `?pitch=${pitch.id}`)}
                        className="flex items-center gap-2 text-[#8E8E93] hover:text-white text-sm transition"
                      >
                        <Eye className="w-4 h-4" />
                        View Pitch
                      </button>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDismiss(report)}
                          disabled={isProcessing}
                          className="flex items-center gap-2 px-4 py-2 bg-[#3F3F46] text-white rounded-lg hover:bg-[#52525B] transition text-sm disabled:opacity-50"
                        >
                          <X className="w-4 h-4" />
                          Dismiss
                        </button>
                        <button
                          onClick={() => handleTakeAction(report)}
                          disabled={isProcessing}
                          className="flex items-center gap-2 px-4 py-2 bg-[#EF4444] text-white rounded-lg hover:brightness-110 transition text-sm disabled:opacity-50"
                        >
                          <Flag className="w-4 h-4" />
                          Hide Pitch
                        </button>
                        <button
                          onClick={() => handleDeletePitch(report.pitch_id)}
                          disabled={isProcessing}
                          className="flex items-center gap-2 px-4 py-2 bg-[#7F1D1D] text-white rounded-lg hover:brightness-110 transition text-sm disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    </div>
                  )}

                  {report.status === 'action_taken' && pitch && (
                    <div className="px-4 py-3 bg-[#27272A] border-t border-[#3F3F46] flex items-center justify-end">
                      <button
                        onClick={() => handleRestorePitch(report.pitch_id)}
                        disabled={isProcessing}
                        className="flex items-center gap-2 px-4 py-2 bg-[#10B981] text-white rounded-lg hover:brightness-110 transition text-sm disabled:opacity-50"
                      >
                        <Check className="w-4 h-4" />
                        Restore Pitch
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
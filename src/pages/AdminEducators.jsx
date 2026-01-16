import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, GraduationCap, Check, X, ExternalLink, AlertTriangle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const STATUS_COLORS = {
  pending: 'bg-[#F59E0B]/20 text-[#F59E0B]',
  approved: 'bg-[#10B981]/20 text-[#10B981]',
  rejected: 'bg-[#EF4444]/20 text-[#EF4444]'
};

export default function AdminEducators() {
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

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ['educatorApplications', filter],
    queryFn: async () => {
      const all = await base44.entities.EducatorPartner.list('-applied_at');
      if (filter === 'all') return all;
      return all.filter(a => a.status === filter);
    }
  });

  const { data: users = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list()
  });

  const getUser = (userId) => users.find(u => u.id === userId);

  const handleApprove = async (application) => {
    setProcessingId(application.id);
    try {
      await base44.entities.EducatorPartner.update(application.id, {
        status: 'approved',
        approved_by: user.id,
        approved_at: new Date().toISOString()
      });
      queryClient.invalidateQueries({ queryKey: ['educatorApplications'] });
      toast.success('Application approved!');
    } catch (error) {
      toast.error('Failed to approve application');
    }
    setProcessingId(null);
  };

  const handleReject = async (application) => {
    setProcessingId(application.id);
    try {
      await base44.entities.EducatorPartner.update(application.id, {
        status: 'rejected',
        approved_by: user.id,
        approved_at: new Date().toISOString()
      });
      queryClient.invalidateQueries({ queryKey: ['educatorApplications'] });
      toast.success('Application rejected');
    } catch (error) {
      toast.error('Failed to reject application');
    }
    setProcessingId(null);
  };

  const handleChangeBadge = async (application, badgeType) => {
    try {
      await base44.entities.EducatorPartner.update(application.id, {
        badge_type: badgeType
      });
      queryClient.invalidateQueries({ queryKey: ['educatorApplications'] });
      toast.success('Badge type updated');
    } catch (error) {
      toast.error('Failed to update badge');
    }
  };

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
              <h1 className="text-white text-xl font-bold">Educator Applications</h1>
              <p className="text-[#8E8E93] text-sm">{applications.length} applications</p>
            </div>
          </div>
        </div>

        <div className="px-4 py-3 border-t border-[rgba(255,255,255,0.06)] overflow-x-auto">
          <div className="flex gap-2">
            {['pending', 'approved', 'rejected', 'all'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
                  filter === status
                    ? 'bg-[#6366F1] text-white'
                    : 'bg-[rgba(255,255,255,0.06)] text-[#8E8E93] hover:bg-[rgba(255,255,255,0.1)]'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
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
        ) : applications.length === 0 ? (
          <div className="text-center py-12">
            <GraduationCap className="w-12 h-12 text-[#3F3F46] mx-auto mb-4" />
            <h3 className="text-white font-semibold mb-2">No applications found</h3>
            <p className="text-[#8E8E93]">No applications match the current filter.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map((application) => {
              const applicant = getUser(application.user_id);
              const isProcessing = processingId === application.id;

              return (
                <div
                  key={application.id}
                  className="bg-[#18181B] rounded-xl border border-[#3F3F46] overflow-hidden"
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center text-white font-bold">
                          {applicant?.full_name?.[0]?.toUpperCase() || applicant?.email?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <h3 className="text-white font-semibold">
                            {applicant?.full_name || applicant?.email || 'Unknown User'}
                          </h3>
                          <p className="text-[#8E8E93] text-sm">{application.specialty}</p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[application.status]}`}>
                        {application.status}
                      </span>
                    </div>

                    <div className="mb-4">
                      <p className="text-[#A1A1AA] text-sm">{application.bio}</p>
                    </div>

                    {application.portfolio_url && (
                      <a
                        href={application.portfolio_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-[#6366F1] text-sm hover:underline mb-4"
                      >
                        <ExternalLink className="w-4 h-4" />
                        View Portfolio
                      </a>
                    )}

                    <div className="text-[#71717A] text-xs">
                      Applied {new Date(application.applied_at).toLocaleDateString()}
                    </div>
                  </div>

                  {application.status === 'pending' && (
                    <div className="px-4 py-3 bg-[#27272A] border-t border-[#3F3F46] flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleReject(application)}
                        disabled={isProcessing}
                        className="flex items-center gap-2 px-4 py-2 bg-[#3F3F46] text-white rounded-lg hover:bg-[#52525B] transition text-sm disabled:opacity-50"
                      >
                        <X className="w-4 h-4" />
                        Reject
                      </button>
                      <button
                        onClick={() => handleApprove(application)}
                        disabled={isProcessing}
                        className="flex items-center gap-2 px-4 py-2 bg-[#10B981] text-white rounded-lg hover:brightness-110 transition text-sm disabled:opacity-50"
                      >
                        <Check className="w-4 h-4" />
                        Approve
                      </button>
                    </div>
                  )}

                  {application.status === 'approved' && (
                    <div className="px-4 py-3 bg-[#27272A] border-t border-[#3F3F46] flex items-center justify-between">
                      <span className="text-[#8E8E93] text-sm">Badge Type:</span>
                      <select
                        value={application.badge_type}
                        onChange={(e) => handleChangeBadge(application, e.target.value)}
                        className="px-3 py-1.5 bg-[#3F3F46] border border-[#52525B] rounded-lg text-white text-sm focus:outline-none focus:border-[#6366F1]"
                      >
                        <option value="educator">Educator</option>
                        <option value="validator">Validator</option>
                        <option value="brand_partner">Brand Partner</option>
                      </select>
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
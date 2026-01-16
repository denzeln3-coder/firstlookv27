import React, { useState } from 'react';
import { X, Loader2, Download, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function ExportModal({ project, onClose, onExportComplete }) {
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  const handleExport = async () => {
    setExporting(true);
    setProgress(10);
    setError(null);

    try {
      // Create render job
      setProgress(20);
      const renderJob = await base44.entities.RenderJob.create({
        edit_project_id: project.id,
        status: 'queued',
        provider: 'shotstack'
      });

      setProgress(30);

      // Call backend function to start rendering
      const result = await base44.functions.invoke('renderVideo', {
        projectId: project.id,
        renderJobId: renderJob.id,
        editInstructions: project.edit_instructions
      });

      setProgress(50);

      // Poll for completion
      let attempts = 0;
      const maxAttempts = 60; // 5 minutes max
      
      const pollStatus = async () => {
        const jobs = await base44.entities.RenderJob.list();
        const job = jobs.find(j => j.id === renderJob.id);
        
        if (job.status === 'completed') {
          setProgress(100);
          await base44.entities.EditProject.update(project.id, {
            status: 'rendered',
            final_video_url: job.output_url
          });
          onExportComplete(job.output_url);
          return;
        } else if (job.status === 'failed') {
          throw new Error(job.error_message || 'Rendering failed');
        }
        
        attempts++;
        if (attempts >= maxAttempts) {
          throw new Error('Export timeout - please try again');
        }
        
        setProgress(50 + (attempts / maxAttempts) * 40);
        setTimeout(pollStatus, 5000);
      };

      await pollStatus();
    } catch (err) {
      console.error('Export error:', err);
      setError(err.message || 'Failed to export video');
      setExporting(false);
    }
  };

  const handleUseFallback = () => {
    if (project.fallback_original_video_url) {
      onExportComplete(project.fallback_original_video_url);
    } else {
      toast.error('No fallback video available');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#18181B] border border-[#27272A] rounded-2xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white text-lg font-bold">Export Video</h3>
          <button
            onClick={onClose}
            disabled={exporting}
            className="text-[#8E8E93] hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!exporting && !error && (
          <>
            <p className="text-[#A1A1AA] text-sm mb-6">
              Your video will be rendered with all edits applied. This may take a few minutes.
            </p>
            <div className="space-y-3">
              <button
                onClick={handleExport}
                className="w-full py-3 bg-[#6366F1] text-white font-semibold rounded-lg hover:brightness-110 transition flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Start Export
              </button>
              <button
                onClick={onClose}
                className="w-full py-3 bg-[#27272A] text-white font-medium rounded-lg hover:bg-[#3F3F46] transition"
              >
                Cancel
              </button>
            </div>
          </>
        )}

        {exporting && (
          <div className="text-center py-6">
            <Loader2 className="w-12 h-12 text-[#6366F1] animate-spin mx-auto mb-4" />
            <p className="text-white text-sm font-medium mb-2">Exporting your video...</p>
            <div className="w-full h-2 bg-[#27272A] rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-[#6366F1] transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-[#636366] text-xs">{progress}% complete</p>
          </div>
        )}

        {error && (
          <div className="text-center py-6">
            <AlertCircle className="w-12 h-12 text-[#EF4444] mx-auto mb-4" />
            <p className="text-white text-sm font-medium mb-2">Export Failed</p>
            <p className="text-[#A1A1AA] text-sm mb-6">{error}</p>
            <div className="space-y-3">
              <button
                onClick={handleUseFallback}
                className="w-full py-3 bg-[#27272A] text-white font-medium rounded-lg hover:bg-[#3F3F46] transition"
              >
                Use Original Video
              </button>
              <button
                onClick={() => {
                  setError(null);
                  setExporting(false);
                }}
                className="w-full py-3 bg-[#6366F1] text-white font-semibold rounded-lg hover:brightness-110 transition"
              >
                Try Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
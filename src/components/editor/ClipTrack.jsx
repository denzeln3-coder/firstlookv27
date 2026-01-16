import React, { useRef } from 'react';
import { Plus, Upload } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function ClipTrack({ project, onUpdate }) {
  const fileInputRef = useRef(null);

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    toast.info('Uploading clips...');

    try {
      for (const file of files) {
        // Upload video file
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        
        // Create video asset
        const video = document.createElement('video');
        video.src = URL.createObjectURL(file);
        
        await new Promise((resolve) => {
          video.onloadedmetadata = () => {
            const duration = video.duration;
            
            base44.entities.VideoAsset.create({
              original_url: file_url,
              duration_seconds: duration,
              mime_type: file.type,
              file_size_bytes: file.size,
              uploaded_by_user_id: project.created_by
            }).then(asset => {
              // Add clip to project
              const clips = project.edit_instructions?.clips || [];
              const lastClipEnd = clips.reduce((max, clip) => 
                Math.max(max, clip.start_time_in_timeline + clip.duration_in_timeline), 0
              );

              clips.push({
                id: `clip_${Date.now()}`,
                video_asset_id: asset.id,
                start_time_in_asset: 0,
                end_time_in_asset: duration,
                start_time_in_timeline: lastClipEnd,
                duration_in_timeline: duration,
                volume: 1.0,
                fade_in_duration: 0,
                fade_out_duration: 0
              });

              project.edit_instructions.clips = clips;
              project.current_duration_seconds = lastClipEnd + duration;
              onUpdate();
              resolve();
            });
          };
        });
      }

      toast.success('Clips uploaded successfully!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload clips');
    }
  };

  const clips = project?.edit_instructions?.clips || [];

  return (
    <div className="space-y-4">
      <button
        onClick={() => fileInputRef.current?.click()}
        className="w-full py-8 border-2 border-dashed border-[#27272A] rounded-xl hover:border-[#6366F1] transition flex flex-col items-center justify-center gap-2 text-[#8E8E93] hover:text-white"
      >
        <Upload className="w-8 h-8" />
        <span className="text-sm font-medium">Upload Video Clips</span>
        <span className="text-xs">MP4, MOV, or WebM</span>
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        multiple
        onChange={handleFileUpload}
        className="hidden"
      />

      {clips.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-white text-sm font-semibold">Clips ({clips.length})</h4>
          {clips.map((clip, index) => (
            <div
              key={clip.id}
              className="p-3 bg-[#18181B] rounded-lg border border-[#27272A]"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-white text-sm font-medium">Clip {index + 1}</span>
                <span className="text-[#636366] text-xs">{clip.duration_in_timeline.toFixed(1)}s</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={clip.volume}
                  onChange={(e) => {
                    clip.volume = parseFloat(e.target.value);
                    onUpdate();
                  }}
                  className="flex-1"
                />
                <span className="text-[#636366] text-xs w-8">{Math.round(clip.volume * 100)}%</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
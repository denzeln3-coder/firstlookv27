import React, { useRef, useEffect } from 'react';

export default function Timeline({ project, currentTime, onSeek, onUpdate }) {
  const timelineRef = useRef(null);
  const duration = project?.current_duration_seconds || 15;

  const handleTimelineClick = (e) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * duration;
    onSeek(Math.max(0, Math.min(newTime, duration)));
  };

  const clips = project?.edit_instructions?.clips || [];

  return (
    <div className="h-48 bg-[#0A0A0A] border-t border-[#18181B] flex flex-col">
      <div className="px-4 py-2 border-b border-[#18181B]">
        <h3 className="text-white text-sm font-semibold">Timeline</h3>
      </div>
      
      <div className="flex-1 p-4">
        {/* Timeline ruler */}
        <div className="relative h-8 bg-[#18181B] rounded-lg mb-2">
          <div className="absolute inset-0 flex items-center">
            {Array.from({ length: Math.ceil(duration) + 1 }).map((_, i) => (
              <div
                key={i}
                className="absolute flex flex-col items-center"
                style={{ left: `${(i / duration) * 100}%` }}
              >
                <div className="w-px h-2 bg-[#636366]" />
                <span className="text-[#636366] text-[10px] mt-1">{i}s</span>
              </div>
            ))}
          </div>
        </div>

        {/* Clip track */}
        <div
          ref={timelineRef}
          onClick={handleTimelineClick}
          className="relative h-16 bg-[#18181B] rounded-lg cursor-pointer overflow-hidden"
        >
          {clips.map((clip, index) => (
            <div
              key={clip.id || index}
              className="absolute top-0 h-full bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] rounded border border-[rgba(255,255,255,0.1)] flex items-center justify-center"
              style={{
                left: `${(clip.start_time_in_timeline / duration) * 100}%`,
                width: `${(clip.duration_in_timeline / duration) * 100}%`
              }}
            >
              <span className="text-white text-xs font-medium">Clip {index + 1}</span>
            </div>
          ))}

          {/* Playhead */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-[#EF4444] pointer-events-none"
            style={{ left: `${(currentTime / duration) * 100}%` }}
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full w-3 h-3 bg-[#EF4444] rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
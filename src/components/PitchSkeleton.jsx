import React from 'react';

export default function PitchSkeleton({ count = 8 }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1 px-1">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="relative w-full bg-[#18181B] rounded-sm overflow-hidden" style={{ paddingBottom: '125%' }}>
          <div className="absolute inset-0">
            <div className="w-full h-full bg-gradient-to-b from-[#27272A] to-[#18181B] animate-pulse" />
            <div className="absolute bottom-0 left-0 right-0 p-3 space-y-2">
              <div className="h-3 bg-[#3F3F46] rounded w-3/4 animate-pulse" />
              <div className="h-2 bg-[#3F3F46] rounded w-1/2 animate-pulse" />
            </div>
            <div className="absolute top-2 left-2 flex items-center gap-1">
              <div className="w-6 h-6 rounded-full bg-[#3F3F46] animate-pulse" />
              <div className="h-2 w-16 bg-[#3F3F46] rounded animate-pulse" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

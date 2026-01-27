import React from 'react';

// Generic skeleton loader for pages
export function PageLoader({ type = 'grid' }) {
  if (type === 'grid') {
    return (
      <div className="min-h-screen bg-[#000000] pt-28 pb-20">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-0.5 px-0.5">
          {[...Array(12)].map((_, i) => (
            <div 
              key={i} 
              className="relative w-full bg-[#18181B] rounded-sm skeleton" 
              style={{ paddingBottom: '125%' }} 
            />
          ))}
        </div>
      </div>
    );
  }

  if (type === 'profile') {
    return (
      <div className="min-h-screen bg-[#000000] pt-16 pb-20 px-4">
        {/* Avatar + Stats skeleton */}
        <div className="flex items-center gap-4 py-4">
          <div className="w-20 h-20 rounded-full bg-[#18181B] skeleton" />
          <div className="flex-1 grid grid-cols-3 gap-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="text-center">
                <div className="h-6 w-12 bg-[#18181B] skeleton rounded mx-auto mb-1" />
                <div className="h-3 w-16 bg-[#18181B] skeleton rounded mx-auto" />
              </div>
            ))}
          </div>
        </div>
        {/* Name skeleton */}
        <div className="h-5 w-32 bg-[#18181B] skeleton rounded mb-2" />
        <div className="h-4 w-24 bg-[#18181B] skeleton rounded mb-4" />
        {/* Buttons skeleton */}
        <div className="flex gap-2 mb-4">
          <div className="flex-1 h-10 bg-[#18181B] skeleton rounded-lg" />
          <div className="w-11 h-10 bg-[#18181B] skeleton rounded-lg" />
          <div className="w-11 h-10 bg-[#18181B] skeleton rounded-lg" />
        </div>
        {/* Grid skeleton */}
        <div className="grid grid-cols-4 gap-1 mt-4">
          {[...Array(8)].map((_, i) => (
            <div 
              key={i} 
              className="bg-[#18181B] skeleton rounded-lg" 
              style={{ aspectRatio: '9/16' }} 
            />
          ))}
        </div>
      </div>
    );
  }

  if (type === 'messages') {
    return (
      <div className="min-h-screen bg-black flex">
        <div className="w-full md:w-80 border-r border-white/10 flex flex-col">
          <div className="p-4 border-b border-white/10">
            <div className="h-10 bg-[#1C1C1E] skeleton rounded-xl mb-4" />
            <div className="h-10 bg-[#1C1C1E] skeleton rounded-xl" />
          </div>
          <div className="flex-1 overflow-y-auto">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="p-4 flex gap-3">
                <div className="w-12 h-12 rounded-full bg-[#1C1C1E] skeleton" />
                <div className="flex-1">
                  <div className="h-4 bg-[#1C1C1E] skeleton rounded w-24 mb-2" />
                  <div className="h-3 bg-[#1C1C1E] skeleton rounded w-32" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (type === 'list') {
    return (
      <div className="min-h-screen bg-[#000000] pt-16 pb-20 px-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-4 border-b border-white/5">
            <div className="w-12 h-12 rounded-full bg-[#18181B] skeleton" />
            <div className="flex-1">
              <div className="h-4 bg-[#18181B] skeleton rounded w-32 mb-2" />
              <div className="h-3 bg-[#18181B] skeleton rounded w-24" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Default full page loader
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#000000]">
      <div className="w-8 h-8 border-4 border-[#27272A] border-t-[#8B5CF6] rounded-full animate-spin" />
    </div>
  );
}

// Inline skeleton for smaller components
export function Skeleton({ className = '', ...props }) {
  return (
    <div 
      className={`bg-[#18181B] skeleton rounded ${className}`}
      {...props}
    />
  );
}

export default PageLoader;

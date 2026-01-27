import React, { useEffect, useRef, useState } from 'react';
import { ProgressiveAvatar } from './ProgressiveImage';

export function ParallaxProfileHeader({
  coverImage,
  avatarUrl,
  displayName,
  username,
  isVerified,
  stats,
  onFollowersClick,
  onFollowingClick,
  children // Action buttons
}) {
  const headerRef = useRef(null);
  const [scrollY, setScrollY] = useState(0);
  const [headerHeight, setHeaderHeight] = useState(200);

  useEffect(() => {
    const handleScroll = () => {
      if (headerRef.current) {
        const rect = headerRef.current.getBoundingClientRect();
        setScrollY(Math.max(0, -rect.top));
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Calculate parallax values
  const parallaxOffset = scrollY * 0.5;
  const headerOpacity = Math.max(0, 1 - scrollY / 150);
  const avatarScale = Math.max(0.6, 1 - scrollY / 400);
  const avatarTranslate = Math.min(scrollY * 0.3, 30);

  return (
    <div ref={headerRef} className="relative">
      {/* Cover Image with Parallax */}
      <div 
        className="relative h-36 overflow-hidden"
        style={{
          transform: `translateY(${parallaxOffset}px)`,
        }}
      >
        {coverImage ? (
          <img
            src={coverImage}
            alt="Cover"
            className="w-full h-full object-cover"
            style={{
              transform: `scale(${1 + scrollY * 0.001})`,
            }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#6366F1] via-[#8B5CF6] to-[#A855F7]" />
        )}
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#000000] via-transparent to-transparent" />
      </div>

      {/* Profile Info Section */}
      <div className="relative px-4 -mt-12">
        {/* Avatar with parallax */}
        <div 
          className="relative z-10 mb-3"
          style={{
            transform: `scale(${avatarScale}) translateY(${avatarTranslate}px)`,
            transformOrigin: 'left center',
          }}
        >
          <div className="w-24 h-24 rounded-full border-4 border-[#000000] overflow-hidden bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center">
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-white text-3xl font-bold">
                {displayName?.[0]?.toUpperCase() || '?'}
              </span>
            )}
          </div>
        </div>

        {/* Name & Stats Row */}
        <div 
          className="flex items-start justify-between mb-3"
          style={{ opacity: headerOpacity }}
        >
          <div className="flex-1">
            <h1 className="text-white text-xl font-bold flex items-center gap-1.5">
              {displayName}
              {isVerified && (
                <svg className="w-5 h-5 text-[#3B82F6]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </h1>
            <p className="text-[#8E8E93] text-sm">@{username}</p>
          </div>

          {/* Stats */}
          <div className="flex gap-4">
            <div className="text-center">
              <div className="text-white text-lg font-bold">{stats?.pitches || 0}</div>
              <div className="text-[#636366] text-[10px] uppercase">Pitches</div>
            </div>
            <button onClick={onFollowersClick} className="text-center">
              <div className="text-white text-lg font-bold">{stats?.followers || 0}</div>
              <div className="text-[#636366] text-[10px] uppercase">Followers</div>
            </button>
            <button onClick={onFollowingClick} className="text-center">
              <div className="text-white text-lg font-bold">{stats?.following || 0}</div>
              <div className="text-[#636366] text-[10px] uppercase">Following</div>
            </button>
          </div>
        </div>

        {/* Action buttons */}
        {children}
      </div>
    </div>
  );
}

// Sticky header that appears on scroll
export function StickyProfileHeader({
  avatarUrl,
  displayName,
  isVisible,
  onBackClick
}) {
  return (
    <div 
      className={`fixed top-0 left-0 right-0 z-30 bg-[#000000]/95 backdrop-blur-lg border-b border-[rgba(255,255,255,0.06)] transition-all duration-300 ${
        isVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
      }`}
    >
      <div className="px-4 py-3 flex items-center gap-3">
        <button onClick={onBackClick} className="text-[#8E8E93] hover:text-white transition">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-white text-xs font-bold">{displayName?.[0]?.toUpperCase()}</span>
          )}
        </div>
        
        <span className="text-white font-semibold truncate">{displayName}</span>
      </div>
    </div>
  );
}

// Hook to track scroll for sticky header
export function useScrollPosition(threshold = 150) {
  const [showStickyHeader, setShowStickyHeader] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowStickyHeader(window.scrollY > threshold);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold]);

  return showStickyHeader;
}

export default ParallaxProfileHeader;

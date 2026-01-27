import React, { useState, useEffect, useRef } from 'react';

// Progressive image loading with blur-up effect
export function ProgressiveImage({ 
  src, 
  alt = '', 
  className = '',
  placeholderColor = '#18181B',
  blurAmount = 20,
  ...props 
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef(null);

  // Intersection observer for lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px' }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div 
      ref={imgRef}
      className={`relative overflow-hidden ${className}`}
      style={{ backgroundColor: placeholderColor }}
      {...props}
    >
      {/* Placeholder shimmer */}
      {!isLoaded && (
        <div className="absolute inset-0 skeleton" />
      )}

      {/* Actual image */}
      {isInView && (
        <img
          src={src}
          alt={alt}
          onLoad={() => setIsLoaded(true)}
          className={`w-full h-full object-cover transition-all duration-500 ${
            isLoaded ? 'opacity-100 blur-0' : `opacity-0 blur-[${blurAmount}px]`
          }`}
          style={{
            filter: isLoaded ? 'blur(0)' : `blur(${blurAmount}px)`,
            transform: isLoaded ? 'scale(1)' : 'scale(1.1)',
          }}
        />
      )}
    </div>
  );
}

// Avatar with progressive loading
export function ProgressiveAvatar({ 
  src, 
  alt = '', 
  fallback,
  size = 'md',
  className = '' 
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const sizes = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
    '2xl': 'w-20 h-20 text-xl',
  };

  const showFallback = !src || hasError;

  return (
    <div 
      className={`relative rounded-full overflow-hidden bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center ${sizes[size]} ${className}`}
    >
      {/* Fallback initial */}
      {showFallback && (
        <span className="text-white font-bold uppercase">
          {fallback?.[0] || '?'}
        </span>
      )}

      {/* Shimmer while loading */}
      {!showFallback && !isLoaded && (
        <div className="absolute inset-0 skeleton rounded-full" />
      )}

      {/* Actual avatar */}
      {!showFallback && (
        <img
          src={src}
          alt={alt}
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}
    </div>
  );
}

// Video thumbnail with progressive loading
export function ProgressiveVideoThumbnail({
  thumbnailUrl,
  videoUrl,
  alt = '',
  className = '',
  showPlayButton = true,
  onClick
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <button
      ref={containerRef}
      onClick={onClick}
      className={`relative overflow-hidden bg-[#18181B] ${className}`}
    >
      {/* Shimmer placeholder */}
      {!isLoaded && (
        <div className="absolute inset-0 skeleton" />
      )}

      {/* Thumbnail */}
      {isInView && thumbnailUrl && (
        <img
          src={thumbnailUrl}
          alt={alt}
          onLoad={() => setIsLoaded(true)}
          className={`w-full h-full object-cover transition-all duration-500 ${
            isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
          }`}
          style={{
            filter: isLoaded ? 'blur(0)' : 'blur(10px)',
          }}
        />
      )}

      {/* Play button overlay */}
      {showPlayButton && isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity">
          <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
            <svg className="w-5 h-5 text-black ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      )}
    </button>
  );
}

// Background image with blur-up
export function ProgressiveBackground({
  src,
  children,
  className = '',
  overlayClassName = 'bg-black/50',
}) {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (src) {
      const img = new Image();
      img.src = src;
      img.onload = () => setIsLoaded(true);
    }
  }, [src]);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Background */}
      <div
        className={`absolute inset-0 bg-cover bg-center transition-all duration-700 ${
          isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
        }`}
        style={{
          backgroundImage: src ? `url(${src})` : undefined,
          filter: isLoaded ? 'blur(0)' : 'blur(20px)',
        }}
      />

      {/* Placeholder */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a2e] to-[#16213e] skeleton" />
      )}

      {/* Overlay */}
      <div className={`absolute inset-0 ${overlayClassName}`} />

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export default ProgressiveImage;

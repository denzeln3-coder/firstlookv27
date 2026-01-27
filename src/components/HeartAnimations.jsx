import React, { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';

// Heart burst animation for upvotes
export function HeartAnimation({ show, onComplete }) {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    if (show) {
      // Create particles for burst effect
      const newParticles = Array.from({ length: 6 }, (_, i) => ({
        id: i,
        angle: (i * 60) + Math.random() * 30,
        distance: 30 + Math.random() * 20,
        size: 8 + Math.random() * 8,
        delay: Math.random() * 0.1
      }));
      setParticles(newParticles);

      // Cleanup after animation
      const timer = setTimeout(() => {
        setParticles([]);
        onComplete?.();
      }, 700);

      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  if (!show && particles.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-50">
      {/* Main heart */}
      <div className="animate-heart-pop">
        <Heart className="w-20 h-20 text-[#EF4444] fill-[#EF4444] drop-shadow-lg" />
      </div>

      {/* Particle hearts */}
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute animate-particle-burst"
          style={{
            '--angle': `${particle.angle}deg`,
            '--distance': `${particle.distance}px`,
            animationDelay: `${particle.delay}s`
          }}
        >
          <Heart 
            className="text-[#EF4444] fill-[#EF4444]" 
            style={{ width: particle.size, height: particle.size }}
          />
        </div>
      ))}

      <style jsx>{`
        @keyframes heart-pop {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          15% {
            transform: scale(1.3);
            opacity: 1;
          }
          30% {
            transform: scale(0.95);
          }
          45% {
            transform: scale(1.1);
          }
          60% {
            transform: scale(1);
          }
          100% {
            transform: scale(0);
            opacity: 0;
          }
        }

        .animate-heart-pop {
          animation: heart-pop 0.7s ease-out forwards;
        }

        @keyframes particle-burst {
          0% {
            transform: translate(0, 0) scale(1);
            opacity: 1;
          }
          100% {
            transform: 
              translate(
                calc(cos(var(--angle)) * var(--distance)),
                calc(sin(var(--angle)) * var(--distance))
              ) 
              scale(0);
            opacity: 0;
          }
        }

        .animate-particle-burst {
          animation: particle-burst 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

// Simple heart button with animation
export function AnimatedHeartButton({ isLiked, onClick, count, size = 'md' }) {
  const [showAnimation, setShowAnimation] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleClick = () => {
    if (!isLiked && !isAnimating) {
      setShowAnimation(true);
      setIsAnimating(true);
      
      // Haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }
    onClick?.();
  };

  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  return (
    <button
      onClick={handleClick}
      className={`flex items-center gap-1.5 transition-transform active:scale-90 ${
        isLiked ? 'text-[#EF4444]' : 'text-white/70 hover:text-white'
      }`}
    >
      <Heart 
        className={`${sizes[size]} transition-all duration-200 ${
          isLiked ? 'fill-[#EF4444] scale-110' : ''
        } ${isAnimating ? 'animate-bounce-once' : ''}`}
      />
      {count !== undefined && (
        <span className="text-sm font-medium">{count}</span>
      )}

      <style jsx>{`
        @keyframes bounce-once {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.3); }
        }
        .animate-bounce-once {
          animation: bounce-once 0.3s ease-out;
        }
      `}</style>
    </button>
  );
}

export default HeartAnimation;

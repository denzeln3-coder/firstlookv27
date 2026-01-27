import React, { useEffect, useState, useCallback } from 'react';

// Confetti piece component
const ConfettiPiece = ({ color, delay, left, duration }) => (
  <div
    className="absolute top-0 animate-confetti-fall"
    style={{
      left: `${left}%`,
      animationDelay: `${delay}s`,
      animationDuration: `${duration}s`,
    }}
  >
    <div
      className="w-3 h-3 animate-confetti-spin"
      style={{
        backgroundColor: color,
        animationDuration: `${0.5 + Math.random() * 0.5}s`,
      }}
    />
  </div>
);

// Full confetti explosion
export function ConfettiExplosion({ 
  show, 
  onComplete,
  particleCount = 50,
  duration = 3000,
  colors = ['#6366F1', '#8B5CF6', '#A855F7', '#EC4899', '#F59E0B', '#10B981', '#3B82F6']
}) {
  const [particles, setParticles] = useState([]);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (show && !isActive) {
      setIsActive(true);
      
      // Generate particles
      const newParticles = Array.from({ length: particleCount }, (_, i) => ({
        id: i,
        color: colors[Math.floor(Math.random() * colors.length)],
        left: Math.random() * 100,
        delay: Math.random() * 0.5,
        duration: 2 + Math.random() * 2,
      }));
      
      setParticles(newParticles);

      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate([50, 30, 50]);
      }

      // Cleanup
      const timer = setTimeout(() => {
        setParticles([]);
        setIsActive(false);
        onComplete?.();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [show, isActive, particleCount, duration, colors, onComplete]);

  if (particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      {particles.map((particle) => (
        <ConfettiPiece key={particle.id} {...particle} />
      ))}

      <style jsx global>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(-10vh) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(110vh) rotate(720deg);
            opacity: 0;
          }
        }

        @keyframes confetti-spin {
          0% {
            transform: rotateX(0deg) rotateY(0deg);
          }
          100% {
            transform: rotateX(360deg) rotateY(360deg);
          }
        }

        .animate-confetti-fall {
          animation: confetti-fall linear forwards;
        }

        .animate-confetti-spin {
          animation: confetti-spin linear infinite;
        }
      `}</style>
    </div>
  );
}

// Celebration modal with confetti
export function CelebrationModal({ 
  show, 
  onClose, 
  title = "Congratulations! 🎉",
  message = "You did something awesome!",
  buttonText = "Continue"
}) {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (show) {
      setShowConfetti(true);
    }
  }, [show]);

  if (!show) return null;

  return (
    <>
      <ConfettiExplosion show={showConfetti} />
      
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-6 animate-fade-in">
        <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-8 max-w-md w-full text-center animate-scale-in">
          <div className="text-6xl mb-4">🚀</div>
          <h2 className="text-white text-2xl font-bold mb-2">{title}</h2>
          <p className="text-[#A1A1AA] mb-6">{message}</p>
          <button
            onClick={onClose}
            className="w-full py-3 bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white font-semibold rounded-xl hover:brightness-110 transition"
          >
            {buttonText}
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }

        @keyframes scale-in {
          from { 
            opacity: 0;
            transform: scale(0.9);
          }
          to { 
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }
      `}</style>
    </>
  );
}

// Hook to trigger first-time celebrations
export function useFirstTimeCelebration(key) {
  const [showCelebration, setShowCelebration] = useState(false);

  const triggerCelebration = useCallback(() => {
    const hasSeenCelebration = localStorage.getItem(`celebration_${key}`);
    if (!hasSeenCelebration) {
      setShowCelebration(true);
      localStorage.setItem(`celebration_${key}`, 'true');
    }
  }, [key]);

  const closeCelebration = useCallback(() => {
    setShowCelebration(false);
  }, []);

  return { showCelebration, triggerCelebration, closeCelebration };
}

export default ConfettiExplosion;

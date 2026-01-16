import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Home, Video, User, ArrowUp, Bookmark, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';

export default function OnboardingTour({ onComplete }) {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: 'Welcome to FirstLook! 🎉',
      description: 'Discover amazing startups through 15-second pitches. Watch demos, upvote favorites, and connect with founders.',
      icon: <Sparkles className="w-12 h-12 text-[#6366F1]" />,
      position: 'center'
    },
    {
      title: 'Explore the Feed',
      description: 'Browse startup pitches in a beautiful grid. Tap any pitch to watch and interact.',
      icon: <Home className="w-8 h-8 text-[#6366F1]" />,
      target: 'explore-grid',
      position: 'top'
    },
    {
      title: 'Upvote Great Pitches',
      description: 'Show support by upvoting pitches you love. Founders get notified!',
      icon: <ArrowUp className="w-8 h-8 text-[#22C55E]" />,
      position: 'center'
    },
    {
      title: 'Save for Later',
      description: 'Bookmark pitches to revisit them anytime from your profile.',
      icon: <Bookmark className="w-8 h-8 text-[#6366F1]" />,
      position: 'center'
    },
    {
      title: 'Record Your Pitch',
      description: 'Got a startup? Record your 15-second pitch and 2-minute demo to share with the community.',
      icon: <Video className="w-8 h-8 text-[#6366F1]" />,
      position: 'center',
      cta: 'Record My Pitch',
      ctaAction: () => {
        onComplete();
        navigate(createPageUrl('RecordPitch'));
      }
    },
    {
      title: 'Your Profile',
      description: 'Manage your pitches, view analytics, and build your founder profile.',
      icon: <User className="w-8 h-8 text-[#6366F1]" />,
      position: 'center'
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const step = steps[currentStep];

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
      <div className="bg-[#18181B] border border-[#27272A] rounded-2xl max-w-lg w-full p-8 relative animate-in fade-in zoom-in-95 duration-300">
        {/* Skip Button */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 text-[#71717A] hover:text-[#FAFAFA] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            {step.icon}
          </div>
          <h2 className="text-[#FAFAFA] text-[24px] font-bold mb-3">
            {step.title}
          </h2>
          <p className="text-[#A1A1AA] text-[16px] leading-relaxed">
            {step.description}
          </p>
        </div>

        {/* Progress Dots */}
        <div className="flex justify-center gap-2 mb-6">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentStep
                  ? 'w-8 bg-[#6366F1]'
                  : 'w-2 bg-[#27272A]'
              }`}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          {currentStep > 0 && (
            <button
              onClick={handlePrev}
              className="px-6 py-3 bg-[#09090B] text-[#FAFAFA] border border-[#27272A] rounded-lg hover:bg-[#27272A] transition-all flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
          )}
          
          {step.cta ? (
            <button
              onClick={step.ctaAction}
              className="flex-1 px-6 py-3 bg-[#6366F1] text-white font-semibold rounded-lg hover:brightness-110 transition-all"
            >
              {step.cta}
            </button>
          ) : null}
          
          <button
            onClick={handleNext}
            className="flex-1 px-6 py-3 bg-[#6366F1] text-white font-semibold rounded-lg hover:brightness-110 transition-all flex items-center justify-center gap-2"
          >
            {currentStep === steps.length - 1 ? "Let's Go!" : 'Next'}
            {currentStep !== steps.length - 1 && <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        {/* Skip text */}
        <button
          onClick={handleSkip}
          className="w-full text-center text-[#71717A] text-[13px] mt-4 hover:text-[#A1A1AA] transition-colors"
        >
          Skip tour
        </button>
      </div>
    </div>
  );
}
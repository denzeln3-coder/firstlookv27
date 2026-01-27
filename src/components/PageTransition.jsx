import React from 'react';
import { useLocation } from 'react-router-dom';

// Simple CSS-based page transitions without external dependencies
export default function PageTransition({ children }) {
  const location = useLocation();
  
  return (
    <div 
      key={location.pathname}
      className="page-transition animate-fadeIn"
    >
      {children}
    </div>
  );
}

// Add these styles to your global CSS or Layout.jsx:
/*
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fadeIn {
  animation: fadeIn 0.2s ease-out forwards;
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.animate-slideInRight {
  animation: slideInRight 0.25s ease-out forwards;
}

@keyframes slideInLeft {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.animate-slideInLeft {
  animation: slideInLeft 0.25s ease-out forwards;
}
*/

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useAuth } from '@/lib/AuthContext';
import PrivacyPolicyModal from './components/PrivacyPolicyModal';
import UserTypeSelectionModal from './components/UserTypeSelectionModal';
import BottomNav from './components/BottomNav';

// Pages that should show the bottom nav
const PAGES_WITH_BOTTOM_NAV = [
  'Explore',
  'Community',
  'Messages',
  'Profile',
  'Saved',
  'ChannelDetail',
  'FollowersList',
  'Leaderboard',
  'ForumHome',
  'Discover',
  ''  // Home route
];

// Pages that should NOT have bottom padding (they handle it themselves or don't need it)
const PAGES_WITHOUT_PADDING = [
  'RecordPitch',
  'VideoEditor',
  'Login',
  'PitchCardCreator',
  'ThumbnailSelector'
];

export default function Layout({ children, currentPageName }) {
  const [showPrivacyPolicy, setShowPrivacyPolicy] = React.useState(false);
  const [showUserTypeSelection, setShowUserTypeSelection] = React.useState(false);
  const [hasCheckedUserType, setHasCheckedUserType] = React.useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Use AuthContext instead of separate query - single source of truth
  const { user, isLoadingAuth } = useAuth();

  // Determine current page from URL
  const currentPage = currentPageName || location.pathname.replace('/', '') || 'Explore';
  
  // Should show bottom nav?
  const showBottomNav = PAGES_WITH_BOTTOM_NAV.includes(currentPage);
  
  // Should add bottom padding?
  const addBottomPadding = showBottomNav && !PAGES_WITHOUT_PADDING.includes(currentPage);

  // Only show user type selection once per session, and only if user exists but has no type
  React.useEffect(() => {
    if (!isLoadingAuth && user && !hasCheckedUserType) {
      setHasCheckedUserType(true);
      
      // Only show modal if user_type is explicitly null/undefined AND not already set in localStorage
      const hasSelectedType = localStorage.getItem('userTypeSelected');
      if (!user.user_type && !hasSelectedType) {
        setShowUserTypeSelection(true);
      }
    }
  }, [user, isLoadingAuth, hasCheckedUserType]);

  // Redirect investors to their dashboard
  React.useEffect(() => {
    if (!isLoadingAuth && user?.user_type === 'investor') {
      if (location.pathname === '/' || location.pathname === '/Explore') {
        navigate('/InvestorDashboard');
      }
    }
  }, [user, isLoadingAuth, location.pathname, navigate]);

  const handleUserTypeComplete = () => {
    setShowUserTypeSelection(false);
    localStorage.setItem('userTypeSelected', 'true');
  };

  return (
    <>
      {showUserTypeSelection && (
        <UserTypeSelectionModal onComplete={handleUserTypeComplete} />
      )}
      {showPrivacyPolicy && !showUserTypeSelection && (
        <PrivacyPolicyModal onAccept={() => setShowPrivacyPolicy(false)} />
      )}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap');

        :root {
          --color-base: #000000;
          --color-surface-1: #0A0A0A;
          --color-surface-2: #141414;
          --color-surface-3: #1C1C1E;
          --color-border-subtle: rgba(255,255,255,0.06);
          --color-border-medium: rgba(255,255,255,0.1);
          --color-border-strong: rgba(255,255,255,0.15);
          --color-text-primary: #FFFFFF;
          --color-text-secondary: #8E8E93;
          --color-text-tertiary: #636366;
          --color-accent: #6366F1;
          --color-accent-hover: #818CF8;
          --color-success: #34D399;
          --color-warning: #FBBF24;
          --color-error: #F87171;
        }

        * {
          font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        body {
          background: var(--color-base);
          color: #FAFAFA;
        }

        /* Page transitions */
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

        .page-content {
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

        .slide-in-right {
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

        .slide-in-left {
          animation: slideInLeft 0.25s ease-out forwards;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .slide-up {
          animation: slideUp 0.3s ease-out forwards;
        }

        /* Safe area for bottom nav */
        .pb-safe {
          padding-bottom: env(safe-area-inset-bottom, 0px);
        }

        .brand-title {
          font-weight: 700;
          letter-spacing: -0.03em;
        }

        .brand-title .highlight {
          background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #A855F7 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .filter-pill {
          transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
          border: 1px solid transparent;
        }

        .filter-pill:not(.active):hover {
          border-color: rgba(99, 102, 241, 0.3);
          background: rgba(99, 102, 241, 0.1);
        }

        .filter-pill.active {
          background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%);
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
        }

        .gradient-text {
          background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #A855F7 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .glass-card {
          background: rgba(24, 24, 27, 0.8);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        button {
          transition: all 200ms ease;
        }

        button:active {
          transform: scale(0.97);
          opacity: 0.9;
        }

        /* Skeleton loading animation */
        @keyframes shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }

        .skeleton {
          background: linear-gradient(
            90deg,
            rgba(255,255,255,0.03) 0%,
            rgba(255,255,255,0.08) 50%,
            rgba(255,255,255,0.03) 100%
          );
          background-size: 1000px 100%;
          animation: shimmer 1.5s infinite;
        }

        /* Custom scrollbar */
        * {
          scrollbar-width: thin;
          scrollbar-color: rgba(255,255,255,0.1) transparent;
        }

        *::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }

        *::-webkit-scrollbar-track {
          background: transparent;
        }

        *::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 3px;
        }

        *::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.2);
        }

        /* Hide scrollbar but keep functionality */
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }

        /* Smooth transitions for all interactive elements */
        a, button {
          transition: all 0.2s ease;
        }

        /* Modal backdrop */
        .modal-backdrop {
          animation: fadeIn 0.15s ease-out forwards;
        }

        /* Card hover effects */
        .card-hover {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .card-hover:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
        }

        /* Input focus styles */
        input:focus, textarea:focus {
          outline: none;
          border-color: #6366F1 !important;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }

        /* Tap highlight removal on mobile */
        * {
          -webkit-tap-highlight-color: transparent;
        }
      `}</style>
      
      {/* Main content with page transition */}
      <div 
        key={location.pathname}
        className={`page-content ${addBottomPadding ? 'pb-20' : ''}`}
      >
        {children}
      </div>
      
      {/* Bottom Navigation */}
      {showBottomNav && <BottomNav />}
      
      <Toaster 
        position="top-center" 
        toastOptions={{
          style: {
            background: '#18181B',
            border: '1px solid #27272A',
            color: '#FAFAFA',
            borderRadius: '12px',
            fontFamily: "'Space Grotesk', sans-serif"
          }
        }}
      />
    </>
  );
}

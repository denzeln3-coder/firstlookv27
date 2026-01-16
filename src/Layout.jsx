import React from 'react';
import { Toaster } from 'sonner';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import PrivacyPolicyModal from './components/PrivacyPolicyModal';
import UserTypeSelectionModal from './components/UserTypeSelectionModal';

export default function Layout({ children }) {
  const [showPrivacyPolicy, setShowPrivacyPolicy] = React.useState(false);
  const [showUserTypeSelection, setShowUserTypeSelection] = React.useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch {
        return null;
      }
    }
  });

  React.useEffect(() => {
    if (user) {
      // Check user type selection first
      if (!user.user_type) {
        setShowUserTypeSelection(true);
        return;
      }

      // Then check privacy policy
      if (!user.privacy_policy_accepted || !user.terms_accepted) {
        const userCreatedDate = new Date(user.created_date);
        const termsAddedDate = new Date('2026-01-07');
        
        if (userCreatedDate >= termsAddedDate) {
          setShowPrivacyPolicy(true);
        }
      }
    }
  }, [user]);

  React.useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/service-worker.js')
          .then((registration) => {
            console.log('SW registered:', registration);
            // Periodically check for service worker updates
            setInterval(() => {
              registration.update();
            }, 60000); // Check every minute
          })
          .catch((error) => {
            console.log('SW registration failed:', error);
          });
      });
    }
  }, []);

  return (
    <>
      {showUserTypeSelection && (
        <UserTypeSelectionModal onComplete={() => setShowUserTypeSelection(false)} />
      )}
      {showPrivacyPolicy && !showUserTypeSelection && (
        <PrivacyPolicyModal onAccept={() => setShowPrivacyPolicy(false)} />
      )}
      <head>
        <meta name="application-name" content="FirstLook" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="FirstLook" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#6366F1" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <script src="https://html2canvas.hertzen.com/dist/html2canvas.min.js"></script>
      </head>
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
          transition: opacity 200ms ease;
        }

        button:active {
          opacity: 0.8;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }

        .skeleton {
          background: linear-gradient(
            90deg,
            rgba(255,255,255,0.03) 0%,
            rgba(255,255,255,0.06) 50%,
            rgba(255,255,255,0.03) 100%
          );
          background-size: 1000px 100%;
          animation: shimmer 2s infinite;
        }

        * {
          scrollbar-width: thin;
          scrollbar-color: rgba(255,255,255,0.1) transparent;
        }

        *::-webkit-scrollbar {
          width: 8px;
        }

        *::-webkit-scrollbar-track {
          background: transparent;
        }

        *::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 4px;
        }

        *::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.15);
        }
      `}</style>
      {children}
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
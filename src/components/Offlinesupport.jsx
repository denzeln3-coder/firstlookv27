import React, { useState, useEffect, createContext, useContext } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

// Context for offline state
const OfflineContext = createContext({
  isOnline: true,
  isOffline: false,
});

export function useOffline() {
  return useContext(OfflineContext);
}

// Provider component
export function OfflineProvider({ children }) {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <OfflineContext.Provider value={{ isOnline, isOffline: !isOnline }}>
      {children}
      <OfflineBanner isOffline={!isOnline} />
    </OfflineContext.Provider>
  );
}

// Offline banner that appears at top
export function OfflineBanner({ isOffline }) {
  const [show, setShow] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (isOffline) {
      setShow(true);
      setWasOffline(true);
    } else if (wasOffline) {
      // Show "back online" briefly
      setTimeout(() => setShow(false), 2000);
    }
  }, [isOffline, wasOffline]);

  if (!show) return null;

  return (
    <div 
      className={`fixed top-0 left-0 right-0 z-[100] px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium transition-all duration-300 ${
        isOffline 
          ? 'bg-[#EF4444] text-white' 
          : 'bg-[#10B981] text-white'
      }`}
    >
      {isOffline ? (
        <>
          <WifiOff className="w-4 h-4" />
          <span>You're offline. Some features may be unavailable.</span>
        </>
      ) : (
        <>
          <RefreshCw className="w-4 h-4" />
          <span>Back online!</span>
        </>
      )}
    </div>
  );
}

// Offline-aware data wrapper
export function OfflineData({ 
  data, 
  isLoading, 
  error, 
  cacheKey,
  children,
  fallback
}) {
  const { isOffline } = useOffline();
  const [cachedData, setCachedData] = useState(null);

  // Save to cache when data updates
  useEffect(() => {
    if (data && cacheKey) {
      try {
        localStorage.setItem(`cache_${cacheKey}`, JSON.stringify({
          data,
          timestamp: Date.now()
        }));
      } catch (e) {
        console.warn('Failed to cache data:', e);
      }
    }
  }, [data, cacheKey]);

  // Load from cache on mount or when offline
  useEffect(() => {
    if (cacheKey && (isOffline || (!data && !isLoading))) {
      try {
        const cached = localStorage.getItem(`cache_${cacheKey}`);
        if (cached) {
          const { data: cachedData } = JSON.parse(cached);
          setCachedData(cachedData);
        }
      } catch (e) {
        console.warn('Failed to load cached data:', e);
      }
    }
  }, [cacheKey, isOffline, data, isLoading]);

  // Determine what data to use
  const displayData = data || cachedData;
  const showingCached = !data && cachedData;

  if (isLoading && !cachedData) {
    return fallback || <div className="animate-pulse">Loading...</div>;
  }

  if (!displayData) {
    return (
      <div className="text-center py-12">
        <WifiOff className="w-12 h-12 text-[#636366] mx-auto mb-3" />
        <p className="text-[#8E8E93]">No data available</p>
        {isOffline && (
          <p className="text-[#636366] text-sm mt-1">Connect to the internet to load content</p>
        )}
      </div>
    );
  }

  return (
    <>
      {showingCached && (
        <div className="bg-[#27272A] text-[#A1A1AA] text-xs px-3 py-1.5 text-center">
          Showing cached content
        </div>
      )}
      {children(displayData)}
    </>
  );
}

// Cache utility functions
export const offlineCache = {
  set: (key, data, expiryMinutes = 60) => {
    try {
      localStorage.setItem(`cache_${key}`, JSON.stringify({
        data,
        timestamp: Date.now(),
        expiry: expiryMinutes * 60 * 1000
      }));
      return true;
    } catch (e) {
      console.warn('Cache set failed:', e);
      return false;
    }
  },

  get: (key) => {
    try {
      const cached = localStorage.getItem(`cache_${key}`);
      if (!cached) return null;

      const { data, timestamp, expiry } = JSON.parse(cached);
      
      // Check if expired
      if (Date.now() - timestamp > expiry) {
        localStorage.removeItem(`cache_${key}`);
        return null;
      }

      return data;
    } catch (e) {
      console.warn('Cache get failed:', e);
      return null;
    }
  },

  clear: (key) => {
    if (key) {
      localStorage.removeItem(`cache_${key}`);
    } else {
      // Clear all cache items
      Object.keys(localStorage)
        .filter(k => k.startsWith('cache_'))
        .forEach(k => localStorage.removeItem(k));
    }
  },

  // Get all cached keys
  keys: () => {
    return Object.keys(localStorage)
      .filter(k => k.startsWith('cache_'))
      .map(k => k.replace('cache_', ''));
  }
};

// Hook to use cached query
export function useCachedData(key, fetcher, options = {}) {
  const { isOffline } = useOffline();
  const [data, setData] = useState(() => offlineCache.get(key));
  const [isLoading, setIsLoading] = useState(!data);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOffline && data) {
      // Use cached data when offline
      return;
    }

    const fetchData = async () => {
      try {
        setIsLoading(true);
        const result = await fetcher();
        setData(result);
        offlineCache.set(key, result, options.cacheMinutes || 60);
        setError(null);
      } catch (e) {
        setError(e);
        // Fall back to cache on error
        const cached = offlineCache.get(key);
        if (cached) setData(cached);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [key, isOffline]);

  return { data, isLoading, error, isFromCache: !isLoading && !!offlineCache.get(key) };
}

export default OfflineProvider;

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function NavigationTracker() {
  const location = useLocation();

  useEffect(() => {
    // Simple page tracking - can be expanded later
    console.log('Page viewed:', location.pathname);
  }, [location]);

  return null;
}

/**
 * Network-aware video quality selection
 * Automatically adapts video quality based on connection speed and device
 */

export function getOptimalVideoQuality(connection, isMobile) {
  if (!connection) {
    return { bitrate: 'auto', maxResolution: isMobile ? '720p' : '1080p' };
  }

  const effectiveType = connection.effectiveType || '4g';
  const downlink = connection.downlink || 10;
  const rtt = connection.rtt || 50;

  // 3G: ~1.5 Mbps, high latency
  if (effectiveType === '3g' || downlink < 1.5) {
    return { bitrate: '500k', maxResolution: isMobile ? '360p' : '480p' };
  }

  // 4G: ~10 Mbps, medium latency
  if (effectiveType === '4g') {
    return {
      bitrate: isMobile ? '1000k' : '1500k',
      maxResolution: isMobile ? '480p' : '720p'
    };
  }

  // 5G or WiFi: high speed
  if (effectiveType === '5g' || downlink > 10) {
    return {
      bitrate: isMobile ? '1500k' : '2500k',
      maxResolution: isMobile ? '720p' : '1080p'
    };
  }

  return { bitrate: 'auto', maxResolution: isMobile ? '720p' : '1080p' };
}

/**
 * Prefetch strategy based on network and battery
 */
export function getPrefetchStrategy() {
  const isMobile = window.innerWidth < 768;
  const connection = navigator.connection;
  const battery = navigator.getBattery ? navigator.getBattery() : null;

  let prefetchCount = 6; // Default desktop

  if (isMobile) {
    prefetchCount = 3; // Reduced for mobile
    
    // Adjust based on connection
    if (connection?.effectiveType === '3g') {
      prefetchCount = 2;
    } else if (connection?.effectiveType === '5g' || connection?.downlink > 10) {
      prefetchCount = 5;
    }
    
    // Reduce if battery is low
    if (battery && battery.level < 0.2) {
      prefetchCount = Math.max(1, prefetchCount - 1);
    }
  }

  return { prefetchCount };
}

/**
 * Check if we should prefetch based on network and battery
 */
export function shouldPrefetch() {
  const connection = navigator.connection;
  
  // Don't prefetch on slow 3G
  if (connection?.effectiveType === '3g') {
    return false;
  }

  // Don't prefetch if user is on a metered connection and using data saver
  if (connection?.saveData) {
    return false;
  }

  return true;
}
import { base44 } from '@/api/base44Client';

class ErrorLogger {
  constructor() {
    this.errors = [];
    this.maxErrors = 100;
  }

  async log(error, context = {}) {
    const errorData = {
      message: error.message || String(error),
      stack: error.stack,
      timestamp: new Date().toISOString(),
      context: {
        ...context,
        userAgent: navigator.userAgent,
        url: window.location.href,
        viewportSize: `${window.innerWidth}x${window.innerHeight}`
      }
    };

    // Store locally
    this.errors.push(errorData);
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }

    // Log to console in development
    console.error('[ErrorLogger]', errorData);

    // Send to backend for critical errors
    if (this.isCritical(context.severity)) {
      try {
        const user = await base44.auth.me().catch(() => null);
        await base44.integrations.Core.SendEmail({
          to: 'errors@firstlook.app',
          subject: `Critical Error: ${context.component || 'Unknown'}`,
          body: `
            Error: ${errorData.message}
            
            User: ${user?.email || 'Anonymous'}
            Component: ${context.component || 'Unknown'}
            Action: ${context.action || 'Unknown'}
            
            Stack:
            ${errorData.stack}
            
            Context:
            ${JSON.stringify(errorData.context, null, 2)}
          `
        }).catch(() => {});
      } catch (e) {
        // Silent fail for error logging
      }
    }

    return errorData;
  }

  isCritical(severity) {
    return severity === 'critical' || severity === 'high';
  }

  getErrors(limit = 50) {
    return this.errors.slice(-limit);
  }

  clear() {
    this.errors = [];
  }

  // Specialized logging methods
  logRecordingError(error, stage) {
    return this.log(error, {
      component: 'Recording',
      action: stage,
      severity: 'high'
    });
  }

  logUploadError(error, fileSize) {
    return this.log(error, {
      component: 'Upload',
      action: 'uploadVideo',
      severity: 'critical',
      fileSize
    });
  }

  logProcessingError(error, operation) {
    return this.log(error, {
      component: 'VideoProcessing',
      action: operation,
      severity: 'high'
    });
  }

  logAuthError(error) {
    return this.log(error, {
      component: 'Auth',
      severity: 'medium'
    });
  }
}

export const errorLogger = new ErrorLogger();

// Setup global error handlers
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    errorLogger.log(event.error, {
      component: 'Global',
      action: 'uncaughtError',
      severity: 'high'
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    errorLogger.log(new Error(event.reason), {
      component: 'Global',
      action: 'unhandledPromise',
      severity: 'high'
    });
  });
}
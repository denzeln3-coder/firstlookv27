import { supabase } from '@/lib/supabase';

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

    this.errors.push(errorData);
    if (this.errors.length > this.maxErrors) this.errors.shift();

    console.error('[ErrorLogger]', errorData);

    if (this.isCritical(context.severity)) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        // Log to console for now - email sending can be added via Supabase Edge Functions
        console.error('[Critical Error]', { user: user?.email, ...errorData });
      } catch (e) {
        // Silent fail
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

  logRecordingError(error, stage) {
    return this.log(error, { component: 'Recording', action: stage, severity: 'high' });
  }

  logUploadError(error, fileSize) {
    return this.log(error, { component: 'Upload', action: 'uploadVideo', severity: 'critical', fileSize });
  }

  logProcessingError(error, operation) {
    return this.log(error, { component: 'VideoProcessing', action: operation, severity: 'high' });
  }

  logAuthError(error) {
    return this.log(error, { component: 'Auth', severity: 'medium' });
  }
}

export const errorLogger = new ErrorLogger();

if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    errorLogger.log(event.error, { component: 'Global', action: 'uncaughtError', severity: 'high' });
  });
  window.addEventListener('unhandledrejection', (event) => {
    errorLogger.log(new Error(event.reason), { component: 'Global', action: 'unhandledPromise', severity: 'high' });
  });
}

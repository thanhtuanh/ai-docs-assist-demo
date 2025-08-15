import { ErrorHandler, Injectable } from '@angular/core';

@Injectable()
export class SafeGlobalErrorHandler implements ErrorHandler {
  private errorCount = 0;
  private maxErrors = 10;

  handleError(error: any): void {
    // ✅ Prevent infinite error loops
    this.errorCount++;
    
    if (this.errorCount > this.maxErrors) {
      console.warn('Too many errors, stopping error handler');
      return;
    }

    console.error('Global Error:', {
      message: error?.message || 'Unknown error',
      stack: error?.stack || 'No stack trace',
      timestamp: new Date().toISOString()
    });

    // ✅ Reset counter after delay
    setTimeout(() => {
      this.errorCount = Math.max(0, this.errorCount - 1);
    }, 5000);
  }
}
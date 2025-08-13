export const environment = {
  production: true,
  apiUrl: '/api', // Uses Nginx proxy in production
  features: {
    industryDetection: true,
    aiAnalysis: true,
    batchProcessing: true,
    realtimeAnalysis: true,
    legacyEndpoints: false
  },
  limits: {
    maxFileSize: '10MB',
    maxBatchFiles: 10,
    textLimits: {
      free: 100000,
      premium: 500000,
      enterprise: 2000000
    }
  },
  endpoints: {
    documents: '/api/documents',
    ai: '/api/ai',
    feedback: '/api/feedback',
    test: '/api/test'
  }
};
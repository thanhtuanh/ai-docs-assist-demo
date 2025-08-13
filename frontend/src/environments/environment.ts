export const environment = {
  production: false,
  apiUrl: '/api', // Proxy to http://localhost:8080/api
  features: {
    industryDetection: true,
    aiAnalysis: true,
    batchProcessing: true,
    realtimeAnalysis: true,
    legacyEndpoints: false // Set to true if backend has legacy endpoints enabled
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
    test: '/api/test' // For development testing
  }
};
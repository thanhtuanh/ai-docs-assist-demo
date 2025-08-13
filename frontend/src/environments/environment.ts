export const environment = {
  production: false,
  //apiUrl: 'http://localhost:8080/api'
  apiUrl: '/api' // ← Proxy leitet an http://localhost:8080 weiter
};
console.log('🔧 DEVELOPMENT Environment loaded:', environment);
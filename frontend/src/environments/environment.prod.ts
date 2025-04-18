// Production environment settings

export const environment = {
  production: true,
  apiUrl: '/api', // This will use relative path in production, working with the nginx configuration
  wsUrl: '/ws'
};
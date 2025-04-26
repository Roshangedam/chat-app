// Production environment settings

export const environment = {
  production: true,
  apiUrl: '/api', // This will use relative path in production, working with the nginx configuration
  wsUrl: '/ws',
  log: {
    apiUrl: '/api',
    logLevel: 'ROOT', // Available levels: 'DEBUG', 'INFO', 'WARNING', 'ERROR', 'ROOT'
    enableSendApiLog: true, // Enable or disable send logging to api
    enableConsoleLog: true // Enable or disable console logging
  },
};

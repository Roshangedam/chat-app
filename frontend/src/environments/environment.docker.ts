// Docker environment settings

export const environment = {
  production: true,
  apiUrl: '/api', // This will use relative path with nginx proxy
  wsUrl: '/ws',  // This will use relative path with nginx proxy
  log: {
    apiUrl: '/api',
    logLevel: 'ROOT', // Available levels: 'DEBUG', 'INFO', 'WARNING', 'ERROR', 'ROOT'
    enableSendApiLog: true, // Enable or disable send logging to api
    enableConsoleLog: true // Enable or disable console logging
  },
};
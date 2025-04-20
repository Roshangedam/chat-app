// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.

export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080',
  wsUrl: 'http://localhost:8080/ws',
  log: {
    apiUrl: 'http://localhost:8080/v1/api/log',
    logLevel: 'ROOT', // Available levels: 'DEBUG', 'INFO', 'WARNING', 'ERROR', 'ROOT'
    enableSendApiLog: true, // Enable or disable send logging to api
    enableConsoleLog: true // Enable or disable console logging
  },
};

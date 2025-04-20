import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from './../../../../../src/environments/environment';
import { isPlatformBrowser } from '@angular/common';

/**
 * Logging Service
 *
 * This service provides functionality for logging messages at different levels.
 * It supports configurable log levels and console logging. Logs are sent to a specified API endpoint.
 *
 * ISO/IEC 25010 Compliance:
 * - Functionality Suitability
 * - Performance Efficiency
 * - Reliability
 * - Maintainability
 * - Usability
 * - Portability
 *
 * Internationalization Support:
 * - All log messages should be prepared for internationalization.
 *
 * @version 1.0.0
 * @since 2024-06-23
 */

@Injectable({
  providedIn: 'root',
})
export class LoggingService {
  private logLevel: string;

  /**
   * Constructor
   * Initializes the log level from the environment configuration.
   *
   * @param http - HttpClient for sending log data to the server
   */
  private isBrowser: boolean;

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.logLevel = environment.log?.logLevel || 'NONE';
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  /**
   * Set Log Level
   * Updates the current log level.
   *
   * @param logLevel - The new log level to set
   */
  setLogLevel(logLevel: string) {
    this.logLevel = logLevel;
  }

  /**
   * Log Debug
   * Logs a debug message if the current log level allows it.
   *
   * @param message - The message to log
   * @param exception - Optional exception details
   */
  logDebug(message: string, exception?: any) {
    if (this.shouldLog('DEBUG')) {
      this.sendLog('DEBUG', message, exception);
    }
  }

  /**
   * Log Info
   * Logs an informational message if the current log level allows it.
   *
   * @param message - The message to log
   * @param exception - Optional exception details
   */
  logInfo(message: string, exception?: any) {
    if (this.shouldLog('INFO')) {
      this.sendLog('INFO', message, exception);
    }
  }

  /**
   * Log Warning
   * Logs a warning message if the current log level allows it.
   *
   * @param message - The message to log
   * @param exception - Optional exception details
   */
  logWarning(message: string, exception?: any) {
    if (this.shouldLog('WARNING')) {
      this.sendLog('WARNING', message, exception);
    }
  }

  /**
   * Log Error
   * Logs an error message if the current log level allows it.
   *
   * @param message - The message to log
   * @param exception - Optional exception details
   */
  logError(message: string, exception?: any) {
    if (this.shouldLog('ERROR')) {
      this.sendLog('ERROR', message, exception);
    }
  }

  /**
   * Should Log
   * Determines if a message should be logged based on the current log level.
   *
   * @param logLevel - The log level of the message
   * @returns boolean - True if the message should be logged, otherwise false
   */
  private shouldLog(logLevel: string): boolean {
    return this.logLevel === 'ROOT' || this.logLevel === logLevel;
  }

  /**
   * Send Log
   * Prepares the log data and sends it to the configured API endpoint.
   * Also logs to the console if enabled in the environment configuration.
   *
   * @param level - The log level of the message
   * @param message - The message to log
   * @param exception - Optional exception details
   */
  private sendLog(level: string, message: string, exception?: any) {
    // Format timestamp to match Java's LocalDateTime format
    const now = new Date();
    // Format: YYYY-MM-DDTHH:MM:SS (Java LocalDateTime compatible format)
    const formattedTimestamp = now.toISOString().split('.')[0];

    const logData = {
      level: level,
      message: message,
      exception: exception ? JSON.stringify(exception) : null,
      // Internationalization: Ensure that the message is localized before sending
      // user: this.userService.getLoggedUser(), // Uncomment if user service is used
      timestamp: formattedTimestamp,
    };

    // Log to console if enabled
    if (environment.log.enableConsoleLog) {
      console.log(`[${level}] ${message}`, exception || '');
    }

    // Send log data to the API endpoint if enabled and running in browser
    if (environment.log.enableSendApiLog && this.isBrowser) {
      try {
        // Use XMLHttpRequest directly to avoid going through interceptors
        // This breaks the circular dependency with AuthService
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${environment.log.apiUrl}`, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            if (environment.log.enableConsoleLog) {
              console.debug('Log sent to server successfully');
            }
          } else {
            console.error('Failed to send log to server:', xhr.statusText);
          }
        };
        xhr.onerror = () => {
          console.error('Failed to send log to server: Network error');
        };
        xhr.send(JSON.stringify(logData));
      } catch (error) {
        console.error('Failed to send log to server:', error);
      }
    } else if (environment.log.enableSendApiLog && !this.isBrowser) {
      // Skip sending logs on server-side
      if (environment.log.enableConsoleLog) {
        console.debug('Skipping log sending on server-side');
      }
    }
  }
}

import { Component, OnInit } from '@angular/core';
import { LoggingService } from '../services/logging.service';

/**
 * Example component demonstrating how to use the LoggingService
 *
 * This component shows proper usage patterns for the different log levels
 * and how to handle exceptions in logging.
 */
@Component({
  selector: 'app-logging-example',
  template: `
    <div class="logging-example">
      <h2>Logging Example</h2>
      <div class="buttons">
        <button (click)="logDebugMessage()">Log Debug</button>
        <button (click)="logInfoMessage()">Log Info</button>
        <button (click)="logWarningMessage()">Log Warning</button>
        <button (click)="logErrorMessage()">Log Error</button>
        <button (click)="logExceptionExample()">Log Exception</button>
      </div>
    </div>
  `,
  styles: [`
    .logging-example {
      padding: 20px;
      border: 1px solid #ccc;
      border-radius: 5px;
      margin: 20px;
    }
    .buttons {
      display: flex;
      gap: 10px;
      margin-top: 15px;
    }
    button {
      padding: 8px 16px;
      background-color: #4CAF50;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    button:hover {
      background-color: #45a049;
    }
  `]
})
export class LoggingExampleComponent implements OnInit {

  constructor(private loggingService: LoggingService) { }

  ngOnInit(): void {
    this.loggingService.logInfo('LoggingExampleComponent initialized');
  }

  /**
   * Example of logging a debug message
   */
  logDebugMessage(): void {
    this.loggingService.logDebug('This is a debug message from the example component');
  }

  /**
   * Example of logging an info message
   */
  logInfoMessage(): void {
    this.loggingService.logInfo('This is an info message from the example component');
  }

  /**
   * Example of logging a warning message
   */
  logWarningMessage(): void {
    this.loggingService.logWarning('This is a warning message from the example component');
  }

  /**
   * Example of logging an error message
   */
  logErrorMessage(): void {
    this.loggingService.logError('This is an error message from the example component');
  }

  /**
   * Example of logging an exception
   */
  logExceptionExample(): void {
    try {
      // Deliberately cause an error
      const obj = null;
      // @ts-ignore - This will cause a runtime error
      const result = obj.nonExistentMethod();
    } catch (error) {
      this.loggingService.logError('An exception occurred in the example component', error);
    }
  }
}
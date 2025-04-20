import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { LoggingService } from './services/logging.service';
import { LoggingExampleComponent } from './examples/logging-example.component';

/**
 * Logger Module
 *
 * This module provides logging functionality for the application.
 * It includes the LoggingService and example components.
 */
@NgModule({
  declarations: [
    LoggingExampleComponent
  ],
  imports: [
    CommonModule,
    HttpClientModule
  ],
  exports: [
    LoggingExampleComponent
  ],
  providers: [
    LoggingService
  ]
})
export class LoggerModule { }
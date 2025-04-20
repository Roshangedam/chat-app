import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
// Import global polyfill to fix 'global is not defined' error
import './app/core/polyfills/global.polyfill';

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));

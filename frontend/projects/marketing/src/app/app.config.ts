import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { environment } from '../environments/environment';
import { APP_URL } from './app-url';

/** Composition root. The site is static: no router, no session and no HTTP client (ADR 0013). */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    { provide: APP_URL, useValue: environment.appUrl },
  ],
};

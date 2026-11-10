import { provideHttpClient } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import {
  DIRECTORY_API,
  LISTINGS_API,
  HttpDirectoryApi,
  HttpListingsApi,
  HttpNavigationApi,
  HttpSessionApi,
  NAVIGATION_API,
  SESSION_API,
} from 'api';
import { routes } from './app.routes';
import { SessionService } from './services/session.service';

/** Composition root: every API contract is bound to its implementation here. */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(),
    provideRouter(routes),
    { provide: SESSION_API, useClass: HttpSessionApi },
    { provide: NAVIGATION_API, useClass: HttpNavigationApi },
    { provide: DIRECTORY_API, useClass: HttpDirectoryApi },
    { provide: LISTINGS_API, useClass: HttpListingsApi },
    provideAppInitializer(() => inject(SessionService).resolve()),
  ],
};

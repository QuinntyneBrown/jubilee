import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import {
  ACCOUNT_API,
  HttpAccountApi,
  DIRECTORY_API,
  LISTINGS_API,
  HttpDirectoryApi,
  HttpListingsApi,
  HttpNavigationApi,
  HttpSessionApi,
  HttpSearchApi,
  NAVIGATION_API,
  SEARCH_API,
  SESSION_API,
} from 'api';
import { routes } from './app.routes';
import { sessionExpiredInterceptor } from './interceptors/session-expired.interceptor';
import { SessionService } from './services/session.service';

/** Composition root: every API contract is bound to its implementation here. */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptors([sessionExpiredInterceptor])),
    // "Shop products" scrolls to the products (L2-034 AC1).
    provideRouter(routes, withInMemoryScrolling({ anchorScrolling: 'enabled' })),
    { provide: ACCOUNT_API, useClass: HttpAccountApi },
    { provide: SESSION_API, useClass: HttpSessionApi },
    { provide: NAVIGATION_API, useClass: HttpNavigationApi },
    { provide: DIRECTORY_API, useClass: HttpDirectoryApi },
    { provide: LISTINGS_API, useClass: HttpListingsApi },
    { provide: SEARCH_API, useClass: HttpSearchApi },
    provideAppInitializer(() => inject(SessionService).resolve()),
  ],
};

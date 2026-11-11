import { provideHttpClient } from '@angular/common/http';
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
  ADMIN_API,
  INCOMING_REQUESTS_API,
  HttpIncomingRequestsApi,
  HttpAdminApi,
  DIRECTORY_API,
  LISTINGS_API,
  HttpDirectoryApi,
  HttpListingsApi,
  HttpMessagesApi,
  HttpListingDraftsApi,
  HttpReferenceApi,
  HttpRequestsApi,
  REFERENCE_API,
  LISTING_DRAFTS_API,
  MESSAGES_API,
  REQUESTS_API,
  HttpNavigationApi,
  HttpSessionApi,
  HttpSearchApi,
  NAVIGATION_API,
  SEARCH_API,
  SESSION_API,
} from 'api';
import { routes } from './app.routes';
import { SessionService } from './services/session.service';

/** Composition root: every API contract is bound to its implementation here. */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(),
    // "Shop products" scrolls to the products (L2-034 AC1).
    provideRouter(routes, withInMemoryScrolling({ anchorScrolling: 'enabled' })),
    { provide: ACCOUNT_API, useClass: HttpAccountApi },
    { provide: SESSION_API, useClass: HttpSessionApi },
    { provide: NAVIGATION_API, useClass: HttpNavigationApi },
    { provide: DIRECTORY_API, useClass: HttpDirectoryApi },
    { provide: LISTINGS_API, useClass: HttpListingsApi },
    { provide: SEARCH_API, useClass: HttpSearchApi },
    { provide: MESSAGES_API, useClass: HttpMessagesApi },
    { provide: REQUESTS_API, useClass: HttpRequestsApi },
    { provide: LISTING_DRAFTS_API, useClass: HttpListingDraftsApi },
    { provide: REFERENCE_API, useClass: HttpReferenceApi },
    { provide: ADMIN_API, useClass: HttpAdminApi },
    { provide: INCOMING_REQUESTS_API, useClass: HttpIncomingRequestsApi },
    provideAppInitializer(() => inject(SessionService).resolve()),
  ],
};

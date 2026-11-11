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
  HELP_API,
  HttpContentApi,
  HttpHelpApi,
  CONTENT_API,
  HttpReportsApi,
  REPORTS_API,
  ACCOUNT_DATA_API,
  HttpAccountDataApi,
  HttpProfileApi,
  PROFILE_API,
  HttpPasswordResetApi,
  PASSWORD_RESET_API,
  HttpSavedApi,
  SAVED_API,
  HttpAccountApi,
  ADMIN_API,
  INCOMING_REQUESTS_API,
  CATALOGUE_API,
  EVENTS_API,
  HttpCatalogueApi,
  HttpNotificationsApi,
  SseEventsApi,
  MY_BUSINESS_API,
  HttpMyBusinessApi,
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
  NOTIFICATIONS_API,
  SEARCH_API,
  SESSION_API,
} from 'api';
import { routes } from './app.routes';
import { connectionInterceptor } from './services/offline/connection.interceptor';
import { errorInterceptor } from './services/error.interceptor';
import { NavigationTrail } from './services/navigation-trail';
import { SessionService } from './services/session.service';

/** Composition root: every API contract is bound to its implementation here. */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptors([connectionInterceptor, errorInterceptor])),
    // Starts watching navigation at once, so the forbidden page knows which page was asked for (L2-114).
    provideAppInitializer(() => {
      inject(NavigationTrail);
    }),
    // "Shop products" scrolls to the products (L2-034 AC1).
    provideRouter(routes, withInMemoryScrolling({ anchorScrolling: 'enabled' })),
    { provide: ACCOUNT_API, useClass: HttpAccountApi },
    { provide: CONTENT_API, useClass: HttpContentApi },
    { provide: HELP_API, useClass: HttpHelpApi },
    { provide: REPORTS_API, useClass: HttpReportsApi },
    { provide: PROFILE_API, useClass: HttpProfileApi },
    { provide: ACCOUNT_DATA_API, useClass: HttpAccountDataApi },
    { provide: PASSWORD_RESET_API, useClass: HttpPasswordResetApi },
    { provide: SAVED_API, useClass: HttpSavedApi },
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
    { provide: MY_BUSINESS_API, useClass: HttpMyBusinessApi },
    { provide: CATALOGUE_API, useClass: HttpCatalogueApi },
    { provide: NOTIFICATIONS_API, useClass: HttpNotificationsApi },
    { provide: EVENTS_API, useClass: SseEventsApi },
    provideAppInitializer(() => inject(SessionService).resolve()),
  ],
};

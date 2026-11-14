import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  isDevMode,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import {
  ACCOUNT_API,
  HELP_API,
  MERCH_API,
  HttpMerchApi,
  HttpContentApi,
  HttpHelpApi,
  CONTENT_API,
  HttpReportsApi,
  REPORTS_API,
  FEEDBACK_API,
  HttpFeedbackApi,
  ACCOUNT_DATA_API,
  HttpAccountDataApi,
  HttpProfileApi,
  PROFILE_API,
  HttpPasswordResetApi,
  PASSWORD_RESET_API,
  HttpSavedApi,
  SAVED_API,
  HttpAccountApi,
  INCOMING_REQUESTS_API,
  CATALOGUE_API,
  EVENTS_API,
  HttpCatalogueApi,
  HttpNotificationsApi,
  SseEventsApi,
  MY_BUSINESS_API,
  STATEMENT_OF_FAITH_API,
  HttpStatementOfFaithApi,
  HttpMyBusinessApi,
  HttpIncomingRequestsApi,
  DIRECTORY_API,
  LISTINGS_API,
  REVIEWS_API,
  HttpReviewsApi,
  HttpDirectoryApi,
  HttpListingsApi,
  HttpMessagesApi,
  HttpListingDraftsApi,
  HttpRequestsApi,
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
import { ADMIN_URL } from './admin-url';
import { APP_VERSION } from './app-version';
import { routes } from './app.routes';
import { environment } from '../environments/environment';
import { connectionInterceptor } from './services/offline/connection.interceptor';
import { errorInterceptor } from './services/error.interceptor';
import { NavigationTrail } from './services/navigation-trail';
import { DraftRegistry } from './drafts/draft-registry';
import { sessionExpiredInterceptor } from './interceptors/session-expired.interceptor';
import { SessionService } from './services/session.service';

/** Composition root: every API contract is bound to its implementation here. */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(
      withInterceptors([connectionInterceptor, sessionExpiredInterceptor, errorInterceptor]),
    ),
    // Starts watching navigation at once, so the forbidden page knows which page was asked for (L2-114).
    provideAppInitializer(() => {
      inject(NavigationTrail);
    }),
    // "Shop products" scrolls to the products (L2-034 AC1).
    provideRouter(routes, withInMemoryScrolling({ anchorScrolling: 'enabled' })),
    // The app shell is kept on the device so Jubilee opens with no connection (L2-119 AC3, ADR 0068);
    // production builds only, so `ng serve` and the specs that run against it have no worker.
    provideServiceWorker('jubilee-sw.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
    { provide: ADMIN_URL, useValue: environment.adminUrl },
    { provide: APP_VERSION, useValue: environment.version },
    { provide: ACCOUNT_API, useClass: HttpAccountApi },
    { provide: CONTENT_API, useClass: HttpContentApi },
    { provide: HELP_API, useClass: HttpHelpApi },
    { provide: MERCH_API, useClass: HttpMerchApi },
    { provide: REPORTS_API, useClass: HttpReportsApi },
    { provide: FEEDBACK_API, useClass: HttpFeedbackApi },
    { provide: PROFILE_API, useClass: HttpProfileApi },
    { provide: ACCOUNT_DATA_API, useClass: HttpAccountDataApi },
    { provide: PASSWORD_RESET_API, useClass: HttpPasswordResetApi },
    { provide: SAVED_API, useClass: HttpSavedApi },
    { provide: SESSION_API, useClass: HttpSessionApi },
    { provide: NAVIGATION_API, useClass: HttpNavigationApi },
    { provide: DIRECTORY_API, useClass: HttpDirectoryApi },
    { provide: LISTINGS_API, useClass: HttpListingsApi },
    { provide: REVIEWS_API, useClass: HttpReviewsApi },
    { provide: SEARCH_API, useClass: HttpSearchApi },
    { provide: MESSAGES_API, useClass: HttpMessagesApi },
    { provide: REQUESTS_API, useClass: HttpRequestsApi },
    { provide: LISTING_DRAFTS_API, useClass: HttpListingDraftsApi },
    { provide: INCOMING_REQUESTS_API, useClass: HttpIncomingRequestsApi },
    { provide: MY_BUSINESS_API, useClass: HttpMyBusinessApi },
    { provide: STATEMENT_OF_FAITH_API, useClass: HttpStatementOfFaithApi },
    { provide: CATALOGUE_API, useClass: HttpCatalogueApi },
    { provide: NOTIFICATIONS_API, useClass: HttpNotificationsApi },
    { provide: EVENTS_API, useClass: SseEventsApi },
    provideAppInitializer(() => inject(SessionService).resolve()),
    // Watches who is signed in from the start: another member's drafts leave the device (L2-116 AC4).
    provideAppInitializer(() => {
      inject(DraftRegistry);
    }),
  ],
};

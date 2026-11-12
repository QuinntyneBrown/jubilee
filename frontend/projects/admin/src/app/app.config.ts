import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { ADMIN_API, HttpAdminApi, HttpStaffSessionApi, STAFF_SESSION_API } from 'api';
import { routes } from './app.routes';
import { sessionExpiredInterceptor } from './services/session-expired.interceptor';
import { StaffSessionService } from './services/staff-session.service';

/** Composition root of the admin application (ADR 0040): every API contract is bound here. */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptors([sessionExpiredInterceptor])),
    provideRouter(routes),
    { provide: STAFF_SESSION_API, useClass: HttpStaffSessionApi },
    { provide: ADMIN_API, useClass: HttpAdminApi },
    provideAppInitializer(() => inject(StaffSessionService).resolve()),
  ],
};

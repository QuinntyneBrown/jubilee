import { provideHttpClient } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { HttpLaunchApi, LAUNCH_API } from 'api';

/**
 * Composition root. The site has no router and no session. While Jubilee is launching soon it
 * sends its two forms to the API on its own origin (ADR 0044) and knows no address of the app: no
 * element of the page links to it (L2-215 AC6).
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(),
    { provide: LAUNCH_API, useClass: HttpLaunchApi },
  ],
};

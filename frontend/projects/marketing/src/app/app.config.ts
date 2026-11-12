import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';

/**
 * Composition root. The site has no router and no session. While Jubilee is launching soon it
 * knows no address of the app: no element of the page links to it (L2-215 AC6, ADR 0044).
 */
export const appConfig: ApplicationConfig = {
  providers: [provideBrowserGlobalErrorListeners()],
};

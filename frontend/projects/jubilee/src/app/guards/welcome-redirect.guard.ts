import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from '../services/session.service';

/**
 * WelcomeRedirectGuard (L2-020): the welcome page is for visitors, so a signed-in member who
 * opens it is taken to the browse home. The session is resolved before the first navigation.
 */
export const welcomeRedirectGuard: CanActivateFn = () =>
  inject(SessionService).member() ? inject(Router).createUrlTree(['/']) : true;

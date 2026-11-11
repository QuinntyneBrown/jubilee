import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from '../services/session.service';

/** A page for members only: a visitor goes to sign in and comes back afterwards (L2-012). */
export const memberGuard: CanActivateFn = (_route, state) =>
  inject(SessionService).member()
    ? true
    : inject(Router).createUrlTree(['/sign-in'], { queryParams: { returnUrl: state.url } });

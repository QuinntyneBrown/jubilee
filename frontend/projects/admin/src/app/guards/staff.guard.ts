import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { StaffSessionService } from '../services/staff-session.service';
import { screenOrQueue } from '../services/return-url';

/**
 * A screen of the admin application needs a staff session (L2-188 AC5): without one the browser
 * goes to `/sign-in`, keeping the screen it asked for. The API enforces the same rule (L2-191).
 */
export const staffGuard: CanActivateFn = (_route, state) => {
  const session = inject(StaffSessionService);
  if (session.staff()) return true;
  const router = inject(Router);
  return session.refused()
    ? router.createUrlTree(['/sign-in'])
    : router.createUrlTree(['/sign-in'], { queryParams: { returnUrl: state.url } });
};

/** A staff member who is signed in already goes straight to the screen asked for (L2-189 AC7). */
export const signedOutGuard: CanActivateFn = (route) => {
  const session = inject(StaffSessionService);
  if (!session.staff()) return true;
  return inject(Router).parseUrl(screenOrQueue(route.queryParamMap.get('returnUrl')));
};

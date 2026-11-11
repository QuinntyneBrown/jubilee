import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from '../services/session.service';

/**
 * The admin screens are for the verification team (L2-098 AC1): a visitor signs in first, and a
 * member who is not on the team is shown the forbidden page. The API enforces the same rule.
 */
export const verifierGuard: CanActivateFn = (_route, state) => {
  const member = inject(SessionService).member();
  const router = inject(Router);
  if (!member) return router.createUrlTree(['/sign-in'], { queryParams: { returnUrl: state.url } });
  return member.isVerifier ? true : router.createUrlTree(['/forbidden']);
};

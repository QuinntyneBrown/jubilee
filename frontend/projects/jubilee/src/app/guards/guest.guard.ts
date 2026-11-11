import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from '../services/session.service';

/** GuestGuard (L2-001 AC1): joining is for visitors, so a signed-in member is taken to browse. */
export const guestGuard: CanActivateFn = () =>
  inject(SessionService).member() ? inject(Router).createUrlTree(['/']) : true;

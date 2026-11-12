import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { StaffSessionService } from './staff-session.service';

/**
 * L2-190 AC3: when the API answers 401 `SESSION_EXPIRED` the staff session has ended. The admin
 * application forgets the staff member and shows `/session-expired`, which signs in again and
 * returns to this screen. A 401 `sign_in_required` (the cookie is gone) goes to `/sign-in` the
 * same way.
 */
export const sessionExpiredInterceptor: HttpInterceptorFn = (request, next) => {
  const session = inject(StaffSessionService);
  const router = inject(Router);
  return next(request).pipe(
    catchError((error: unknown) => {
      const code = error instanceof HttpErrorResponse && error.status === 401 && error.error?.code;
      if ((code === 'SESSION_EXPIRED' || code === 'sign_in_required') && session.staff()) {
        const returnUrl = router.url;
        session.expire();
        const to = code === 'SESSION_EXPIRED' ? '/session-expired' : '/sign-in';
        void router.navigate([to], { queryParams: { returnUrl } });
      }
      return throwError(() => error);
    }),
  );
};

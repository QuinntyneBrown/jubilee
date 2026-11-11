import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { SessionService } from '../services/session.service';

/**
 * L2-116: when the server answers 401 `SESSION_EXPIRED` the member's session has ended. The app
 * forgets the member and shows `/session-expired`, which signs in again and returns to this page.
 */
export const sessionExpiredInterceptor: HttpInterceptorFn = (request, next) => {
  const session = inject(SessionService);
  const router = inject(Router);
  return next(request).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        error.error?.code === 'SESSION_EXPIRED' &&
        session.member()
      ) {
        const returnUrl = router.url;
        session.expire();
        void router.navigate(['/session-expired'], { queryParams: { returnUrl } });
      }
      return throwError(() => error);
    }),
  );
};

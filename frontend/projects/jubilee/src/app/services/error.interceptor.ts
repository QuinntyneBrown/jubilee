import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { isSystemPage } from './navigation-trail';

interface Problem {
  code?: string;
  reference?: string;
  backBy?: string;
}

/**
 * Sends a failed page load to the page that explains it (L2-115, L2-117). An unhandled server error on
 * a read opens the server error page with its `JB-500-` reference; any answer of "maintenance" opens
 * the maintenance page with the time Jubilee is back. Both keep the address the member came from, so
 * "Try again" and "Check again" return to it. A failed save (anything but a read) is left to the dialog or page
 * that made it, so what was typed stays where it is, whatever the failure. The error still reaches the caller.
 */
export const errorInterceptor: HttpInterceptorFn = (request, next) => {
  const router = inject(Router);
  return next(request).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        request.method === 'GET' &&
        !isSystemPage(router.url)
      ) {
        const problem = (error.error ?? {}) as Problem;
        const from = router.url;
        if (error.status === 503 && problem.code === 'MAINTENANCE') {
          void router.navigate(['/maintenance'], {
            queryParams: { backBy: problem.backBy, from },
          });
        } else if (
          error.status === 500 &&
          problem.code === 'unexpected_error' &&
          /^JB-500-[A-Z0-9]{4}$/.test(problem.reference ?? '')
        ) {
          void router.navigate(['/error'], { queryParams: { ref: problem.reference, from } });
        }
      }
      return throwError(() => error);
    }),
  );
};

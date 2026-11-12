import { Dialog } from '@angular/cdk/dialog';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { DraftRegistry } from '../drafts/draft-registry';
import { SessionService } from '../services/session.service';

/**
 * L2-116: when the server answers 401 `SESSION_EXPIRED` the member's session has ended. The app
 * keeps what the member was typing, forgets the member and shows `/session-expired`, which signs
 * in again and returns to this page. Only the first refusal acts: it clears the member, so the
 * other calls refused at the same moment find none and the page opens once (AC2).
 */
export const sessionExpiredInterceptor: HttpInterceptorFn = (request, next) => {
  const session = inject(SessionService);
  const router = inject(Router);
  const drafts = inject(DraftRegistry);
  const dialogs = inject(Dialog);
  return next(request).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        error.error?.code === 'SESSION_EXPIRED' &&
        session.member()
      ) {
        const returnUrl = router.url;
        drafts.saveAll();
        session.expire();
        // A dialog does not close when the address changes; the page under it is going.
        dialogs.closeAll();
        void router.navigate(['/session-expired'], { queryParams: { returnUrl } });
      }
      return throwError(() => error);
    }),
  );
};

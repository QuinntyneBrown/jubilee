import {
  HttpErrorResponse,
  HttpEvent,
  HttpInterceptorFn,
  HttpResponse,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { OWN_OFFLINE_FALLBACK, OWN_RETRY } from 'api';
import { Observable, defer, finalize, retry, tap, throwError, timer } from 'rxjs';
import { ToastService } from '../../toasts/toast.service';
import { ConnectionService } from './connection.service';
import { isBackgroundRead, OfflineNavigation } from './offline-navigation';
import { timings } from './timings';

/**
 * Tells the connection service what every request learned (L2-120 to L2-122):
 * - an answer, even an error, means Jubilee can be reached; the time it took feeds the "slow" warning;
 * - no answer at all is reported, and a write is tried again for up to a minute, with a warning at 5
 *   seconds, unless it keeps its own queue (a message);
 * - a page read that got no answer while the device is offline shows the offline page, unless the page
 *   has a saved copy to show.
 */
export const connectionInterceptor: HttpInterceptorFn = (request, next) => {
  const connection = inject(ConnectionService);
  const toasts = inject(ToastService);
  const offlinePage = inject(OfflineNavigation);
  const limits = timings();
  const retries =
    request.method !== 'GET' && request.method !== 'HEAD' && !request.context.get(OWN_RETRY);

  return defer((): Observable<HttpEvent<unknown>> => {
    const started = performance.now();
    let warned: ReturnType<typeof setTimeout> | undefined;
    if (retries) {
      warned = setTimeout(() => {
        toasts.show({
          tone: 'warning',
          title: 'Still sending your request',
          text: 'Your connection is slow. We’ll keep trying for a minute.',
        });
      }, limits.slowRequest);
    }
    return next(request).pipe(
      retry({
        delay: (error: unknown) =>
          retries && isNoAnswer(error) && performance.now() - started < limits.retryWindow
            ? timer(limits.retryEvery)
            : throwError(() => error),
      }),
      tap({
        next: (event) => {
          if (event instanceof HttpResponse) {
            connection.recordLatency(performance.now() - started);
            connection.reportSuccess();
          }
        },
        error: (error: unknown) => {
          if (isNoAnswer(error)) {
            connection.reportNetworkFailure();
            if (
              request.method === 'GET' &&
              connection.isOffline() &&
              !request.context.get(OWN_OFFLINE_FALLBACK) &&
              !isBackgroundRead(new URL(request.url, 'http://x').pathname)
            ) {
              offlinePage.show();
            }
          } else if (error instanceof HttpErrorResponse) {
            connection.reportSuccess();
          }
        },
      }),
      finalize(() => clearTimeout(warned)),
    );
  });
};

/** No answer at all: the status is 0, or a gateway or an outage that has nothing behind it (not maintenance). */
function isNoAnswer(error: unknown): boolean {
  if (!(error instanceof HttpErrorResponse)) return false;
  if (error.status === 0 || error.status === 502 || error.status === 504) return true;
  return error.status === 503 && (error.error as { code?: string } | null)?.code !== 'MAINTENANCE';
}

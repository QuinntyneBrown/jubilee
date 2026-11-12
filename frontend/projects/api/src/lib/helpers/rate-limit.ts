import { HttpErrorResponse } from '@angular/common/http';

/** True when the API refused a request because too many were made (429, L2-137 AC1). */
export function isRateLimited(error: unknown): error is HttpErrorResponse {
  return error instanceof HttpErrorResponse && error.status === 429;
}

/** "Try again in 42 minutes.", with the wait the API named in `Retry-After`; an hour when it named none. */
export function tryAgainIn(error: HttpErrorResponse): string {
  const seconds = Number(error.headers?.get('Retry-After')) || 3600;
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  return `Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`;
}

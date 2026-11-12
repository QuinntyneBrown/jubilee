import { HttpErrorResponse } from '@angular/common/http';
import { MonoTypeOperatorFunction, retry, throwError, timeout, timer } from 'rxjs';

/** How long a form waits for an answer before it sends again (L2-127 AC2). */
export const SEND_TIMEOUT_MS = 10_000;

/** How long a form waits before it sends again what could not be sent (L2-216 AC6, L2-217 AC6). */
export const SEND_AGAIN_MS = 5_000;

/** A pragmatic check of an address in the browser; the server has the last word (L2-126 AC5). */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const TOO_LONG = 'This is too long.';
export const EMAIL_INVALID = 'Enter a valid e-mail address, like name@example.com.';

/** What stands above a form after a send that did not go through. */
export interface FormNotice {
  tone: 'info' | 'warning';
  heading: string | null;
  text: string;
}

export const ROBOT: FormNotice = {
  tone: 'warning',
  heading: null,
  text: 'We couldn’t check that you’re not a robot. Wait a moment and try again.',
};

/** Shown while a form that could not reach Jubilee keeps sending: a notice, never an error. */
export const STILL_SENDING: FormNotice = {
  tone: 'info',
  heading: 'Still sending.',
  text: 'We couldn’t reach Jubilee just now. Keep this page open: we’ll keep trying, and what you typed is still here.',
};

/** An answer the visitor can act on: a field, the consent or the bot challenge (422), or the limit (429). */
function answered(error: unknown): boolean {
  return error instanceof HttpErrorResponse && (error.status === 422 || error.status === 429);
}

/**
 * Keeps a send going until Jubilee answers it (ADR 0047). A send that cannot be made, is not
 * answered within 10 seconds or is answered with a fault is no error for the visitor: `waiting` is
 * called, so the form can say it is still sending, and the same send is made again 5 seconds
 * later, for as long as it takes. Only 422 and 429 end it as an error.
 */
export function keepSending<T>(waiting: () => void): MonoTypeOperatorFunction<T> {
  return (source) =>
    source.pipe(
      timeout(SEND_TIMEOUT_MS),
      retry({
        delay: (error: unknown) => {
          if (answered(error)) return throwError(() => error);
          waiting();
          return timer(SEND_AGAIN_MS);
        },
      }),
    );
}

/** "You’re doing that a lot." with the wait the API names in `Retry-After` (L2-137 AC1). */
export function tooMany(error: HttpErrorResponse): FormNotice {
  const seconds = Number(error.headers?.get('Retry-After')) || 3600;
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  return {
    tone: 'warning',
    heading: null,
    text: `You’re doing that a lot. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
  };
}

/** The bot challenge was not passed: the answer names `challenge` and nothing else. */
export function challengeFailed(error: unknown): boolean {
  return (
    error instanceof HttpErrorResponse && error.status === 422 && !!error.error?.errors?.challenge
  );
}

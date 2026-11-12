import { HttpErrorResponse } from '@angular/common/http';

/** How long a form waits for its answer before it says it failed (L2-127 AC2). */
export const SEND_TIMEOUT_MS = 10_000;

/** A pragmatic check of an address in the browser; the server has the last word (L2-126 AC5). */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const TOO_LONG = 'This is too long.';
export const EMAIL_INVALID = 'Enter a valid e-mail address, like name@example.com.';

/** What stands above a form after a send that did not go through. */
export interface FormNotice {
  tone: 'danger' | 'warning';
  heading: string | null;
  text: string;
}

export const ROBOT: FormNotice = {
  tone: 'warning',
  heading: null,
  text: 'We couldn’t check that you’re not a robot. Wait a moment and try again.',
};

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

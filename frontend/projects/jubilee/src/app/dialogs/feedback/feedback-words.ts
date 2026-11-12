import { HttpErrorResponse } from '@angular/common/http';
import { TimeoutError } from 'rxjs';

/** A note is held to this many characters (L2-210 AC11). */
export const NOTE_MAX = 1000;

/** What happened and what was expected are held to this many (L2-212 AC14). */
export const ANSWER_MAX = 2000;

/** A send that takes longer than this fails instead of spinning (L2-127 AC2). */
export const SUBMIT_TIMEOUT_MS = 10_000;

export interface FeedbackFailure {
  title: string;
  text: string;
}

/** Why feedback could not be sent: too many in an hour, the time it took, or the connection (L2-128). */
export function feedbackFailure(error: unknown): FeedbackFailure {
  if (error instanceof HttpErrorResponse && error.status === 429) {
    return {
      title: 'We couldn’t send that',
      text: 'Slow down a little. You can send more feedback in an hour. What you typed is still here.',
    };
  }
  if (error instanceof TimeoutError) {
    return {
      title: 'We couldn’t send that',
      text: 'It took too long, so we stopped. What you typed is still here. Try again.',
    };
  }
  return {
    title: 'We couldn’t send that',
    text: 'Your connection dropped before it reached us. What you typed is still here. Try again.',
  };
}

/** The screens whose name is not their `page` in words. */
const SCREENS: Record<string, string> = {
  business: 'Business page',
  product: 'Product page',
  'list-business': 'List your business',
  'request-detail': 'Request',
  'my-business': 'My business',
  'my-products': 'My products',
  'my-services': 'My services',
  'edit-listing': 'Edit listing',
  'incoming-requests': 'Incoming requests',
  'data-download': 'Data download',
};

/** The name of a screen, from the `page` of its route: what a bug report says it attaches (L2-210 AC4). */
export function screenName(page: string): string {
  const words = SCREENS[page] ?? page.replace(/-/g, ' ');
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : 'This screen';
}

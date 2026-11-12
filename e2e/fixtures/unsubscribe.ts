import type { Page } from '@playwright/test';

// A stand-in for the unsubscribe link of a notification e-mail (L2-224). What the page posts is kept
// so a test can prove it (ADR 0009).

export type UnsubscribeAnswer =
  | 'messages'
  | 'requests'
  | 'reminders'
  | 'new-businesses'
  | 'tips'
  | 'summary'
  /** The link does not verify: 404. */
  | 'invalid'
  /** The request fails: 503. */
  | 'fails'
  /** No answer comes. */
  | 'pending';

export interface FakeUnsubscribe {
  answer: UnsubscribeAnswer;
  /** The tokens the page posted, in order. */
  posted: string[];
}

export async function stubUnsubscribe(
  page: Page,
  answer: UnsubscribeAnswer = 'messages',
): Promise<FakeUnsubscribe> {
  const fake: FakeUnsubscribe = { answer, posted: [] };
  await page.route('**/api/email/unsubscribe/*', (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    fake.posted.push(new URL(route.request().url()).pathname.split('/').pop() ?? '');
    switch (fake.answer) {
      case 'pending':
        return new Promise<void>(() => undefined);
      case 'invalid':
        return route.fulfill({
          status: 404,
          contentType: 'application/problem+json',
          body: JSON.stringify({
            title: 'This link doesn’t work.',
            status: 404,
            code: 'UNSUBSCRIBE_LINK_INVALID',
            correlationId: 'e2e',
          }),
        });
      case 'fails':
        return route.fulfill({
          status: 503,
          contentType: 'application/problem+json',
          body: JSON.stringify({ title: 'Problem', status: 503, correlationId: 'e2e' }),
        });
      default:
        return route.fulfill({ json: { unsubscribed: true, category: fake.answer } });
    }
  });
  return fake;
}

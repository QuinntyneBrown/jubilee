import type { Page } from '@playwright/test';

// A stand-in for the policy page endpoint (L2-107 to L2-110) for the states the recording lacks:
// the page cannot be loaded. Everything else is answered from the recording (ADR 0009).

export interface FakeContent {
  /** How many of the next reads fail with a 503 before the endpoint answers. */
  failures: number;
  /** How many reads were made. */
  reads: number;
}

export async function stubContent(
  page: Page,
  initial: Partial<Pick<FakeContent, 'failures'>> = {},
): Promise<FakeContent> {
  const fake: FakeContent = { failures: 0, ...initial, reads: 0 };
  const sections: Record<string, { heading: string; anchor: string; body: string }[]> = {
    terms: [{ heading: 'Your account', anchor: 'your-account', body: 'Be 18 or older.' }],
    help: [{ heading: 'Is it free?', anchor: 'is-it-free', body: 'Yes.' }],
  };
  await page.route('**/api/content/*', (route) => {
    fake.reads++;
    if (fake.failures > 0) {
      fake.failures--;
      return route.fulfill({
        status: 503,
        contentType: 'application/problem+json',
        body: JSON.stringify({
          title: 'Problem',
          status: 503,
          correlationId: 'e2e',
          reference: 'JB-CONT-503',
        }),
      });
    }
    const slug = route.request().url().split('/').pop()!;
    return route.fulfill({
      json: {
        slug,
        title: slug === 'help' ? 'Help' : 'Terms of use',
        lead: 'Back again.',
        version: 1,
        publishedAt: '2026-11-02T17:00:00+00:00',
        sections: sections[slug] ?? sections['terms'],
      },
    });
  });
  return fake;
}

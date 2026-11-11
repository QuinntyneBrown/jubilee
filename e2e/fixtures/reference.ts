import type { Page, Route } from '@playwright/test';

// A stand-in for the anonymous reference endpoints (L2-081, L2-082). The requests the app makes are
// kept so a test can prove what it sent, in particular that the token travels in the body (ADR 0009).

export type ReferenceOutcome = 'open' | 'closed' | 'unknown' | 'load-fails' | 'hang';

export interface FakeReference {
  outcome: ReferenceOutcome;
  /** `422` answers the next answer with these codes. */
  answerErrors: Record<string, string> | null;
  opens: { token: string; url: string }[];
  answers: {
    token: string;
    answer: string | null;
    name: string;
    role: string;
    note: string;
  }[];
  reports: { token: string }[];
}

const problem = (status: number, body: object) => ({
  status,
  contentType: 'application/problem+json',
  body: JSON.stringify({ title: 'Problem', status, correlationId: 'e2e', ...body }),
});

const CLOSED =
  'Reference links work once, for 14 days. If Naomi still needs a reference, Naomi can send you a new request from the listing.';

export const referenceView = {
  ownerName: 'Naomi Laurent',
  ownerFirstName: 'Naomi',
  business: 'Luzandre.com',
  church: 'Grace Toronto Church',
  intro:
    'Naomi is listing Luzandre.com on Jubilee, Toronto’s Christian marketplace, and named you at Grace Toronto Church as Naomi’s church reference. Your answer is private: Naomi and the public never see it.',
  question: 'How well do you know Naomi?',
  answers: [
    {
      value: 'vouches',
      label: 'I know Naomi and can vouch for Naomi',
      hint: 'Naomi is part of our church and I trust Naomi to deal honestly',
    },
    {
      value: 'cant-vouch',
      label: 'I know Naomi, but I can’t vouch for Naomi’s business',
      hint: 'Tell us more below if you can',
    },
    {
      value: 'doesnt-know',
      label: 'I don’t know this person',
      hint: 'We will not publish the listing on this reference',
    },
  ],
};

export async function stubReference(
  page: Page,
  initial: Partial<FakeReference> = {},
): Promise<FakeReference> {
  const fake: FakeReference = {
    outcome: 'open',
    answerErrors: null,
    opens: [],
    answers: [],
    reports: [],
    ...initial,
  };

  await page.route('**/api/reference-requests/*', (route: Route) => {
    const request = route.request();
    const action = new URL(request.url()).pathname.split('/').pop();
    const body = request.postDataJSON() as Record<string, string>;
    if (action === 'open') fake.opens.push({ token: body.token, url: request.url() });
    switch (fake.outcome) {
      case 'hang':
        return new Promise<void>(() => void route);
      case 'load-fails':
        return route.abort('failed');
      case 'unknown':
        return route.fulfill(
          problem(404, {
            code: 'REFERENCE_LINK_CLOSED',
            detail:
              'Reference links work once, for 14 days. If the owner still needs a reference, they can send you a new request from their listing.',
          }),
        );
      case 'closed':
        return route.fulfill(problem(410, { code: 'REFERENCE_LINK_CLOSED', detail: CLOSED }));
      default:
    }
    if (action === 'open') return route.fulfill({ json: referenceView });
    if (action === 'report') {
      fake.reports.push({ token: body.token });
      return route.fulfill({ status: 204 });
    }
    if (fake.answerErrors) {
      return route.fulfill(problem(422, { code: 'validation_failed', errors: fake.answerErrors }));
    }
    fake.answers.push(body as FakeReference['answers'][number]);
    return route.fulfill({ status: 204 });
  });

  return fake;
}

import type { Page, Route } from '@playwright/test';
import { daniel, type FakeStaff, type StaffMember, stubStaff } from './staff';

// A stand-in for the policies endpoints of the admin application (L2-226): the four pages with
// their kept versions, and the publish. The requests the admin application makes are kept so a
// test can prove what it sent (ADR 0009).

export type PolicySlug = 'statement-of-faith' | 'terms' | 'privacy' | 'help';

interface Section {
  heading: string;
  anchor: string;
  body: string;
}

interface Version {
  number: number;
  title: string;
  lead: string;
  sections: Section[];
  publishedAt: string;
  publishedBy: string;
}

export interface PublishBody {
  title: string;
  lead: string;
  sections: Section[];
  basedOn: number;
}

export interface FakePolicies {
  list: 'ok' | 'fails' | 'hangs';
  page: 'ok' | 'fails' | 'hangs';
  /** `fails` answers the next publish with a 500, `conflict` with 409 `VERSION_CHANGED`, `hangs` never answers. */
  publish: 'ok' | 'fails' | 'conflict' | 'hangs';
  /** The kept versions of each page, newest first. */
  versions: Record<PolicySlug, Version[]>;
  published: { slug: string; body: PublishBody }[];
  staff: FakeStaff;
}

const BUILT_IN = '2026-11-02T17:00:00Z';

const TITLES: Record<PolicySlug, string> = {
  'statement-of-faith': 'Statement of faith',
  terms: 'Terms of use',
  privacy: 'Privacy',
  help: 'Help',
};

export const PRIVACY_SECTIONS: Section[] = [
  {
    heading: 'What we keep',
    anchor: 'what-we-keep',
    body: '- Your name, e-mail, and optional phone, neighbourhood and home church name and address. Your home church is shown to no one.\n- Messages and requests you send, so both sides can see them.\n- For businesses: listing details.',
  },
  {
    heading: 'Your choices',
    anchor: 'your-choices',
    body: 'Change what we e-mail you in [notification settings](/account/notifications), and download or delete your account from [your account](/account).',
  },
  {
    heading: 'Privacy contact and your rights',
    anchor: 'privacy-contact',
    body: 'To see or correct the personal information we hold about you, write to our privacy contact at [privacy@jubilee.example](mailto:privacy@jubilee.example). We answer within 30 days, as Canada’s privacy law (PIPEDA) requires.',
  },
];

const LEADS: Record<PolicySlug, string> = {
  'statement-of-faith':
    'Jubilee is open to everyone as a customer. Businesses that list here agree to the commitments below.',
  terms:
    'These terms cover using Jubilee as a member and as a listed business. Jubilee introduces buyers and businesses; the agreement to buy is between the two of you.',
  privacy: 'We collect only what the marketplace needs to work, and we never sell it.',
  help: 'Answers to the questions members ask most.',
};

const builtIn = (slug: PolicySlug): Version => ({
  number: 1,
  title: TITLES[slug],
  lead: LEADS[slug],
  sections:
    slug === 'privacy'
      ? PRIVACY_SECTIONS
      : [{ heading: 'What we believe', anchor: 'what-we-believe', body: 'Text.' }],
  publishedAt: BUILT_IN,
  publishedBy: 'built-in',
});

/** The mocks' state: the privacy notice at version 2, published by Daniel Osei on 9 November. */
export const defaultVersions = (): Record<PolicySlug, Version[]> => ({
  'statement-of-faith': [builtIn('statement-of-faith')],
  terms: [builtIn('terms')],
  privacy: [
    {
      ...builtIn('privacy'),
      number: 2,
      publishedAt: '2026-11-09T15:00:00Z',
      publishedBy: 'Daniel Osei',
    },
    builtIn('privacy'),
  ],
  help: [builtIn('help')],
});

const problem = (status: number, body: object) => ({
  status,
  contentType: 'application/problem+json',
  body: JSON.stringify({ title: 'Problem', status, correlationId: 'e2e', ...body }),
});

const SLUGS: PolicySlug[] = ['statement-of-faith', 'terms', 'privacy', 'help'];

export async function stubPolicies(
  page: Page,
  initial: Partial<Omit<FakePolicies, 'staff'>> = {},
  staff: StaffMember = daniel,
): Promise<FakePolicies> {
  const fake: FakePolicies = {
    list: 'ok',
    page: 'ok',
    publish: 'ok',
    versions: defaultVersions(),
    published: [],
    staff: undefined as unknown as FakeStaff,
    ...initial,
  };
  fake.staff = await stubStaff(page, staff);

  const dto = (slug: PolicySlug) => {
    const v = fake.versions[slug][0];
    return {
      slug,
      title: v.title,
      lead: v.lead,
      version: v.number,
      publishedAt: v.publishedAt,
      sections: v.sections,
    };
  };
  const versionRows = (slug: PolicySlug) =>
    fake.versions[slug].map((v, i) => ({
      number: v.number,
      title: v.title,
      publishedAt: v.publishedAt,
      publishedBy: v.publishedBy,
      published: i === 0,
    }));

  await page.route('**/api/admin/content**', async (route: Route) => {
    const request = route.request();
    const parts = new URL(request.url()).pathname.split('/').filter(Boolean).slice(3);
    const slug = parts[0] as PolicySlug | undefined;

    if (!slug) {
      if (fake.list === 'hangs') return;
      if (fake.list === 'fails') return route.fulfill(problem(503, { reference: 'JB-ADM-521' }));
      return route.fulfill({
        json: SLUGS.map((s) => ({
          slug: s,
          title: fake.versions[s][0].title,
          version: fake.versions[s][0].number,
          publishedAt: fake.versions[s][0].publishedAt,
          publishedBy: fake.versions[s][0].publishedBy,
          keptVersions: fake.versions[s].length,
        })),
      });
    }
    if (!SLUGS.includes(slug)) return route.fulfill(problem(404, { code: 'CONTENT_NOT_FOUND' }));

    if (request.method() === 'POST') {
      const body = request.postDataJSON() as PublishBody;
      fake.published.push({ slug, body });
      if (fake.publish === 'hangs') return;
      if (fake.publish === 'fails') return route.fulfill(problem(500, {}));
      if (fake.publish === 'conflict') {
        return route.fulfill(
          problem(409, { code: 'VERSION_CHANGED', detail: 'Another version was published.' }),
        );
      }
      fake.versions[slug].unshift({
        number: fake.versions[slug][0].number + 1,
        title: body.title,
        lead: body.lead,
        sections: body.sections.map((s) => ({
          ...s,
          anchor: s.anchor || s.heading.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        })),
        publishedAt: '2026-11-10T15:00:00Z',
        publishedBy: 'Daniel Osei',
      });
      return route.fulfill({ status: 201, json: dto(slug) });
    }

    if (fake.page === 'hangs') return;
    if (fake.page === 'fails') return route.fulfill(problem(503, { reference: 'JB-ADM-522' }));
    return route.fulfill({
      json: {
        published: dto(slug),
        publishedBy: fake.versions[slug][0].publishedBy,
        versions: versionRows(slug),
      },
    });
  });

  return fake;
}

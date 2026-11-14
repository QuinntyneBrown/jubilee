import type { Page, Route } from '@playwright/test';
import { catalogFor } from './admin-tables';

// The staff session of the admin application (L2-190) and staff sign-in (L2-189), answered at the
// network edge (ADR 0009): the admin application sees exactly what these endpoints return.

export type StaffRole = 'moderator' | 'admin';

export interface StaffMember {
  displayName: string;
  initials: string;
  email: string;
  roles: StaffRole[];
  /** The unresolved reports, for the admin bar (L2-188 AC3, ADR 0058). */
  reportCount: number;
  /** The environment the API runs in, named in the top bar (L2-272 AC1). */
  environment: string;
}

/** Miriam Castillo of the Jubilee team, as the mocks show her. */
export const miriam: StaffMember = {
  displayName: 'Miriam Castillo',
  initials: 'MC',
  email: 'miriam@jubilee.to',
  roles: ['moderator'],
  reportCount: 3,
  environment: 'Production',
};

/** Daniel Osei, an administrator without the moderator role (L2-188 AC4). */
export const daniel: StaffMember = {
  displayName: 'Daniel Osei',
  initials: 'DO',
  email: 'daniel@jubilee.to',
  roles: ['admin'],
  reportCount: 0,
  environment: 'Production',
};

/** Ada Nwosu, an administrator, as the admin mocks show her. */
export const ada: StaffMember = {
  displayName: 'Ada Nwosu',
  initials: 'AN',
  email: 'ada@jubilee.to',
  roles: ['admin'],
  reportCount: 0,
  environment: 'Production',
};

/** What `GET /api/staff/session` answers: a staff member, no session, or a refused network (L2-192). */
export type StaffAnswer = StaffMember | 'signed-out' | 'network-refused';

export interface FakeStaff {
  answer: StaffAnswer;
  /** The addresses the sign-in button sent the browser to. */
  signInStarts: string[];
  /** How many times "Sign out" ended the session. */
  signOuts: number;
  /** How many times the admin application read the session. */
  reads: number;
}

const problem = (status: number, code: string) => ({
  status,
  contentType: 'application/problem+json',
  body: JSON.stringify({ title: 'Problem', status, code, correlationId: 'e2e' }),
});

export async function stubStaff(page: Page, answer: StaffAnswer = miriam): Promise<FakeStaff> {
  const fake: FakeStaff = { answer, signInStarts: [], signOuts: 0, reads: 0 };

  // The shell reads the catalog of tables of the staff member's role on every screen (L2-272 AC2).
  await page.route('**/api/admin/tables', (route: Route) => {
    const current = fake.answer;
    if (typeof current === 'string') return route.fulfill(problem(401, 'sign_in_required'));
    return route.fulfill({ json: { groups: catalogFor(current) } });
  });

  await page.route('**/api/staff/session', async (route: Route) => {
    if (route.request().method() === 'DELETE') {
      fake.signOuts++;
      fake.answer = 'signed-out';
      return route.fulfill({ status: 204 });
    }
    fake.reads++;
    const current = fake.answer;
    if (current === 'signed-out') return route.fulfill(problem(401, 'sign_in_required'));
    if (current === 'network-refused') return route.fulfill(problem(403, 'NETWORK_NOT_ALLOWED'));
    return route.fulfill({ json: current });
  });

  // The start of single sign-on is a navigation to the API, which would send the browser to Entra
  // ID; the stand-in records it and holds the browser there.
  await page.route('**/api/staff/sign-in/start**', (route: Route) => {
    fake.signInStarts.push(route.request().url());
    return route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><title>Entra ID</title><p>Entra ID</p>',
    });
  });

  return fake;
}

// Acceptance Test
// Traces to: L2-188, L2-189, L2-190, L2-192
// Description: the admin application: its shell and navigation, staff sign-in through single
// sign-on, signing out and the end of a staff session, and the refused network.
import { stubAdmin } from '../fixtures/admin';
import { stubModeration } from '../fixtures/moderation';
import { ADMIN_URL, expect, test } from '../fixtures/jb-test';
import { miriam, stubStaff } from '../fixtures/staff';
import { AdminShellPage } from '../pages/admin-shell.page';
import { AdminSignInPage } from '../pages/admin-sign-in.page';
import { AdminListingsPage } from '../pages/admin-listings.page';

test.describe('the admin application (L2-188)', () => {
  test('AC2: the root opens the listings', async ({ page, jb }) => {
    const listings = new AdminListingsPage(page);
    await stubAdmin(page);
    await jb.gotoAdmin('/');

    await expect(page).toHaveURL(`${ADMIN_URL}/listings`);
    await expect(listings.heading).toHaveText('Listings');
  });

  test('AC3: the admin bar shows the lockup and tag, the staff navigation, the name and role, and Sign out', async ({
    page,
    jb,
  }) => {
    const shell = new AdminShellPage(page);
    await shell.setWidth(1280);
    await stubModeration(page);
    await jb.gotoAdmin('/reports');

    await expect(shell.brand).toContainText('jubilee');
    await expect(shell.tag).toHaveText('admin');
    await expect(shell.navLink('Listings')).toBeVisible();
    await expect(shell.navLink('Reports')).toHaveAttribute('aria-current', 'page');
    await expect(shell.navLink('Featured')).not.toHaveAttribute('aria-current', 'page');
    await expect(shell.staffName).toHaveText('Miriam Castillo');
    await expect(shell.staffRole).toHaveText('Moderator');
    await expect(shell.signOut).toBeVisible();
  });

  test('AC3: a staff member with both roles is shown with both', async ({ page, jb }) => {
    const shell = new AdminShellPage(page);
    await shell.setWidth(1280);
    await stubModeration(page, {}, { ...miriam, roles: ['moderator', 'admin'] });
    await jb.gotoAdmin('/featured');

    await expect(shell.staffRole).toHaveText('Moderator · Administrator');
  });

  test('AC5: without a staff session a screen sends the browser to sign in, keeping where it was going', async ({
    page,
    jb,
  }) => {
    const signIn = new AdminSignInPage(page);
    await stubStaff(page, 'signed-out');
    await jb.gotoAdmin('/reports');

    await expect(page).toHaveURL(`${ADMIN_URL}/sign-in?returnUrl=%2Freports`);
    await expect(signIn.heading).toHaveText('Sign in to the admin application');
  });

  test('AC7: an unknown address says the page was not found and offers the listings', async ({
    page,
    jb,
  }) => {
    const shell = new AdminShellPage(page);
    await stubAdmin(page);
    await jb.gotoAdmin('/no-such-page');

    await expect(shell.statusHeading).toHaveText('We couldn’t find that page.');
    await shell.statusAction('Go to listings').click();
    await expect(page).toHaveURL(`${ADMIN_URL}/listings`);
  });
});

test.describe('staff sign-in through single sign-on (L2-189)', () => {
  test('AC1: the sign-in screen offers only the staff account, with no e-mail or password field', async ({
    page,
    jb,
  }) => {
    const signIn = new AdminSignInPage(page);
    await stubStaff(page, 'signed-out');
    await jb.gotoAdmin('/sign-in');

    await expect(signIn.heading).toHaveText('Sign in to the admin application');
    await expect(signIn.lead).toHaveText(
      'For the Jubilee team and administrators. You’ll sign in with your Jubilee staff account and confirm it with a second factor.',
    );
    await expect(signIn.signIn).toHaveText('Sign in with your staff account');
    await expect(signIn.frameFoot).toHaveText('Members sign in at app.jubilee.to.');
    await expect(signIn.textFields).toHaveCount(0);
    await expect(signIn.alert).toHaveCount(0);
  });

  test('AC2: the button turns busy and sends the browser to single sign-on with the screen asked for', async ({
    page,
    jb,
  }) => {
    const signIn = new AdminSignInPage(page);
    const staff = await stubStaff(page, 'signed-out');
    await jb.gotoAdmin('/sign-in?returnUrl=%2Freports%2F42');

    // A navigation answered 204 leaves the screen in place, to be looked at while it hands over.
    await page.route('**/api/staff/sign-in/start**', (route) => {
      staff.signInStarts.push(route.request().url());
      return route.fulfill({ status: 204 });
    });
    await signIn.signIn.click();

    await expect(signIn.busy).toBeDisabled();
    expect(staff.signInStarts).toEqual([
      `${ADMIN_URL}/api/staff/sign-in/start?returnUrl=%2Freports%2F42`,
    ]);
  });

  const refusals = [
    {
      error: 'second-factor',
      title: 'Sign-in needs a second factor.',
      text: 'Your staff account signed in without one, so we didn’t let you in. Set up a second factor for your staff account, then try again.',
      button: 'Sign in with your staff account',
      criterion: 'AC3',
    },
    {
      error: 'not-staff',
      title: 'This account isn’t on the Jubilee staff list.',
      text: 'Ask a Jubilee administrator to add you. Members sign in at app.jubilee.to.',
      button: 'Sign in with your staff account',
      criterion: 'AC4',
    },
    {
      error: 'sso',
      title: 'We couldn’t sign you in.',
      text: 'The sign-in service didn’t answer as expected. Try again. If it keeps happening, tell us and quote JB-STAFF-503.',
      button: 'Try again',
      criterion: 'AC5',
    },
  ];
  for (const refusal of refusals) {
    test(`${refusal.criterion}: a refused sign-in (${refusal.error}) says why`, async ({
      page,
      jb,
    }) => {
      const signIn = new AdminSignInPage(page);
      await stubStaff(page, 'signed-out');
      await jb.gotoAdmin(`/sign-in?error=${refusal.error}`);

      await expect(signIn.alert).toHaveRole('alert');
      await expect(signIn.alert).toContainText(refusal.title);
      await expect(signIn.alert).toContainText(refusal.text);
      await expect(signIn.signIn).toHaveText(refusal.button);
    });
  }

  test('AC6: cancelling at the staff directory returns to the default screen with no message', async ({
    page,
    jb,
  }) => {
    const signIn = new AdminSignInPage(page);
    await stubStaff(page, 'signed-out');
    await jb.gotoAdmin('/sign-in?error=cancelled');

    await expect(signIn.alert).toHaveCount(0);
    await expect(signIn.signIn).toHaveText('Sign in with your staff account');
  });

  test('AC7: a staff member who is already signed in goes straight to the screen asked for', async ({
    page,
    jb,
  }) => {
    const listings = new AdminListingsPage(page);
    await stubAdmin(page);
    await jb.gotoAdmin('/sign-in?returnUrl=%2Flistings');

    await expect(page).toHaveURL(`${ADMIN_URL}/listings`);
    await expect(listings.heading).toHaveText('Listings');
  });
});

test.describe('the staff session (L2-190)', () => {
  test('AC4: Sign out ends the session on the server and says so', async ({ page, jb }) => {
    const shell = new AdminShellPage(page);
    const signIn = new AdminSignInPage(page);
    await shell.setWidth(1280);
    const fake = await stubAdmin(page);
    await jb.gotoAdmin('/listings');

    await shell.signOut.click();

    await expect(page).toHaveURL(`${ADMIN_URL}/signed-out`);
    expect(fake.staff.signOuts).toBe(1);
    await expect(signIn.alert).toContainText('You’ve signed out of the admin application.');
    await expect(signIn.signIn).toHaveText('Sign in again');
  });

  test('AC3: a request answered SESSION_EXPIRED shows that the staff session ended', async ({
    page,
    jb,
  }) => {
    const signIn = new AdminSignInPage(page);
    await stubAdmin(page);
    await page.route('**/api/admin/reports**', (route) =>
      route.fulfill({
        status: 401,
        contentType: 'application/problem+json',
        body: JSON.stringify({
          status: 401,
          code: 'SESSION_EXPIRED',
          title: 'Sign in to continue.',
        }),
      }),
    );
    await jb.gotoAdmin('/reports');

    await expect(page).toHaveURL(`${ADMIN_URL}/session-expired?returnUrl=%2Freports`);
    await expect(signIn.heading).toHaveText('Session ended');
    await expect(signIn.alert).toContainText('Your staff session ended.');
    await expect(signIn.alert).toContainText(
      'For your safety staff sessions end after 30 minutes without activity, and 8 hours after sign-in.',
    );
    await expect(signIn.signIn).toHaveText('Sign in again');
  });

  test('AC3: a request answered sign_in_required sends the browser to sign in, keeping the screen', async ({
    page,
    jb,
  }) => {
    const signIn = new AdminSignInPage(page);
    await stubAdmin(page);
    await page.route('**/api/admin/reports**', (route) =>
      route.fulfill({
        status: 401,
        contentType: 'application/problem+json',
        body: JSON.stringify({
          status: 401,
          code: 'sign_in_required',
          title: 'Sign in to continue.',
        }),
      }),
    );
    await jb.gotoAdmin('/reports');

    await expect(page).toHaveURL(`${ADMIN_URL}/sign-in?returnUrl=%2Freports`);
    await expect(signIn.heading).toHaveText('Sign in to the admin application');
  });
});

test.describe('the network restriction (L2-192)', () => {
  test('AC6: off an allowed network the sign-in screen says so and offers no sign-in', async ({
    page,
    jb,
  }) => {
    const signIn = new AdminSignInPage(page);
    await stubStaff(page, 'network-refused');
    await jb.gotoAdmin('/sign-in');

    await expect(signIn.alert).toContainText('You’re not on an allowed network.');
    await expect(signIn.alert).toContainText(
      'The admin application only answers on a Jubilee staff network. Connect to one and try again.',
    );
    await expect(signIn.signIn).toHaveCount(0);
  });

  test('AC6: a screen opened off an allowed network shows the same refusal', async ({
    page,
    jb,
  }) => {
    const signIn = new AdminSignInPage(page);
    await stubStaff(page, 'network-refused');
    await jb.gotoAdmin('/listings');

    await expect(signIn.alert).toContainText('You’re not on an allowed network.');
    await expect(signIn.signIn).toHaveCount(0);
  });
});

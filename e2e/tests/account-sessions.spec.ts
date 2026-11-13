import { expect, test } from '../fixtures/jb-test';
import { OTHER_DEVICE, THIS_DEVICE, stubProfile } from '../fixtures/profile';
import { stubSession } from '../fixtures/session';
import { AccountPage } from '../pages/account.page';
import { SignOutOthersDialog } from '../pages/sign-out-others.dialog';
import { Toasts } from '../pages/toasts';

// "Where you're signed in" on the account page (L2-143 AC3, ADR 0065): each device with its network
// and when it was last active, this device first, and any other signed out on its own. The API is
// answered by Playwright mocking (ADR 0009); the fake keeps what the app sent.

test.describe("where you're signed in (L2-143 AC3)", () => {
  test('AC3: the member sees this device first, then each other device with when it was last active', async ({
    page,
    jb,
  }) => {
    const account = new AccountPage(page);
    await jb.signInAs('member');
    await stubProfile(page);
    await jb.goto('/account');

    await expect(account.sessionsCard.getByRole('heading')).toHaveText('Where you’re signed in');
    await expect(account.sessionRows).toHaveCount(2);
    await expect(account.sessionRows.nth(0).locator('.row__title')).toHaveText('Safari on iPhone');
    await expect(account.sessionRows.nth(0).locator('.row__meta')).toHaveText(
      'This device · Network 203.0.113.x',
    );
    await expect(account.sessionRows.nth(1).locator('.row__title')).toHaveText('Chrome on Windows');
    await expect(account.sessionRows.nth(1).locator('.row__meta')).toHaveText(
      'Last active 2 hours ago · Network 198.51.100.x',
    );
    await expect(account.signOutDevice('Chrome on Windows')).toBeVisible();
    await expect(account.sessionRow('Safari on iPhone').getByRole('button')).toHaveCount(0);
  });

  test('AC3: signing out one device ends that session only, says so and leaves the list with this device', async ({
    page,
    jb,
  }) => {
    const account = new AccountPage(page);
    const toasts = new Toasts(page);
    await jb.signInAs('member');
    const fake = await stubProfile(page);
    await jb.goto('/account');

    await account.signOutDevice('Chrome on Windows').focus();
    await page.keyboard.press('Enter');

    await expect(toasts.withTitle('Signed out of Chrome on Windows')).toBeVisible();
    await expect(account.sessionRow('Chrome on Windows')).toHaveCount(0);
    await expect(account.sessionRows).toHaveCount(1);
    await expect(account.noOtherDevices).toBeVisible();
    expect(fake.endedSessions).toEqual([OTHER_DEVICE.id]);
    expect(new URL(page.url()).pathname).toBe('/account');
  });

  test('AC3: when signing a device out fails, its row stays and the member is told to try again', async ({
    page,
    jb,
  }) => {
    const account = new AccountPage(page);
    const toasts = new Toasts(page);
    await jb.signInAs('member');
    await stubProfile(page, { sessionEnd: 'fails' });
    await jb.goto('/account');

    await account.signOutDevice('Chrome on Windows').click();

    await expect(toasts.danger('We couldn’t sign out Chrome on Windows')).toContainText(
      'Try again.',
    );
    await expect(account.sessionRow('Chrome on Windows')).toBeVisible();
    await expect(account.signOutDevice('Chrome on Windows')).toBeEnabled();
  });

  test('AC3: with no other session the list says no other devices are signed in', async ({
    page,
    jb,
  }) => {
    const account = new AccountPage(page);
    await jb.signInAs('member');
    await stubProfile(page, { sessions: [THIS_DEVICE] });
    await jb.goto('/account');

    await expect(account.sessionRows).toHaveCount(1);
    await expect(account.noOtherDevices).toBeVisible();
  });

  test('while the list loads it says so to assistive technology', async ({ page, jb }) => {
    const account = new AccountPage(page);
    await jb.signInAs('member');
    await stubProfile(page, { sessionsLoad: 'pending' });
    await jb.goto('/account');

    await expect(account.sessionsLoading).toHaveText('Loading where you’re signed in…');
    await expect(account.sessionRows.filter({ hasText: 'Safari' })).toHaveCount(0);
  });

  test('a list that cannot be loaded names its reference and loads again on "Try again"', async ({
    page,
    jb,
  }) => {
    const account = new AccountPage(page);
    await jb.signInAs('member');
    const fake = await stubProfile(page, { sessionsLoad: 'fails' });
    await jb.goto('/account');

    await expect(account.sessionsError).toContainText('We couldn’t load where you’re signed in');
    await expect(account.sessionsError).toContainText('JB-ACC-526');
    await expect(account.firstName).toHaveValue('Joanna');
    fake.sessionsLoad = 'ok';
    await account.sessionsTryAgain.click();

    await expect(account.sessionRows).toHaveCount(2);
  });

  test('L2-011 AC5: after "Sign out of other devices" the list shows this device only', async ({
    page,
    jb,
  }) => {
    const account = new AccountPage(page);
    const dialog = new SignOutOthersDialog(page);
    await stubSession(page, { signedIn: true, otherSessionCount: 1 });
    await stubProfile(page);
    await jb.goto('/account');

    await account.signOutOthers.click();
    await dialog.confirm.click();

    await expect(account.sessionRows).toHaveCount(1);
    await expect(account.sessionRow('Safari on iPhone')).toBeVisible();
    await expect(account.noOtherDevices).toBeVisible();
  });
});

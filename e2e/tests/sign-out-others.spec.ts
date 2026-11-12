import { expect, test } from '../fixtures/jb-test';
import { stubProfile } from '../fixtures/profile';
import { stubSession } from '../fixtures/session';
import { AccountPage } from '../pages/account.page';
import { SignOutOthersDialog } from '../pages/sign-out-others.dialog';
import { AccountMenuRegion } from '../pages/sign-in.page';
import { Toasts } from '../pages/toasts';

// "Sign out of other devices" on the account page (L2-011 AC1, AC4, AC5, AC6). The API is answered
// by Playwright mocking (ADR 0009); the fake counts what the app sends.

test.describe('sign out of other devices (L2-011)', () => {
  test('AC4: with one other device the section says so and asks before it signs it out', async ({
    page,
    jb,
  }) => {
    const account = new AccountPage(page);
    const dialog = new SignOutOthersDialog(page);
    const session = await stubSession(page, { signedIn: true, otherSessionCount: 1 });
    await stubProfile(page);
    await jb.goto('/account');

    await expect(account.signedInOn).toHaveText('Signed in on this phone and 1 other device');
    await account.signOutOthers.click();

    await expect(dialog.title).toHaveText('Sign out of your other devices?');
    await expect(dialog.description).toHaveText(
      'Your 1 other device is signed out at once. You stay signed in on this phone.',
    );
    await expect(dialog.keep).toBeFocused();
    await expect(dialog.confirm).toBeVisible();
    expect(session.othersEnded).toBe(0);
  });

  test('AC5: confirming ends the other sessions, says so and leaves this one signed in', async ({
    page,
    jb,
  }) => {
    const account = new AccountPage(page);
    const dialog = new SignOutOthersDialog(page);
    const toasts = new Toasts(page);
    const session = await stubSession(page, { signedIn: true, otherSessionCount: 1 });
    await stubProfile(page);
    await jb.goto('/account');

    await account.signOutOthers.click();
    await dialog.confirm.click();

    await expect(toasts.withTitle('Your other devices were signed out')).toBeVisible();
    await expect(dialog.root).toHaveCount(0);
    await expect(account.signedInOn).toHaveText('Signed in on this phone only');
    await expect(account.signOutOthers).toHaveCount(0);
    await expect(account.avatar).toBeVisible();
    expect(new URL(page.url()).pathname).toBe('/account');
    expect(session.othersEnded).toBe(1);
    expect(session.signOuts).toBe(0);
  });

  test('AC4: several other devices are counted, in the section and in the dialog', async ({
    page,
    jb,
  }) => {
    const account = new AccountPage(page);
    const dialog = new SignOutOthersDialog(page);
    await stubSession(page, { signedIn: true, otherSessionCount: 3 });
    await stubProfile(page);
    await jb.goto('/account');

    await expect(account.signedInOn).toHaveText('Signed in on this phone and 3 other devices');
    await account.signOutOthers.click();

    await expect(dialog.description).toHaveText(
      'Your 3 other devices are signed out at once. You stay signed in on this phone.',
    );
  });

  test('AC4: "Keep them signed in" closes the dialog, sends nothing and returns to the button', async ({
    page,
    jb,
  }) => {
    const account = new AccountPage(page);
    const dialog = new SignOutOthersDialog(page);
    const session = await stubSession(page, { signedIn: true, otherSessionCount: 1 });
    await stubProfile(page);
    await jb.goto('/account');

    await account.signOutOthers.click();
    await dialog.keep.click();

    await expect(dialog.root).toHaveCount(0);
    await expect(account.signOutOthers).toBeFocused();
    await expect(account.signedInOn).toHaveText('Signed in on this phone and 1 other device');
    expect(session.othersEnded).toBe(0);
  });

  test('AC4: by keyboard, Enter opens the dialog and Escape leaves the devices signed in', async ({
    page,
    jb,
  }) => {
    const account = new AccountPage(page);
    const dialog = new SignOutOthersDialog(page);
    const session = await stubSession(page, { signedIn: true, otherSessionCount: 1 });
    await stubProfile(page);
    await jb.goto('/account');

    await account.signOutOthers.focus();
    await page.keyboard.press('Enter');
    await expect(dialog.keep).toBeFocused();
    await page.keyboard.press('Escape');

    await expect(dialog.root).toHaveCount(0);
    await expect(account.signOutOthers).toBeFocused();
    expect(session.othersEnded).toBe(0);
  });

  test('AC5: while the request is on its way the dialog is busy and a second press sends nothing', async ({
    page,
    jb,
  }) => {
    const account = new AccountPage(page);
    const dialog = new SignOutOthersDialog(page);
    await stubSession(page, { signedIn: true, otherSessionCount: 1, endOthers: 'pending' });
    let sent = 0;
    page.on('request', (request) => {
      if (request.url().endsWith('/api/session/others')) sent++;
    });
    await stubProfile(page);
    await jb.goto('/account');

    await account.signOutOthers.click();
    await dialog.confirm.click();

    await expect(dialog.confirm).toHaveAttribute('aria-busy', 'true');
    await expect(dialog.keep).toBeDisabled();
    await dialog.confirm.click({ force: true });
    expect(sent).toBe(1);
  });

  test('AC5: when the request fails the dialog says so, stays open and no session has ended', async ({
    page,
    jb,
  }) => {
    const account = new AccountPage(page);
    const dialog = new SignOutOthersDialog(page);
    const session = await stubSession(page, {
      signedIn: true,
      otherSessionCount: 1,
      endOthers: 'fails',
    });
    await stubProfile(page);
    await jb.goto('/account');

    await account.signOutOthers.click();
    await dialog.confirm.click();

    await expect(dialog.failure).toHaveText('We couldn’t sign out your other devices. Try again.');
    await expect(dialog.confirm).toBeEnabled();
    expect(session.othersEnded).toBe(0);
    await dialog.keep.click();
    await expect(account.signedInOn).toHaveText('Signed in on this phone and 1 other device');
  });

  test('AC6: signed in on this device only, the section says so and offers no other device to sign out', async ({
    page,
    jb,
  }) => {
    const account = new AccountPage(page);
    await stubSession(page, { signedIn: true, otherSessionCount: 0 });
    await stubProfile(page);
    await jb.goto('/account');

    await expect(account.signedInOn).toHaveText('Signed in on this phone only');
    await expect(account.signOut).toBeVisible();
    await expect(account.signOutOthers).toHaveCount(0);
  });

  test('AC1: "Sign out" on the account page asks "Sign out of Jubilee?" first', async ({
    page,
    jb,
  }) => {
    const account = new AccountPage(page);
    const confirm = new AccountMenuRegion(page);
    const session = await stubSession(page, { signedIn: true, otherSessionCount: 1 });
    await stubProfile(page);
    await jb.goto('/account');

    await account.signOut.click();

    await expect(confirm.confirmTitle).toHaveText('Sign out of Jubilee?');
    await expect(confirm.stay).toBeFocused();
    expect(session.signOuts).toBe(0);
    await confirm.confirmSignOut.click();
    await expect.poll(() => account.dataPage()).toBe('welcome');
    expect(session.signOuts).toBe(1);
  });

  for (const width of [360, 1280] as const) {
    test(`AC4: the two actions of the section fit at ${width} px`, async ({ page, jb }) => {
      const account = new AccountPage(page);
      await account.setWidth(width);
      await stubSession(page, { signedIn: true, otherSessionCount: 1 });
      await stubProfile(page);
      await jb.goto('/account');

      const row = (await account.signOutRow.boundingBox())!;
      for (const button of [account.signOutOthers, account.signOut]) {
        const box = (await button.boundingBox())!;
        expect(box.x).toBeGreaterThanOrEqual(row.x - 0.5);
        expect(box.x + box.width).toBeLessThanOrEqual(row.x + row.width + 0.5);
        expect(box.height).toBeGreaterThanOrEqual(width === 360 ? 44 : 24);
      }
    });
  }
});

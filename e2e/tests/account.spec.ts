import { expect, test } from '../fixtures/jb-test';
import { stubProfile } from '../fixtures/profile';
import { AccountMenuDialog } from '../pages/account-menu.dialog';
import { AccountPage } from '../pages/account.page';
import { ChangeEmailDialog } from '../pages/change-email.dialog';
import { ChangePasswordDialog } from '../pages/change-password.dialog';
import { ConfirmEmailChangePage } from '../pages/confirm-email-change.page';
import { LeaveUnsavedDialog } from '../pages/leave-unsaved.dialog';
import { NotificationSettingsPage } from '../pages/notification-settings.page';
import { Toasts } from '../pages/toasts';

test.describe('edit the profile (L2-013)', () => {
  test('AC1: the account shows the profile, when the member joined and when it was last saved', async ({
    page,
    jb,
  }) => {
    const account = new AccountPage(page);
    await jb.signInAs('member');
    await stubProfile(page);
    await jb.goto('/account');

    await expect(account.heading).toHaveText('Your account');
    await expect(account.subtitle).toHaveText('Joanna Adeyemi · member since October 2026');
    await expect(account.firstName).toHaveValue('Joanna');
    await expect(account.lastName).toHaveValue('Adeyemi');
    await expect(account.email).toHaveValue('joanna.adeyemi@example.com');
    await expect(account.emailHelp).toContainText('Confirmed.');
    await expect(account.phone).toHaveValue('416-555-0142');
    await expect(account.phoneHelp).toHaveText(
      'Shared with a business only when you send a request.',
    );
    await expect(account.postalCode).toHaveValue('M4C 1A1');
    await expect(account.homeChurch).toHaveValue('Grace Toronto Church');
    await expect(account.lastSaved).toHaveText('Last saved Mon 9 Nov');
    await expect(account.passwordRow).toContainText('Changed 14 Oct 2026');
  });

  test('AC2: saving sends the six fields and says when it was saved', async ({ page, jb }) => {
    const account = new AccountPage(page);
    await jb.signInAs('member');
    const fake = await stubProfile(page);
    await jb.goto('/account');
    await account.firstName.fill('Joy');
    await account.phone.fill('416-555-0100');
    await account.pronouns.fill('she/her');

    await account.save.click();

    await expect(account.saved).toContainText('Profile saved');
    await expect(account.saved).toContainText('Saved today at 9:00 a.m.');
    expect(fake.profiles).toEqual([
      {
        firstName: 'Joy',
        lastName: 'Adeyemi',
        phone: '416-555-0100',
        postalCode: 'M4C 1A1',
        homeChurch: 'Grace Toronto Church',
        pronouns: 'she/her',
      },
    ]);
    await expect(account.lastSaved).toHaveText('Last saved Tue 10 Nov');
  });

  test('AC3: a phone that is not ten digits is refused beside the field and in the summary', async ({
    page,
    jb,
  }) => {
    const account = new AccountPage(page);
    await jb.signInAs('member');
    const fake = await stubProfile(page);
    await jb.goto('/account');
    await account.phone.fill('555-0142');

    await account.save.click();

    await expect(account.summary).toContainText('Fix 1 thing to continue');
    await expect(account.summaryLinks).toHaveText([
      'Enter a 10-digit phone number, like 416-555-0142.',
    ]);
    await expect(account.errorOf('phone')).toHaveText(
      'Enter a 10-digit phone number, like 416-555-0142.',
    );
    await expect(account.phone).toHaveAttribute('aria-invalid', 'true');
    expect(fake.profiles).toEqual([]);
    await account.summaryLinks.first().click();
    await expect(account.phone).toBeFocused();
  });

  test('AC4: an incomplete postal code is refused', async ({ page, jb }) => {
    const account = new AccountPage(page);
    await jb.signInAs('member');
    await stubProfile(page);
    await jb.goto('/account');
    await account.postalCode.fill('M4C');

    await account.save.click();

    await expect(account.errorOf('postal')).toHaveText('Enter a full postal code, like M4C 1A1.');
  });

  test('AC4: the server refusals are shown the same way', async ({ page, jb }) => {
    const account = new AccountPage(page);
    await jb.signInAs('member');
    await stubProfile(page, { save: 'invalid' });
    await jb.goto('/account');
    await account.firstName.fill('Joy');

    await account.save.click();

    await expect(account.summary).toContainText('Fix 2 things to continue');
    await expect(account.errorOf('phone')).toBeVisible();
    await expect(account.errorOf('postal')).toBeVisible();
    await expect(account.firstName).toHaveValue('Joy');
  });

  test('a save that cannot reach the server keeps what was typed', async ({ page, jb }) => {
    const account = new AccountPage(page);
    await jb.signInAs('member');
    await stubProfile(page, { save: 'offline' });
    await jb.goto('/account');
    await account.firstName.fill('Joy');

    await account.save.click();

    await expect(account.main.getByRole('alert')).toContainText('We couldn’t save your profile');
    await expect(account.firstName).toHaveValue('Joy');
  });

  test('Discard changes puts back what was last saved', async ({ page, jb }) => {
    const account = new AccountPage(page);
    await jb.signInAs('member');
    await stubProfile(page);
    await jb.goto('/account');
    await expect(account.discard).toBeDisabled();
    await account.firstName.fill('Joy');
    await account.homeChurch.fill('');
    await expect(account.discard).toBeEnabled();

    await account.discard.click();

    await expect(account.firstName).toHaveValue('Joanna');
    await expect(account.homeChurch).toHaveValue('Grace Toronto Church');
    await expect(account.discard).toBeDisabled();
  });

  test('AC6: leaving with unsaved changes asks first', async ({ page, jb }) => {
    const account = new AccountPage(page);
    const leave = new LeaveUnsavedDialog(page);
    await jb.signInAs('member');
    await stubProfile(page);
    await jb.goto('/account');
    await account.firstName.fill('Joy');

    await account.sectionTabs.getByRole('link', { name: 'Saved' }).click();
    await expect(leave.title).toHaveText('Leave without saving?');
    await leave.keepEditing.click();
    await expect(page).toHaveURL(/\/account$/);
    await expect(account.firstName).toHaveValue('Joy');

    await account.sectionTabs.getByRole('link', { name: 'Saved' }).click();
    await leave.leave.click();
    await expect(page).toHaveURL(/\/saved$/);
  });

  test('leaving without changes does not ask', async ({ page, jb }) => {
    const account = new AccountPage(page);
    await jb.signInAs('member');
    await stubProfile(page);
    await jb.goto('/account');
    await expect(account.firstName).toHaveValue('Joanna');

    await account.sectionTabs.getByRole('link', { name: 'Saved' }).click();

    await expect(page).toHaveURL(/\/saved$/);
  });

  test('L2-118: an account that cannot load names JB-ACC-503 and can be tried again', async ({
    page,
    jb,
  }) => {
    const account = new AccountPage(page);
    await jb.signInAs('member');
    const fake = await stubProfile(page, { load: 'fails' });
    await jb.goto('/account');
    await expect(account.errorState).toContainText('We couldn’t load your account');

    fake.load = 'ok';
    await account.tryAgain.click();

    await expect(account.firstName).toHaveValue('Joanna');
  });

  test('L2-012: a visitor is sent to sign in', async ({ page, jb }) => {
    await jb.goto('/account');

    await expect(page).toHaveURL(/\/sign-in\?returnUrl=%2Faccount/);
  });
});

test.describe('change the e-mail (L2-014)', () => {
  test('AC1: the new address and the current password send a link and say so', async ({
    page,
    jb,
  }) => {
    const account = new AccountPage(page);
    const dialog = new ChangeEmailDialog(page);
    await jb.signInAs('member');
    const fake = await stubProfile(page);
    await jb.goto('/account');

    await account.changeEmail.click();
    await expect(dialog.title).toHaveText('Change your e-mail');
    await expect(dialog.email).toBeFocused();
    await dialog.fill('joy@example.com', 'correct horse 13');
    await dialog.send.click();

    await expect(dialog.title).toHaveText('Check your new inbox');
    await expect(dialog.sentNote).toContainText(
      'We sent a link to joy@example.com. It works for 24 hours.',
    );
    expect(fake.emailChanges).toEqual([
      { email: 'joy@example.com', currentPassword: 'correct horse 13' },
    ]);
    await dialog.done.click();
    await expect(account.email).toHaveValue('joanna.adeyemi@example.com');
    await expect(account.changeEmail).toBeFocused();
  });

  test('AC4: an address another account uses is refused under the field', async ({ page, jb }) => {
    const account = new AccountPage(page);
    const dialog = new ChangeEmailDialog(page);
    await jb.signInAs('member');
    await stubProfile(page, { emailChange: 'taken' });
    await jb.goto('/account');
    await account.changeEmail.click();
    await dialog.fill('david.chen@example.com', 'correct horse 13');

    await dialog.send.click();

    await expect(dialog.emailError).toHaveText('An account already uses this e-mail.');
    await expect(dialog.email).toHaveValue('david.chen@example.com');
    await expect(dialog.password).toHaveValue('');
  });

  test('a wrong current password is refused under its field', async ({ page, jb }) => {
    const account = new AccountPage(page);
    const dialog = new ChangeEmailDialog(page);
    await jb.signInAs('member');
    await stubProfile(page, { emailChange: 'wrong-password' });
    await jb.goto('/account');
    await account.changeEmail.click();
    await dialog.fill('joy@example.com', 'not my password');

    await dialog.send.click();

    await expect(dialog.passwordError).toHaveText('That isn’t your current password.');
  });

  test('an address that is not an address is refused before anything is sent', async ({
    page,
    jb,
  }) => {
    const account = new AccountPage(page);
    const dialog = new ChangeEmailDialog(page);
    await jb.signInAs('member');
    const fake = await stubProfile(page);
    await jb.goto('/account');
    await account.changeEmail.click();
    await dialog.fill('not-an-email', 'correct horse 13');

    await dialog.send.click();

    await expect(dialog.emailError).toHaveText(
      'Enter a full e-mail address, like name@example.com.',
    );
    expect(fake.emailChanges).toEqual([]);
  });

  test('AC3: opening the link changes the address, and the token leaves the address bar', async ({
    page,
    jb,
  }) => {
    const confirm = new ConfirmEmailChangePage(page);
    await jb.signInAs('member');
    const fake = await stubProfile(page, { confirm: 'confirmed' });
    await jb.goto('/confirm-email-change/the-token');

    await expect(confirm.heading).toHaveText('E-mail changed');
    await expect(page).toHaveURL(/\/confirm-email-change$/);
    expect(fake.confirmed).toEqual(['the-token']);
  });

  test('AC5: a link that expired changes nothing', async ({ page, jb }) => {
    const confirm = new ConfirmEmailChangePage(page);
    await jb.signInAs('member');
    await stubProfile(page, { confirm: 'expired' });
    await jb.goto('/confirm-email-change/old-token');

    await expect(confirm.heading).toHaveText('This link has expired');
    await expect(confirm.text).toContainText('Your e-mail has not changed');
  });

  test('an address taken meanwhile is told so', async ({ page, jb }) => {
    const confirm = new ConfirmEmailChangePage(page);
    await jb.signInAs('member');
    await stubProfile(page, { confirm: 'email-in-use' });
    await jb.goto('/confirm-email-change/late-token');

    await expect(confirm.heading).toHaveText('An account already uses this e-mail');
  });

  test('L2-118: a link that cannot be checked names JB-VERIFY-502', async ({ page, jb }) => {
    const confirm = new ConfirmEmailChangePage(page);
    await jb.signInAs('member');
    await stubProfile(page, { confirm: 'fails' });
    await jb.goto('/confirm-email-change/a-token');

    await expect(confirm.errorState).toBeVisible();
  });
});

test.describe('change the password (L2-015)', () => {
  test('AC3: the current and the new password change it and say what happened', async ({
    page,
    jb,
  }) => {
    const account = new AccountPage(page);
    const dialog = new ChangePasswordDialog(page);
    const toasts = new Toasts(page);
    await jb.signInAs('member');
    const fake = await stubProfile(page);
    await jb.goto('/account');

    await account.changePassword.click();
    await expect(dialog.title).toHaveText('Change your password');
    await dialog.current.fill('correct horse 13');
    await dialog.next.fill('a brand new password 7');
    await dialog.repeat.fill('a brand new password 7');
    await dialog.save.click();

    await expect(dialog.root).toBeHidden();
    await expect(toasts.withTitle('Password changed')).toBeVisible();
    expect(fake.passwordChanges).toEqual([
      {
        currentPassword: 'correct horse 13',
        newPassword: 'a brand new password 7',
        repeatPassword: 'a brand new password 7',
      },
    ]);
    await expect(account.passwordRow).toContainText('Changed 10 Nov 2026');
  });

  test('AC2: a wrong current password is refused and the password fields are emptied', async ({
    page,
    jb,
  }) => {
    const account = new AccountPage(page);
    const dialog = new ChangePasswordDialog(page);
    await jb.signInAs('member');
    await stubProfile(page, { passwordChange: 'wrong-password' });
    await jb.goto('/account');
    await account.changePassword.click();
    await dialog.current.fill('not my password');
    await dialog.next.fill('a brand new password 7');
    await dialog.repeat.fill('a brand new password 7');

    await dialog.save.click();

    await expect(dialog.currentError).toHaveText('That isn’t your current password.');
    await expect(dialog.current).toHaveValue('');
    await expect(dialog.next).toHaveValue('');
  });

  test('a new password that is too short, different or breached is refused', async ({
    page,
    jb,
  }) => {
    const account = new AccountPage(page);
    const dialog = new ChangePasswordDialog(page);
    await jb.signInAs('member');
    const fake = await stubProfile(page, { passwordChange: 'breached' });
    await jb.goto('/account');
    await account.changePassword.click();

    await dialog.current.fill('correct horse 13');
    await dialog.next.fill('short');
    await dialog.repeat.fill('short');
    await dialog.save.click();
    await expect(dialog.nextError).toHaveText('Use at least 10 characters.');

    await dialog.current.fill('correct horse 13');
    await dialog.next.fill('a brand new password 7');
    await dialog.repeat.fill('something else entirely');
    await dialog.save.click();
    await expect(dialog.repeatError).toHaveText('The two passwords are different.');
    expect(fake.passwordChanges).toEqual([]);

    await dialog.current.fill('correct horse 13');
    await dialog.next.fill('password12345');
    await dialog.repeat.fill('password12345');
    await dialog.save.click();
    await expect(dialog.nextError).toContainText('appeared in a data breach');
  });

  test('AC5: a member who joined with Google sets a password without a current one', async ({
    page,
    jb,
  }) => {
    const account = new AccountPage(page);
    const dialog = new ChangePasswordDialog(page);
    await jb.signInAs('member');
    const fake = await stubProfile(page, {
      account: { hasPassword: false, passwordChangedAt: null },
    });
    await jb.goto('/account');
    await expect(account.passwordRow).toContainText('You sign in with Google');

    await account.changePassword.click();
    await expect(dialog.title).toHaveText('Set a password');
    await expect(dialog.current).toHaveCount(0);
    await dialog.next.fill('a brand new password 7');
    await dialog.repeat.fill('a brand new password 7');
    await dialog.save.click();

    await expect(dialog.root).toBeHidden();
    expect(fake.passwordChanges).toEqual([
      {
        currentPassword: null,
        newPassword: 'a brand new password 7',
        repeatPassword: 'a brand new password 7',
      },
    ]);
  });
});

test.describe('choose notification settings (L2-016, L2-149)', () => {
  test('AC1, AC5: the five switches and how often show the defaults', async ({ page, jb }) => {
    const settings = new NotificationSettingsPage(page);
    await jb.signInAs('member');
    await stubProfile(page);
    await jb.goto('/account/notifications');

    await expect(settings.switch('New messages')).toBeChecked();
    await expect(settings.switch('Request updates')).toBeChecked();
    await expect(settings.switch('Meeting reminders')).toBeChecked();
    await expect(settings.switch('New businesses')).not.toBeChecked();
    await expect(settings.switch('Tips for business owners')).not.toBeChecked();
    await expect(settings.frequency).toHaveValue('as-it-happens');
    await expect(settings.status).toHaveText('Changes save as you make them');
    await expect(settings.securityNote).toHaveText(
      'We always e-mail you about sign-in and security, whatever you choose here.',
    );
    await expect(settings.subtitle).toHaveText('Joanna Adeyemi · member since October 2026');
  });

  test('AC2: a switch saves on its own, with nothing else sent', async ({ page, jb }) => {
    const settings = new NotificationSettingsPage(page);
    await jb.signInAs('member');
    const fake = await stubProfile(page);
    await jb.goto('/account/notifications');

    await settings.switch('Tips for business owners').check();

    await expect(settings.status).toHaveText('Saved at 9:00 a.m.');
    await expect(settings.switch('Tips for business owners')).toBeChecked();
    expect(fake.preferenceCalls).toEqual([{ setting: 'tips', enabled: true }]);

    await settings.switch('New messages').uncheck();
    await expect(settings.switch('New messages')).not.toBeChecked();
    expect(fake.preferenceCalls).toEqual([
      { setting: 'tips', enabled: true },
      { setting: 'messages', enabled: false },
    ]);
  });

  test('AC1: how often saves too', async ({ page, jb }) => {
    const settings = new NotificationSettingsPage(page);
    await jb.signInAs('member');
    const fake = await stubProfile(page);
    await jb.goto('/account/notifications');

    await settings.frequency.selectOption('daily-summary');

    await expect(settings.status).toHaveText('Saved at 9:00 a.m.');
    expect(fake.preferenceCalls).toEqual([{ setting: 'frequency', frequency: 'daily-summary' }]);
  });

  test('AC3: a switch that cannot be saved goes back, and Try again saves it', async ({
    page,
    jb,
  }) => {
    const settings = new NotificationSettingsPage(page);
    const toasts = new Toasts(page);
    await jb.signInAs('member');
    const fake = await stubProfile(page, { preferenceFailures: 1 });
    await jb.goto('/account/notifications');

    // A click, not check(): the switch goes back at once, and check() insists it stays on.
    await settings.switch('New businesses').click();

    const toast = toasts.withTitle('We couldn’t save “New businesses”');
    await expect(toast).toBeVisible();
    await expect(settings.switch('New businesses')).not.toBeChecked();

    await toasts.action(toast, 'Try again').click();

    await expect(settings.switch('New businesses')).toBeChecked();
    await expect(settings.status).toHaveText('Saved at 9:00 a.m.');
    expect(fake.preferenceCalls).toEqual([
      { setting: 'new-businesses', enabled: true },
      { setting: 'new-businesses', enabled: true },
    ]);
  });

  test('L2-118: settings that cannot load name JB-PREF-503', async ({ page, jb }) => {
    const settings = new NotificationSettingsPage(page);
    await jb.signInAs('member');
    const fake = await stubProfile(page, { preferencesLoad: 'fails' });
    await jb.goto('/account/notifications');
    await expect(settings.errorState).toContainText('We couldn’t load your settings');

    fake.preferencesLoad = 'ok';
    await settings.tryAgain.click();

    await expect(settings.switch('New messages')).toBeChecked();
  });

  test('the Notification settings tab leads here from the profile', async ({ page, jb }) => {
    const account = new AccountPage(page);
    const settings = new NotificationSettingsPage(page);
    await jb.signInAs('member');
    await stubProfile(page);
    await jb.goto('/account');

    await account.sectionTabs.getByRole('link', { name: 'Notification settings' }).click();

    await expect(page).toHaveURL(/\/account\/notifications$/);
    await expect(settings.switch('New messages')).toBeVisible();
  });
});

test.describe('the account menu (L2-019)', () => {
  test('AC1: the avatar opens the menu with the name, the address and the links', async ({
    page,
    jb,
  }) => {
    const menu = new AccountMenuDialog(page);
    const account = new AccountPage(page);
    await account.setWidth(1280);
    await jb.signInAs('member');
    await page.route('**/api/session', (route) =>
      route.fulfill({
        json: {
          signedIn: true,
          firstName: 'Joanna',
          displayName: 'Joanna Adeyemi',
          initials: 'JA',
          email: 'joanna.adeyemi@example.com',
          emailStatus: 'confirmed',
        },
      }),
    );
    await jb.goto('/');

    await account.avatar.click();

    await expect(menu.name).toHaveText('Joanna Adeyemi');
    await expect(menu.email).toHaveText('joanna.adeyemi@example.com');
    await expect(menu.items).toHaveText([
      'Your account',
      'Your requests',
      'Saved',
      'Notifications',
      'List your business',
      'Help',
      'Sign out',
    ]);
    await expect(menu.item('Your account')).toBeFocused();

    // Escape closes it and focus goes back to the avatar.
    await page.keyboard.press('Escape');
    await expect(menu.root).toBeHidden();
    await expect(account.avatar).toBeFocused();
  });

  test('AC2: arrow keys move between the items', async ({ page, jb }) => {
    const menu = new AccountMenuDialog(page);
    const account = new AccountPage(page);
    await account.setWidth(1280);
    await jb.signInAs('member');
    await jb.goto('/');
    await account.avatar.click();

    await page.keyboard.press('ArrowDown');
    await expect(menu.item('Your requests')).toBeFocused();
    await page.keyboard.press('ArrowUp');
    await expect(menu.item('Your account')).toBeFocused();
  });

  test('AC3: an owner sees My business and a verifier sees the Verification queue', async ({
    page,
    jb,
  }) => {
    const menu = new AccountMenuDialog(page);
    const account = new AccountPage(page);
    await account.setWidth(1280);
    await jb.signInAs('member', { ownsListing: true });
    await page.route('**/api/session', (route) =>
      route.fulfill({
        json: {
          signedIn: true,
          firstName: 'Joanna',
          displayName: 'Joanna Adeyemi',
          initials: 'JA',
          isVerifier: true,
        },
      }),
    );
    await jb.goto('/');

    await account.avatar.click();

    await expect(menu.item('My business')).toBeVisible();
    await expect(menu.item('List your business')).toHaveCount(0);
    await expect(menu.item('Verification queue')).toBeVisible();
  });

  test('a link in the menu goes to its page and closes the menu', async ({ page, jb }) => {
    const menu = new AccountMenuDialog(page);
    const account = new AccountPage(page);
    await account.setWidth(1280);
    await jb.signInAs('member');
    await stubProfile(page);
    await jb.goto('/');
    await account.avatar.click();

    await menu.item('Notifications').click();

    await expect(page).toHaveURL(/\/account\/notifications$/);
    await expect(menu.root).toBeHidden();
  });
});

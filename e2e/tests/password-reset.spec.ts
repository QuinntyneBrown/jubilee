import { expect, test } from '../fixtures/jb-test';
import { BREACHED, RESET_EMAIL, stubPasswordReset } from '../fixtures/password-reset';
import { ForgotPasswordPage } from '../pages/forgot-password.page';
import { ResetPasswordPage } from '../pages/reset-password.page';

const TOKEN = 'e2e-reset-token-0123456789abcdefghijklmnopq';
const RESET = `/reset-password/${TOKEN}`;

test.describe('forgot password (L2-008)', () => {
  test('AC1: a well-formed address gets the same answer whether or not an account exists', async ({ page, jb }) => {
    const forgot = new ForgotPasswordPage(page);
    const fake = await stubPasswordReset(page);
    await jb.goto('/forgot-password');

    await expect(forgot.heading).toHaveText('Reset your password');
    await forgot.email.fill(RESET_EMAIL);
    await forgot.send.click();

    await expect(forgot.sentHeading).toBeVisible();
    await expect(forgot.sentText).toHaveText(
      `If ${RESET_EMAIL} has an account, a reset link is on its way. It works for 60 minutes.`,
    );
    expect(fake.requestedFor).toEqual([RESET_EMAIL]);
    await expect(forgot.backToSignIn).toHaveAttribute('href', '/sign-in');
  });

  test('AC3: an empty or malformed address shows the summary and the field error', async ({ page, jb }) => {
    const forgot = new ForgotPasswordPage(page);
    const fake = await stubPasswordReset(page);
    await jb.goto('/forgot-password');

    await forgot.send.click();
    await expect(forgot.summary).toContainText('Fix 1 thing to continue');
    await expect(forgot.emailError).toHaveText('Enter an e-mail address like name@example.com');

    await forgot.email.fill('joanna.adeyemi');
    await forgot.send.click();
    await expect(forgot.emailError).toHaveText('Enter an e-mail address like name@example.com');
    await expect(forgot.email).toHaveAttribute('aria-invalid', 'true');
    await forgot.summaryLinks.first().click();
    await expect(forgot.email).toBeFocused();
    expect(fake.requestedFor).toEqual([]);
  });

  test('the button is busy and the field locked while the request is on its way', async ({ page, jb }) => {
    const forgot = new ForgotPasswordPage(page);
    await stubPasswordReset(page, { request: 'slow' });
    await jb.goto('/forgot-password');

    await forgot.email.fill(RESET_EMAIL);
    await forgot.send.click();

    await expect(forgot.send).toHaveAttribute('aria-busy', 'true');
    await expect(forgot.email).toHaveAttribute('readonly', '');
    await expect(forgot.sentHeading).toBeVisible();
  });

  test('when the request fails the page says so, quotes the reference and can try again', async ({ page, jb }) => {
    const forgot = new ForgotPasswordPage(page);
    const fake = await stubPasswordReset(page, { request: 'fails' });
    await jb.goto('/forgot-password');

    await forgot.email.fill(RESET_EMAIL);
    await forgot.send.click();
    await expect(forgot.reference).toHaveText('JB-AUTH-503');

    fake.request = 'accepts';
    await forgot.tryAgain.click();
    await forgot.send.click();
    await expect(forgot.sentHeading).toBeVisible();
  });
});

test.describe('reset password (L2-009, L2-140)', () => {
  test('AC1: a valid link shows the account and the two fields; the token leaves the address bar', async ({ page, jb }) => {
    const reset = new ResetPasswordPage(page);
    const fake = await stubPasswordReset(page);
    await jb.goto(RESET);

    await expect(reset.heading).toHaveText('Choose a new password');
    await expect(reset.forAccount).toHaveText(`For ${RESET_EMAIL}`);
    await expect(reset.password).toBeVisible();
    await expect(reset.main.getByText('At least 10 characters.')).toBeVisible();
    await expect(reset.repeat).toBeVisible();
    await expect(page).toHaveURL(/\/reset-password$/);
    expect(fake.inspected).toEqual([TOKEN]);
    expect(fake.urls.every((url) => !url.includes(TOKEN))).toBe(true);
  });

  test('AC2 and AC3: a short password and two that differ are refused with the field errors', async ({ page, jb }) => {
    const reset = new ResetPasswordPage(page);
    const fake = await stubPasswordReset(page);
    await jb.goto(RESET);

    await reset.fill('short', 'shorter');
    await reset.change.click();

    await expect(reset.summary).toContainText('Fix 2 things to continue');
    await expect(reset.passwordError).toHaveText('Use at least 10 characters. This one has 5.');
    await expect(reset.repeatError).toHaveText(
      'The two passwords don\u2019t match. Type the same password again.',
    );
    expect(fake.changes).toEqual([]);
  });

  test('AC4: matching passwords change the password and say how to go on', async ({ page, jb }) => {
    const reset = new ResetPasswordPage(page);
    const fake = await stubPasswordReset(page);
    await jb.goto(RESET);

    await reset.fill('a brand new password 7');
    await reset.change.click();

    await expect(reset.heading).toHaveText('Password changed');
    await expect(reset.main).toContainText(
      'You\u2019re signed out everywhere else. Sign in with your new password.',
    );
    await expect(reset.signIn).toHaveAttribute('href', '/sign-in');
    expect(fake.changes).toEqual([
      { token: TOKEN, newPassword: 'a brand new password 7', repeatPassword: 'a brand new password 7' },
    ]);
    expect(fake.urls.every((url) => !url.includes(TOKEN))).toBe(true);
  });

  test('AC5: an expired or used link says so and offers a new one', async ({ page, jb }) => {
    const reset = new ResetPasswordPage(page);
    await stubPasswordReset(page, { link: 'expired' });
    await jb.goto(RESET);

    await expect(reset.heading).toHaveText('This link has expired');
    await expect(reset.main).toContainText('Reset links work once, for 60 minutes.');
    await expect(reset.sendNewLink).toHaveAttribute('href', '/forgot-password');
  });

  test('AC5: a link that expires while the form is open shows the same state', async ({ page, jb }) => {
    const reset = new ResetPasswordPage(page);
    await stubPasswordReset(page, { reset: 'expires' });
    await jb.goto(RESET);

    await reset.fill('a brand new password 7');
    await reset.change.click();

    await expect(reset.heading).toHaveText('This link has expired');
  });

  test('AC6: a password from a known breach is refused and the form stays', async ({ page, jb }) => {
    const reset = new ResetPasswordPage(page);
    await stubPasswordReset(page);
    await jb.goto(RESET);

    await reset.fill(BREACHED);
    await reset.change.click();

    await expect(reset.passwordError).toHaveText('This password has appeared in a data breach. Choose another.');
    await expect(reset.password).toHaveAttribute('aria-invalid', 'true');
    await expect(reset.heading).toHaveText('Choose a new password');
  });

  test('when the link cannot be checked the page says so and can try again', async ({ page, jb }) => {
    const reset = new ResetPasswordPage(page);
    const fake = await stubPasswordReset(page, { link: 'fails' });
    await jb.goto(RESET);

    await expect(reset.errorState).toBeVisible();

    fake.link = 'valid';
    await reset.tryAgain.click();
    await expect(reset.heading).toHaveText('Choose a new password');
    expect(fake.inspected).toEqual([TOKEN, TOKEN]);
  });
});

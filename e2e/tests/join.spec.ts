import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures/jb-test';
import { stubConfirmation, stubResend, stubSession, unconfirmedSession } from '../fixtures/stubs';
import {
  JoinErrorScreen,
  JoinPage,
  JoinSubmittingScreen,
  JoinSuccessScreen,
} from '../pages/join.page';
import { VerifyEmailBannerRegion, VerifyEmailPage } from '../pages/verify-email.page';

// Join Jubilee: L2-001 to L2-005. The API is answered by Playwright mocking (ADR 0009); the
// requests the app makes are captured to prove what it sends.

const valid = {
  first: 'Joanna',
  last: 'Adeyemi',
  email: 'joanna.adeyemi@example.com',
  password: 'longpassword1',
  church: 'Grace Toronto Church',
  agree: true,
};

/** Answers the join request with `status` and `body`, and keeps the request bodies it saw. */
async function stubJoin(
  page: Page,
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
) {
  const seen: Record<string, unknown>[] = [];
  await page.route('**/api/account/join', (route) => {
    seen.push(route.request().postDataJSON() as Record<string, unknown>);
    return route.fulfill({
      status,
      headers,
      contentType: status >= 400 ? 'application/problem+json' : 'application/json',
      body: JSON.stringify(body),
    });
  });
  return seen;
}

test.describe('join with e-mail (L2-001)', () => {
  test('AC1: the form asks for the fields of the mock, with their limits and the Google button', async ({
    page,
    jb,
  }) => {
    const join = new JoinPage(page);
    await jb.open('sign-up');
    await expect.poll(() => join.dataPage()).toBe('sign-up');

    await expect(join.heading).toHaveText('Join Jubilee');
    await expect(join.firstName).toHaveAttribute('maxlength', '50');
    await expect(join.lastName).toHaveAttribute('maxlength', '50');
    await expect(join.email).toHaveAttribute('maxlength', '254');
    await expect(join.password).toHaveAttribute('maxlength', '128');
    await expect(join.password).toHaveAttribute('type', 'password');
    await expect(join.google).toHaveAttribute('href', '/api/auth/google/start?from=join');
    await expect(join.statementLink).toHaveAttribute('target', '_blank');
    await expect(join.termsLink).toHaveAttribute('target', '_blank');
    await expect(join.signInLink).toBeVisible();
  });

  test('AC3: the form names its fields as designed and marks only the optional one', async ({
    page,
    jb,
  }) => {
    const join = new JoinPage(page);
    await jb.open('sign-up');

    await expect(join.email).toHaveAttribute('placeholder', 'you@example.com');
    await expect(join.homeChurch).toHaveAttribute('placeholder', 'e.g. The Meeting House');
    await expect(join.passwordHint).toHaveText('At least 10 characters.');
    await expect(join.homeChurchHint).toHaveText(
      'Shown to no one. Helps us recommend businesses near you.',
    );
    await expect(join.fieldOf('Home church')).toContainText('(optional)');
    await expect(join.main).not.toContainText('(required)');
    for (const control of [join.firstName, join.lastName, join.email, join.password]) {
      await expect(control).toHaveAttribute('required', '');
    }
    await expect(join.homeChurch).not.toHaveAttribute('required', '');
    // Each hint stands under its control.
    expect(await join.topEdge(join.passwordHint)).toBeGreaterThanOrEqual(
      await join.bottomEdge(join.password),
    );
    expect(await join.topEdge(join.homeChurchHint)).toBeGreaterThanOrEqual(
      await join.bottomEdge(join.homeChurch),
    );
  });

  test('AC4: the agreement is one sentence with its two links', async ({ page, jb }) => {
    const join = new JoinPage(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await jb.open('sign-up');

    await expect(join.agreementText).toHaveText(
      'I am 18 or older and agree to Jubilee’s statement of faith and terms.',
    );
    await expect(join.statementLink).toHaveAttribute('href', '/statement-of-faith');
    await expect(join.termsLink).toHaveAttribute('href', '/terms');
    // The links are words of the sentence, on its line, not lines of their own.
    expect(
      Math.abs((await join.topEdge(join.termsLink)) - (await join.topEdge(join.statementLink))),
    ).toBeLessThan(2);
    expect(await join.leftEdge(join.termsLink)).toBeGreaterThan(
      await join.rightEdge(join.statementLink),
    );
  });

  test('AC7: the page says who it is for and offers Log in under the form', async ({
    page,
    jb,
  }) => {
    const join = new JoinPage(page);
    await jb.open('sign-up');

    await expect(join.heading).toHaveText('Join Jubilee');
    await expect(join.lead).toHaveText('Free for everyone in Toronto’s Christian community.');
    await expect(join.main).toContainText('Already on Jubilee?');
    await expect(join.signInLink).toHaveAttribute('href', '/sign-in');
    expect(await join.topEdge(join.signInLink)).toBeGreaterThan(
      await join.bottomEdge(join.createAccount),
    );
  });

  test('AC8: the names pair from 640 px, the e-mail and the password from 1024 px', async ({
    page,
    jb,
  }) => {
    const join = new JoinPage(page);
    const beside = async (left: typeof join.email, right: typeof join.email): Promise<boolean> =>
      (await join.leftEdge(right)) >= (await join.rightEdge(left));

    await page.setViewportSize({ width: 360, height: 800 });
    await jb.open('sign-up');
    expect(await beside(join.firstName, join.lastName)).toBe(false);
    expect(await beside(join.email, join.password)).toBe(false);

    await page.setViewportSize({ width: 768, height: 800 });
    expect(await beside(join.firstName, join.lastName)).toBe(true);
    expect(await beside(join.email, join.password)).toBe(false);

    await page.setViewportSize({ width: 1280, height: 800 });
    expect(await beside(join.firstName, join.lastName)).toBe(true);
    expect(await beside(join.email, join.password)).toBe(true);
  });

  test('L2-003 AC8: Google comes first, with its mark, and "or use email" divides it from the form', async ({
    page,
    jb,
  }) => {
    const join = new JoinPage(page);
    await jb.open('sign-up');

    await expect(join.google).toHaveAttribute('href', '/api/auth/google/start?from=join');
    await expect(join.googleMark).toBeVisible();
    await expect(join.divider).toHaveText('or use email');
    expect(await join.bottomEdge(join.google)).toBeLessThanOrEqual(
      await join.topEdge(join.divider),
    );
    expect(await join.bottomEdge(join.divider)).toBeLessThanOrEqual(
      await join.topEdge(join.firstName),
    );
  });

  test('L2-187 AC1, AC2: the brand panel stands beside the form from 1024 px, and not below it', async ({
    page,
    jb,
  }) => {
    const join = new JoinPage(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await jb.open('sign-up');
    await expect(join.brandPanel).toBeVisible();
    await expect(join.brandPanel).toContainText('Hire, shop and book with your church family.');
    await expect(join.lockup).toHaveCount(1);
    expect(await join.leftEdge(join.frameCard)).toBeGreaterThan(
      await join.rightEdge(join.brandPanel),
    );

    await page.setViewportSize({ width: 360, height: 800 });
    await expect(join.brandPanel).toBeHidden();
    await expect(join.lockup).toHaveCount(1);
    expect(await join.bottomEdge(join.lockup)).toBeLessThanOrEqual(
      await join.topEdge(join.frameCard),
    );
  });

  test('L2-187 AC3: the lockup leads to the welcome page', async ({ page, jb }) => {
    const join = new JoinPage(page);
    await jb.open('sign-up');

    await join.lockup.click();

    await expect.poll(() => join.dataPage()).toBe('welcome');
  });

  test('AC1: a signed-in member who opens the join page is taken to browse', async ({
    page,
    jb,
  }) => {
    await jb.signInAs('member');
    await jb.goto('/join');
    await expect.poll(() => new JoinPage(page).dataPage()).toBe('browse');
  });

  test('AC2: joining sends the fields and shows where the link was sent', async ({ page, jb }) => {
    const seen = await stubJoin(page, 201, { email: valid.email });
    const join = new JoinPage(page);
    await jb.open('sign-up');

    await join.fill(valid);
    await join.createAccount.click();

    await expect(join.sentHeading).toBeVisible();
    await expect(join.sentText).toContainText(valid.email);
    expect(seen).toEqual([
      {
        firstName: 'Joanna',
        lastName: 'Adeyemi',
        email: valid.email,
        password: valid.password,
        homeChurch: 'Grace Toronto Church',
        agreementAccepted: true,
        challengeToken: null,
      },
    ]);
  });

  test('AC3: an empty form is not sent; the summary counts the fixes and takes the focus', async ({
    page,
    jb,
  }) => {
    const seen = await stubJoin(page, 201, { email: '' });
    const join = new JoinPage(page);
    await jb.open('sign-up');

    await join.createAccount.click();

    await expect(join.summary).toContainText('Fix 5 things to continue');
    await expect(join.summary).toBeFocused();
    await expect(join.summaryLinks).toHaveCount(5);
    await expect(join.email).toHaveAttribute('aria-invalid', 'true');
    await expect(join.fieldError('email')).toBeVisible();
    await expect(join.agreement).toHaveAttribute('aria-invalid', 'true');
    expect(seen).toEqual([]);

    await join.summaryLinks.first().click();
    await expect(join.firstName).toBeFocused();
  });

  test('AC3: a short password says how long it is', async ({ page, jb }) => {
    const join = new JoinPage(page);
    await jb.open('sign-up');

    await join.fill({ ...valid, password: 'short' });
    await join.createAccount.click();

    await expect(join.fieldError('password')).toHaveText(
      'Use at least 10 characters. This one has 5.',
    );
    await expect(join.summary).toContainText('Fix 1 thing to continue');
  });

  test('AC4: an address that already has an account is refused beside the field', async ({
    page,
    jb,
  }) => {
    await stubJoin(page, 422, {
      title: 'Check the form',
      status: 422,
      errors: { email: 'EMAIL_TAKEN' },
    });
    const join = new JoinPage(page);
    await jb.open('sign-up');

    await join.fill(valid);
    await join.createAccount.click();

    await expect(join.fieldError('email')).toHaveText(
      'An account already uses this e-mail. Log in instead, or use another address.',
    );
    await expect(join.summary).toBeFocused();
  });

  test('AC4: a password found in a breach is refused', async ({ page, jb }) => {
    await stubJoin(page, 422, {
      title: 'Check the form',
      status: 422,
      errors: { password: 'PASSWORD_BREACHED' },
    });
    const join = new JoinPage(page);
    await jb.open('sign-up');

    await join.fill(valid);
    await join.createAccount.click();

    await expect(join.fieldError('password')).toContainText('data breach');
  });

  test('AC5: too many attempts tell the visitor how long to wait', async ({ page, jb }) => {
    await stubJoin(
      page,
      429,
      { title: 'Too many requests', status: 429 },
      { 'Retry-After': '600' },
    );
    const join = new JoinPage(page);
    await jb.open('sign-up');

    await join.fill(valid);
    await join.createAccount.click();

    await expect(join.notice).toHaveText('You’re doing that a lot. Try again in 10 minutes.');
  });

  test('AC6: a failed request shows the error reference and lets the visitor try again', async ({
    page,
    jb,
  }) => {
    await stubJoin(page, 503, {
      title: 'Service unavailable',
      status: 503,
      reference: 'JB-AUTH-503',
    });
    const join = new JoinPage(page);
    await jb.open('sign-up');

    await join.fill(valid);
    await join.createAccount.click();

    await expect(join.errorState).toContainText('JB-AUTH-503');
    await join.errorState.getByRole('button', { name: 'Try again' }).click();
    await expect(join.createAccount).toBeVisible();
  });
});

test.describe('the other states of Sign up, in the frame (L2-001, L2-002, L2-003, L2-187)', () => {
  test('"Check your e-mail" is the only heading, with neither the lead nor the link under the card', async ({
    page,
    jb,
  }) => {
    const join = new JoinSuccessScreen(page);
    await jb.open('sign-up.success');
    await join.ready();

    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(join.heading).toHaveText('Check your e-mail');
    await expect(join.sentText).toContainText('joanna.adeyemi@example.com');
    await expect(join.lead).toHaveCount(0);
    await expect(join.signInLink).toHaveCount(0);
    await expect(join.frameFoot).toBeHidden();
  });

  test('a failed request leaves one heading and no link under the card', async ({ page, jb }) => {
    const join = new JoinErrorScreen(page);
    await jb.open('sign-up.error');
    await join.ready();

    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(join.heading).toHaveText('We couldn’t load the join form');
    await expect(join.lead).toHaveCount(0);
    await expect(join.signInLink).toHaveCount(0);
  });

  test('a notice from Google stands between the heading and the Google button', async ({
    page,
    jb,
  }) => {
    const join = new JoinPage(page);
    await jb.open('sign-up.google-cancelled');

    expect(await join.topEdge(join.notice)).toBeGreaterThanOrEqual(
      await join.bottomEdge(join.lead),
    );
    expect(await join.bottomEdge(join.notice)).toBeLessThanOrEqual(await join.topEdge(join.google));
  });

  test('the error summary stands above the Google button and takes the focus', async ({
    page,
    jb,
  }) => {
    const join = new JoinPage(page);
    await jb.open('sign-up.invalid');

    await join.createAccount.click();

    await expect(join.summary).toBeFocused();
    expect(await join.bottomEdge(join.summary)).toBeLessThanOrEqual(
      await join.topEdge(join.google),
    );
    await expect(join.heading).toHaveText('Join Jubilee');
  });

  test('while the form is being sent the frame keeps its heading and its link', async ({
    page,
    jb,
  }) => {
    const join = new JoinSubmittingScreen(page);
    await jb.open('sign-up.submitting');
    await join.ready();

    await expect(join.createAccount).toHaveAttribute('aria-busy', 'true');
    await expect(join.email).toHaveAttribute('readonly', '');
    await expect(join.heading).toHaveText('Join Jubilee');
    await expect(join.signInLink).toBeVisible();
  });
});

test.describe('show password on Sign up (L2-187)', () => {
  for (const width of [360, 1280]) {
    test(`AC4: the button inside the control shows the password, then hides it, at ${width} px`, async ({
      page,
      jb,
    }) => {
      const join = new JoinPage(page);
      await page.setViewportSize({ width, height: 800 });
      await jb.open('sign-up');
      await join.password.fill('a long password 1');

      expect(await join.rightEdge(join.showPassword)).toBeLessThanOrEqual(
        await join.rightEdge(join.password),
      );
      expect(await join.leftEdge(join.showPassword)).toBeGreaterThan(
        await join.leftEdge(join.password),
      );

      await join.showPassword.click();
      await expect(join.password).toHaveAttribute('type', 'text');
      await expect(join.hidePassword).toBeFocused();
      await expect(join.password).toHaveValue('a long password 1');

      await join.hidePassword.click();
      await expect(join.password).toHaveAttribute('type', 'password');
      await expect(join.showPassword).toBeFocused();
      await expect(join.password).toHaveValue('a long password 1');
    });
  }

  test('AC5, AC6: by keyboard it comes after the password, works with Enter and Space and sends nothing', async ({
    page,
    jb,
  }) => {
    const seen = await stubJoin(page, 201, {});
    const join = new JoinPage(page);
    await jb.open('sign-up');
    await join.fill(valid);

    await join.password.press('Tab');
    await expect(join.showPassword).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(join.password).toHaveAttribute('type', 'text');
    await page.keyboard.press('Space');
    await expect(join.password).toHaveAttribute('type', 'password');

    expect(seen).toHaveLength(0);
    await expect(join.password).toHaveValue(valid.password);
    // The password still keeps its limit and its hint.
    await expect(join.password).toHaveAttribute('maxlength', '128');
    await expect(join.password).toHaveAttribute('aria-describedby', 'password-help');
  });
});

test.describe('confirm the e-mail address (L2-004)', () => {
  test('AC1: the waiting page names the address and sends the link again', async ({ page, jb }) => {
    await stubResend(page);
    const verify = new VerifyEmailPage(page);
    await jb.open('verify-email');

    await expect(verify.heading).toHaveText('Confirm your e-mail');
    await expect(verify.text).toContainText(unconfirmedSession.email);
    const request = page.waitForRequest('**/api/account/confirmation/resend');
    await verify.sendAgain.click();
    expect((await request).method()).toBe('POST');
    await expect(verify.status).toContainText(`We sent a new link to ${unconfirmedSession.email}`);
  });

  test('AC2: opening the link confirms the address and takes the token out of the address bar', async ({
    page,
    jb,
  }) => {
    const bodies: unknown[] = [];
    page.on('request', (request) => {
      if (request.url().endsWith('/api/account/confirmation')) bodies.push(request.postDataJSON());
    });
    const verify = new VerifyEmailPage(page);
    await jb.open('verify-email.success');

    await expect(verify.heading).toHaveText('E-mail confirmed');
    await expect(verify.text).toContainText('Thanks, Joanna.');
    expect(bodies).toEqual([{ token: 'e2e-token' }]);
    expect(new URL(page.url()).pathname).toBe('/verify-email');
  });

  test('AC3: a link past its 24 hours says so and offers a new one', async ({ page, jb }) => {
    const verify = new VerifyEmailPage(page);
    await jb.open('verify-email.expired');

    await expect(verify.heading).toHaveText('This link has expired');
    await expect(verify.text).toContainText('24 hours');
  });

  test('AC3: while the link is checked the page says it is working', async ({ page, jb }) => {
    const verify = new VerifyEmailPage(page);
    await jb.open('verify-email.loading');

    await expect(verify.status).toContainText('Confirming your e-mail');
  });

  test('AC4: a failed check shows JB-VERIFY-502 and can be tried again', async ({ page, jb }) => {
    const verify = new VerifyEmailPage(page);
    await jb.open('verify-email.error');

    await expect(verify.errorReference).toHaveText('JB-VERIFY-502');
    await stubConfirmation(page, { outcome: 'confirmed', firstName: 'Joanna' });
    await verify.tryAgain.click();
    await expect(verify.heading).toHaveText('E-mail confirmed');
  });
});

test.describe('restricted until the address is confirmed (L2-005)', () => {
  test('AC1: an unconfirmed member sees the banner, with no way to dismiss it', async ({
    page,
    jb,
  }) => {
    const banner = new VerifyEmailBannerRegion(page);
    await jb.open('verify-email-banner');

    await expect(banner.banner).toContainText('Confirm your e-mail to message businesses.');
    await expect(banner.banner).toContainText(unconfirmedSession.email);
    await expect(banner.changeEmail).toBeVisible();
    await expect(banner.dismiss).toHaveCount(0);
  });

  test('AC1: "Send it again" asks for a new link and says it was sent', async ({ page, jb }) => {
    await stubResend(page);
    const banner = new VerifyEmailBannerRegion(page);
    await jb.open('verify-email-banner');

    await banner.sendAgain.click();

    await expect(banner.banner).toContainText('We sent a new link');
  });

  test('AC3: an address that bounced says so and offers to change it', async ({ page, jb }) => {
    const banner = new VerifyEmailBannerRegion(page);
    await jb.open('verify-email-banner.danger');

    await expect(banner.banner).toContainText('We couldn’t deliver e-mail to');
    await expect(banner.changeEmail).toBeVisible();
  });

  test('AC4: confirming in another tab replaces the banner with a confirmation when this tab is focused again', async ({
    page,
    jb,
  }) => {
    const banner = new VerifyEmailBannerRegion(page);
    await jb.open('verify-email-banner');
    await expect(banner.banner).toBeVisible();

    await stubSession(page, { ...unconfirmedSession, emailStatus: 'confirmed' });
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));

    await expect(banner.banner).toContainText('E-mail confirmed.');
    await expect(banner.sendAgain).toHaveCount(0);
    await banner.dismiss.click();
    await expect(banner.banner).toHaveCount(0);
  });

  test('a confirmed member sees no banner', async ({ page, jb }) => {
    const banner = new VerifyEmailBannerRegion(page);
    await jb.open('browse');
    await expect(page.locator('main#main')).toBeAttached();
    await expect(banner.banner).toHaveCount(0);
  });
});

test.describe('join with Google: off, cancelled or refused (L2-003)', () => {
  test('AC5: without Google sign-in the page shows no Google button and no "or use email"', async ({
    page,
    jb,
  }) => {
    const join = new JoinPage(page);
    await jb.open('sign-up.google-unavailable');

    await expect(join.createAccount).toBeVisible();
    await expect(join.google).toHaveCount(0);
    await expect(join.divider).toHaveCount(0);
  });

  test('AC6: a visitor who cancelled at Google is back on the join page and keeps their place', async ({
    page,
    jb,
  }) => {
    const join = new JoinPage(page);
    await jb.goto('/join?error=google-cancelled&returnUrl=%2Fb%2Flegacy-financial');

    await expect(join.notice).toHaveText(
      'You didn’t finish with Google. Try again, or use your e-mail and password.',
    );
    await expect(join.notice).toHaveAttribute('role', 'status');
    await expect(join.google).toHaveAttribute(
      'href',
      '/api/auth/google/start?from=join&returnUrl=%2Fb%2Flegacy-financial',
    );
  });

  test('AC7: a refusal after starting from the join page is shown on the join page', async ({
    page,
    jb,
  }) => {
    const join = new JoinPage(page);
    await jb.open('sign-up.google-refused');

    await expect(join.notice).toHaveText(
      'Use a Google account with a confirmed e-mail, or join with e-mail.',
    );
    await expect(join.notice).toHaveAttribute('role', 'alert');
  });

  test('AC7: a failed Google sign-in is explained on the join page', async ({ page, jb }) => {
    const join = new JoinPage(page);
    await jb.goto('/join?error=google');

    await expect(join.notice).toContainText('We couldn’t sign you in with Google');
  });
});

test.describe('join with Google: the agreement (L2-003)', () => {
  test('AC1: a Google member who has not agreed is held on the agreement page', async ({
    page,
    jb,
  }) => {
    await jb.signInAs('member');
    await stubSession(page, {
      ...unconfirmedSession,
      emailStatus: 'confirmed',
      agreementRequired: true,
    });
    await jb.goto('/');
    await expect.poll(() => new JoinPage(page).dataPage()).toBe('join-agreement');
    expect(new URL(page.url()).pathname).toBe('/join/agreement');
  });

  test('AC2: continuing without ticking the box is refused; ticking it saves and goes on', async ({
    page,
    jb,
  }) => {
    await jb.signInAs('member');
    let agreed = false;
    await page.route('**/api/session', (route) =>
      route.fulfill({
        json: { ...unconfirmedSession, emailStatus: 'confirmed', agreementRequired: !agreed },
      }),
    );
    await page.route('**/api/account/agreement', (route) => {
      agreed = true;
      return route.fulfill({ status: 204 });
    });
    const join = new JoinPage(page);
    await jb.goto('/join/agreement?returnUrl=%2Fsearch%3Fq%3Dplumber');

    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(join.summary).toContainText('Agree to the statement of faith to join');

    await join.agreement.check();
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect.poll(() => new URL(page.url()).pathname).toBe('/search');
  });
});

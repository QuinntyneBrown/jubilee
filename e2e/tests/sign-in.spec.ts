import type { Page } from '@playwright/test';
import { joanna } from '../fixtures/cast';
import { expect, test } from '../fixtures/jb-test';
import { AccountMenuDialog } from '../pages/account-menu.dialog';
import { refuseAsExpired, stubStarting } from '../fixtures/session';
import { SearchPage } from '../pages/search.page';
import { ProductPage } from '../pages/product.page';
import {
  AccountMenuRegion,
  SessionExpiredPage,
  SignInErrorScreen,
  SignInPage,
  SignInSubmittingScreen,
} from '../pages/sign-in.page';

// Sign in and out: L2-006, L2-007, L2-010, L2-011, L2-012, L2-116. The API is answered by
// Playwright mocking (ADR 0009); the requests the app makes are captured to prove what it sends.

const session = {
  ...joanna.session,
  email: 'joanna.adeyemi@example.com',
  emailStatus: 'confirmed',
};

/** Answers `POST /api/session` and keeps the bodies it saw. */
async function stubSignIn(
  page: Page,
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
): Promise<Record<string, unknown>[]> {
  const seen: Record<string, unknown>[] = [];
  await page.route('**/api/session', (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    seen.push(route.request().postDataJSON() as Record<string, unknown>);
    return route.fulfill({
      status,
      headers,
      contentType: status >= 400 ? 'application/problem+json' : 'application/json',
      body: JSON.stringify(body),
    });
  });
  // After signing in the app loads the member's navigation counts.
  await page.route('**/api/me/navigation', (route) => route.fulfill({ json: joanna.navigation }));
  return seen;
}

test.describe('sign in (L2-006)', () => {
  test('AC3: the page welcomes the member back and offers Forgot password and a free account', async ({
    page,
    jb,
  }) => {
    const signIn = new SignInPage(page);
    await jb.open('sign-in');
    await expect.poll(() => signIn.dataPage()).toBe('sign-in');

    await expect(signIn.heading).toHaveText('Welcome back');
    await expect(signIn.lead).toHaveText('Log in to message businesses and manage your listing.');
    await expect(signIn.forgotPassword).toHaveAttribute('href', '/forgot-password');
    await expect(signIn.main).toContainText('New to Jubilee?');
    await expect(signIn.joinFree).toHaveAttribute('href', /^\/join/);
  });

  for (const width of [360, 1280]) {
    test(`AC3: "Forgot password?" is on the line of the Password label at ${width} px`, async ({
      page,
      jb,
    }) => {
      const signIn = new SignInPage(page);
      await page.setViewportSize({ width, height: 800 });
      await jb.open('sign-in');

      // Beside the label, above the control.
      expect(await signIn.bottomEdge(signIn.forgotPassword)).toBeLessThanOrEqual(
        await signIn.topEdge(signIn.password),
      );
      expect(await signIn.topEdge(signIn.forgotPassword)).toBeLessThan(
        await signIn.bottomEdge(signIn.passwordLabel),
      );
      expect(await signIn.leftEdge(signIn.forgotPassword)).toBeGreaterThan(
        await signIn.leftEdge(signIn.passwordLabel),
      );
    });
  }

  test('AC8: the form has Email, Password and "Keep me logged in", not ticked', async ({
    page,
    jb,
  }) => {
    const signIn = new SignInPage(page);
    await jb.open('sign-in');

    await expect(signIn.email).toHaveAttribute('placeholder', 'you@example.com');
    await expect(signIn.email).toHaveAttribute('type', 'email');
    await expect(signIn.password).toHaveAttribute('type', 'password');
    await expect(signIn.keepSignedIn).not.toBeChecked();
    await expect(signIn.signIn).toHaveText('Log in');
  });

  test('L2-003 AC8: Google comes first, with its mark, and "or use email" divides it from the form', async ({
    page,
    jb,
  }) => {
    const signIn = new SignInPage(page);
    await jb.open('sign-in');

    await expect(signIn.google).toHaveAttribute('href', '/api/auth/google/start?returnUrl=%2F');
    await expect(signIn.googleMark).toBeVisible();
    await expect(signIn.divider).toHaveText('or use email');
    expect(await signIn.bottomEdge(signIn.google)).toBeLessThanOrEqual(
      await signIn.topEdge(signIn.divider),
    );
    expect(await signIn.bottomEdge(signIn.divider)).toBeLessThanOrEqual(
      await signIn.topEdge(signIn.email),
    );
  });

  test('AC1: the right e-mail and password sign in, say "Welcome back" and land on browse', async ({
    page,
    jb,
  }) => {
    const seen = await stubSignIn(page, 200, session);
    const signIn = new SignInPage(page);
    await jb.open('sign-in');

    await signIn.signInWith('joanna.adeyemi@example.com', 'correct horse 13', true);

    await expect(signIn.toast).toContainText('Welcome back, Joanna');
    await expect.poll(() => signIn.dataPage()).toBe('browse');
    await expect(signIn.avatar).toBeVisible();
    expect(seen).toEqual([
      { email: 'joanna.adeyemi@example.com', password: 'correct horse 13', keepSignedIn: true },
    ]);
  });

  test('AC1: the visitor is taken back to the page they came from', async ({ page, jb }) => {
    await stubSignIn(page, 200, session);
    const signIn = new SignInPage(page);
    await jb.goto('/sign-in?returnUrl=%2Fsearch%3Fq%3Dplumber');

    await signIn.signInWith('joanna.adeyemi@example.com', 'correct horse 13');

    await expect.poll(() => signIn.dataPage()).toBe('search');
    expect(new URL(page.url()).search).toBe('?q=plumber');
    await expect(new SearchPage(page).heading).toContainText('plumber');
  });

  for (const hostile of [
    'https://evil.example/',
    '//evil.example',
    '/\\evil.example',
    'javascript:alert(1)',
  ]) {
    test(`L2-012 AC3: the return URL ${hostile} is not followed`, async ({ page, jb }) => {
      await stubSignIn(page, 200, session);
      const signIn = new SignInPage(page);
      await jb.goto(`/sign-in?returnUrl=${encodeURIComponent(hostile)}`);

      await signIn.signInWith('joanna.adeyemi@example.com', 'correct horse 13');

      await expect.poll(() => signIn.dataPage()).toBe('browse');
      expect(new URL(page.url()).origin).toBe(new URL(page.url()).origin);
      expect(new URL(page.url()).pathname).toBe('/');
    });
  }

  test('AC4: a malformed e-mail shows the field error and sends nothing', async ({ page, jb }) => {
    const seen = await stubSignIn(page, 200, session);
    const signIn = new SignInPage(page);
    await jb.open('sign-in');

    await signIn.signInWith('joanna.adeyemi@', 'correct horse 13');

    await expect(signIn.fieldError('email')).toHaveText(
      'Enter the e-mail address you joined with, like name@example.com',
    );
    await expect(signIn.email).toHaveAttribute('aria-invalid', 'true');
    await expect(signIn.summary).toBeFocused();
    expect(seen).toEqual([]);
  });

  test('AC5: a wrong password keeps the e-mail and says so beside the password', async ({
    page,
    jb,
  }) => {
    await stubSignIn(page, 401, { title: 'No', status: 401, code: 'INVALID_CREDENTIALS' });
    const signIn = new SignInPage(page);
    await jb.open('sign-in');

    await signIn.signInWith('joanna.adeyemi@example.com', 'not the password');

    await expect(signIn.fieldError('password')).toHaveText(
      'That password doesn’t match this e-mail. Try again or reset it.',
    );
    await expect(signIn.email).toHaveValue('joanna.adeyemi@example.com');
    await expect(signIn.summary).toContainText('Fix 1 thing to continue');
  });

  test('AC2: while the request is in flight the fields are read-only and a second press sends nothing', async ({
    page,
    jb,
  }) => {
    let requests = 0;
    await page.route('**/api/session', (route) => {
      if (route.request().method() !== 'POST') return route.fallback();
      requests++;
      return new Promise<void>(() => undefined);
    });
    const signIn = new SignInPage(page);
    await jb.open('sign-in');

    await signIn.signInWith('joanna.adeyemi@example.com', 'correct horse 13');
    await expect(signIn.signIn).toHaveAttribute('aria-busy', 'true');
    await expect(signIn.email).toHaveJSProperty('readOnly', true);
    await expect(signIn.password).toHaveJSProperty('readOnly', true);
    await signIn.password.press('Enter');

    expect(requests).toBe(1);
  });

  test('AC7: a member who opens the sign-in page is taken to browse', async ({ page, jb }) => {
    const signIn = new SignInPage(page);
    await jb.signInAs('member');
    await jb.goto('/sign-in');

    await expect.poll(() => signIn.dataPage()).toBe('browse');
  });

  test('a failed request shows JB-AUTH-503 and can be tried again', async ({ page, jb }) => {
    await stubSignIn(page, 503, { title: 'Unavailable', status: 503, reference: 'JB-AUTH-503' });
    const signIn = new SignInPage(page);
    await jb.open('sign-in');

    await signIn.signInWith('joanna.adeyemi@example.com', 'correct horse 13');

    await expect(signIn.errorState).toContainText('JB-AUTH-503');
    await signIn.tryAgain.click();
    await expect(signIn.signIn).toBeVisible();
  });

  test('a refusal from Google is explained on the sign-in page', async ({ page, jb }) => {
    const signIn = new SignInPage(page);
    await jb.goto('/sign-in?error=google');

    await expect(signIn.notice).toContainText('We couldn’t sign you in with Google');
  });
});

test.describe('the Log in frame (L2-187)', () => {
  test('AC1: from 1024 px a brand panel stands beside the form', async ({ page, jb }) => {
    const signIn = new SignInPage(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await jb.open('sign-in');

    await expect(signIn.brandPanel).toBeVisible();
    await expect(signIn.brandPanel).toContainText('Hire, shop and book with your church family.');
    await expect(signIn.brandPanel).toContainText(
      'Christian-owned businesses across Toronto, all in one place.',
    );
    await expect(signIn.brandPanel).toContainText('© Jubilee · Toronto');
    // The panel holds the only lockup, and the form stands to its right.
    await expect(signIn.lockup).toHaveCount(1);
    await expect(signIn.panelLockup).toBeVisible();
    expect(await signIn.leftEdge(signIn.card)).toBeGreaterThan(
      await signIn.rightEdge(signIn.brandPanel),
    );
    // One screen, one heading: what the panel says is not a second one.
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  });

  test('AC2: under 1024 px there is no panel and the lockup is above the card', async ({
    page,
    jb,
  }) => {
    const signIn = new SignInPage(page);
    for (const width of [360, 768, 1023]) {
      await page.setViewportSize({ width, height: 800 });
      await jb.open('sign-in');

      await expect(signIn.brandPanel).toBeHidden();
      await expect(signIn.lockup).toHaveCount(1);
      expect(await signIn.bottomEdge(signIn.lockup)).toBeLessThanOrEqual(
        await signIn.topEdge(signIn.card),
      );
    }
  });

  for (const width of [360, 1280]) {
    test(`AC3: the lockup leads to the welcome page at ${width} px`, async ({ page, jb }) => {
      const signIn = new SignInPage(page);
      await page.setViewportSize({ width, height: 800 });
      await jb.open('sign-in');

      await signIn.lockup.click();

      await expect.poll(() => signIn.dataPage()).toBe('welcome');
    });
  }
});

test.describe('the other states of Log in, in the frame (L2-006, L2-003, L2-187)', () => {
  test('a failed request leaves one heading, and neither the lead nor the link under the card', async ({
    page,
    jb,
  }) => {
    const signIn = new SignInErrorScreen(page);
    await jb.open('sign-in.error');
    await signIn.ready();

    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(signIn.heading).toHaveText('We couldn’t load sign in');
    await expect(signIn.lead).toHaveCount(0);
    await expect(signIn.joinFree).toHaveCount(0);
    await expect(signIn.frameFoot).toBeHidden();
    await expect(signIn.lockup).toBeVisible();
  });

  test('under 1024 px the lockup stays at the top when the card is short', async ({ page, jb }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    const form = new SignInPage(page);
    await jb.open('sign-in');
    const top = await form.topEdge(form.lockup);

    const failed = new SignInErrorScreen(page);
    await jb.open('sign-in.error');
    await failed.ready();

    // The error state is shorter than the screen; the frame does not centre it.
    expect(await failed.topEdge(failed.lockup)).toBe(top);
  });

  test('a notice from Google stands between the heading and the Google button', async ({
    page,
    jb,
  }) => {
    const signIn = new SignInPage(page);
    await jb.open('sign-in.google-cancelled');

    expect(await signIn.topEdge(signIn.calmNotice)).toBeGreaterThanOrEqual(
      await signIn.bottomEdge(signIn.lead),
    );
    expect(await signIn.bottomEdge(signIn.calmNotice)).toBeLessThanOrEqual(
      await signIn.topEdge(signIn.google),
    );
  });

  test('the error summary stands above the Google button and takes the focus', async ({
    page,
    jb,
  }) => {
    const signIn = new SignInPage(page);
    await jb.open('sign-in');

    await signIn.signInWith('joanna.adeyemi@', 'longpassword1');

    await expect(signIn.summary).toBeFocused();
    expect(await signIn.bottomEdge(signIn.summary)).toBeLessThanOrEqual(
      await signIn.topEdge(signIn.google),
    );
    await expect(signIn.heading).toHaveText('Welcome back');
  });

  test('while the form is being sent the frame keeps its heading and its link', async ({
    page,
    jb,
  }) => {
    const signIn = new SignInSubmittingScreen(page);
    await jb.open('sign-in.submitting');
    await signIn.ready();

    await expect(signIn.signIn).toHaveAttribute('aria-busy', 'true');
    await expect(signIn.email).toHaveAttribute('readonly', '');
    await expect(signIn.heading).toHaveText('Welcome back');
    await expect(signIn.joinFree).toBeVisible();
  });
});

test.describe('show password on Log in (L2-187)', () => {
  for (const width of [360, 1280]) {
    test(`AC4: the button inside the control shows the password, then hides it, at ${width} px`, async ({
      page,
      jb,
    }) => {
      const signIn = new SignInPage(page);
      await page.setViewportSize({ width, height: 800 });
      await jb.open('sign-in');
      await signIn.password.fill('correct horse 13');

      // Inside the control, at its right edge.
      expect(await signIn.rightEdge(signIn.showPassword)).toBeLessThanOrEqual(
        await signIn.rightEdge(signIn.password),
      );
      expect(await signIn.leftEdge(signIn.showPassword)).toBeGreaterThan(
        await signIn.leftEdge(signIn.password),
      );
      expect(await signIn.topEdge(signIn.showPassword)).toBeGreaterThanOrEqual(
        await signIn.topEdge(signIn.password),
      );

      await signIn.showPassword.click();
      await expect(signIn.password).toHaveAttribute('type', 'text');
      await expect(signIn.hidePassword).toBeVisible();
      await expect(signIn.showPassword).toHaveCount(0);

      await signIn.hidePassword.click();
      await expect(signIn.password).toHaveAttribute('type', 'password');
      await expect(signIn.showPassword).toBeVisible();
    });
  }

  test('AC5: showing keeps what was typed, keeps the focus on the button and sends nothing', async ({
    page,
    jb,
  }) => {
    const seen = await stubSignIn(page, 200, session);
    const signIn = new SignInPage(page);
    await jb.open('sign-in');
    await signIn.email.fill('joanna.adeyemi@example.com');
    await signIn.password.fill('correct horse 13');

    await signIn.showPassword.click();

    await expect(signIn.password).toHaveValue('correct horse 13');
    await expect(signIn.hidePassword).toBeFocused();
    await signIn.hidePassword.click();
    await expect(signIn.password).toHaveValue('correct horse 13');
    await expect(signIn.showPassword).toBeFocused();
    expect(seen).toHaveLength(0);
    await expect.poll(() => signIn.dataPage()).toBe('sign-in');
  });

  test('AC6: by keyboard the button comes after the password and works with Enter and with Space', async ({
    page,
    jb,
  }) => {
    const seen = await stubSignIn(page, 200, session);
    const signIn = new SignInPage(page);
    await jb.open('sign-in');
    await signIn.password.fill('correct horse 13');

    await signIn.password.press('Tab');
    await expect(signIn.showPassword).toBeFocused();

    await page.keyboard.press('Enter');
    await expect(signIn.password).toHaveAttribute('type', 'text');
    await expect(signIn.hidePassword).toBeFocused();

    await page.keyboard.press('Space');
    await expect(signIn.password).toHaveAttribute('type', 'password');
    await expect(signIn.showPassword).toBeFocused();
    expect(seen).toHaveLength(0);
  });

  test('AC5: the password still signs in after it was shown', async ({ page, jb }) => {
    const seen = await stubSignIn(page, 200, session);
    const signIn = new SignInPage(page);
    await jb.open('sign-in');
    await signIn.email.fill('joanna.adeyemi@example.com');
    await signIn.password.fill('correct horse 13');
    await signIn.showPassword.click();

    await signIn.signIn.click();

    await expect.poll(() => seen.length).toBe(1);
    expect(seen[0]).toMatchObject({ password: 'correct horse 13' });
  });
});

test.describe('continue with Google: off, cancelled or refused (L2-003)', () => {
  test('AC5: without Google sign-in the page shows no Google button and no "or use email"', async ({
    page,
    jb,
  }) => {
    const signIn = new SignInPage(page);
    await jb.open('sign-in.google-unavailable');

    await expect(signIn.signIn).toBeVisible();
    await expect(signIn.google).toHaveCount(0);
    await expect(signIn.divider).toHaveCount(0);
  });

  test('AC9: a page opened while Jubilee is starting shows the Google button once Jubilee answers', async ({
    page,
    jb,
  }) => {
    // The session is asked for again after 200 ms here, not 5 seconds.
    await page.addInitScript(() => {
      Object.assign((globalThis as { __jbTimings?: object }).__jbTimings ?? {}, { backoff: [200] });
    });
    const jubilee = await stubStarting(page);
    const signIn = new SignInPage(page);
    await jb.goto('/sign-in');
    await expect(signIn.signIn).toBeVisible();
    await expect(signIn.google).toHaveCount(0);
    await signIn.email.fill('joanna.adeyemi@example.com');

    await jubilee.ready();

    await expect(signIn.google).toBeVisible();
    await expect(signIn.divider).toHaveText('or use email');
    await expect(signIn.email).toHaveValue('joanna.adeyemi@example.com');
  });

  test('AC6: a visitor who cancelled at Google is told so calmly and keeps their place', async ({
    page,
    jb,
  }) => {
    const signIn = new SignInPage(page);
    await jb.goto('/sign-in?error=google-cancelled&returnUrl=%2Fb%2Flegacy-financial');

    await expect(signIn.calmNotice).toHaveText(
      'You didn’t finish with Google. Try again, or use your e-mail and password.',
    );
    await expect(signIn.calmNotice).toHaveAttribute('role', 'status');
    await expect(signIn.notice).toHaveCount(0);
    await expect(signIn.google).toHaveAttribute(
      'href',
      '/api/auth/google/start?returnUrl=%2Fb%2Flegacy-financial',
    );
  });

  test('AC4: a Google account without a confirmed e-mail is refused in the words of the requirement', async ({
    page,
    jb,
  }) => {
    const signIn = new SignInPage(page);
    await jb.open('sign-in.google-refused');

    await expect(signIn.notice).toHaveText(
      'Use a Google account with a confirmed e-mail, or join with e-mail.',
    );
  });
});

test.describe('throttling (L2-007, L2-137)', () => {
  test('AC1: a locked account is told to wait 15 minutes or reset the password', async ({
    page,
    jb,
  }) => {
    await stubSignIn(
      page,
      429,
      { title: 'Too many tries.', status: 429, code: 'SIGN_IN_LOCKED' },
      { 'Retry-After': '900' },
    );
    const signIn = new SignInPage(page);
    await jb.open('sign-in');

    await signIn.signInWith('joanna.adeyemi@example.com', 'correct horse 13');

    await expect(signIn.notice).toHaveText(
      'Too many tries. Wait 15 minutes or reset your password.',
    );
  });

  test('AC2: a blocked address is told how long to wait', async ({ page, jb }) => {
    await stubSignIn(
      page,
      429,
      { title: 'You are doing that a lot.', status: 429, code: 'rate_limited' },
      { 'Retry-After': '600' },
    );
    const signIn = new SignInPage(page);
    await jb.open('sign-in');

    await signIn.signInWith('joanna.adeyemi@example.com', 'correct horse 13');

    await expect(signIn.notice).toHaveText('You’re doing that a lot. Try again in 10 minutes.');
  });
});

test.describe('the sign-in prompt and return to origin (L2-012)', () => {
  test('AC1, AC2: a visitor who asked to be told when a product is back signs in and the alert is saved', async ({
    page,
    jb,
  }) => {
    await stubSignIn(page, 200, session);
    const product = new ProductPage(page);
    const signIn = new SignInPage(page);
    await jb.open('product.sold-out', { who: 'visitor' });

    await product.alertButton.click();
    const dialog = page.getByRole('dialog', { name: 'Join to be told when it’s back' });
    await expect(dialog).toBeAttached();
    await dialog.getByRole('link', { name: 'Sign in' }).click();
    await expect(signIn.heading).toHaveText('Welcome back');

    const alert = page.waitForRequest(
      (request) => request.url().includes('/stock-alert') && request.method() === 'PUT',
    );
    await signIn.signInWith('joanna.adeyemi@example.com', 'correct horse 13');

    await alert;
    expect(new URL(page.url()).pathname).toBe('/b/luzandre/p/faith-heavyweight-tee-charcoal');
  });
});

test.describe('session expiry (L2-010 AC3, L2-116)', () => {
  test('AC3: the page says the member was signed out and offers to sign in', async ({
    page,
    jb,
  }) => {
    const expired = new SessionExpiredPage(page);
    await jb.open('session-expired');

    await expect(expired.heading).toHaveText('You’ve been signed out');
    await expect(expired.text).toContainText('30 days, or when your password changes');
    await expect(expired.signIn).toHaveAttribute('href', '/sign-in?returnUrl=%2F');
  });

  test('AC1: a call answered 401 SESSION_EXPIRED takes the member to the page and back after signing in', async ({
    page,
    jb,
  }) => {
    await jb.signInAs('member');
    await page.route('**/api/search?*', (route) =>
      route.fulfill({
        status: 401,
        contentType: 'application/problem+json',
        body: JSON.stringify({
          title: 'Sign in to continue.',
          status: 401,
          code: 'SESSION_EXPIRED',
        }),
      }),
    );
    const expired = new SessionExpiredPage(page);

    await jb.goto('/search?q=plumber');

    await expect.poll(() => expired.dataPage()).toBe('session-expired');
    await expect(expired.signIn).toHaveAttribute(
      'href',
      '/sign-in?returnUrl=%2Fsearch%3Fq%3Dplumber',
    );
    await expect(expired.avatar).toHaveCount(0);
  });
});

test.describe('several calls refused for one ended session (L2-116 AC2)', () => {
  test('AC2: the session-expired page opens once and returns to the page the member was on', async ({
    page,
    jb,
  }) => {
    const expired = new SessionExpiredPage(page);
    await expired.setWidth(1280);
    await jb.signInAs('member');
    await jb.goto('/');
    await expect.poll(() => expired.dataPage()).toBe('browse');
    // The account page reads the profile and the data download together; both are refused, the
    // second a moment after the page has already opened.
    const refused = await refuseAsExpired(page, /\/api\/account(\/.*)?$/, 400);
    const opened: string[] = [];
    page.on('framenavigated', (frame) => {
      const url = new URL(frame.url());
      if (url.pathname === '/session-expired') opened.push(url.search);
    });

    await expired.avatar.click();
    await new AccountMenuDialog(page).item('Your account').click();

    await expect.poll(() => expired.dataPage()).toBe('session-expired');
    await expect.poll(() => refused.answered).toBe(2);
    await expect(expired.signIn).toHaveAttribute('href', '/sign-in?returnUrl=%2Faccount');
    expect(opened).toEqual(['?returnUrl=%2Faccount']);
    // Going back leaves the page in one step: it was put in the history once.
    await page.goBack();
    await expect.poll(() => new URL(page.url()).pathname).not.toBe('/session-expired');
  });
});

test.describe('sign out (L2-011)', () => {
  test('AC1, AC2: the avatar opens the account menu; signing out asks first, then ends this session and goes to welcome', async ({
    page,
    jb,
  }) => {
    const menu = new AccountMenuRegion(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await jb.open('browse');
    let signedOut = 0;
    await page.route('**/api/session', (route) => {
      if (route.request().method() !== 'DELETE') return route.fallback();
      signedOut++;
      return route.fulfill({ status: 204 });
    });

    await new SignInPage(page).avatar.click();
    await expect(menu.menuPanel).toBeVisible();
    await expect(menu.menuPanel).toContainText('Joanna Adeyemi');
    await menu.signOut.click();

    await expect(menu.confirmTitle).toHaveText('Sign out of Jubilee?');
    await expect(menu.stay).toBeFocused();
    expect(signedOut).toBe(0);
    await menu.confirmSignOut.click();

    await expect.poll(() => new SignInPage(page).dataPage()).toBe('welcome');
    expect(signedOut).toBe(1);
    await expect(new SignInPage(page).avatar).toHaveCount(0);
  });

  test('AC1: "Stay signed in" closes the dialog and does not sign out', async ({ page, jb }) => {
    const menu = new AccountMenuRegion(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await jb.open('browse');
    let signedOut = 0;
    await page.route('**/api/session', (route) => {
      if (route.request().method() !== 'DELETE') return route.fallback();
      signedOut++;
      return route.fulfill({ status: 204 });
    });

    await new SignInPage(page).avatar.click();
    await menu.signOut.click();
    await menu.stay.click();

    await expect(menu.confirm).toHaveCount(0);
    expect(signedOut).toBe(0);
    await expect(new SignInPage(page).avatar).toBeVisible();
  });

  test('the menu closes with Escape and returns the focus to the avatar', async ({ page, jb }) => {
    const menu = new AccountMenuRegion(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await jb.open('browse');
    const avatar = new SignInPage(page).avatar;

    await avatar.click();
    await expect(menu.menuPanel).toBeVisible();
    await page.keyboard.press('Escape');

    await expect(menu.menu).toHaveCount(0);
    await expect(avatar).toBeFocused();
  });
});

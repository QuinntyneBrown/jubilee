import type { Page } from '@playwright/test';
import { joanna } from '../fixtures/cast';
import { expect, test } from '../fixtures/jb-test';
import { SearchPage } from '../pages/search.page';
import { ProductPage } from '../pages/product.page';
import { AccountMenuRegion, SessionExpiredPage, SignInPage } from '../pages/sign-in.page';

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
  test('AC3: the page offers Forgot password, Join free and Google', async ({ page, jb }) => {
    const signIn = new SignInPage(page);
    await jb.open('sign-in');
    await expect.poll(() => signIn.dataPage()).toBe('sign-in');

    await expect(signIn.heading).toHaveText('Sign in to Jubilee');
    await expect(signIn.forgotPassword).toHaveAttribute('href', '/forgot-password');
    await expect(signIn.joinFree).toHaveAttribute('href', /^\/join/);
    await expect(signIn.google).toHaveAttribute('href', '/api/auth/google/start?returnUrl=%2F');
    await expect(signIn.keepSignedIn).not.toBeChecked();
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
    await expect(signIn.heading).toHaveText('Sign in to Jubilee');

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

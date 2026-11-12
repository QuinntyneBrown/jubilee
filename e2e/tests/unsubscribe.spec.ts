import { expect, test } from '../fixtures/jb-test';
import { stubUnsubscribe } from '../fixtures/unsubscribe';
import { UnsubscribePage } from '../pages/unsubscribe.page';

test.describe('unsubscribe page (L2-224)', () => {
  test('AC1: opening the link turns the category off without signing in, says what stops, and the token leaves the address bar', async ({
    page,
    jb,
  }) => {
    const unsubscribe = new UnsubscribePage(page);
    const fake = await stubUnsubscribe(page, 'messages');
    await jb.goto('/unsubscribe/the-token');

    await expect(unsubscribe.heading).toHaveText('You’re unsubscribed');
    await expect(unsubscribe.status).toContainText(
      'We won’t e-mail you about new messages any more. They still reach you in Jubilee.',
    );
    await expect(unsubscribe.text).toContainText(
      'We always e-mail you about sign-in and security, whatever you choose.',
    );
    await expect(page).toHaveURL(/\/unsubscribe$/);
    expect(fake.posted).toEqual(['the-token']);
    await expect(unsubscribe.settings).toHaveAttribute('href', '/account/notifications');
    await expect(unsubscribe.browse).toHaveAttribute('href', '/');
  });

  for (const [category, says] of [
    ['requests', 'We won’t e-mail you about request updates any more.'],
    ['reminders', 'We won’t e-mail you meeting reminders any more.'],
    ['new-businesses', 'We won’t send you the weekly note about new businesses any more.'],
    ['tips', 'We won’t send you tips for business owners any more.'],
  ] as const) {
    test(`AC1: the page names what stops for "${category}"`, async ({ page, jb }) => {
      const unsubscribe = new UnsubscribePage(page);
      await stubUnsubscribe(page, category);
      await jb.goto('/unsubscribe/a-token');

      await expect(unsubscribe.text).toContainText(says);
    });
  }

  test('AC2: the link of a daily summary says both switches are off', async ({ page, jb }) => {
    const unsubscribe = new UnsubscribePage(page);
    await stubUnsubscribe(page, 'summary');
    await jb.goto('/unsubscribe/summary-token');

    await expect(unsubscribe.heading).toHaveText('You’re unsubscribed');
    await expect(unsubscribe.text).toContainText(
      'We won’t send you the daily summary any more: “New messages” and “Request updates” are now off.',
    );
  });

  test('AC3: a link that does not verify changes nothing and says so', async ({ page, jb }) => {
    const unsubscribe = new UnsubscribePage(page);
    await stubUnsubscribe(page, 'invalid');
    await jb.goto('/unsubscribe/not-a-token');

    await expect(unsubscribe.heading).toHaveText('This link doesn’t work');
    await expect(unsubscribe.text).toContainText('Nothing has changed.');
    await expect(unsubscribe.settings).toBeVisible();
    await expect(unsubscribe.errorState).toHaveCount(0);
  });

  test('AC4: a request that fails quotes JB-PREF-503, and "Try again" unsubscribes', async ({
    page,
    jb,
  }) => {
    const unsubscribe = new UnsubscribePage(page);
    const fake = await stubUnsubscribe(page, 'fails');
    await jb.goto('/unsubscribe/the-token');

    await expect(unsubscribe.errorState).toContainText('We couldn’t unsubscribe you');
    await expect(unsubscribe.reference).toHaveText('JB-PREF-503');

    fake.answer = 'tips';
    await unsubscribe.tryAgain.click();

    await expect(unsubscribe.heading).toHaveText('You’re unsubscribed');
    expect(fake.posted).toEqual(['the-token', 'the-token']);
  });

  test('while the answer is on its way the page says so', async ({ page, jb }) => {
    const unsubscribe = new UnsubscribePage(page);
    await stubUnsubscribe(page, 'pending');
    await jb.goto('/unsubscribe/the-token');

    await expect(unsubscribe.heading).toHaveText('Unsubscribing you…');
  });

  test('the page works from the keyboard: Tab reaches "Notification settings"', async ({
    page,
    jb,
  }) => {
    const unsubscribe = new UnsubscribePage(page);
    await stubUnsubscribe(page, 'messages');
    await jb.goto('/unsubscribe/the-token');
    await expect(unsubscribe.heading).toHaveText('You’re unsubscribed');

    await unsubscribe.settings.focus();
    await expect(unsubscribe.settings).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(unsubscribe.browse).toBeFocused();
  });
});

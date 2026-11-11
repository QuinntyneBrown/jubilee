import { expect, test } from '../fixtures/jb-test';
import { stubMessaging } from '../fixtures/messaging';
import { goOffline, goOnline, restoreJubilee, waitForSnapshot } from '../fixtures/offline';
import { BrowsePage } from '../pages/browse.page';
import { ConnectionBannerRegion } from '../pages/connection-banner';
import { ConversationPage, MessagesPage } from '../pages/messages.page';
import { OfflinePage } from '../pages/offline.page';

// Use Jubilee offline: L2-119 to L2-122. The network is cut at the page's edge (fixtures/offline.ts);
// the API is answered by Playwright mocking (ADR 0009) and the requests it receives are kept.

test.describe('the connection banner (L2-121)', () => {
  test('AC1: going offline says so at once and offers no dismiss', async ({ page, jb }) => {
    const banner = new ConnectionBannerRegion(page);
    await jb.open('messages');
    await expect(banner.root).toHaveCount(0);

    await goOffline(page);

    await expect(banner.root).toContainText('You’re offline.');
    await expect(banner.dismiss).toHaveCount(0);
    await expect(banner.tryAgain).toBeVisible();
  });

  test('AC1: the connection returning says so, and the notice can be dismissed', async ({
    page,
    jb,
  }) => {
    const banner = new ConnectionBannerRegion(page);
    await jb.open('messages');
    await goOffline(page);
    await expect(banner.root).toContainText('You’re offline.');

    await goOnline(page);

    await expect(banner.root).toContainText('You’re back online.');
    await banner.dismiss.click();
    await expect(banner.root).toHaveCount(0);
  });

  test('AC2: when Jubilee cannot be reached the banner says it is on our side, with a countdown and the status page', async ({
    page,
    jb,
  }) => {
    const banner = new ConnectionBannerRegion(page);
    await jb.open('messages');
    await goOffline(page);
    await goOnline(page, 'down');

    await expect(banner.root).toContainText('We can’t reach Jubilee.');
    await expect(banner.root).toContainText('This is on our side.');
    await expect(banner.root).toContainText(/Trying again in \d+ seconds?\./);
    await expect(banner.checkStatus).toHaveAttribute('href', /^https:\/\//);
    await expect(banner.dismiss).toHaveCount(0);
  });

  test('AC3: the banner clears when Jubilee answers again', async ({ page, jb }) => {
    const banner = new ConnectionBannerRegion(page);
    await jb.open('messages');
    await goOffline(page);
    await goOnline(page, 'down');
    await expect(banner.root).toContainText('We can’t reach Jubilee.');

    await restoreJubilee(page);
    await banner.checkStatus.evaluate(() => window.dispatchEvent(new Event('online')));

    await expect(banner.root).toContainText('You’re back online.');
  });
});

test.describe('pages offline (L2-119, L2-122)', () => {
  test('L2-119 AC1: the directory last loaded is shown, and the banner says when it was saved', async ({
    page,
    jb,
  }) => {
    const browse = new BrowsePage(page);
    const banner = new ConnectionBannerRegion(page);
    await browse.setWidth(1280);
    await stubMessaging(page);
    await jb.open('browse');
    await expect(browse.featuredCards.first()).toBeVisible();
    await waitForSnapshot(page, 'browse-home');
    await browse.primaryNav.getByRole('link', { name: 'Messages' }).click();
    await expect(page.locator('body')).toHaveAttribute('data-page', 'messages');

    await goOffline(page);
    await browse.brand.click();

    await expect(browse.featuredCards.first()).toBeVisible();
    await expect(banner.root).toContainText(/Showing the directory saved at \d+:\d\d [ap]\.m\./);
    await expect(browse.searchBox).toBeDisabled();
  });

  test('L2-122 AC1: a page that cannot load shows the offline page, which says what still works', async ({
    page,
    jb,
  }) => {
    const offline = new OfflinePage(page);
    const browse = new BrowsePage(page);
    const messages = new MessagesPage(page);
    await jb.open('messages');
    await expect(messages.list.rows).toHaveCount(4);
    await goOffline(page);

    await browse.brand.click();

    await expect(offline.heading).toHaveText('You’re offline');
    await expect(offline.text).toContainText('Messages you already opened are still readable');
    await expect(offline.openMessages).toBeVisible();
  });

  test('L2-122 AC2: when the connection returns the offline page opens the page that was asked for', async ({
    page,
    jb,
  }) => {
    const offline = new OfflinePage(page);
    const browse = new BrowsePage(page);
    const messages = new MessagesPage(page);
    await jb.open('messages');
    await expect(messages.list.rows).toHaveCount(4);
    await goOffline(page);
    await browse.brand.click();
    await expect(offline.heading).toHaveText('You’re offline');

    await goOnline(page);

    await expect(page.locator('body')).toHaveAttribute('data-page', 'browse');
  });

  test('L2-122 AC3: what needs a connection is disabled and says why', async ({ page, jb }) => {
    const browse = new BrowsePage(page);
    await browse.setWidth(1280);
    await jb.open('browse');
    await expect(browse.searchBox).toBeEnabled();

    await goOffline(page);

    await expect(browse.searchBox).toBeDisabled();
    await expect(browse.searchBox).toHaveAttribute('title', /needs a connection/i);
  });
});

test.describe('messages written offline (L2-120)', () => {
  test('AC1: a message written offline waits on the device and is sent when the connection returns', async ({
    page,
    jb,
  }) => {
    const conversation = new ConversationPage(page);
    const banner = new ConnectionBannerRegion(page);
    await jb.signInAs('member');
    const fake = await stubMessaging(page);
    await jb.goto('/messages/c-legacy');
    await conversation.ready();
    await expect(conversation.bubbles).toHaveCount(3);

    await goOffline(page);
    await conversation.composer.fill('Should I bring last year’s tax return?');
    await conversation.send.click();

    await expect(conversation.bubble('tax return').status).toHaveText('Waiting to send');
    expect(fake.sends).toEqual([]);

    await goOnline(page);

    await expect(banner.root).toContainText('You’re back online. 1 saved message was sent.');
    await expect(conversation.bubble('tax return').time).not.toContainText('Waiting to send');
    expect(fake.sends.map((s) => s.body)).toEqual(['Should I bring last year’s tax return?']);
  });

  test('AC2: several messages are sent in the order they were written, each once', async ({
    page,
    jb,
  }) => {
    const conversation = new ConversationPage(page);
    await jb.signInAs('member');
    const fake = await stubMessaging(page);
    await jb.goto('/messages/c-legacy');
    await conversation.ready();
    await expect(conversation.bubbles).toHaveCount(3);

    await goOffline(page);
    for (const text of ['First', 'Second', 'Third']) {
      await conversation.composer.fill(text);
      await conversation.send.click();
    }
    await goOnline(page);

    await expect.poll(() => fake.sends.length).toBe(3);
    expect(fake.sends.map((s) => s.body)).toEqual(['First', 'Second', 'Third']);
    expect(new Set(fake.sends.map((s) => s.idempotencyKey)).size).toBe(3);
  });

  test('AC3: a message the server refuses is shown as not sent, with a way to try again or delete it', async ({
    page,
    jb,
  }) => {
    const conversation = new ConversationPage(page);
    await jb.signInAs('member');
    await stubMessaging(page);
    await jb.goto('/messages/c-legacy');
    await conversation.ready();
    await expect(conversation.bubbles).toHaveCount(3);
    await goOffline(page);
    await conversation.composer.fill('Too late');
    await conversation.send.click();
    await expect(conversation.bubble('Too late').status).toHaveText('Waiting to send');
    await page.route('**/api/conversations/c-legacy/messages', (route) =>
      route.fulfill({
        status: 422,
        contentType: 'application/problem+json',
        body: JSON.stringify({ title: 'Problem', status: 422, code: 'invalid' }),
      }),
    );

    await goOnline(page);

    const bubble = conversation.bubble('Too late');
    await expect(bubble.time).toContainText('Not sent.');
    await expect(bubble.tryAgain).toBeVisible();
    await bubble.delete.click();
    await expect(conversation.bubbles.filter({ hasText: 'Too late' })).toHaveCount(0);
  });

  test('AC4: a conversation already opened can still be read offline', async ({ page, jb }) => {
    const conversation = new ConversationPage(page);
    await jb.signInAs('member');
    await stubMessaging(page);
    await jb.goto('/messages/c-legacy');
    await conversation.ready();
    await expect(conversation.bubbles).toHaveCount(3);
    await waitForSnapshot(page, 'conversation:c-legacy');
    await conversation.backLink.click();
    await expect(conversation.list.rows).toHaveCount(4);

    await goOffline(page);
    await conversation.list.row('Legacy Financial').click();

    await expect(conversation.heading).toHaveText('Legacy Financial');
    await expect(conversation.bubbles).toHaveCount(3);
  });
});

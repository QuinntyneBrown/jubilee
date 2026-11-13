import { expect, test } from '../fixtures/jb-test';
import { stubMessaging } from '../fixtures/messaging';
import {
  INSTALLED_APP_URL,
  answerWorkerSends,
  deviceOffline,
  fireOutboxSync,
  goOffline,
  goOnline,
  savedOnDevice,
  waitForAppShell,
  waitForSnapshot,
} from '../fixtures/offline';
import { BrowsePage } from '../pages/browse.page';
import { ConnectionBannerRegion } from '../pages/connection-banner';
import { ConversationPage } from '../pages/messages.page';

// The installed app (L2-119 AC3, L2-120 AC5, ADR 0068): the production build with its service
// worker, served on its own port. The worker leaves /api to the network, so the page is answered
// by Playwright mocking as in every other spec (ADR 0009).

test.describe('the installed app (L2-119 AC3)', () => {
  // The worker installs the app shell in the background before the device can go offline.
  test.describe.configure({ timeout: 120_000 });

  for (const who of ['visitor', 'member'] as const) {
    test(`Jubilee opens with no connection and shows the directory saved last, for a ${who}`, async ({
      page,
      jb,
    }) => {
      const browse = new BrowsePage(page);
      const banner = new ConnectionBannerRegion(page);
      await browse.setWidth(1280);
      await jb.signInAs(who);
      await jb.goto(`${INSTALLED_APP_URL}/`);
      await expect(browse.featuredCards.first()).toBeVisible();
      await waitForSnapshot(page, 'browse-home');
      await waitForAppShell(page);

      await deviceOffline(page);
      await page.reload();

      await expect(browse.featuredCards.first()).toBeVisible();
      await expect(banner.root).toContainText(/Showing the directory saved at \d+:\d\d [ap]\.m\./);
      // Nothing else the page reads replaces it with the offline page.
      await page.waitForTimeout(1_000);
      await expect(page.locator('body')).toHaveAttribute('data-page', 'browse');
    });
  }

  test('a member who opens Jubilee with no connection is still signed in and reads the conversations saved', async ({
    page,
    jb,
  }) => {
    const conversation = new ConversationPage(page);
    const banner = new ConnectionBannerRegion(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await jb.signInAs('member');
    await stubMessaging(page);
    await jb.goto(`${INSTALLED_APP_URL}/messages/c-legacy`);
    await conversation.ready();
    await expect(conversation.bubbles).toHaveCount(3);
    await waitForSnapshot(page, 'conversation:c-legacy');
    await waitForAppShell(page);

    await deviceOffline(page);
    await page.reload();

    await expect(conversation.heading).toHaveText('Legacy Financial');
    await expect(conversation.bubbles).toHaveCount(3);
    await expect(banner.root).toContainText('You’re offline.');
  });
});

test.describe('Background Sync (L2-120 AC5)', () => {
  test.describe.configure({ timeout: 120_000 });

  test('a message written offline is sent by the service worker when the connection returns while Jubilee is closed', async ({
    page,
    context,
    jb,
  }) => {
    const conversation = new ConversationPage(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await jb.signInAs('member');
    await stubMessaging(page);
    // The device clock is the real one: the worker, which no test clock reaches, compares with it.
    await jb.goto(`${INSTALLED_APP_URL}/messages/c-legacy`, 'light', new Date());
    await conversation.ready();
    await expect(conversation.bubbles).toHaveCount(3);
    await waitForAppShell(page);
    const sends = await answerWorkerSends(context);

    await deviceOffline(page);
    await conversation.composer.fill('Running ten minutes late');
    await conversation.send.click();
    await expect(conversation.bubble('Running ten minutes late').status).toHaveText(
      'Waiting to send',
    );
    // Jubilee is closed; the device finds its connection again and the browser fires the sync.
    const other = await context.newPage();
    await page.close();
    await context.setOffline(false);
    await fireOutboxSync(context, other, INSTALLED_APP_URL);

    await expect.poll(() => sends.map((send) => send.body)).toEqual(['Running ten minutes late']);
    expect(sends[0].conversationId).toBe('c-legacy');
    expect(sends[0].idempotencyKey).toBeTruthy();
    // Nothing is left waiting on the device.
    await other.goto(`${INSTALLED_APP_URL}/jubilee-icon.svg`);
    await expect.poll(() => savedOnDevice(other).then((saved) => saved.queued)).toBe(0);
  });

  test('with Jubilee open, what the service worker sent leaves the queue and the page does not send it again', async ({
    page,
    context,
    jb,
  }) => {
    const conversation = new ConversationPage(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await jb.signInAs('member');
    const fake = await stubMessaging(page);
    await jb.goto(`${INSTALLED_APP_URL}/messages/c-legacy`, 'light', new Date());
    await conversation.ready();
    await expect(conversation.bubbles).toHaveCount(3);
    await waitForAppShell(page);
    const sends = await answerWorkerSends(context);
    await goOffline(page);
    await conversation.composer.fill('Is the side door open?');
    await conversation.send.click();
    const waiting = conversation.bubble('Is the side door open?').status;
    await expect(waiting).toHaveText('Waiting to send');

    await fireOutboxSync(context, page, INSTALLED_APP_URL);

    await expect.poll(() => sends.map((send) => send.body)).toEqual(['Is the side door open?']);
    await expect(waiting).toHaveCount(0);
    await goOnline(page);
    await expect(new ConnectionBannerRegion(page).root).toContainText('You’re back online.');
    expect(fake.sends).toEqual([]);
  });
});

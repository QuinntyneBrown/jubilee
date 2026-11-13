import { expect, test } from '../fixtures/jb-test';
import {
  BACK_IN_STOCK,
  FakeNotification,
  NOTIFICATIONS,
  stubNotifications,
} from '../fixtures/notifications';
import { NotificationsPage } from '../pages/notifications.page';
import { Toasts } from '../pages/toasts';

const CONFIRMED = 'Legacy Financial confirmed your meeting';
const MESSAGE = 'New message from WaterWorks Plumbing & Drains';

/** A notification that arrives over the stream. */
const arrival = (title: string): FakeNotification => ({
  id: crypto.randomUUID(),
  kind: 'request',
  title,
  detail: '',
  target: '/requests/r2',
  at: '2026-11-10T14:30:00Z',
  read: false,
});

test.describe('stay notified (L2-064 to L2-070)', () => {
  test('L2-064: the list shows what happened, unread first marked, with the count in the bell', async ({
    page,
    jb,
  }) => {
    const centre = new NotificationsPage(page);
    await stubNotifications(page);
    await jb.goto('/notifications');

    await expect(centre.heading).toHaveText('Notifications');
    await expect(centre.items).toHaveCount(5);
    await expect(centre.unread()).toHaveCount(3);
    await expect(centre.item(CONFIRMED)).toContainText('Unread.');
    await expect(centre.notifications).toHaveAccessibleName('Notifications, 3 unread');
    await expect(centre.settings).toHaveAttribute('href', '/account/notifications');
  });

  test('L2-064: mark all as read clears the markers and the bell', async ({ page, jb }) => {
    const centre = new NotificationsPage(page);
    const fake = await stubNotifications(page);
    await jb.goto('/notifications');

    await centre.markAll.click();
    await expect(centre.unread()).toHaveCount(0);
    await expect(centre.markAll).toHaveCount(0);
    await expect(centre.notifications).toHaveAccessibleName('Notifications');
    expect(fake.allRead).toBe(1);
  });

  test('L2-064: opening a notification marks it read and goes to its page', async ({
    page,
    jb,
  }) => {
    const centre = new NotificationsPage(page);
    const fake = await stubNotifications(page);
    await page.route('**/api/requests/r1', (route) => route.fulfill({ status: 404, json: {} }));
    await jb.goto('/notifications');

    await centre.link(CONFIRMED).click();
    await expect(page).toHaveURL(/\/requests\/r1$/);
    expect(fake.opened).toEqual([NOTIFICATIONS[0].id]);
  });

  test('L2-064: with nothing to show the page says so', async ({ page, jb }) => {
    const centre = new NotificationsPage(page);
    await stubNotifications(page, { items: [] });
    await jb.goto('/notifications');

    await expect(centre.empty).toContainText('No notifications yet');
    await expect(centre.markAll).toHaveCount(0);
  });

  test('L2-064: when the list cannot load the page says so, quotes the reference and can try again', async ({
    page,
    jb,
  }) => {
    const centre = new NotificationsPage(page);
    const fake = await stubNotifications(page, { list: 'fails' });
    await jb.goto('/notifications');

    await expect(centre.empty).toContainText('We couldn’t load your notifications');
    await expect(centre.reference).toHaveText('JB-NTF-503');

    fake.list = 'ok';
    await centre.tryAgain.click();
    await expect(centre.items).toHaveCount(5);
  });

  test('L2-070: a notification that arrives is shown as a toast once, even after a reconnect', async ({
    page,
    jb,
  }) => {
    const centre = new NotificationsPage(page);
    const toasts = new Toasts(page);
    const fake = await stubNotifications(page);
    await jb.goto('/notifications');
    await expect(centre.items).toHaveCount(5);

    fake.push({
      id: 'c3000000-0000-4000-8000-0000000000aa',
      kind: 'message',
      title: 'New message from Grace Bakery',
      detail: 'Your cake is ready.',
      target: '/messages/m9',
      at: '2026-11-10T14:30:00Z',
      read: false,
    });

    const toast = toasts.withTitle('New message from Grace Bakery');
    await expect(toast).toBeVisible();
    await expect(toasts.action(toast, 'Open conversation')).toBeVisible();
    await expect(centre.items).toHaveCount(6);

    // The browser asks again; the same event is sent again and must not repeat the toast.
    await toasts.dismiss(toast).click();
    await expect.poll(() => fake.lastEventIds.length).toBeGreaterThan(2);
    await expect(toast).toHaveCount(0);
  });

  test('L2-070 AC4: when the browser has given up on the stream, the app opens it again after 5 seconds, from the last event', async ({
    page,
    jb,
  }) => {
    const toasts = new Toasts(page);
    const fake = await stubNotifications(page, { items: [] });
    await jb.goto('/notifications');
    fake.push(arrival('First update'));
    const first = toasts.withTitle('First update');
    await expect(first).toBeVisible();
    await toasts.dismiss(first).click();
    await page.clock.install();

    // The server refuses the stream: the browser stops asking.
    fake.stream = 'refused';
    await expect.poll(() => fake.refusals).toBeGreaterThan(0);
    const asked = fake.lastEventIds.length;
    fake.stream = 'ok';
    fake.push(arrival('Second update'));

    await page.clock.runFor(3_500);
    expect(fake.refusals).toBe(1);
    expect(fake.lastEventIds).toHaveLength(asked);

    await page.clock.runFor(2_000);
    await expect(toasts.withTitle('Second update')).toBeVisible();
    // It asked for what came after the last event it had, so nothing is shown twice.
    expect(fake.lastEventIds[asked]).toBe('1001');
    await expect(first).toHaveCount(0);
  });

  test('L2-070 AC4: the app opens the stream again at once when the device is online again', async ({
    page,
    context,
    jb,
  }) => {
    const toasts = new Toasts(page);
    const fake = await stubNotifications(page, { items: [] });
    await jb.goto('/notifications');
    await expect.poll(() => fake.lastEventIds.length).toBeGreaterThan(0);
    await page.clock.install();
    fake.stream = 'refused';
    await expect.poll(() => fake.refusals).toBeGreaterThan(0);

    await context.setOffline(true);
    fake.stream = 'ok';
    fake.push(arrival('While you were offline'));
    await context.setOffline(false);

    await expect(toasts.withTitle('While you were offline')).toBeVisible({ timeout: 3_000 });
  });

  test('L2-036 AC4: a product back in stock is in the list, unread, and opens the product page', async ({
    page,
    jb,
  }) => {
    const centre = new NotificationsPage(page);
    await jb.open('notifications.back-in-stock');

    await expect(centre.subtitle).toHaveText('4 unread');
    await expect(centre.items).toHaveCount(6);
    const notice = centre.items.first();
    await expect(notice).toContainText('Unread.');
    await expect(notice).toContainText(BACK_IN_STOCK.title);
    await expect(notice).toContainText('Luzandre.com has it again. You asked to be told.');
    // Its kind has an icon of its own, the bag of a product
    await expect(centre.bagIcon(BACK_IN_STOCK.title)).toHaveCount(1);

    await centre.link(BACK_IN_STOCK.title).click();
    await expect(page).toHaveURL(/\/b\/luzandre\/p\/faith-heavyweight-tee-charcoal$/);
    await expect(centre.main.getByRole('heading', { level: 1 })).toHaveText(
      'Faith heavyweight tee, charcoal',
    );
  });

  test('L2-036 AC4 and L2-066 AC5: a product back in stock arrives as a toast with "View in shop"', async ({
    page,
    jb,
  }) => {
    const toasts = new Toasts(page);
    const fake = await stubNotifications(page, { items: [] });
    await jb.goto('/notifications');

    fake.push(BACK_IN_STOCK);

    const toast = toasts.withTitle(BACK_IN_STOCK.title);
    await expect(toast).toContainText('Luzandre.com has it again. You asked to be told.');
    await toasts.action(toast, 'View in shop').click();
    await expect(page).toHaveURL(/\/b\/luzandre\/p\/faith-heavyweight-tee-charcoal$/);
    expect(fake.opened).toEqual([BACK_IN_STOCK.id]);
  });

  test('L2-065: counts that change on the server reach the badges', async ({ page, jb }) => {
    const centre = new NotificationsPage(page);
    await stubNotifications(page, { counts: { unreadConversationCount: 120, newRequestCount: 0 } });
    await jb.goto('/notifications');

    await expect(centre.conversations).toContainText('99+');
  });

  test('L2-066: a toast offers an action named for what it opens', async ({ page, jb }) => {
    const toasts = new Toasts(page);
    const fake = await stubNotifications(page, { items: [] });
    await jb.goto('/notifications');

    fake.push({
      id: 'c3000000-0000-4000-8000-0000000000ab',
      kind: 'request',
      title: MESSAGE,
      detail: '',
      target: '/requests/r2',
      at: '2026-11-10T14:30:00Z',
      read: false,
    });
    await expect(toasts.action(toasts.withTitle(MESSAGE), 'View request')).toBeVisible();
  });

  test('L2-235 AC1 and AC5: a new review has the star icon and opens the listing', async ({
    page,
    jb,
  }) => {
    const centre = new NotificationsPage(page);
    const review = {
      id: 'c3000000-0000-4000-8000-0000000000aa',
      kind: 'review' as const,
      title: 'New review of Legacy Financial',
      detail: 'Joanna A. gave it 5 of 5 stars for Discovery meeting.',
      target: '/b/legacy-financial',
      at: '2026-11-10T14:30:00Z',
      read: false,
    };
    await stubNotifications(page, { items: [review] });
    await jb.signInAs('member');
    await jb.goto('/notifications');

    await expect(centre.item(review.title)).toContainText(review.detail);
    await expect(centre.starIcon(review.title)).toHaveCount(1);
    await expect(centre.link(review.title)).toHaveAttribute('href', '/b/legacy-financial');
  });
});

import { expect, test } from '../fixtures/jb-test';
import { NOTIFICATIONS, stubNotifications } from '../fixtures/notifications';
import { NotificationsPage } from '../pages/notifications.page';
import { Toasts } from '../pages/toasts';

const CONFIRMED = 'Legacy Financial confirmed your meeting';
const MESSAGE = 'New message from WaterWorks Plumbing & Drains';

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
});

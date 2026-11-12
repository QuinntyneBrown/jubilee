import { expect, test } from '../fixtures/jb-test';
import { FakeNotification, stubNotifications } from '../fixtures/notifications';
import { NotificationsPage } from '../pages/notifications.page';
import { Toasts } from '../pages/toasts';

const FAILED = 'Couldn’t mark them as read';

/** How long a toast whose time is up may take to leave the screen. */
const GONE = 1_000;

/** A notification that arrives over the stream; the app shows it as an info toast. */
const arrival = (n: number): FakeNotification => ({
  id: `c3000000-0000-4000-8000-0000000001${String(n).padStart(2, '0')}`,
  kind: 'request',
  title: `Request update ${n}`,
  detail: '',
  target: `/requests/r${n}`,
  at: '2026-11-10T14:30:00Z',
  read: false,
});

test.describe('toasts (L2-066)', () => {
  test('AC1: a toast goes after 8 seconds, and not a moment before', async ({ page, jb }) => {
    const toasts = new Toasts(page);
    const fake = await stubNotifications(page, { items: [] });
    await jb.goto('/notifications');
    await page.clock.install();

    fake.push(arrival(1));
    const toast = toasts.info('Request update 1');
    await expect(toast).toBeVisible();

    // The page's clock also runs by itself, so the checks leave the test's own time some room:
    // there at 6 seconds, and gone within a second of 8.5.
    await page.clock.runFor(6_000);
    await expect(toast).toBeVisible();
    await page.clock.runFor(2_500);
    await expect(toast).toHaveCount(0, { timeout: GONE });
  });

  test('AC1: the timer holds while the pointer is on the toast and runs again when it leaves', async ({
    page,
    jb,
  }) => {
    const toasts = new Toasts(page);
    const centre = new NotificationsPage(page);
    const fake = await stubNotifications(page, { items: [] });
    await jb.goto('/notifications');
    await page.clock.install();

    fake.push(arrival(1));
    const toast = toasts.info('Request update 1');
    await expect(toast).toBeVisible();
    await page.clock.runFor(4_000);

    await toast.hover();
    await page.clock.runFor(20_000);
    await expect(toast).toBeVisible();

    await centre.heading.hover();
    await page.clock.runFor(3_000);
    await expect(toast).toBeVisible();
    await page.clock.runFor(1_500);
    await expect(toast).toHaveCount(0, { timeout: GONE });
  });

  test('AC1: the timer holds while the toast has the focus and runs again when the focus leaves', async ({
    page,
    jb,
  }) => {
    const toasts = new Toasts(page);
    const centre = new NotificationsPage(page);
    const fake = await stubNotifications(page, { items: [] });
    await jb.goto('/notifications');
    await page.clock.install();

    fake.push(arrival(1));
    const toast = toasts.info('Request update 1');
    await expect(toast).toBeVisible();

    await toasts.action(toast, 'View request').focus();
    await page.clock.runFor(20_000);
    await expect(toast).toBeVisible();

    await centre.settings.focus();
    await page.clock.runFor(8_500);
    await expect(toast).toHaveCount(0, { timeout: GONE });
  });

  test('AC2: an error toast is an alert and stays until it is dismissed; other toasts rise in a polite region', async ({
    page,
    jb,
  }) => {
    const toasts = new Toasts(page);
    const centre = new NotificationsPage(page);
    const fake = await stubNotifications(page, { markAll: 'fails' });
    await jb.goto('/notifications');
    await page.clock.install();

    await centre.markAll.click();
    const failed = toasts.danger(FAILED);
    await expect(failed).toBeVisible();
    await expect(failed).toHaveAttribute('role', 'alert');
    await expect(toasts.region).toHaveAttribute('role', 'status');
    await expect(toasts.region).toHaveAttribute('aria-live', 'polite');

    fake.push(arrival(1));
    const info = toasts.info('Request update 1');
    await expect(info).toBeVisible();
    await expect(info).not.toHaveAttribute('role', 'alert');

    // Long after the other toast has gone, the error is still there.
    await page.clock.runFor(60_000);
    await expect(info).toHaveCount(0);
    await expect(failed).toBeVisible();

    // AC6: every toast has a dismiss button with a name.
    await toasts.dismiss(failed).click();
    await expect(failed).toHaveCount(0);
  });

  test('AC3: a fourth toast pushes out the oldest; three show, newest at the bottom', async ({
    page,
    jb,
  }) => {
    const toasts = new Toasts(page);
    const fake = await stubNotifications(page, { items: [] });
    await jb.goto('/notifications');
    await page.clock.install();

    for (const n of [1, 2, 3]) {
      fake.push(arrival(n));
      await expect(toasts.info(`Request update ${n}`)).toBeVisible();
    }
    await expect(toasts.all).toHaveCount(3);

    fake.push(arrival(4));
    await expect(toasts.info('Request update 4')).toBeVisible();

    await expect(toasts.all).toHaveCount(3);
    expect(await toasts.titles()).toEqual([
      'Request update 2',
      'Request update 3',
      'Request update 4',
    ]);
  });

  test('AC3: an error toast is never the one pushed out', async ({ page, jb }) => {
    const toasts = new Toasts(page);
    const centre = new NotificationsPage(page);
    const fake = await stubNotifications(page, { markAll: 'fails' });
    await jb.goto('/notifications');
    await page.clock.install();

    await centre.markAll.click();
    await expect(toasts.danger(FAILED)).toBeVisible();
    for (const n of [1, 2, 3]) {
      fake.push(arrival(n));
      await expect(toasts.info(`Request update ${n}`)).toBeVisible();
    }

    await expect(toasts.all).toHaveCount(3);
    expect(await toasts.titles()).toEqual([FAILED, 'Request update 2', 'Request update 3']);
  });

  test('AC4: on a phone the toast sits above the tab bar; from 640 px it is at the bottom right, 24rem wide', async ({
    page,
    jb,
  }) => {
    const toasts = new Toasts(page);
    const centre = new NotificationsPage(page);
    const fake = await stubNotifications(page, { items: [] });
    await centre.setWidth(360);
    await jb.goto('/notifications');
    fake.push(arrival(1));
    const toast = toasts.info('Request update 1');
    await expect(toast).toBeVisible();

    const onPhone = (await toast.boundingBox())!;
    const tabBar = (await centre.tabBar.boundingBox())!;
    expect(onPhone.y + onPhone.height).toBeLessThanOrEqual(tabBar.y);

    await centre.setWidth(1280);
    await expect(centre.tabBar).toBeHidden();
    const onDesktop = (await toast.boundingBox())!;
    const viewport = page.viewportSize()!;
    expect(onDesktop.width).toBe(384);
    expect(viewport.width - (onDesktop.x + onDesktop.width)).toBeLessThanOrEqual(32);
    expect(viewport.height - (onDesktop.y + onDesktop.height)).toBeLessThanOrEqual(32);
  });
});

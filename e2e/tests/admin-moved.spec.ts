// Acceptance Test
// Traces to: L2-194
// Description: the app after the Jubilee team's screens moved to the admin application: no
// admin link in its chrome, and old /admin links say where the screens went.
import { ADMIN_URL, expect, test } from '../fixtures/jb-test';
import { AccountMenuDialog } from '../pages/account-menu.dialog';
import { AdminMovedPage } from '../pages/admin-moved.page';

const LISTING_ID = '3f1d2c4e-7a55-4c0e-9d3a-0a1b2c3d4e5f';

test.describe('the app after the move (L2-194)', () => {
  test('AC1: the top bar shows no link to an admin screen', async ({ page, jb }) => {
    const moved = new AdminMovedPage(page);
    await moved.setWidth(1280);
    await jb.signInAs('member');
    await jb.goto('/');

    await expect(moved.primaryNav.getByRole('link', { name: 'Browse' })).toBeVisible();
    await expect(moved.topBarLink(/Verif/)).toHaveCount(0);
    await expect(moved.topBarLink(/^(Listings|Reports|Featured|Admin)/)).toHaveCount(0);
    await expect(moved.adminLinksIn(moved.topBar)).toHaveCount(0);
  });

  test('AC1: the account menu shows no link to an admin screen', async ({ page, jb }) => {
    const moved = new AdminMovedPage(page);
    const menu = new AccountMenuDialog(page);
    await moved.setWidth(1280);
    await jb.signInAs('member');
    await jb.goto('/');

    await moved.avatar.click();

    await expect(menu.item('Your account')).toBeVisible();
    await expect(menu.items).not.toContainText([/Listings|Reports|Featured|Admin/]);
    await expect(moved.adminLinksIn(menu.root)).toHaveCount(0);
  });

  test('AC1: on a phone the tab bar shows no admin entry', async ({ page, jb }) => {
    const moved = new AdminMovedPage(page);
    await moved.setWidth(360);
    await jb.signInAs('member');
    await jb.goto('/');

    await expect(moved.tab('Browse')).toBeVisible();
    await expect(moved.tab(/Verif|Listings/)).toHaveCount(0);
    await expect(moved.adminLinksIn(moved.tabBar)).toHaveCount(0);
  });

  const screens = [
    [`/admin/verifications/${LISTING_ID}`, `/listings/${LISTING_ID}`],
    ['/admin/verifications', '/listings'],
    ['/admin/reports', '/reports'],
    [
      '/admin/reports/5b0c7a10-2d4e-4f6a-8b1c-0123456789ab',
      '/reports/5b0c7a10-2d4e-4f6a-8b1c-0123456789ab',
    ],
    ['/admin/featured', '/featured'],
  ] as const;
  for (const [old, moved] of screens) {
    test(`AC2: ${old} says the page has moved and opens ${moved} in the admin application`, async ({
      page,
      jb,
    }) => {
      const screen = new AdminMovedPage(page);
      await jb.signInAs('member');
      await jb.goto(old);

      await expect(screen.heading).toHaveText('This page has moved');
      await expect(screen.text).toHaveText(
        'The Jubilee team’s screens are now in the admin application. It opens only on a Jubilee staff network.',
      );
      await expect(screen.openAdmin).toHaveAttribute('href', `${ADMIN_URL}${moved}`);
    });
  }

  test('AC2: a visitor following an old link is told the same, and Back to browse goes home', async ({
    page,
    jb,
  }) => {
    const screen = new AdminMovedPage(page);
    await jb.goto('/admin/verifications');

    await expect(screen.heading).toHaveText('This page has moved');
    await screen.backToBrowse.click();
    await expect(page).not.toHaveURL(/\/admin/);
  });

  test('AC3: any other path under /admin opens the listings of the admin application', async ({
    page,
    jb,
  }) => {
    const screen = new AdminMovedPage(page);
    await jb.signInAs('member');
    await jb.goto('/admin/team/settings');

    await expect(screen.heading).toHaveText('This page has moved');
    await expect(screen.openAdmin).toHaveAttribute('href', `${ADMIN_URL}/listings`);
  });
});

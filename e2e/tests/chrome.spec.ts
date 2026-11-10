import { expect, test } from '../fixtures/jb-test';
import { NotFoundPage } from '../pages/not-found.page';
import { ShellPage } from '../pages/shell.page';

// Site chrome: L2-112, L2-164, L2-065, L2-022 (criterion 3) and L2-162.
// The not-found page carries the chrome and needs no data, so it is the page under the frame.

test.describe('footer and skip link (L2-112)', () => {
  test('AC1: every app page shows the footer line and the four trust links', async ({
    page,
    jb,
  }) => {
    const shell = new ShellPage(page);
    // Given any app page
    await jb.open('not-found', { who: 'visitor' });
    // Then the footer reads the copyright line for the current year
    await expect(shell.footer).toContainText('© 2026 Jubilee · Toronto’s Christian marketplace');
    // And links to the four trust pages
    await expect(shell.footerLink('Statement of faith')).toHaveAttribute(
      'href',
      '/statement-of-faith',
    );
    await expect(shell.footerLink('Help')).toHaveAttribute('href', '/help');
    await expect(shell.footerLink('Terms')).toHaveAttribute('href', '/terms');
    await expect(shell.footerLink('Privacy')).toHaveAttribute('href', '/privacy');
  });

  test('AC4: "Skip to content" is the first focusable element and moves focus to main', async ({
    page,
    jb,
  }) => {
    const shell = new ShellPage(page);
    await jb.open('not-found');
    // When the user presses Tab once
    await shell.pressTab();
    // Then the skip link has focus and is visible
    await expect(shell.skipLink).toBeFocused();
    await expect(shell.skipLink).toHaveText('Skip to content');
    await expect(shell.skipLink).toBeInViewport();
    // When they activate it
    await shell.pressEnter();
    // Then focus is on main
    await expect(shell.main).toBeFocused();
  });
});

test.describe('member navigation by viewport (L2-112, L2-164)', () => {
  test('under 768 px: tab bar, and a top bar with brand, search link and notifications', async ({
    page,
    jb,
  }) => {
    const shell = new ShellPage(page);
    await shell.setWidth(360);
    await jb.open('not-found');

    // L2-112 AC3: the fixed tab bar shows Browse, List, Messages and You
    await expect(shell.tabBar).toBeVisible();
    await expect(shell.tabs()).toHaveText(['Browse', 'List', /^Messages/, 'You']);
    await expect(shell.tabBar).toHaveCSS('position', 'fixed');
    // and the page reserves at least the height of the bar (3.75rem)
    expect(await shell.reservedBottomSpace()).toBeGreaterThanOrEqual(60);

    // L2-164 AC1: the top bar shows only the brand, the search link and notifications
    await expect(shell.brand).toBeVisible();
    await expect(shell.searchLink).toBeVisible();
    await expect(shell.notifications).toBeVisible();
    await expect(shell.primaryNav).toBeHidden();
    await expect(shell.searchBox).toBeHidden();
    await expect(shell.avatar).toBeHidden();
    await expect(shell.topBarLink('List your business')).toBeHidden();
  });

  test('768 px to 1023 px: no tab bar, primary navigation in the top bar, search by link', async ({
    page,
    jb,
  }) => {
    const shell = new ShellPage(page);
    await shell.setWidth(800);
    await jb.open('not-found');

    // L2-164 AC2
    await expect(shell.tabBar).toBeHidden();
    expect(await shell.reservedBottomSpace()).toBe(0);
    // L2-112 AC2: brand, Browse, Messages with badge, List your business and the avatar
    await expect(shell.brand).toBeVisible();
    await expect(shell.topBarLink('Browse')).toBeVisible();
    await expect(shell.topBarLink(/^Messages/)).toBeVisible();
    await expect(shell.topBarLink('List your business')).toBeVisible();
    await expect(shell.avatar).toBeVisible();
    await expect(shell.avatar).toHaveText('JA');
    await expect(shell.avatar).toHaveAccessibleName('Account menu for Joanna Adeyemi');
    // Search is reached by the link, not a box
    await expect(shell.searchBox).toBeHidden();
    await expect(shell.searchLink).toBeVisible();
  });

  test('from 1024 px: the top bar also shows the search box', async ({ page, jb }) => {
    const shell = new ShellPage(page);
    await shell.setWidth(1280);
    await jb.open('not-found');

    // L2-164 AC3, L2-112 AC2
    await expect(shell.searchBox).toBeVisible();
    await expect(shell.searchBox).toHaveAttribute('placeholder', 'Plumber, lawyer, Bibles…');
    await expect(shell.searchLink).toBeHidden();
    await expect(shell.tabBar).toBeHidden();
  });

  test('an owner gets "My business" in the top bar and "Business" in the tab bar', async ({
    page,
    jb,
  }) => {
    const shell = new ShellPage(page);
    await shell.setWidth(1280);
    await jb.open('not-found', { navigation: { ownsListing: true } });
    await expect(shell.topBarLink('My business')).toHaveAttribute('href', '/my-business');
    await expect(shell.topBarLink('List your business')).toHaveCount(0);

    await shell.setWidth(360);
    await expect(shell.tabs()).toHaveText(['Browse', 'Business', /^Messages/, 'You']);
  });

  test('submitting the top bar search goes to the search page with the query', async ({
    page,
    jb,
  }) => {
    const shell = new ShellPage(page);
    await shell.setWidth(1280);
    await jb.open('not-found');
    await shell.searchBox.fill('plumber');
    await shell.searchBox.press('Enter');
    await expect(page).toHaveURL(/\/search\?q=plumber$/);
  });
});

test.describe('visitor chrome (L2-022)', () => {
  test('AC3: the top bar shows "Sign in" and "Join free" instead of the avatar', async ({
    page,
    jb,
  }) => {
    const shell = new ShellPage(page);
    await shell.setWidth(1280);
    await jb.open('not-found', { who: 'visitor' });

    await expect(shell.topBarLink('Sign in')).toHaveAttribute('href', '/sign-in');
    await expect(shell.topBarLink('Join free')).toHaveAttribute('href', '/join');
    await expect(shell.brand).toHaveAttribute('href', '/welcome');
    await expect(shell.avatar).toHaveCount(0);
    await expect(shell.notifications).toHaveCount(0);
    await expect(shell.topBarLink(/^Messages/)).toHaveCount(0);
  });

  test('under 768 px the tab bar offers Browse, Sign in and Join', async ({ page, jb }) => {
    const shell = new ShellPage(page);
    await shell.setWidth(360);
    await jb.open('not-found', { who: 'visitor' });
    await expect(shell.tabs()).toHaveText(['Browse', 'Sign in', 'Join']);
    await expect(shell.topBarLink('Join free')).toBeVisible();
  });
});

test.describe('unread badges (L2-065)', () => {
  test('AC1: "Messages" carries the unread count, announced as "{n} unread"', async ({
    page,
    jb,
  }) => {
    const shell = new ShellPage(page);
    await shell.setWidth(1280);
    await jb.open('not-found');
    const inTopBar = shell.badgeIn(shell.topBarLink(/^Messages/));
    await expect(inTopBar).toHaveText('2');
    await expect(inTopBar).toHaveAccessibleName('2 unread');
    await expect(shell.notifications).toHaveAccessibleName('Notifications, 3 unread');

    await shell.setWidth(360);
    const inTabBar = shell.badgeIn(shell.tab(/^Messages/));
    await expect(inTabBar).toHaveText('2');
    await expect(inTabBar).toHaveAccessibleName('2 unread');
  });

  test('AC3: a count above 99 reads "99+"', async ({ page, jb }) => {
    const shell = new ShellPage(page);
    await shell.setWidth(1280);
    await jb.open('not-found', { navigation: { unreadConversationCount: 120 } });
    const badge = shell.badgeIn(shell.topBarLink(/^Messages/));
    await expect(badge).toHaveText('99+');
    await expect(badge).toHaveAccessibleName('120 unread');
  });

  test('with nothing unread there is no badge and no dot', async ({ page, jb }) => {
    const shell = new ShellPage(page);
    await shell.setWidth(1280);
    await jb.open('not-found', {
      navigation: { unreadConversationCount: 0, unreadNotificationCount: 0 },
    });
    await expect(shell.badgeIn(shell.topBarLink(/^Messages/))).toHaveCount(0);
    await expect(shell.notifications).toHaveAccessibleName('Notifications');
  });
});

test.describe('touch targets (L2-162)', () => {
  test('tab bar items are at least 44 × 44 CSS px', async ({ page, jb }) => {
    const shell = new ShellPage(page);
    await shell.setWidth(360);
    await jb.open('not-found');
    await expect(shell.tabs()).toHaveCount(4);
    for (const tab of await shell.tabs().all()) {
      const box = await tab.boundingBox();
      expect(box?.width).toBeGreaterThanOrEqual(44);
      expect(box?.height).toBeGreaterThanOrEqual(44);
    }
  });
});

test.describe('not-found page (L2-113)', () => {
  test('AC1: an unknown URL shows the not-found page with two ways out', async ({ page, jb }) => {
    const notFound = new NotFoundPage(page);
    await jb.open('not-found', { who: 'visitor' });
    await expect(notFound.heading).toHaveText('We can’t find that page');
    await expect(notFound.text).toHaveText(
      'The link may be old, or the listing may have been removed. Search for the business by name, or start from browse.',
    );
    await expect(notFound.backToBrowse).toHaveAttribute('href', '/');
    await expect(notFound.search).toHaveAttribute('href', '/search');
    await expect.poll(() => notFound.dataPage()).toBe('not-found');
  });
});

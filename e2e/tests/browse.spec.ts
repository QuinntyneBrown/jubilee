import { categories } from '../fixtures/categories';
import { expect, test } from '../fixtures/jb-test';
import { browseHomeFromMock } from '../fixtures/mock-data';
import { stubBrowseHome } from '../fixtures/stubs';
import { BrowsePage } from '../pages/browse.page';

// Browse home: L2-021, L2-022, L2-027, L2-118 and L2-164 (criterion 4).
// "browse" is Joanna, a signed-in member, against the recorded answers of the seeded API (ADR 0009) (the mocks' catalogue).

test.describe('browse home for a member (L2-021)', () => {
  for (const [time, word] of [
    ['2026-11-10T09:00:00-05:00', 'Morning'],
    ['2026-11-10T11:59:00-05:00', 'Morning'],
    ['2026-11-10T12:00:00-05:00', 'Afternoon'],
    ['2026-11-10T16:59:00-05:00', 'Afternoon'],
    ['2026-11-10T17:00:00-05:00', 'Evening'],
  ] as const) {
    test(`AC1: at ${time.slice(11, 16)} Toronto time the greeting reads "${word}, Joanna"`, async ({
      page,
      jb,
    }) => {
      const browse = new BrowsePage(page);
      await jb.open('browse', { now: new Date(time) });
      await expect(browse.greeting).toHaveText(`${word}, Joanna`);
    });
  }

  test('AC2: it shows the chips, the featured five, five shop products and the grouped directory', async ({
    page,
    jb,
  }) => {
    const browse = new BrowsePage(page);
    await jb.open('browse');
    await expect.poll(() => browse.dataPage()).toBe('browse');
    await expect(browse.heading).toHaveText('Do business with Toronto’s Christian community.');
    await expect(browse.subline).toHaveText(
      '47 verified businesses — shops, advisors, trades and more.',
    );

    // Category chips: "All" plus the ten categories
    await expect(browse.categoryChips).toHaveText(['All', ...categories.map((c) => c.name)]);
    await expect(browse.categoryChips.first()).toHaveAttribute('aria-current', 'page');
    await expect(browse.categoryChips.nth(4)).toHaveAttribute('href', '/c/home-property');

    // "Featured this week": up to five businesses, in slot order (L2-106)
    await expect(browse.featuredCards).toHaveCount(5);
    await expect(browse.featuredCard(0).name).toHaveText('Legacy Financial');
    await expect(browse.featuredCard(4).name).toHaveText('WaterWorks Plumbing & Drains');
    await expect(browse.featuredCard(4).verifiedMark).toHaveText('Verified');

    // "From the shops": up to five products with "All shops"
    await expect(browse.productCards).toHaveCount(5);
    await expect(browse.allShops).toHaveAttribute('href', '/c/shops');

    // "All {n} businesses" grouped by category with each group's count
    await expect(browse.directoryHeading).toHaveText('All 47 businesses');
    await expect(browse.groups).toHaveCount(10);
    const counts = [3, 3, 6, 10, 4, 4, 5, 2, 7, 3];
    for (const [index, category] of categories.entries()) {
      const group = browse.group(category.name);
      await expect(group.count).toContainText(`${counts[index]}`);
      await expect(group.count).toContainText(`${counts[index]} businesses`);
    }
  });

  test('AC3: a group of more than four lists four and "See all {n}"; a smaller one lists all', async ({
    page,
    jb,
  }) => {
    const browse = new BrowsePage(page);
    await jb.open('browse');

    const home = browse.group('Home & property');
    await expect(home.rows).toHaveCount(4);
    await expect(home.seeAll).toHaveText('See all 10');
    await expect(home.seeAll).toHaveAttribute('href', '/c/home-property');

    const realEstate = browse.group('Real estate & living');
    await expect(realEstate.rows).toHaveCount(4);
    await expect(realEstate.seeAll).toHaveCount(0);

    const learning = browse.group('Learning');
    await expect(learning.rows).toHaveCount(2);
    await expect(learning.seeAll).toHaveCount(0);
  });

  test('a directory row links to the business and says it is verified', async ({ page, jb }) => {
    const browse = new BrowsePage(page);
    await jb.open('browse');
    const row = browse.group('Shops').rows.first();
    await expect(row).toHaveAttribute('href', '/b/luzandre');
    await expect(row).toHaveAccessibleName(/Luzandre\.com.*Verified/);
  });

  test('AC5: with no live businesses it shows "No businesses are listed yet"', async ({
    page,
    jb,
  }) => {
    const browse = new BrowsePage(page);
    await jb.open('browse.empty');
    await expect(browse.subline).toHaveText('The first verified businesses are on their way.');
    await expect(browse.emptyState).toContainText('No businesses are listed yet');
    await expect(browse.stateAction('List your business')).toHaveAttribute('href', '/list');
    await expect(browse.featured).toHaveCount(0);
    await expect(browse.groups).toHaveCount(0);
  });

  test('AC6 and L2-118: a failed load keeps the chrome and shows the error with its reference', async ({
    page,
    jb,
  }) => {
    const browse = new BrowsePage(page);
    await browse.setWidth(360);
    await jb.open('browse.error');

    // The top bar and tab bar stay
    await expect(browse.topBar).toBeVisible();
    await expect(browse.tabBar).toBeVisible();
    // The error state reads the L2-118 sentence with the reference
    await expect(browse.errorState).toContainText('We couldn’t load the directory');
    await expect(browse.errorState).toContainText(
      'Nothing is lost. Check your connection and try again. If it keeps happening, tell us and quote JB-DIR-503.',
    );
    await expect(browse.errorReference).toHaveText('JB-DIR-503');
    await expect(browse.stateAction('Open messages')).toHaveAttribute('href', '/messages');

    // "Try again" reloads the directory region
    await page.unroute('**/api/directory/home');
    await browse.tryAgain.click();
    await expect(browse.directoryHeading).toHaveText('All 47 businesses');
    await expect(browse.errorState).toHaveCount(0);
  });

  test('while the directory loads it says so and shows placeholders', async ({ page, jb }) => {
    const browse = new BrowsePage(page);
    await jb.open('browse.loading');
    await expect(browse.subline).toHaveText('Loading the directory…');
    await expect(browse.loadingStatus).toHaveText('Loading the directory…');
    await expect(browse.skeletons.first()).toBeVisible();
    await expect(browse.categoryChips).toHaveCount(11);
  });
});

test.describe('browse home for a visitor (L2-022)', () => {
  test('AC1: the same directory with a "New here?" panel and nothing personal', async ({
    page,
    jb,
  }) => {
    const browse = new BrowsePage(page);
    await browse.setWidth(1280);
    await jb.open('browse.signed-out');

    await expect(browse.directoryHeading).toHaveText('All 47 businesses');
    await expect(browse.featuredCards).toHaveCount(5);
    await expect(browse.joinPanel).toContainText('New here?');
    await expect(browse.joinPanel).toContainText(
      'Join free to message businesses, book meetings and save favourites.',
    );
    await expect(browse.joinPanelAction).toHaveAttribute('href', '/join');
    // No greeting, avatar or message count
    await expect(browse.greeting).toHaveText('Toronto’s Christian marketplace');
    await expect(browse.avatar).toHaveCount(0);
    await expect(browse.topBarLink(/^Messages/)).toHaveCount(0);
  });

  test('a member gets no join panel', async ({ page, jb }) => {
    const browse = new BrowsePage(page);
    await jb.open('browse');
    await expect(browse.directoryHeading).toBeVisible();
    await expect(browse.joinPanel).toHaveCount(0);
  });

  test('a failed load offers a visitor "Sign in" in place of "Open messages"', async ({
    page,
    jb,
  }) => {
    const browse = new BrowsePage(page);
    await jb.open('browse.error', { who: 'visitor' });
    await expect(browse.errorReference).toHaveText('JB-DIR-503');
    await expect(browse.stateAction('Sign in')).toHaveAttribute('href', '/sign-in');
    await expect(browse.stateAction('Open messages')).toHaveCount(0);
  });
});

test.describe('card content rules (L2-027)', () => {
  test('AC2: a long business name wraps and is never cut; the tagline is clamped to two lines', async ({
    page,
    jb,
  }) => {
    const browse = new BrowsePage(page);
    await browse.setWidth(360);
    await jb.open('browse.edge');
    const long = browse.featuredCard(0);
    await expect(long.name).toContainText(
      'Psychotherapy and Counselling Services of Greater Toronto',
    );
    expect(await long.nameIsTruncated()).toBe(false);
    expect(await long.taglineLines()).toBe(2);
    expect(await browse.overflowsHorizontally()).toBe(false);
  });

  test('AC3: a long directory row name is cut to one line and stays whole for assistive technology', async ({
    page,
    jb,
  }) => {
    const browse = new BrowsePage(page);
    const fullName =
      'Adrianne Sequeira, DMin., RP, RMFT, RN — Individual, Couple and Family Psychotherapy and Counselling Services of Greater Toronto';
    // Given a directory whose first Health & family business has a very long name
    const directory = browseHomeFromMock('edge');
    directory.groups.find((g) => g.slug === 'health-family')!.businesses[0].name = fullName;
    await stubBrowseHome(page, directory);
    await browse.setWidth(360);
    await jb.open('browse');
    const group = browse.group('Health & family');
    await expect(group.rowName(0)).toHaveText(fullName);
    expect(await group.rowNameIsTruncated(0)).toBe(true);
    await expect(group.rows.first()).toHaveAccessibleName(new RegExp(`^${fullName}`));
    // One line: the long row is no taller than a short one
    expect(await group.rowHeight(0)).toBe(await group.rowHeight(1));
  });

  test('AC4: a four-digit count has a thousands separator', async ({ page, jb }) => {
    const browse = new BrowsePage(page);
    await jb.open('browse.edge');
    await expect(browse.subline).toHaveText(
      '1,204 verified businesses — shops, advisors, trades and more.',
    );
    await expect(browse.directoryHeading).toHaveText('All 1,204 businesses');
  });

  test('AC5: a product card shows the product, the shop and the price, with "ea" for per-unit', async ({
    page,
    jb,
  }) => {
    const browse = new BrowsePage(page);
    await jb.open('browse');
    const tee = browse.productCard(0);
    await expect(tee.name).toHaveText('Faith heavyweight tee, charcoal');
    await expect(tee.shopName).toHaveText('Luzandre.com');
    await expect(tee.price).toHaveText('$34');
    await expect(tee.mediaTile).toBeVisible();
    await expect(browse.productCard(2).price).toHaveText('$22 ea');
    await expect(browse.productCard(4).shopName).toHaveText('Christian Bookstores');
    await expect(browse.productCard(4).price).toHaveText('$64');
  });
});

test.describe('hero search (L2-164)', () => {
  test('AC4: the hero search shows under 768 px and is hidden from 768 px', async ({
    page,
    jb,
  }) => {
    const browse = new BrowsePage(page);
    await browse.setWidth(767);
    await jb.open('browse');
    await expect(browse.heroSearch).toBeVisible();
    await browse.setWidth(768);
    await expect(browse.heroSearch).toBeHidden();
  });

  test('submitting the hero search opens the search page with the query', async ({ page, jb }) => {
    const browse = new BrowsePage(page);
    await browse.setWidth(360);
    await jb.open('browse');
    await browse.searchFromHero('bibles');
    await expect(page).toHaveURL(/\/search\?q=bibles$/);
  });
});

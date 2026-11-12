import { chipCategories as categories } from '../fixtures/categories';
import { expect, test } from '../fixtures/jb-test';
import { WelcomePage } from '../pages/welcome.page';

// Welcome page: L2-020, with L2-106 (featured), L2-027 and L2-111 (card rules, verified mark).
// The default state runs against the recorded answers of the seeded API (ADR 0009): the mocks' catalogue of 47 businesses.

test.describe('welcome page (L2-020)', () => {
  test('AC1: a visitor sees the tagline, heading, live count and the two actions', async ({
    page,
    jb,
  }) => {
    const welcome = new WelcomePage(page);
    // Given a visitor, when they open /welcome
    await jb.open('welcome');
    // Then
    await expect(welcome.tagline).toHaveText('Toronto’s Christian marketplace');
    await expect(welcome.heading).toHaveText('Do business with Toronto’s Christian community.');
    await expect(welcome.countLine).toHaveText(
      '47 verified businesses — shops, advisors, trades and more. Free to join, free to list.',
    );
    await expect(welcome.joinFree).toHaveAttribute('href', '/join');
    await expect(welcome.browseBusinesses).toHaveAttribute('href', '/');
    await expect.poll(() => welcome.dataPage()).toBe('welcome');
  });

  test('AC2: it lists the eleven categories, the three steps, the featured four and the owner panel', async ({
    page,
    jb,
  }) => {
    const welcome = new WelcomePage(page);
    await jb.open('welcome');

    // All eleven categories as links, in the fixed order (L2-020)
    await expect(welcome.categoryLinks).toHaveText(categories.map((c) => c.name));
    for (const [index, category] of categories.entries()) {
      await expect(welcome.categoryLinks.nth(index)).toHaveAttribute('href', `/c/${category.slug}`);
    }
    // The three "How Jubilee works" steps
    await expect(welcome.steps).toHaveText([
      'Find someone you can trust',
      'Ask, book or order',
      'Keep wealth working for the kingdom',
    ]);
    // Up to four featured businesses (L2-106: the first four of this week's slots) with "Browse all {n}"
    await expect(welcome.featuredCards).toHaveCount(4);
    await expect(welcome.featuredCard(0).name).toHaveText('Legacy Financial');
    await expect(welcome.featuredCard(1).name).toHaveText('Luzandre.com');
    await expect(welcome.featuredCard(2).name).toHaveText('Christian Bookstores');
    await expect(welcome.featuredCard(3).name).toHaveText('Adrianne Sequeira, DMin., RP, RMFT, RN');
    await expect(welcome.browseAll).toHaveText('Browse all 47');
    await expect(welcome.browseAll).toHaveAttribute('href', '/');
    // The "Own a business?" panel
    await expect(welcome.listYourBusiness).toHaveAttribute('href', '/join?returnUrl=%2Flist');
  });

  test('AC3: the count shown is the count the directory reports', async ({ page, jb }) => {
    const welcome = new WelcomePage(page);
    // Given the directory now holds 1,204 live verified businesses
    await page.route('**/api/directory/welcome', (route) =>
      route.fulfill({ json: { liveBusinessCount: 1204, categories, featured: [] } }),
    );
    await jb.open('welcome');
    // Then the count follows it, with a thousands separator (L2-027 AC4)
    await expect(welcome.countLine).toHaveText(
      '1,204 verified businesses — shops, advisors, trades and more. Free to join, free to list.',
    );
    // And with nothing to feature the section is left out
    await expect(welcome.featured).toHaveCount(0);
  });

  test('AC4: a signed-in member is taken to the browse home', async ({ page, jb }) => {
    // Given a signed-in member, when they open /welcome
    await jb.open('welcome', { who: 'member' });
    // Then they are at /
    await expect(page).toHaveURL(/\/$/);
    await expect.poll(() => new WelcomePage(page).dataPage()).not.toBe('welcome');
  });

  test('the page stays useful when the welcome data cannot be loaded', async ({ page, jb }) => {
    const welcome = new WelcomePage(page);
    await page.route('**/api/directory/welcome', (route) => route.fulfill({ status: 503 }));
    await jb.open('welcome');
    await expect(welcome.countLine).toHaveText(
      'Shops, advisors, trades and more. Free to join, free to list.',
    );
    await expect(welcome.categoryLinks).toHaveCount(11);
    await expect(welcome.featured).toHaveCount(0);
    await expect(welcome.listYourBusiness).toBeVisible();
  });
});

test.describe('featured business cards', () => {
  test('L2-027 AC1 and L2-111: a card has a category tile, name, tagline, highlight and the Verified mark', async ({
    page,
    jb,
  }) => {
    const welcome = new WelcomePage(page);
    await jb.open('welcome');
    const card = welcome.featuredCard(0);

    await expect(card.root).toHaveAttribute('href', '/b/legacy-financial');
    await expect(card.categoryLabel).toHaveText('Financial');
    await expect(card.name).toHaveText('Legacy Financial');
    await expect(card.tagline).toHaveText('Build a Legacy. Protect a Legacy. Leave a Legacy.');
    await expect(card.highlight).toHaveText('Free first meeting');
    // L2-111 AC2: an icon and the text, never colour alone
    await expect(card.verifiedMark).toHaveText('Verified');
    await expect(card.verifiedIcon).toBeVisible();
  });
});

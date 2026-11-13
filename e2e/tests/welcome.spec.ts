import { chipCategories as categories } from '../fixtures/categories';
import { expect, test } from '../fixtures/jb-test';
import { WelcomePage } from '../pages/welcome.page';

// Welcome page: L2-020, with L2-106 (featured) and L2-027 (card rules); no Verified mark (ADR 0057).
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
      '47 businesses — shops, advisors, trades and more. Free to join, free to list.',
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
    await expect(welcome.stepList).toContainText(
      'Every listing is a Christian-owned business whose owner agreed to Jubilee’s statement of faith.',
    );
    // Up to four featured businesses (L2-106: the first four of this week's slots) with "Browse all {n}"
    await expect(welcome.featuredCards).toHaveCount(4);
    await expect(welcome.featuredCard(0).name).toHaveText('Legacy Financial');
    await expect(welcome.featuredCard(1).name).toHaveText('Luzandre.com');
    await expect(welcome.featuredCard(2).name).toHaveText('Christian Bookstores');
    await expect(welcome.featuredCard(3).name).toHaveText('Adrianne Sequeira, DMin., RP, RMFT, RN');
    await expect(welcome.browseAll).toHaveText('Browse all 47');
    await expect(welcome.browseAll).toHaveAttribute('href', '/');
    // The "Own a business?" panel
    await expect(welcome.ownABusiness).toContainText(
      'List it free. Tell us what you offer, agree to the statement of faith and publish. You are live straight away.',
    );
    await expect(welcome.listYourBusiness).toHaveAttribute('href', '/join?returnUrl=%2Flist');
  });

  test('AC3: the count shown is the count the directory reports', async ({ page, jb }) => {
    const welcome = new WelcomePage(page);
    // Given the directory now holds 1,204 live businesses
    await page.route('**/api/directory/welcome', (route) =>
      route.fulfill({ json: { liveBusinessCount: 1204, categories, featured: [] } }),
    );
    await jb.open('welcome');
    // Then the count follows it, with a thousands separator (L2-027 AC4)
    await expect(welcome.countLine).toHaveText(
      '1,204 businesses — shops, advisors, trades and more. Free to join, free to list.',
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
  test('L2-027 AC1: a card has a category tile, name, tagline and highlight, and no Verified mark', async ({
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
    // ADR 0057: no card calls a business verified
    await expect(card.root).not.toContainText('Verified');
  });

  test('L2-027 AC2 and L2-106 AC1: a long name wraps whole, its tagline is clamped, and fewer than four are shown as they are', async ({
    page,
    jb,
  }) => {
    const welcome = new WelcomePage(page);
    const name =
      'Adrianne Sequeira, DMin., RP, RMFT, RN — Psychotherapy and Counselling Services of Greater Toronto';
    // Given this week features one business, with a very long name and tagline
    await page.route('**/api/directory/welcome', (route) =>
      route.fulfill({
        json: {
          liveBusinessCount: 47,
          categories,
          featured: [
            {
              slug: 'adrianne-sequeira',
              name,
              tagline:
                'Individual, couple and family psychotherapy for every season of life, in person in Scarborough and online across Ontario, with evening and Saturday appointments for working families.',
              highlight: null,
              categorySlug: 'health-family',
              coverPhoto: null,
            },
          ],
        },
      }),
    );
    await welcome.setWidth(360);
    await jb.open('welcome');
    // Then the one card is shown, its name whole and its tagline on two lines
    await expect(welcome.featuredCards).toHaveCount(1);
    const card = welcome.featuredCard(0);
    await expect(card.name).toHaveText(name);
    expect(await card.nameIsTruncated()).toBe(false);
    expect(await card.taglineLines()).toBe(2);
    expect(await welcome.overflowsHorizontally()).toBe(false);
  });
});

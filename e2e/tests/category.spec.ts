import { expect, test } from '../fixtures/jb-test';
import { CategoryPage } from '../pages/category.page';
import { NotFoundPage } from '../pages/not-found.page';

// Category page: L2-023, L2-026, L2-111, L2-113 and L2-118.
// "category" is /c/home-property against the seeded API: ten businesses.

test.describe('category page (L2-023)', () => {
  test('AC1: it shows the breadcrumb, heading, count with the category fact, filters, sort and cards', async ({
    page,
    jb,
  }) => {
    const category = new CategoryPage(page);
    await category.setWidth(1280);
    await jb.open('category');
    await expect.poll(() => category.dataPage()).toBe('category');

    await expect(category.breadcrumbItems).toHaveText(['Browse', 'Home & property']);
    await expect(category.breadcrumb.getByRole('link', { name: 'Browse' })).toHaveAttribute(
      'href',
      '/',
    );
    await expect(category.heading).toHaveText('Home & property');
    await expect(category.subtitle).toHaveText('10 verified businesses · 3 take emergency calls');
    await expect(category.chips).toHaveText([
      'Free quote',
      'Emergency calls',
      'Open Saturdays',
      'Serves Scarborough',
      'Serves North York',
      'Serves East York',
      'Serves Etobicoke',
      'Serves Downtown',
    ]);
    await expect(category.sort).toHaveValue('recommended');
    await expect(category.cards).toHaveCount(10);
    await expect(category.card(0).name).toHaveText('WaterWorks Plumbing & Drains');
    await expect(category.card(0).root).toHaveAttribute('href', '/b/waterworks-plumbing-drains');

    // Under 768 px the "Filters" button stands in for the chips
    await category.setWidth(360);
    await expect(category.filtersButton).toBeVisible();
    await expect(category.filterChips).toBeHidden();
  });

  test('L2-111 AC1 and AC2: every listed business carries the Verified mark, icon and text', async ({
    page,
    jb,
  }) => {
    const category = new CategoryPage(page);
    await jb.open('category');
    await expect(category.cards).toHaveCount(10);
    for (let index = 0; index < 10; index++) {
      await expect(category.card(index).verifiedMark).toHaveText('Verified');
      await expect(category.card(index).verifiedIcon).toBeVisible();
    }
  });

  test('a category without emergency-call businesses shows the count alone', async ({
    page,
    jb,
  }) => {
    const category = new CategoryPage(page);
    await jb.goto('/c/learning');
    await expect(category.heading).toHaveText('Learning');
    await expect(category.subtitle).toHaveText('2 verified businesses');
    await expect(category.showing).toHaveText('Showing all 2');
  });

  test('AC2 and L2-113: an unknown category shows the not-found page', async ({ page, jb }) => {
    const notFound = new NotFoundPage(page);
    // Given a slug that is not one of the ten categories
    const answer = page.waitForResponse('**/api/categories/plumbers/listings?*');
    await jb.goto('/c/plumbers');
    // Then the API answers 404 and the not-found page shows, at the URL that was asked for
    expect((await answer).status()).toBe(404);
    await expect(notFound.heading).toHaveText('We can’t find that page');
    await expect(page).toHaveURL(/\/c\/plumbers$/);
  });

  test('AC3: a category with no live businesses invites the first listing', async ({
    page,
    jb,
  }) => {
    const category = new CategoryPage(page);
    await jb.open('category.empty');
    await expect(category.subtitle).toHaveText('No businesses yet');
    await expect(category.emptyState).toContainText('No one has listed here yet');
    await expect(category.stateAction('List your business')).toHaveAttribute('href', '/list');
    await expect(category.stateAction('Browse other categories')).toHaveAttribute('href', '/');
    await expect(category.filterChips).toHaveCount(0);
  });

  test('AC4 and L2-118: a failed load shows the error with JB-CAT-503 and recovers on "Try again"', async ({
    page,
    jb,
  }) => {
    const category = new CategoryPage(page);
    await jb.open('category.error');
    await expect(category.heading).toHaveText('Home & property');
    await expect(category.errorState).toContainText('We couldn’t load this category');
    await expect(category.errorState).toContainText(
      'Nothing is lost. Check your connection and try again. If it keeps happening, tell us and quote JB-CAT-503.',
    );
    await expect(category.errorReference).toHaveText('JB-CAT-503');
    await expect(category.stateAction('Back to browse')).toHaveAttribute('href', '/');

    await page.unroute('**/api/categories/*/listings?*');
    await category.tryAgain.click();
    await expect(category.cards).toHaveCount(10);
  });

  test('while the category loads it says so and shows placeholders', async ({ page, jb }) => {
    const category = new CategoryPage(page);
    await jb.open('category.loading');
    await expect(category.heading).toHaveText('Home & property');
    await expect(category.subtitle).toHaveText('Loading businesses…');
    await expect(category.loadingStatus).toHaveText('Loading businesses…');
    await expect(category.skeletons.first()).toBeVisible();
  });
});

test.describe('pagination (L2-026)', () => {
  test('AC1: a long category shows 16 cards, the range and collapsed page controls', async ({
    page,
    jb,
  }) => {
    const category = new CategoryPage(page);
    await jb.open('category.long');
    await expect(category.subtitle).toHaveText('312 verified businesses · 41 take emergency calls');
    await expect(category.cards).toHaveCount(16);
    await expect(category.showing).toHaveText('Showing 1–16 of 312');
    await expect(category.pageLinks).toHaveText(['‹', '1', '2', '3', '…', '20', '›']);
    await expect(category.pageLink(1)).toHaveAttribute('aria-current', 'page');
    await expect(category.previous).toHaveAttribute('aria-disabled', 'true');
    await expect(category.next).toHaveAttribute('href', '/c/home-property?page=2');
  });

  test('AC2: opening page 2 puts page=2 in the URL, shows the next cards and moves focus to the heading', async ({
    page,
    jb,
  }) => {
    const category = new CategoryPage(page);
    await jb.open('category.long');
    await expect(category.cards).toHaveCount(16);
    // Given the API serves each page of the long category
    const asked: string[] = [];
    await page.route('**/api/categories/*/listings?*', async (route) => {
      const url = new URL(route.request().url());
      asked.push(url.searchParams.get('page') ?? '');
      const response = await route.fetch({ url: url.toString().replace(/page=\d+/, 'page=1') });
      const body = await response.json();
      await route.fulfill({
        json: {
          ...body,
          totalCount: 312,
          matchCount: 312,
          page: Number(url.searchParams.get('page')),
          pageCount: 20,
          businesses: body.businesses.slice(0, 5),
        },
      });
    });
    // When the member opens page 2
    await category.pageLink(2).click();
    // Then
    await expect(page).toHaveURL(/\/c\/home-property\?page=2$/);
    await expect(category.showing).toHaveText('Showing 17–32 of 312');
    expect(asked).toContain('2');
    await expect(category.pageLink(2)).toHaveAttribute('aria-current', 'page');
    await expect(category.heading).toBeFocused();
    await expect(category.pageLinks).toHaveText(['‹', '1', '2', '3', '…', '20', '›']);
  });

  test('AC3: a page beyond the last shows the nearest valid page', async ({ page, jb }) => {
    const category = new CategoryPage(page);
    // Given ten businesses, so one page; when page 9 is requested
    await jb.goto('/c/home-property?page=9');
    // Then the last page (1) is shown and the URL says so
    await expect(category.cards).toHaveCount(10);
    await expect(category.showing).toHaveText('Showing all 10');
    await expect(page).toHaveURL(/\/c\/home-property$/);

    // And a page below 1 shows page 1
    await jb.goto('/c/home-property?page=0');
    await expect(category.cards).toHaveCount(10);
    await expect(page).toHaveURL(/\/c\/home-property$/);
  });

  test('AC4: with 16 or fewer businesses there is no pagination and the footer reads "Showing all {n}"', async ({
    page,
    jb,
  }) => {
    const category = new CategoryPage(page);
    await jb.open('category');
    await expect(category.showing).toHaveText('Showing all 10');
    await expect(category.pagination).toHaveCount(0);
  });
});

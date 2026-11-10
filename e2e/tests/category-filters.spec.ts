import { expect, test } from '../fixtures/jb-test';
import { CategoryPage } from '../pages/category.page';

// Category filters and sorting: L2-024 and L2-025, against the seeded Home & property category.
// Three businesses take emergency calls; four offer a free quote and serve East York.

test.describe('filters as inline chips, from 768 px (L2-024)', () => {
  test.beforeEach(async ({ page }) => {
    await new CategoryPage(page).setWidth(1280);
  });

  test('AC1: pressing "Emergency calls" presses the chip and narrows the list', async ({
    page,
    jb,
  }) => {
    const category = new CategoryPage(page);
    await jb.open('category');
    await expect(category.chip('Emergency calls')).toHaveAttribute('aria-pressed', 'false');

    await category.chip('Emergency calls').click();

    await expect(category.chip('Emergency calls')).toHaveAttribute('aria-pressed', 'true');
    await expect(category.cardNames()).toHaveText([
      'WaterWorks Plumbing & Drains',
      'Cornerstone Electric',
      'Shepherd’s Heating & Cooling',
    ]);
    await expect(category.subtitle).toHaveText('3 of 10 businesses match your filters');
    await expect(page).toHaveURL(/\/c\/home-property\?offers=emergency-calls$/);

    // Pressing it again removes the filter
    await category.chip('Emergency calls').click();
    await expect(category.cards).toHaveCount(10);
    await expect(page).toHaveURL(/\/c\/home-property$/);
  });

  test('AC3: filters in one group match any of them; across groups all groups must match', async ({
    page,
    jb,
  }) => {
    const category = new CategoryPage(page);
    await jb.open('category');
    // Any of two offers
    await category.chip('Emergency calls').click();
    await category.chip('Open Saturdays').click();
    await expect(category.cards).toHaveCount(3);
    // …and one of the areas
    await category.chip('Serves Etobicoke').click();
    await expect(category.cardNames()).toHaveText([
      'Cornerstone Electric',
      'Shepherd’s Heating & Cooling',
    ]);
    await expect(page).toHaveURL(
      /\/c\/home-property\?offers=emergency-calls,open-saturdays&areas=etobicoke$/,
    );
  });

  test('AC4: filters that match nothing explain why and offer two ways back', async ({
    page,
    jb,
  }) => {
    const category = new CategoryPage(page);
    await jb.open('category');
    await category.chip('Emergency calls').click();
    await category.chip('Open Saturdays').click();
    await category.chip('Serves Scarborough').click();

    await expect(category.subtitle).toHaveText('0 of 10 businesses match your filters');
    await expect(category.emptyState).toContainText('No businesses match these filters');
    // A suggestion naming the count a single removal would give
    await expect(category.emptyState).toContainText(
      'Try removing one. Without “Serves Scarborough”, 3 businesses match.',
    );
    // The chips stay visible
    await expect(category.chip('Serves Scarborough')).toHaveAttribute('aria-pressed', 'true');
    await expect(category.chips).toHaveCount(8);

    // A button removes the most recent filter
    await category.stateButton('Remove “Serves Scarborough”').click();
    await expect(category.cards).toHaveCount(3);
    await expect(category.chip('Serves Scarborough')).toHaveAttribute('aria-pressed', 'false');
  });

  test('AC4: the most recent filter is the one offered for removal, and "Clear all filters" clears', async ({
    page,
    jb,
  }) => {
    const category = new CategoryPage(page);
    await jb.open('category');
    await category.chip('Serves Scarborough').click();
    await category.chip('Open Saturdays').click();
    await expect(category.emptyState).toContainText('No businesses match these filters');
    await expect(category.stateButton('Remove “Open Saturdays”')).toBeVisible();

    await category.stateAction('Clear all filters').click();
    await expect(category.cards).toHaveCount(10);
    await expect(page).toHaveURL(/\/c\/home-property$/);
  });

  test('AC5: a copied URL applies the same filters and sort elsewhere', async ({ page, jb }) => {
    const category = new CategoryPage(page);
    await jb.goto('/c/home-property?offers=free-quote&areas=east-york&sort=name');
    await expect(category.chip('Free quote')).toHaveAttribute('aria-pressed', 'true');
    await expect(category.chip('Serves East York')).toHaveAttribute('aria-pressed', 'true');
    await expect(category.sort).toHaveValue('name');
    await expect(category.cardNames()).toHaveText([
      'Ace Waterproofing',
      'Atera Construction and Renovation',
      'Good Ground Landscaping',
      'Moore’s Cleaning Service',
    ]);
  });

  test('AC6: filter values outside the allowed set are ignored', async ({ page, jb }) => {
    const category = new CategoryPage(page);
    await jb.goto('/c/home-property?offers=free-beer,emergency-calls&areas=atlantis&sort=price');
    await expect(category.cards).toHaveCount(3);
    await expect(category.chip('Emergency calls')).toHaveAttribute('aria-pressed', 'true');
    await expect(category.sort).toHaveValue('recommended');
    await expect(category.chips.and(page.locator('[aria-pressed="true"]'))).toHaveCount(1);
  });

  test('changing a filter returns to page 1', async ({ page, jb }) => {
    const category = new CategoryPage(page);
    await jb.open('category.long');
    await page.unroute('**/api/categories/*/listings?*');
    await jb.goto('/c/home-property?page=1&sort=newest');
    const reloaded = page.waitForResponse(/listings\?offers=free-quote&sort=newest&page=1$/);
    await category.chip('Free quote').click();
    await expect(page).toHaveURL(/\/c\/home-property\?offers=free-quote&sort=newest$/);
    await reloaded;
  });
});

test.describe('filters in a sheet, under 768 px (L2-024)', () => {
  test.beforeEach(async ({ page }) => {
    await new CategoryPage(page).setWidth(360);
  });

  test('AC2: "Filters" opens a sheet with offers, areas, sort, "Clear all" and a live count', async ({
    page,
    jb,
  }) => {
    const category = new CategoryPage(page);
    const { filters } = category;
    await jb.open('category');
    await category.openFilters();

    await expect(filters.title).toBeVisible();
    await expect(filters.boxesIn(filters.offers)).toHaveText([
      'Free quote',
      'Emergency calls',
      'Open Saturdays',
    ]);
    await expect(filters.boxesIn(filters.areas)).toHaveText([
      'Scarborough',
      'North York',
      'East York',
      'Etobicoke',
      'Downtown',
    ]);
    await expect(filters.sort).toHaveValue('recommended');
    await expect(filters.clearAll).toBeVisible();
    await expect(filters.show).toHaveText('Show 10 businesses');

    // The count follows the boxes as they are ticked
    await filters.box('Free quote').check();
    await expect(filters.show).toHaveText('Show 8 businesses');
    await filters.box('East York').check();
    await expect(filters.show).toHaveText('Show 4 businesses');
    // Nothing is applied until the member says so
    await expect(category.cards).toHaveCount(10);

    await filters.show.click();
    await expect(filters.root).toHaveCount(0);
    await expect(category.cards).toHaveCount(4);
    await expect(category.filtersButton).toHaveText('Filters · 2');
    await expect(page).toHaveURL(/\/c\/home-property\?offers=free-quote&areas=east-york$/);
  });

  test('the sheet opens with the applied filters ticked, and "Clear all" unticks them', async ({
    page,
    jb,
  }) => {
    const category = new CategoryPage(page);
    const { filters } = category;
    await jb.open('filters');
    await category.openFilters();
    await expect(filters.box('Free quote')).toBeChecked();
    await expect(filters.box('East York')).toBeChecked();
    await expect(filters.show).toHaveText('Show 4 businesses');

    await filters.clearAll.click();
    await expect(filters.box('Free quote')).not.toBeChecked();
    await expect(filters.show).toHaveText('Show 10 businesses');
    await filters.show.click();
    await expect(category.cards).toHaveCount(10);
  });

  test('Escape closes the sheet without applying, and focus returns to "Filters"', async ({
    page,
    jb,
  }) => {
    const category = new CategoryPage(page);
    const { filters } = category;
    await jb.open('category');
    await category.openFilters();
    await filters.box('Emergency calls').check();
    await filters.pressEscape();
    await expect(filters.root).toHaveCount(0);
    await expect(category.cards).toHaveCount(10);
    await expect(category.filtersButton).toBeFocused();
  });

  test('the sheet sorts as well', async ({ page, jb }) => {
    const category = new CategoryPage(page);
    await jb.open('category');
    await category.openFilters();
    await category.filters.sort.selectOption({ label: 'Name A–Z' });
    await category.filters.show.click();
    await expect(page).toHaveURL(/\/c\/home-property\?sort=name$/);
    await expect(category.card(0).name).toHaveText('Ace Waterproofing');
  });
});

test.describe('sorting (L2-025)', () => {
  test('AC3: "Recommended" is the default order', async ({ page, jb }) => {
    const category = new CategoryPage(page);
    await jb.open('category');
    await expect(category.sort.locator('option')).toHaveText(['Recommended', 'Newest', 'Name A–Z']);
    await expect(category.sort).toHaveValue('recommended');
    await expect(category.cardNames().first()).toHaveText('WaterWorks Plumbing & Drains');
  });

  test('AC1: "Name A–Z" orders by name and is kept in the URL', async ({ page, jb }) => {
    const category = new CategoryPage(page);
    await jb.open('category');
    await category.sortBy('Name A–Z');
    await expect(page).toHaveURL(/\/c\/home-property\?sort=name$/);
    const names = await category.cardNames().allTextContents();
    expect(names).toHaveLength(10);
    expect(names).toEqual(
      [...names].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' })),
    );
  });

  test('AC1: "Name A–Z" ignores a leading "The"', async ({ page, jb }) => {
    const category = new CategoryPage(page);
    await jb.goto('/c/learning?sort=name');
    // "The Revelation Centre" sorts under R, before "Talent Can Be Taught"
    await expect(category.cardNames()).toHaveText([
      'The Revelation Centre',
      'Talent Can Be Taught',
    ]);
  });

  test('AC2: "Newest" asks for the newest-first order', async ({ page, jb }) => {
    const category = new CategoryPage(page);
    await jb.open('category');
    const answer = page.waitForResponse(/listings\?.*sort=newest/);
    await category.sortBy('Newest');
    expect((await answer).status()).toBe(200);
    await expect(page).toHaveURL(/\/c\/home-property\?sort=newest$/);
    await expect(category.cards).toHaveCount(10);
  });
});

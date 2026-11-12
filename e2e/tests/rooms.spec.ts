import { expect, test } from '../fixtures/jb-test';
import { BrowsePage } from '../pages/browse.page';
import { BusinessPage } from '../pages/business.page';
import { CategoryPage } from '../pages/category.page';

// Rooms and rentals in the directory: L2-192 (the shelf on Browse), L2-193 (the category page)
// and L2-194 (the space card), against the recorded answers of the seeded API (ADR 0009): five
// spaces, one or more per term.

test.describe('Rooms & places to stay on Browse (L2-192)', () => {
  test('AC1, AC2: after "Featured this week" it shows the newest four spaces and the term filter', async ({
    page,
    jb,
  }) => {
    const browse = new BrowsePage(page);
    await browse.setWidth(1280);
    await jb.open('browse');

    await expect(browse.rooms).toBeVisible();
    await expect(browse.roomsAll).toHaveText('All 5 rooms and rentals');
    await expect(browse.roomsAll).toHaveAttribute('href', '/c/rooms-rentals');
    await expect(browse.roomsFilter.chips).toHaveText([
      'Any length',
      'Short stays',
      'Long term',
      'Rooms',
      'Roommates',
    ]);
    await expect(browse.roomsFilter.chip('Any length')).toHaveAttribute('aria-pressed', 'true');
    await expect(browse.roomsFilter.chip('Rooms')).toHaveAttribute('aria-pressed', 'false');
    await expect(browse.spaceCards.locator('.space-card__title')).toHaveText([
      'Guest suite near Roncesvalles',
      'Furnished room in a family home, Leslieville',
      'Bright basement apartment in the Annex',
      'Roommate wanted: 3-bedroom house in East York',
    ]);
  });

  test('AC3: "Rooms" shows only rooms, without reloading the page', async ({ page, jb }) => {
    const browse = new BrowsePage(page);
    await jb.open('browse');
    await expect(browse.spaceCards).toHaveCount(4);
    let reads = 0;
    page.on('request', (request) => {
      if (request.url().includes('/api/directory/home')) reads++;
    });

    await browse.roomsFilter.choose('Rooms');

    await expect(browse.roomsFilter.chip('Rooms')).toHaveAttribute('aria-pressed', 'true');
    await expect(browse.roomsFilter.chip('Any length')).toHaveAttribute('aria-pressed', 'false');
    await expect(browse.spaceCards).toHaveCount(1);
    await expect(browse.spaceCard(0).badge).toHaveText('Room');
    expect(reads).toBe(0);
  });

  test('AC4: a term with no space says so and keeps the filter', async ({ page, jb }) => {
    const browse = new BrowsePage(page);
    await jb.open('browse.rooms-empty');

    await browse.roomsFilter.choose('Roommates');

    await expect(browse.spaceCards).toHaveCount(0);
    await expect(browse.roomsEmpty).toHaveText(
      'Nothing listed for this yet. New rooms and rentals are added every week.',
    );
    await expect(browse.roomsEmpty).toHaveAttribute('role', 'status');
    await expect(browse.roomsFilter.chip('Roommates')).toHaveAttribute('aria-pressed', 'true');
  });

  test('AC6, AC7: spaces are not a business group, and the search box invites a room', async ({
    page,
    jb,
  }) => {
    const browse = new BrowsePage(page);
    await browse.setWidth(1280);
    await jb.open('browse');

    await expect(browse.directoryHeading).toHaveText('All 47 businesses');
    await expect(browse.group('Rooms & rentals').root).toHaveCount(0);
    // The hero's search box is the phone's (L2-164 AC4).
    await browse.setWidth(360);
    await expect(browse.heroSearch).toHaveAttribute(
      'placeholder',
      'Plumber, lawyer, room to rent…',
    );
  });
});

test.describe('the space card (L2-194)', () => {
  test('AC1, AC3: term, rent, title, two facts, neighbourhood and availability, named by its title', async ({
    page,
    jb,
  }) => {
    const browse = new BrowsePage(page);
    await jb.open('browse');

    const suite = browse.spaceCard(0);
    await expect(suite.badge).toHaveText('Short stay');
    await expect(suite.price).toHaveText('$120 / night');
    await expect(suite.facts).toHaveText('Queen bed · Private bath');
    await expect(suite.area).toHaveText('Roncesvalles');
    await expect(suite.available).toHaveText('Most weekends');
    await expect(suite.root).toHaveAccessibleName('Guest suite near Roncesvalles');
    await expect(suite.root).toHaveAccessibleDescription('Short stay $120 / night Roncesvalles');

    await expect(browse.spaceCard(1).available).toHaveText('Available now');
    await expect(browse.spaceCard(2).available).toHaveText('From Dec 1');
    await expect(browse.spaceCard(2).price).toHaveText('$1,850 / month');
    await expect(browse.spaceCard(3).badge).toHaveText('Roommate wanted');
  });

  test('AC2: Enter on a card opens the space page', async ({ page, jb }) => {
    const browse = new BrowsePage(page);
    await jb.open('browse');

    await browse.spaceCard(0).root.focus();
    await page.keyboard.press('Enter');

    await expect(page).toHaveURL(/\/b\/roncesvalles-guest-suite$/);
    await expect(new BusinessPage(page).heading).toHaveText('Guest suite near Roncesvalles');
  });
});

test.describe('the "Rooms & rentals" category page (L2-193)', () => {
  test('AC1, AC4: spaces newest first under the term filter, no business filters, then the call to list', async ({
    page,
    jb,
  }) => {
    const category = new CategoryPage(page);
    await category.setWidth(1280);
    await jb.open('category.rooms-rentals');

    await expect(category.breadcrumbItems).toHaveText(['Browse', 'Rooms & rentals']);
    await expect(category.heading).toHaveText('Rooms & rentals');
    await expect(category.subtitle).toHaveText('5 spaces');
    await expect(category.termFilter.chip('Any length')).toHaveAttribute('aria-pressed', 'true');
    await expect(category.spaceCards).toHaveCount(5);
    await expect(category.spaceCard(4).title).toHaveText(
      'Furnished 2-bed condo near Scarborough Town Centre',
    );
    await expect(category.filterChips).toHaveCount(0);
    await expect(category.sort).toHaveCount(0);
    await expect(category.showing).toHaveText('Showing all 5');
    await expect(category.spare).toContainText(
      'Rent it to someone from the community. Free to list.',
    );
    await expect(category.listASpace).toHaveAttribute('href', '/list?kind=space');
  });

  test('AC2: a term narrows the list and goes in the URL; an unknown term is ignored', async ({
    page,
    jb,
  }) => {
    const category = new CategoryPage(page);
    await jb.open('category.rooms-rentals');

    await category.termFilter.choose('Long term');

    await expect(page).toHaveURL(/\/c\/rooms-rentals\?term=long-term$/);
    await expect(category.termFilter.chip('Long term')).toHaveAttribute('aria-pressed', 'true');
    await expect(category.spaceCards).toHaveCount(2);
    await expect(category.subtitle).toHaveText('2 spaces');

    await page.goto('/c/rooms-rentals?term=castle');
    await expect(page).toHaveURL(/\/c\/rooms-rentals$/);
    await expect(category.spaceCards).toHaveCount(5);
  });

  test('AC3: a term with no space says so and keeps the filter', async ({ page, jb }) => {
    const category = new CategoryPage(page);
    await jb.open('category.rooms-rentals-empty');

    await expect(category.emptyState).toHaveText(
      'Nothing listed for this yet. New rooms and rentals are added every week.',
    );
    await expect(category.termFilter.chip('Roommates')).toHaveAttribute('aria-pressed', 'true');
    await expect(category.listASpace).toBeVisible();
  });

  test('AC5: loading shows card placeholders; a failed load names JB-CAT-503', async ({
    page,
    jb,
  }) => {
    const loading = new CategoryPage(page);
    await jb.open('category.rooms-rentals-loading');
    await expect(loading.subtitle).toHaveText('Loading spaces…');
    await expect(loading.skeletons.first()).toBeVisible();

    await jb.open('category.rooms-rentals-error');
    await expect(loading.errorState).toContainText('We couldn’t load this category');
    await expect(loading.errorReference).toHaveText('JB-CAT-503');
  });
});

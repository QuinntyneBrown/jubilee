import { expect, test } from '../fixtures/jb-test';
import { spaceResults, stubSearch } from '../fixtures/stubs';
import { SearchPage } from '../pages/search.page';

const ROOMMATE_HOME = {
  kind: 'business',
  name: 'Roomwell Home Staging',
  slug: 'roomwell-home-staging',
  productSlug: null,
  businessName: 'Roomwell Home Staging',
  categorySlug: 'home-property',
  explanation: null,
};

test.describe('spaces in search (L2-204)', () => {
  test('L2-204 AC1: spaces that match are listed under Businesses as space cards, and counted', async ({
    page,
    jb,
  }) => {
    // Given the query "room" matches a room and a roommate listing
    const search = new SearchPage(page);
    await search.setWidth(1280);
    await stubSearch(page, spaceResults());

    // When the results load
    await jb.goto('/search?q=room');

    // Then both are space cards under Businesses, and the counts include them
    await expect(search.heading).toHaveText('Results for “room”');
    await expect(search.subtitle).toHaveText('2 businesses · 0 services · 0 products');
    await expect(search.tab('Businesses')).toHaveAttribute('aria-selected', 'true');
    await expect(search.spaceCards).toHaveCount(2);
    const room = search.spaceCard(0);
    await expect(room.title).toHaveText('Furnished room in a family home, Leslieville');
    await expect(room.badge).toHaveText('Room');
    await expect(room.price).toHaveText('$950 / month');
    await expect(room.area).toHaveText('Leslieville');
    await expect(room.available).toHaveText('Available now');
    await expect(room.root).toHaveAttribute('href', '/b/furnished-room-leslieville');
    await expect(search.spaceCard(1).badge).toHaveText('Roommate wanted');
    await expect(search.rows).toHaveCount(0);
  });

  test('L2-204 AC1: a business that matches stays a row beside the space cards', async ({
    page,
    jb,
  }) => {
    // Given the query "room" matches two spaces and a business
    const search = new SearchPage(page);
    await search.setWidth(1280);
    await stubSearch(page, spaceResults([ROOMMATE_HOME]));

    // When the results load
    await jb.goto('/search?q=room');

    // Then the spaces are cards and the business is a row
    await expect(search.subtitle).toHaveText('3 businesses · 0 services · 0 products');
    await expect(search.spaceCards).toHaveCount(2);
    await expect(search.rows).toHaveCount(1);
    await expect(search.rowTitle(0)).toHaveText('Roomwell Home Staging');
  });
});

// Acceptance Test
// Traces to: L2-285, L2-289, L2-290
// Description: non-profits have their own category page of business cards with a sort and no
// filters, a closing call to list one, and a shelf of their own on the browse home, apart from
// the businesses.

import { expect, test } from '../fixtures/jb-test';
import { BrowsePage } from '../pages/browse.page';
import { CategoryPage } from '../pages/category.page';

test.describe('non-profits: the category (L2-289)', () => {
  test('AC3: the category lists the non-profits as business cards, with the sort and no filters', async ({
    page,
    jb,
  }) => {
    const category = new CategoryPage(page);
    await category.setWidth(1280);
    await jb.open('category.non-profits');

    await expect(category.breadcrumbItems).toHaveText(['Browse', 'Non-profits']);
    await expect(category.heading).toHaveText('Non-profits');
    await expect(category.subtitle).toHaveText('3 non-profits');
    await expect(category.filterChips).toHaveCount(0);
    await expect(category.filtersButton).toHaveCount(0);
    await expect(category.sort).toHaveValue('recommended');
    await expect(category.cards).toHaveCount(3);

    const hopeHouse = category.cardNamed('Hope House Toronto');
    await expect(hopeHouse.root).toHaveAttribute('href', '/b/hope-house-toronto');
    await expect(hopeHouse.tagline).toHaveText(
      'Meals, beds and friendship for men leaving the shelter system.',
    );
    await expect(hopeHouse.highlight).toHaveText('Volunteers welcome');
    await expect(hopeHouse.categoryLabel).toHaveText('Non-profit');
    await expect(hopeHouse.rating).toHaveCount(0);
    await expect(hopeHouse.root).not.toContainText('Verified');
    await expect(hopeHouse.root).not.toContainText('hopehouse.example');

    await category.setWidth(360);
    await expect(category.filtersButton).toHaveCount(0);
    await expect(category.sort).toBeVisible();
  });

  test('AC4: the sort orders the non-profits by name', async ({ page, jb }) => {
    const category = new CategoryPage(page);
    await jb.open('category.non-profits');
    await category.sortBy('Name A–Z');
    await expect(page).toHaveURL(/sort=name/);
    await expect(category.cardNames()).toHaveText([
      'Bread & Bridges',
      'Hope House Toronto',
      'Lakeshore Youth Collective',
    ]);
  });

  test('AC5: the page ends with the call to list a non-profit', async ({ page, jb }) => {
    const category = new CategoryPage(page);
    await jb.open('category.non-profits');

    await expect(category.lead).toContainText('Lead a Christian non-profit in Toronto?');
    await expect(category.lead).toContainText(
      'List it for free. Supporters go to its own website to give.',
    );
    await expect(category.listANonprofit).toHaveAttribute('href', '/list?kind=nonprofit');
  });

  test('AC6: with no live non-profit it invites a leader to list one', async ({ page, jb }) => {
    const category = new CategoryPage(page);
    await jb.open('category.non-profits-empty');

    await expect(category.heading).toHaveText('Non-profits');
    await expect(category.emptyState).toContainText('No non-profit is listed here yet');
    await expect(category.emptyState).toContainText(
      'Know a Christian ministry or charity in Toronto? Invite them to list free, or list the one you lead.',
    );
    await expect(category.stateAction('List a non-profit')).toHaveAttribute(
      'href',
      '/list?kind=nonprofit',
    );
    await expect(category.stateAction('Browse other categories')).toHaveAttribute('href', '/');
    await expect(category.sort).toHaveCount(0);
  });

  test('AC7: while it loads it shows card skeletons, and a failed load shows JB-CAT-503', async ({
    page,
    jb,
  }) => {
    const category = new CategoryPage(page);
    await jb.open('category.non-profits-loading');
    await expect(category.loadingStatus).toHaveText('Loading non-profits…');
    await expect(category.skeletons.first()).toBeAttached();

    await jb.open('category.non-profits-error');
    await expect(category.errorState).toContainText('We couldn’t load this category');
    await expect(category.errorReference).toHaveText('JB-CAT-503');
  });
});

test.describe('non-profits: the browse home (L2-289 AC1, AC2)', () => {
  test('the chips end with "Non-profits" and the shelf stands apart from the businesses', async ({
    page,
    jb,
  }) => {
    const browse = new BrowsePage(page);
    await jb.open('browse');

    await expect(browse.categoryChips.last()).toHaveText('Non-profits');
    await expect(browse.categoryChips.last()).toHaveAttribute('href', '/c/non-profits');

    await expect(browse.nonprofits).toContainText(
      'Ministries and charities at work across the city.',
    );
    await expect(browse.nonprofitsAll).toHaveText('All 3 non-profits');
    await expect(browse.nonprofitsAll).toHaveAttribute('href', '/c/non-profits');
    await expect(browse.nonprofitCards).toHaveCount(3);
    await expect(browse.nonprofitCard(0).categoryLabel).toHaveText('Non-profit');
    await expect(browse.groupHeadings).not.toContainText(['Non-profits']);
    await expect(browse.directoryHeading).toHaveText(/All 50 businesses/);
  });
});

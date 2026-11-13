// Acceptance Test
// Traces to: L2-248, L2-252, L2-253
// Description: software platforms have their own category page of business cards with a sort
// and no filters, a closing call to list a platform, and a group on the browse home.

import { expect, test } from '../fixtures/jb-test';
import { BrowsePage } from '../pages/browse.page';
import { CategoryPage } from '../pages/category.page';

test.describe('software platforms: the category (L2-252)', () => {
  test('AC2: the category lists the platforms as business cards, with the sort and no filters', async ({
    page,
    jb,
  }) => {
    const category = new CategoryPage(page);
    await category.setWidth(1280);
    await jb.open('category.software-platforms');

    await expect(category.breadcrumbItems).toHaveText(['Browse', 'Software platforms']);
    await expect(category.heading).toHaveText('Software platforms');
    await expect(category.subtitle).toHaveText('3 platforms');
    await expect(category.filterChips).toHaveCount(0);
    await expect(category.filtersButton).toHaveCount(0);
    await expect(category.sort).toHaveValue('recommended');
    await expect(category.cards).toHaveCount(3);
    await expect(category.cardNames()).toContainText(['Lanternread']);
    await expect(category.showing).toHaveText('Showing all 3');

    const lanternread = category.cardNamed('Lanternread');
    await expect(lanternread.root).toHaveAttribute('href', '/b/lanternread');
    await expect(lanternread.tagline).toHaveText('A reading log families keep together');
    await expect(lanternread.highlight).toHaveText('Free for families');
    await expect(lanternread.categoryLabel).toHaveText('Software');
    await expect(lanternread.root).not.toContainText('Verified');
    await expect(lanternread.root).not.toContainText('lanternread.example');

    // Under 768 px there is still no "Filters" button: a platform has no offers and serves no area
    await category.setWidth(360);
    await expect(category.filtersButton).toHaveCount(0);
    await expect(category.sort).toBeVisible();
  });

  test('L2-260 AC3: a platform with three reviews shows its rating on its card, and one with fewer shows none', async ({
    page,
    jb,
  }) => {
    const category = new CategoryPage(page);
    await jb.open('category.software-platforms');

    await expect(category.cardNamed('Lanternread').rating).toHaveText(/4\.3\s*\(4\)/);
    await expect(category.cardNamed('Ledgerleaf').rating).toHaveCount(0);
    await expect(category.cardNamed('Gatherboard').rating).toHaveCount(0);
  });

  test('AC2: the sort orders the platforms by name', async ({ page, jb }) => {
    const category = new CategoryPage(page);
    await jb.open('category.software-platforms');
    await category.sortBy('Name A–Z');
    await expect(page).toHaveURL(/sort=name/);
    await expect(category.cardNames()).toHaveText(['Gatherboard', 'Lanternread', 'Ledgerleaf']);
  });

  test('AC4: the page ends with the call to list a platform', async ({ page, jb }) => {
    const category = new CategoryPage(page);
    await jb.open('category.software-platforms');

    await expect(category.built).toContainText('Built something people use online?');
    await expect(category.built).toContainText(
      'List your platform for free. Members go to your website to use it.',
    );
    await expect(category.listAPlatform).toHaveAttribute('href', '/list?kind=platform');
  });

  test('AC5: with no live platform it invites a founder to list one', async ({ page, jb }) => {
    const category = new CategoryPage(page);
    await jb.open('category.software-platforms-empty');

    await expect(category.heading).toHaveText('Software platforms');
    await expect(category.emptyState).toContainText('No platform is listed here yet');
    await expect(category.emptyState).toContainText(
      'Know a Christian founder in Toronto? Invite them to list free, or list your own platform.',
    );
    await expect(category.stateAction('List a platform')).toHaveAttribute(
      'href',
      '/list?kind=platform',
    );
    await expect(category.stateAction('Browse other categories')).toHaveAttribute('href', '/');
    await expect(category.sort).toHaveCount(0);
  });

  test('AC6: while it loads it shows card skeletons, and a failed load shows JB-CAT-503', async ({
    page,
    jb,
  }) => {
    const category = new CategoryPage(page);
    await jb.open('category.software-platforms-loading');
    await expect(category.loadingStatus).toHaveText('Loading platforms…');
    await expect(category.skeletons.first()).toBeAttached();

    await jb.open('category.software-platforms-error');
    await expect(category.errorState).toContainText('We couldn’t load this category');
    await expect(category.errorReference).toHaveText('JB-CAT-503');
  });
});

test.describe('software platforms: the browse home (L2-252 AC1)', () => {
  test('the chips end with "Software platforms" and the directory has its group', async ({
    page,
    jb,
  }) => {
    const browse = new BrowsePage(page);
    await jb.open('browse');

    await expect(browse.categoryChips.last()).toHaveText('Software platforms');
    await expect(browse.categoryChips.last()).toHaveAttribute('href', '/c/software-platforms');

    const group = browse.group('Software platforms');
    await expect(browse.groupHeadings.last()).toHaveText('Software platforms');
    await expect(group.count).toContainText('3 businesses');
    await expect(group.rows).toHaveCount(3);
    await expect(group.rows.first()).toHaveAttribute('href', /^\/b\//);
  });
});

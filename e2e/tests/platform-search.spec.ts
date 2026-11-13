// Acceptance Test
// Traces to: L2-253
// Description: a software platform is found in search as a business result, with the match
// explained, and its row opens the platform page.

import { expect, test } from '../fixtures/jb-test';
import { SearchPage } from '../pages/search.page';

test.describe('software platforms in search (L2-253)', () => {
  test('AC2: "reading" lists Lanternread under Businesses and explains the match', async ({
    page,
    jb,
  }) => {
    const search = new SearchPage(page);
    await jb.open('search.platforms');

    await expect(search.heading).toHaveText('Results for “reading”');
    await expect(search.subtitle).toHaveText('1 business · 0 services · 0 products');
    await expect(search.tab('Businesses')).toHaveAttribute('aria-selected', 'true');
    await expect(search.rows).toHaveCount(1);
    await expect(search.rowTitles.first()).toHaveText('Lanternread');
    await expect(search.rowTitles.first()).toHaveAttribute('href', '/b/lanternread');
    await expect(search.rowMeta(0)).toHaveText(
      'Software platforms · Matches reading in tagline and what it does',
    );
    await expect(search.marks.first()).toHaveText('reading');
    await expect(search.row(0)).not.toContainText('lanternread.example');
  });

  test('AC2: the web address is not searched', async ({ page, jb }) => {
    const search = new SearchPage(page);
    await jb.goto('/search?q=lanternread.example');

    await expect(search.rows).toHaveCount(0);
  });
});

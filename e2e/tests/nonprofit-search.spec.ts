// Acceptance Test
// Traces to: L2-290
// Description: search finds non-profits by their own words and shows them under a "Non-profits"
// tab of their own, never counted among the businesses; the tab is there only when one matched.

import { expect, test } from '../fixtures/jb-test';
import { SearchPage } from '../pages/search.page';

test.describe('non-profits in search (L2-290)', () => {
  test('AC2: a search that finds only non-profits opens the "Non-profits" tab, counted apart', async ({
    page,
    jb,
  }) => {
    const search = new SearchPage(page);
    await jb.open('search.non-profits');

    await expect(search.heading).toHaveText('Results for “youth”');
    await expect(search.subtitle).toHaveText(
      '0 businesses · 0 services · 0 products · 2 non-profits',
    );
    await expect(search.tabButtons).toHaveText([
      'Businesses 0',
      'Services 0',
      'Products 0',
      'Non-profits 2',
    ]);
    await expect(search.tab('Non-profits')).toHaveAttribute('aria-selected', 'true');
    await expect(search.rowTitles).toHaveText(
      ['Bread & Bridges', 'Lakeshore Youth Collective'].sort(),
    );
    await expect(search.row(0).getByRole('link', { name: 'Bread & Bridges' })).toHaveAttribute(
      'href',
      '/b/bread-and-bridges',
    );
    await expect(search.rowMeta(0)).toContainText('Non-profits · Matches youth in who it serves');
    await expect(search.marks.first()).toHaveText('youth');
  });

  test('AC2: a search that finds no non-profit has no "Non-profits" tab and says nothing of them', async ({
    page,
    jb,
  }) => {
    const search = new SearchPage(page);
    await jb.open('search.platforms');

    await expect(search.tabButtons.first()).toBeVisible();
    await expect(search.tab('Non-profits')).toHaveCount(0);
    await expect(search.subtitle).not.toContainText('non-profit');
  });

  test('AC2: the arrow keys reach the "Non-profits" tab, the last, wrapping from the first (L2-158)', async ({
    page,
    jb,
  }) => {
    const search = new SearchPage(page);
    await jb.open('search.non-profits');

    await search.tab('Businesses').focus();
    await page.keyboard.press('ArrowLeft');
    await expect(search.tab('Non-profits')).toBeFocused();
  });
});

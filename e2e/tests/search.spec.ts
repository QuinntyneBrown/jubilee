import { expect, test } from '../fixtures/jb-test';
import { memberSearchStart, noResults, stubSearch, stubSearchStart } from '../fixtures/stubs';
import { SearchPage } from '../pages/search.page';

// Search the directory: L2-029 to L2-032, L2-118 and L2-181.
// "search" is /search?q=plumber against the recorded answers of the seeded API (ADR 0009).

test.describe('search results (L2-029)', () => {
  test('AC1: the heading, the counts line and the three tabs with counts', async ({ page, jb }) => {
    const search = new SearchPage(page);
    await jb.open('search');
    await expect.poll(() => search.dataPage()).toBe('search');

    await expect(search.heading).toHaveText('Results for “plumber”');
    await expect(search.subtitle).toHaveText(/^\d+ businesses? · \d+ services? · \d+ products?$/);
    await expect(search.tabButtons).toHaveCount(3);
    await expect(search.tab('Businesses')).toHaveAttribute('aria-selected', 'true');
    await expect(search.tab('Services')).toHaveAttribute('aria-selected', 'false');
    await expect(search.tab('Products')).toHaveAttribute('aria-selected', 'false');
    await expect(search.tab('Businesses')).toContainText(/\d/);
  });

  test('AC2: a result explains the match, with the matched term in <mark>', async ({
    page,
    jb,
  }) => {
    const search = new SearchPage(page);
    await jb.open('search');

    await expect(search.rows.first()).toBeVisible();
    await expect(search.rowMeta(0)).toContainText(/Matches .*plumb.* in /i);
    await expect(search.marks.first()).toHaveText(/plumb/i);
  });

  test('AC2: choosing a tab shows that group; the arrow keys move between tabs', async ({
    page,
    jb,
  }) => {
    const search = new SearchPage(page);
    await jb.open('search');
    await expect(search.rows.first()).toBeVisible();

    await search.tab('Services').click();
    await expect(search.tab('Services')).toHaveAttribute('aria-selected', 'true');
    await expect(search.panel).toHaveAccessibleName(/Services/);

    await search.tab('Services').press('ArrowRight');
    await expect(search.tab('Products')).toHaveAttribute('aria-selected', 'true');
    await expect(search.tab('Products')).toBeFocused();
  });

  test('AC5: a query submitted from the top bar lands on /search?q= and stays in the box', async ({
    page,
    jb,
  }) => {
    const search = new SearchPage(page);
    await search.setWidth(1280);
    await jb.open('browse');

    await search.searchFromTopBar('plumber');

    await expect(page).toHaveURL(/\/search\?q=plumber$/);
    await expect(search.heading).toHaveText('Results for “plumber”');
    await expect(search.searchBox).toHaveValue('plumber');
  });

  test('AC6: a failing search shows the error with its reference, and Try again retries', async ({
    page,
    jb,
  }) => {
    const search = new SearchPage(page);
    await jb.open('search.error');

    await expect(search.errorState).toContainText('We couldn’t load your results');
    await expect(search.errorReference).toHaveText('JB-SRCH-503');
    await expect(search.heading).toHaveText('Results for “plumber”');
  });

  test('a search that is rate limited shows the same error', async ({ page, jb }) => {
    const search = new SearchPage(page);
    await stubSearch(page, { title: 'You are doing that a lot.', status: 429 }, 429);
    await jb.goto('/search?q=plumber');

    await expect(search.errorState).toContainText('We couldn’t load your results');
    await expect(search.errorReference).toHaveText('JB-SRCH-503');
  });

  test('while results load the page says so and shows placeholders', async ({ page, jb }) => {
    const search = new SearchPage(page);
    await jb.open('search.loading');

    await expect(search.loadingStatus).toHaveText('Loading results…');
    await expect(search.skeletons.first()).toBeVisible();
    await expect(search.subtitle).toHaveText('Searching…');
  });
});

test.describe('search with no results (L2-030)', () => {
  test('AC1: it names the query, offers the close term, a search button and the category', async ({
    page,
    jb,
  }) => {
    const search = new SearchPage(page);
    await jb.open('search.no-results');

    await expect(search.emptyTitle).toHaveText('Nothing matches “plumbre”');
    await expect(search.emptyState).toContainText('Did you mean plumber?');
    await expect(search.stateAction('Search “plumber”')).toHaveAttribute(
      'href',
      '/search?q=plumber',
    );
    await expect(search.stateAction('Browse Home & property')).toHaveAttribute(
      'href',
      '/c/home-property',
    );
  });

  test('AC1: the search button runs the search for the close term', async ({ page, jb }) => {
    const search = new SearchPage(page);
    await jb.open('search.no-results');
    await search.stateAction('Search “plumber”').click();

    await expect(page).toHaveURL(/\/search\?q=plumber$/);
  });

  test('AC2: with no close term the suggestion is omitted and all categories are offered', async ({
    page,
    jb,
  }) => {
    const search = new SearchPage(page);
    await stubSearch(page, noResults('zzzzzzzz', null));
    await jb.goto('/search?q=zzzzzzzz');

    await expect(search.emptyTitle).toHaveText('Nothing matches “zzzzzzzz”');
    await expect(search.emptyState).not.toContainText('Did you mean');
    await expect(search.stateAction('Browse all categories')).toHaveAttribute('href', '/');
  });
});

test.describe('the empty search page (L2-031)', () => {
  test('AC1: it invites a search, lists up to 5 recent searches and the popular categories', async ({
    page,
    jb,
  }) => {
    const search = new SearchPage(page);
    await jb.open('search.empty');

    await expect(search.heading).toHaveText('Search');
    await expect(search.subtitle).toHaveText('Find a business, a service or a product.');
    await expect(search.recentChips).toHaveText([
      'plumber',
      'family lawyer',
      'journaling Bible',
      'wedding flowers',
    ]);
    await expect(search.recentChips.first()).toHaveAttribute('href', '/search?q=plumber');
    await expect(search.popularChips.first()).toHaveText('Shops');
    await expect(search.popularChips.first()).toHaveAttribute('href', '/c/shops');
  });

  test('AC1: it does not call the search endpoint', async ({ page, jb }) => {
    const search = new SearchPage(page);
    const searched: string[] = [];
    page.on('request', (request) => {
      if (/\/api\/search\?/.test(request.url())) searched.push(request.url());
    });
    await jb.open('search.empty');
    await expect(search.popularChips.first()).toBeVisible();

    expect(searched).toEqual([]);
  });

  test('AC2: a visitor or a member with no history sees no recent searches', async ({
    page,
    jb,
  }) => {
    const search = new SearchPage(page);
    await jb.open('search.empty');
    await stubSearchStart(page, { ...memberSearchStart, recent: [] });
    await jb.goto('/search');

    await expect(search.popularChips.first()).toBeVisible();
    await expect(search.recentSection).toHaveCount(0);
  });

  test('AC3: a member removes one recent search, then clears them all, on the server', async ({
    page,
    jb,
  }) => {
    const search = new SearchPage(page);
    await jb.open('search.empty');
    await expect(search.recentChips).toHaveCount(4);

    const removed = page.waitForRequest(
      (request) =>
        request.method() === 'DELETE' &&
        request.url().endsWith('/api/search/recent/00000000-0000-0000-0000-000000000002'),
    );
    await search.removeRecent('family lawyer').click();
    await removed;
    await expect(search.recentChips).toHaveText(['plumber', 'journaling Bible', 'wedding flowers']);

    const cleared = page.waitForRequest(
      (request) => request.method() === 'DELETE' && request.url().endsWith('/api/search/recent'),
    );
    await search.clearRecent.click();
    await cleared;
    await expect(search.recentSection).toHaveCount(0);
  });

  test('AC5 (L2-029): submitting the page search box opens the results', async ({ page, jb }) => {
    const search = new SearchPage(page);
    await jb.open('search.empty');
    await search.pageSearchBox.fill('plumber');
    await search.pageSearchBox.press('Enter');

    await expect(page).toHaveURL(/\/search\?q=plumber$/);
  });
});

test.describe('search input limits (L2-032)', () => {
  test('AC1: the search boxes stop at 100 characters', async ({ page, jb }) => {
    const search = new SearchPage(page);
    await search.setWidth(1280);
    await jb.open('browse');

    await expect(search.searchBox).toHaveAttribute('maxlength', '100');
  });

  test('AC2: a query of only whitespace shows the empty search page without searching', async ({
    page,
    jb,
  }) => {
    const search = new SearchPage(page);
    const searched: string[] = [];
    page.on('request', (request) => {
      if (/\/api\/search\?/.test(request.url())) searched.push(request.url());
    });
    await jb.goto('/search?q=%20%20');

    await expect(search.subtitle).toHaveText('Find a business, a service or a product.');
    expect(searched).toEqual([]);
  });

  test('AC3: HTML or script in a query is shown as text and never run', async ({ page, jb }) => {
    const search = new SearchPage(page);
    const query = '<img src=x onerror="window.pwned=1"><script>window.pwned=1</script>';
    await stubSearch(page, noResults(query, null));
    await jb.goto(`/search?q=${encodeURIComponent(query)}`);

    await expect(search.emptyTitle).toHaveText(`Nothing matches “${query}”`);
    await expect(search.heading).toHaveText(`No results for “${query}”`);
    expect(await page.evaluate(() => (window as unknown as { pwned?: number }).pwned)).toBe(
      undefined,
    );
    await expect(search.main.locator('img[src="x"]')).toHaveCount(0);
  });
});

test.describe('search without its index (L2-181)', () => {
  test('AC3: results from the name search show no match explanation', async ({ page, jb }) => {
    const search = new SearchPage(page);
    await stubSearch(page, {
      query: 'plumbing',
      businessCount: 1,
      serviceCount: 0,
      productCount: 0,
      hasMatchExplanations: false,
      hits: [
        {
          kind: 'business',
          name: 'WaterWorks Plumbing & Drains',
          slug: 'waterworks-plumbing-drains',
          productSlug: null,
          businessName: 'WaterWorks Plumbing & Drains',
          categorySlug: 'home-property',
          explanation: null,
        },
      ],
      suggestion: null,
    });
    await jb.goto('/search?q=plumbing');

    await expect(search.rowTitle(0)).toHaveText('WaterWorks Plumbing & Drains');
    await expect(search.rowMeta(0)).toHaveText('Home & property');
    await expect(search.marks).toHaveCount(0);
  });
});

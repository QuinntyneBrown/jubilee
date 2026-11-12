import { test } from '../../../e2e/fixtures/demo';
import {
  noResults,
  searchHit,
  searchResultsOf,
  stubSearch,
  unstubSearch,
} from '../../../e2e/fixtures/stubs';
import { SearchPage } from '../../../e2e/pages/search.page';

// Video 04: journey 3, search the directory. A member searches from the top bar, reads the grouped
// results, meets the no-results and the empty search page, and sees a paused listing leave the
// next search, against the recorded API and the stubs of search.spec.ts (ADR 0009); the cards say
// what the run settled behind the screen. Built by `node tools/video-demo/build.mjs`
// (docs/videos/README.md).

test('journey 3: search the directory', async ({ demo }) => {
  const search = new SearchPage(demo.page);
  const searchFor = async (query: string) => {
    await search.searchBox.fill('');
    await demo.type(search.searchBox, query);
    await search.searchBox.press('Enter');
  };

  await demo.jb.open('browse');
  await search.searchBox.waitFor();
  await demo.card('Journey 3 · Search the directory', [
    'Anyone searches businesses, services and products by keyword and sees grouped results.',
    'This run: from 85% to complete.',
  ]);
  await demo.scene('intro');

  await demo.hideCard();
  await demo.scene('search', async () => {
    await searchFor('plumber');
    await search.rows.first().waitFor();
    await demo.point(search.heading);
    await demo.point(search.subtitle);
  });

  await demo.scene('explain', async () => {
    await demo.point(search.marks.first());
    await demo.pause(1500);
    await demo.point(search.rowMeta(1));
  });

  await demo.scene('tabs', async () => {
    await searchFor('bibles');
    await search.rows.first().waitFor();
    await demo.point(search.tab('Businesses'));
    await demo.pause(1200);
    await demo.click(search.tab('Products'));
    await demo.point(search.rowTitle(0));
  });

  await stubSearch(
    demo.page,
    noResults('plumbre', { closeTerm: 'plumber', categorySlug: 'home-property' }),
  );
  await demo.scene('no-results', async () => {
    await searchFor('plumbre');
    await search.emptyTitle.waitFor();
    await demo.point(search.emptyTitle);
    await demo.point(search.stateAction('Browse Home & property'));
    await demo.pause(1200);
    await unstubSearch(demo.page);
    await demo.click(search.stateAction('Search “plumber”'));
    await search.rows.first().waitFor();
  });

  await demo.scene('empty', async () => {
    await demo.jb.open('search.empty');
    await search.recentChips.first().waitFor();
    await demo.point(search.recentChips.first());
    await demo.point(search.popularChips.first());
    await demo.pause(1200);
    await demo.click(search.removeRecent('family lawyer'));
  });

  const waterworks = searchHit('business', 'Plumbing by Waterworks', 'waterworks');
  const heating = searchHit('business', 'Plumbing and Heating Co.', 'plumbing-heating');
  await stubSearch(demo.page, searchResultsOf('plumbing', [waterworks, heating]));
  await demo.scene('current-before', async () => {
    await searchFor('plumbing');
    await search.rows.first().waitFor();
    await demo.point(search.subtitle);
    await demo.point(search.rowTitle(1));
  });

  // Its owner pauses Plumbing and Heating Co.: the next search is answered without it.
  await stubSearch(demo.page, noResults('roofing', null));
  await demo.scene('current-after', async () => {
    await searchFor('roofing');
    await search.emptyTitle.waitFor();
    await stubSearch(demo.page, searchResultsOf('plumbing', [waterworks]));
    await searchFor('plumbing');
    await search.rows.first().waitFor();
    await demo.point(search.subtitle);
    await demo.point(search.rowTitle(0));
  });

  // The pointer leaves the picture before the cards cover it.
  await demo.page.mouse.move(1270, 715, { steps: 12 });
  await demo.card('Search reads the listings themselves', [
    'DatabaseSearchIndex analyses the public listings, their services and their products at the time of the query.',
    'ADR 0011, amended: this is the final design. No separate index, no SearchIndexingJob, no outbox message for search.',
    'L2-029 AC7: every change to a listing, a service or a product shows in the next search.',
  ]);
  await demo.scene('decision');

  await demo.card('Proved through the API’s own endpoints', [
    'SearchCurrencyTests.cs, 21 tests: pause and resume, an edit, a service, a product, an approval, a moderation hold, a deletion.',
    'L2-028 AC1: a draft, paused, deleted or held listing is never found. L2-181 AC3: nor by the fallback name search.',
    'search.spec.ts: each tab lists its kind (AC1), a search made again (AC7), Try again (AC6).',
  ]);
  await demo.scene('tests');

  await demo.hideCard();
  await unstubSearch(demo.page);
  await demo.scene('error', async () => {
    await demo.jb.open('search.error');
    await search.errorState.waitFor();
    await demo.point(search.errorReference);
    await demo.pause(2500);
    await unstubSearch(demo.page);
    await demo.click(search.tryAgain);
    await search.rows.first().waitFor();
  });

  await demo.page.mouse.move(1270, 715, { steps: 12 });
  await demo.card('Journey 3 is complete', [
    'L2-029, L2-181 and L2-182, the search design and its diagrams describe the code as built.',
    'Left for the owner: the visual, responsive and accessibility sweeps.',
    'Deferred: search latency under load (the performance designs).',
  ]);
  await demo.scene('close');
});

import { test } from '../../../e2e/fixtures/demo';
import { browseHomeFromMock } from '../../../e2e/fixtures/mock-data';
import { stubBrowseHome } from '../../../e2e/fixtures/stubs';
import { BrowsePage } from '../../../e2e/pages/browse.page';
import { CategoryPage } from '../../../e2e/pages/category.page';
import { WelcomePage } from '../../../e2e/pages/welcome.page';

// Video 03: journey 1, discover businesses. A visitor goes from the welcome page to the browse
// home and a filtered category, against the recorded API (ADR 0009); the cards say what the run
// settled behind the screen. Built by `node tools/video-demo/build.mjs` (docs/videos/README.md).

test('journey 1: discover businesses', async ({ demo }) => {
  const welcome = new WelcomePage(demo.page);
  const browse = new BrowsePage(demo.page);
  const category = new CategoryPage(demo.page);

  await demo.jb.open('welcome');
  await welcome.countLine.waitFor();
  await demo.card('Journey 1 · Discover businesses', [
    'A visitor explores the welcome page, browses home and opens a category with its filters.',
    'This run: from 93% to complete.',
  ]);
  await demo.scene('intro');

  await demo.hideCard();
  await demo.scene('welcome', async () => {
    await demo.point(welcome.heading);
    await demo.point(welcome.countLine);
  });

  await demo.scene('welcome-more', async () => {
    await demo.point(welcome.categoryLinks.nth(4));
    await demo.scroll(420);
    await demo.point(welcome.steps.nth(1));
    await demo.scroll(380);
    await demo.point(welcome.featuredCards.first());
  });

  await demo.scene('browse', async () => {
    await demo.scroll(-800);
    await demo.click(welcome.browseBusinesses);
    await browse.directoryHeading.waitFor();
    await demo.point(browse.joinPanelAction);
  });

  await demo.scene('groups', async () => {
    await browse.directoryHeading.scrollIntoViewIfNeeded();
    await demo.point(browse.directoryHeading);
    await demo.scroll(260);
    await demo.point(browse.group('Home & property').seeAll);
  });

  // The answer of a directory in which no Learning business is live (L2-021 AC4).
  const directory = browseHomeFromMock('default');
  directory.groups = directory.groups.filter((group) => group.slug !== 'learning');
  await stubBrowseHome(demo.page, directory);
  await demo.scene('empty-group', async () => {
    await demo.jb.open('browse.signed-out');
    await browse.directoryHeading.waitFor();
    await browse.group('Media').root.scrollIntoViewIfNeeded();
    await demo.point(browse.group('Business & tech').heading);
    await demo.pause(900);
    await demo.point(browse.group('Media').heading);
  });

  await demo.scene('category', async () => {
    await demo.click(browse.categoryChip('Home & property'));
    await category.cards.first().waitFor();
    await demo.point(category.heading);
    await demo.point(category.subtitle);
  });

  await demo.scene('filter', async () => {
    await demo.click(category.chip('Emergency calls'));
    await demo.point(category.subtitle);
    await demo.point(category.cards.first());
  });

  await demo.scene('sort', async () => {
    await demo.click(category.chip('Emergency calls'));
    await demo.point(category.sort);
    await category.sortBy('Name A–Z');
    await demo.point(category.cards.first());
    await demo.scroll(300);
  });

  // The pointer leaves the picture before the cards cover it.
  await demo.page.mouse.move(1270, 715, { steps: 12 });
  await demo.card('A change reaches the cached pages', [
    'Welcome, browse home and each category page are cached for 60 seconds (L2-156).',
    'DirectoryCacheInvalidationInterceptor removes them when the API saves a listing, product, service or featured slot.',
    'ADR 0003: this is the designed path. No outbox handler in the worker.',
  ]);
  await demo.scene('cache');

  await demo.card('Proved through the API’s own endpoints', [
    'DirectoryCacheTests.cs: an owner pauses and resumes, a verifier approves, a verifier sets the featured week. Each shows on the next request.',
    'A change the API is not told about is gone within 60 seconds (L2-028).',
    'browse.spec.ts: L2-021 AC4. welcome.spec.ts: L2-027 AC2 on a featured card.',
  ]);
  await demo.scene('tests');

  await demo.card('Journey 1 is complete', [
    'L2-156, the three directory designs and their diagrams describe the code as built.',
    'Left for the owner: the visual, responsive and accessibility sweeps.',
    'Deferred: page weight and latency budgets (the performance designs).',
  ]);
  await demo.scene('close');
});

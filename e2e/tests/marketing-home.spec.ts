import { expect, test } from '../fixtures/jb-test';
import { MarketingHomePage } from '../pages/marketing-home.page';

// The marketing site (L1-026, ADR 0013): a static page, so no recorded API answers are involved.

test.describe('marketing home page (L2-183)', () => {
  test('AC1: the page shows its sections in order, from the top bar to the footer', async ({
    page,
    jb,
  }) => {
    const home = new MarketingHomePage(page);
    // Given anyone, when they open the marketing site
    await jb.open('marketing-home');
    // Then the top bar
    await expect(home.lockup).toHaveText('jubilee');
    await expect(home.sectionLinks).toHaveText([
      'Why Jubilee',
      'How it works',
      'Inside the app',
      'For businesses',
    ]);
    await expect(home.openJubilee).toBeVisible();
    // And the opening
    await expect(home.heading).toHaveText('Toronto’s Christian businesses, in one place.');
    await expect(home.lead).toHaveText(
      'Jubilee is where Toronto’s Christian community finds shops, advisors and trades it can trust. Every business is vouched for by a church, so you can shop, hire and recommend with confidence.',
    );
    await expect(home.startBrowsing).toBeVisible();
    await expect(home.watchTheFilm).toBeVisible();
    await expect(home.note).toHaveText('Free for members · Every business church-verified');
    // And every section heading, in order (AC7: each reads as one sentence)
    await expect(home.headings).toHaveText([
      'See Jubilee in action.',
      'Trust, built in.',
      'From need to handshake.',
      'Shops and services, side by side.',
      'Run a Christian-owned business? Be found.',
      'Your community is open for business.',
    ]);
    // And the footer
    await expect(home.footer).toContainText('Toronto’s Christian marketplace · jubilee.to');
    await expect.poll(() => home.dataPage()).toBe('marketing-home');
  });

  test('AC2: the opening shows a glimpse of the app with four verified businesses', async ({
    page,
    jb,
  }) => {
    const home = new MarketingHomePage(page);
    await jb.open('marketing-home');
    await expect(home.glimpseSearch).toHaveText('Home repairs near Leslieville');
    await expect(home.glimpseCaption).toHaveText('Home & property · 11 verified');
    // Each name carries the Verified mark as text for assistive technology, not as colour alone
    await expect(home.glimpseNames).toHaveText([
      'WaterWorks Plumbing & Drains Verified',
      'Norris Roofing & Contracting Verified',
      'Moore’s Cleaning Service Verified',
      'Tony’s Flooring Centre Verified',
    ]);
    await expect(home.glimpseTaglines).toHaveText([
      'Treating Every Customer As Family',
      'Trusted in Ontario for over 25 years',
      'Enjoy the Freedom of Clean',
      'Family owned and operated since 1961',
    ]);
    await expect(home.glimpseNotes).toHaveText([
      'Vouched for by Grace Toronto Church',
      'WaterWorks replied in 12 min',
    ]);
  });

  test('AC3, AC4 and AC6: the benefits, the steps and the points for businesses', async ({
    page,
    jb,
  }) => {
    const home = new MarketingHomePage(page);
    await jb.open('marketing-home');
    await expect(home.why).toContainText(
      'The recommendations you already ask your church for, gathered in one place and ready when you need them.',
    );
    await expect(home.benefits).toHaveText([
      'Know who you’re dealing with. Every business is vouched for by a pastor or elder before it appears. No more guessing from star ratings.',
      'Keep your money in the community. Every purchase supports a family that shares your faith and your city, and helps them build something lasting.',
      'Find it in seconds, not Sundays. A plumber, a lawyer, a study Bible. Look in one place instead of asking around after service.',
    ]);
    await expect(home.steps).toHaveText([
      'Step 1Look up what you need Browse shops and services by category, or just search for the job in your own words.',
      'Step 2Reach out directly Message, call or book the business yourself. No middleman, no fees on top.',
      'Step 3Pass it on Save the ones you love and share them with friends from church and small group.',
    ]);
    await expect(home.forBusinesses).toContainText(
      'Reach believers across Toronto who would rather buy from someone who shares their faith.',
    );
    await expect(home.points).toHaveText([
      'Customers who already trust youYour church’s word travels with your listing, so first conversations start warm.',
      'A page that sells for youShow your products or services, prices and story. Update it whenever you like.',
      'Free to joinNo listing fees and no cut of your sales. Just honest business, done well.',
    ]);
    await expect(home.listYourBusiness).toBeVisible();
  });

  test('AC5: five business cards, Legacy Financial first and featured', async ({ page, jb }) => {
    const home = new MarketingHomePage(page);
    await jb.open('marketing-home');
    await expect(home.inside).toContainText(
      'From a Sunday altar bouquet to a retirement plan, the people behind every page share your values.',
    );
    await expect(home.seeAll).toHaveText('See all 47 businesses');
    await expect(home.cardNames).toHaveText([
      'Legacy Financial',
      'Flower Creations',
      'Adrianne Sequeira, DMin., RP, RMFT, RN',
      'Luzandre.com',
      'Kevin Marshall, Barrister & Solicitor',
    ]);
    await expect(home.cardTags).toHaveText(['Financial', 'Shop', 'Health', 'Shop', 'Legal']);
    await expect(home.cardTaglines.first()).toHaveText(
      'Build a Legacy. Protect a Legacy. Leave a Legacy.',
    );
    await expect(home.cardHighlights).toHaveText([
      'Free first meeting',
      'Same-day delivery',
      'Accepting new clients',
      'Ships across Canada',
      'Book a consultation',
    ]);
    // The Verified mark is an icon and the word, never colour alone
    await expect(home.cardVerified).toHaveText(Array(5).fill('Verified'));
    await expect(home.cardVerifiedIcons).toHaveCount(5);
    await expect(home.featuredCards).toHaveCount(1);
    await expect(home.featuredCards).toContainText('Legacy Financial');
  });
});

test.describe('pitch film player (L2-184)', () => {
  test('AC1: before play it shows the still, the play button and the length, and fetches no film', async ({
    page,
    jb,
  }) => {
    const home = new MarketingHomePage(page);
    home.watchRequests();
    await jb.open('marketing-home');
    await expect(home.play).toBeVisible();
    await expect(home.filmLength).toHaveText('1:04');
    await expect(home.video).not.toHaveAttribute('controls');
    await expect(home.currentChapter).toHaveCount(0);
    expect(home.filmRequests()).toEqual([]);
  });

  test('AC2: play replaces the still with the film and its controls, from the start', async ({
    page,
    jb,
  }) => {
    const home = new MarketingHomePage(page);
    await jb.open('marketing-home');
    // When the visitor presses play
    await home.play.click();
    // Then the still is gone and the film has the browser's controls
    await expect(home.play).toHaveCount(0);
    await expect(home.video).toHaveAttribute('controls');
    await expect(home.currentChapter).toHaveText('0:00Why we built Jubilee');
    expect(await home.filmTime()).toBeLessThan(5);
  });

  test('AC3: a chapter plays the film from its time and becomes the current one', async ({
    page,
    jb,
  }) => {
    const home = new MarketingHomePage(page);
    await home.withoutFilm();
    await jb.open('marketing-home');
    await expect(home.chapters).toHaveText([
      '0:00Why we built Jubilee',
      '0:21Finding someone you can trust',
      '0:43Growing your business',
    ]);
    // When the visitor chooses the second chapter
    await home.chapter('Finding someone you can trust').click();
    // Then the film stands at 0:21 and that chapter is current
    await expect(home.play).toHaveCount(0);
    await expect(home.currentChapter).toHaveText('0:21Finding someone you can trust');
    await expect.poll(async () => Math.floor(await home.filmTime())).toBeGreaterThanOrEqual(21);
    expect(await home.filmTime()).toBeLessThan(43);
    // And the third chapter moves it on
    await home.chapter('Growing your business').click();
    await expect(home.currentChapter).toHaveText('0:43Growing your business');
    await expect.poll(async () => Math.floor(await home.filmTime())).toBeGreaterThanOrEqual(43);
  });

  test('AC4: "Watch the film" moves the page to the film section', async ({ page, jb }) => {
    const home = new MarketingHomePage(page);
    await jb.open('marketing-home');
    await home.watchTheFilm.click();
    await expect(page).toHaveURL(/#film$/);
    await expect(home.play).toBeInViewport();
  });
});

test.describe('from the marketing site to the app (L2-185)', () => {
  // AC4: one configured address; the development build points at the app on :4200.
  const app = 'http://localhost:4200';

  test('AC1: the browse actions and the cards open the app at its browse home', async ({
    page,
    jb,
  }) => {
    const home = new MarketingHomePage(page);
    await jb.open('marketing-home');
    await expect(home.openJubilee).toHaveAttribute('href', `${app}/`);
    await expect(home.startBrowsing).toHaveAttribute('href', `${app}/`);
    await expect(home.seeAll).toHaveAttribute('href', `${app}/`);
    await expect(home.closingStartBrowsing).toHaveAttribute('href', `${app}/`);
    await expect(home.cards).toHaveCount(5);
    for (const card of await home.cards.all()) {
      await expect(card).toHaveAttribute('href', `${app}/`);
    }
  });

  test('AC2: "List your business free" opens joining with a return to listing', async ({
    page,
    jb,
  }) => {
    const home = new MarketingHomePage(page);
    await jb.open('marketing-home');
    await expect(home.listYourBusiness).toHaveAttribute('href', `${app}/join?returnUrl=%2Flist`);
  });

  test('AC3: a top bar link moves to its section, clear of the sticky top bar', async ({
    page,
    jb,
  }) => {
    const home = new MarketingHomePage(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await jb.open('marketing-home');
    for (const [name, id] of [
      ['How it works', 'how'],
      ['For businesses', 'businesses'],
      ['Why Jubilee', 'why'],
      ['Inside the app', 'inside'],
    ]) {
      await home.sectionLink(name).click();
      await expect(page).toHaveURL(new RegExp(`#${id}$`));
      const heading = home.section(id).getByRole('heading', { level: 2 });
      await expect(heading).toBeInViewport();
      // The section starts at or below the bottom edge of the top bar
      await expect
        .poll(async () => (await home.topOf(home.section(id))) - (await home.topBarHeight()))
        .toBeGreaterThanOrEqual(-1);
    }
  });
});

test.describe('marketing site delivery (L2-186)', () => {
  test('AC1: the page never calls the Jubilee API', async ({ page, jb }) => {
    const home = new MarketingHomePage(page);
    home.watchRequests();
    await jb.open('marketing-home');
    await home.ready();
    expect(home.apiRequests()).toEqual([]);
  });

  for (const width of [360, 576, 768, 992]) {
    test(`AC2: at ${width} px nothing overflows and the top bar keeps the lockup and "Open Jubilee"`, async ({
      page,
      jb,
    }) => {
      const home = new MarketingHomePage(page);
      await page.setViewportSize({ width, height: 800 });
      await jb.open('marketing-home');
      await home.ready();
      expect(await home.horizontalOverflow()).toBe(0);
      await expect(home.lockup).toBeVisible();
      await expect(home.openJubilee).toBeVisible();
      await expect(home.sectionLinks.first()).toBeHidden();
      // The opening stacks its text above the glimpse of the app
      expect(await home.topOf(home.glimpse)).toBeGreaterThan(await home.topOf(home.note));
    });
  }

  test('AC2: at 1280 px the section links show and the glimpse sits beside the text', async ({
    page,
    jb,
  }) => {
    const home = new MarketingHomePage(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await jb.open('marketing-home');
    await home.ready();
    expect(await home.horizontalOverflow()).toBe(0);
    await expect(home.sectionLinks).toHaveCount(4);
    await expect(home.sectionLinks.first()).toBeVisible();
    expect(await home.topOf(home.glimpse)).toBeLessThan(await home.topOf(home.note));
  });

  test('AC3: the page is light on a device set to dark, in Archivo and Inter', async ({
    page,
    jb,
  }) => {
    const home = new MarketingHomePage(page);
    await page.emulateMedia({ colorScheme: 'dark' });
    await jb.open('marketing-home', { theme: 'dark' });
    expect(await home.theme()).toBe('light');
    // Cream paper and ink type, whatever the device prefers
    expect(await home.paperColour()).toBe('rgb(244, 242, 236)');
    expect(await home.fontOf(home.heading)).toMatch(/^"?Archivo/);
    expect(await home.fontOf(home.lead)).toMatch(/^"?Inter/);
  });

  test('AC4: every action is reached by Tab in reading order, with a focus ring', async ({
    page,
    jb,
  }) => {
    const home = new MarketingHomePage(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await jb.open('marketing-home');
    expect(await home.tabThrough(10)).toEqual([
      'Skip to content',
      'Jubilee home',
      'Why Jubilee',
      'How it works',
      'Inside the app',
      'For businesses',
      'Open Jubilee',
      'Start browsing',
      'Watch the film',
      'Play the Jubilee film',
    ]);
    expect(await home.focusRingShown()).toBe(true);
  });

  test('AC5: with reduced motion an in-page link jumps instead of scrolling smoothly', async ({
    page,
    jb,
  }) => {
    const home = new MarketingHomePage(page);
    await jb.open('marketing-home');
    expect(await home.scrollBehaviour()).toBe('smooth');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await home.scrollBehaviour()).toBe('auto');
  });
});

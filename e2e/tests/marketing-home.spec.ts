import { expect, test } from '../fixtures/jb-test';
import { MarketingHomePage } from '../pages/marketing-home.page';

// The marketing site (L1-026, ADR 0013) in its launching-soon state (L1-030, ADR 0044). Its one call
// to the API, GET /api/launch, is answered from the recording.

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
    await expect(home.launchingSoon).toBeVisible();
    // And the opening
    await expect(home.heading).toHaveText('Toronto’s Christian businesses, in one place.');
    await expect(home.badge).toHaveText('Launching soon');
    await expect(home.lead).toHaveText(
      'Jubilee is where Toronto’s Christian community will find shops, advisors and trades it can trust. Every business is verified before it appears. We are launching soon.',
    );
    await expect(home.tellMe).toBeVisible();
    await expect(home.watchTheFilm).toBeVisible();
    await expect(home.note).toHaveText('Not open yet · Free for members at launch');
    // And every section heading, in order (AC7: each reads as one sentence)
    await expect(home.headings).toHaveText([
      'See Jubilee in action.',
      'Our mission.',
      'Trust, built in.',
      'From need to handshake.',
      'Shops and services, side by side.',
      'Run a Christian-owned business? Be found.',
      'Be listed on launch day.',
      'Jubilee is launching soon.',
    ]);
    // And the footer
    await expect(home.footer).toContainText('Toronto’s Christian marketplace · jubilee.to');
    await expect.poll(() => home.dataPage()).toBe('marketing-home');
  });

  test('AC2: the opening shows a preview of the app with four businesses, no count and no reply time', async ({
    page,
    jb,
  }) => {
    const home = new MarketingHomePage(page);
    await jb.open('marketing-home');
    await expect(home.glimpseSearch).toHaveText('Home repairs near Leslieville');
    await expect(home.glimpseCaption).toHaveText('Home & property · a preview');
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
      'Verified by the Jubilee team',
      'Message a business directly',
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
      'Know who you’re dealing with. Every business is verified by the Jubilee team before it appears. No more guessing from star ratings.',
      'Keep your money in the community. Every purchase supports a family that shares your faith and your city, and helps them build something lasting.',
      'Find it in seconds, not Sundays. A plumber, a lawyer, a study Bible. Look in one place instead of asking around after service.',
    ]);
    await expect(home.how).toContainText('This is how Jubilee will work once it is open.');
    await expect(home.steps).toHaveText([
      'Step 1Look up what you need Browse shops and services by category, or just search for the job in your own words.',
      'Step 2Reach out directly Message, call or book the business yourself. No middleman, no fees on top.',
      'Step 3Pass it on Save the ones you love and share them with friends from church and small group.',
    ]);
    await expect(home.forBusinesses).toContainText(
      'Reach believers across Toronto who would rather buy from someone who shares their faith.',
    );
    await expect(home.points).toHaveText([
      'Customers who already trust youThe Verified mark travels with your listing, so first conversations start warm.',
      'A page that sells for youShow your products or services, prices and story. Update it whenever you like.',
      'Free to joinNo listing fees and no cut of your sales. Just honest business, done well.',
    ]);
    await expect(home.sendDetails).toBeVisible();
  });

  test('AC8: the page states the mission word for word', async ({ page, jb }) => {
    const home = new MarketingHomePage(page);
    // Given anyone, when they open the marketing site
    await jb.open('marketing-home');
    // Then "Our mission." follows the film and comes before "Trust, built in."
    await expect(home.missionHeading).toHaveText('Our mission.');
    // And under it stands the mission (L0-001), word for word
    await expect(home.missionStatement).toHaveText(
      'Abiding in Jesus and for love of Him, Jubilee equips Christian business people in Toronto to prosper with purpose and resource His Kingdom.',
    );
  });

  test('AC5: five business cards, Legacy Financial first and featured, none of them a link', async ({
    page,
    jb,
  }) => {
    const home = new MarketingHomePage(page);
    await jb.open('marketing-home');
    await expect(home.inside).toContainText(
      'From a Sunday altar bouquet to a retirement plan, the people behind every page share your values. Here is a preview of the businesses you will find.',
    );
    await expect(home.inside.getByRole('link')).toHaveCount(0);
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

test.describe('launching-soon marketing page (L2-215)', () => {
  test('AC2 and AC3: "Launching soon" and "Tell me when it launches" move to the launch notification, clear of the top bar', async ({
    page,
    jb,
  }) => {
    const home = new MarketingHomePage(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await jb.open('marketing-home');
    for (const link of [home.launchingSoon, home.tellMe]) {
      // When the visitor follows the link
      await home.lockup.click();
      await link.click();
      // Then the page stands at "Jubilee is launching soon."
      await expect(page).toHaveURL(/#notify$/);
      await expect(home.notify.getByRole('heading', { level: 2 })).toBeInViewport();
      await expect
        .poll(async () => (await home.topOf(home.notify)) - (await home.topBarHeight()))
        .toBeGreaterThanOrEqual(-1);
    }
  });

  test('AC3: "Send your business’s details" moves to "Be listed on launch day."', async ({
    page,
    jb,
  }) => {
    const home = new MarketingHomePage(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await jb.open('marketing-home');
    await home.sendDetails.click();
    await expect(page).toHaveURL(/#pre-register$/);
    await expect(home.preRegister.getByRole('heading', { level: 2 })).toBeInViewport();
    await expect
      .poll(async () => (await home.topOf(home.preRegister)) - (await home.topBarHeight()))
      .toBeGreaterThanOrEqual(-1);
  });

  test('AC4: the two launch sections say what each form is for', async ({ page, jb }) => {
    const home = new MarketingHomePage(page);
    await jb.open('marketing-home');
    await expect(home.preRegister).toContainText(
      'Send your business’s details now and the Jubilee team will be in touch before launch to prepare your listing. Sending this form does not list or verify your business: every business is verified before it appears.',
    );
    await expect(home.notify).toContainText(
      'Leave your e-mail address and we will tell you the day Jubilee opens. One e-mail, and nothing else.',
    );
  });

  test('AC5: nothing on the page says that anyone can browse, message or book today', async ({
    page,
    jb,
  }) => {
    const home = new MarketingHomePage(page);
    await jb.open('marketing-home');
    await home.ready();
    const words = await home.words();
    for (const claim of [
      'Start browsing',
      'Open Jubilee',
      'See all',
      '47',
      '11 verified',
      'replied in',
      'open for business',
      'List your business free',
    ]) {
      expect(words, `the page says "${claim}"`).not.toContain(claim);
    }
  });

  test('AC6: no link on the page points to the app; every link moves within the page', async ({
    page,
    jb,
  }) => {
    const home = new MarketingHomePage(page);
    await jb.open('marketing-home');
    await home.ready();
    const addresses = await home.linkAddresses();
    expect(addresses.length).toBeGreaterThan(5);
    for (const address of addresses) {
      // Not the app, in production or in development
      expect(address).not.toContain('app.jubilee.to');
      expect(address).not.toContain('localhost:4200');
      // And nowhere but this page
      expect(address).toMatch(/^http:\/\/localhost:4201\/#[a-z-]+$/);
    }
  });
});

test.describe('in-page links (L2-185 AC3; AC1, AC2 and AC4 are suspended until launch)', () => {
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
  test('AC1: rendering the page calls nothing of the Jubilee API', async ({ page, jb }) => {
    const home = new MarketingHomePage(page);
    home.watchRequests();
    await jb.open('marketing-home');
    await home.ready();
    expect(home.apiRequests()).toEqual([]);
  });

  for (const width of [360, 576, 768, 992]) {
    test(`AC2: at ${width} px nothing overflows and the top bar keeps the lockup and "Launching soon"`, async ({
      page,
      jb,
    }) => {
      const home = new MarketingHomePage(page);
      await page.setViewportSize({ width, height: 800 });
      await jb.open('marketing-home');
      await home.ready();
      expect(await home.horizontalOverflow()).toBe(0);
      await expect(home.lockup).toBeVisible();
      await expect(home.launchingSoon).toBeVisible();
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

  test('L2-112 AC4: "Skip to content" moves focus to main', async ({ page, jb }) => {
    const home = new MarketingHomePage(page);
    await jb.open('marketing-home');
    await home.skipToContent();
    expect(await home.mainFocused()).toBe(true);
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
      'Launching soon',
      'Tell me when it launches',
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

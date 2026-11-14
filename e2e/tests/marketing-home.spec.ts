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
      'Jubilee is where Toronto’s Christian community will find shops, advisors and trades it can trust. We are launching soon.',
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
    // ADR 0057: the names carry no Verified mark
    await expect(home.glimpseNames).toHaveText([
      'WaterWorks Plumbing & Drains',
      'Norris Roofing & Contracting',
      'Moore’s Cleaning Service',
      'Tony’s Flooring Centre',
    ]);
    await expect(home.glimpseTaglines).toHaveText([
      'Treating Every Customer As Family',
      'Trusted in Ontario for over 25 years',
      'Enjoy the Freedom of Clean',
      'Family owned and operated since 1961',
    ]);
    await expect(home.glimpseNotes).toHaveText([
      'Every owner agrees to our statement of faith',
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
      'Know who you’re dealing with. Every owner agrees to Jubilee’s statement of faith and to deal honestly with every customer. No more guessing from star ratings.',
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
      'Customers who already trust youBelievers across Toronto look for businesses that share their faith, so first conversations start warm.',
      'A page that sells for youShow your products or services, prices and story. Update it whenever you like.',
      'Free to joinNo listing fees and no cut of your sales. Just honest business, done well.',
    ]);
    await expect(home.sendDetails).toBeVisible();
  });

  test('AC7: each heading reads as one sentence, its second part in the accent colour', async ({
    page,
    jb,
  }) => {
    const home = new MarketingHomePage(page);
    await jb.open('marketing-home');
    await home.ready();
    // Assistive technology reads each heading as one sentence
    await expect(home.heading).toHaveAccessibleName(
      'Toronto’s Christian businesses, in one place.',
    );
    await expect(home.missionHeading).toHaveAccessibleName('Our mission.');
    // And the second part of every heading is set in a colour of its own
    const parts = await home.headingParts();
    expect(parts).toHaveLength(9);
    expect(parts.filter(({ accented }) => !accented)).toEqual([]);
  });

  test('AC8: the page states the mission word for word', async ({ page, jb }) => {
    const home = new MarketingHomePage(page);
    // Given anyone, when they open the marketing site
    await jb.open('marketing-home');
    // Then "Our mission." follows the film and comes before "Trust, built in."
    await expect(home.missionHeading).toHaveText('Our mission.');
    // And under it stands the mission (L0-001), word for word
    await expect(home.missionStatement).toHaveText(
      'Jubilee helps Christian business owners in Toronto do well in business and use what they earn to support God’s work. We do this because we love Jesus and stay close to Him.',
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
    // ADR 0057: no card calls a business verified
    await expect(home.cards.filter({ hasText: 'Verified' })).toHaveCount(0);
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

  test('AC6: by keyboard, Enter plays the film, its own controls answer and come before the chapters', async ({
    page,
    jb,
  }) => {
    const home = new MarketingHomePage(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await jb.open('marketing-home');
    // Given the visitor reaches the play button by Tab
    await home.tabTo(home.play);
    // When they press Enter
    await page.keyboard.press('Enter');
    // Then the still gives way to the film, from the start, and the film takes the focus
    await expect(home.play).toHaveCount(0);
    await expect(home.video).toHaveAttribute('controls');
    await expect(home.currentChapter).toHaveText('0:00Why we built Jubilee');
    expect(await home.filmTime()).toBeLessThan(5);
    await expect.poll(() => home.filmFocused()).toBe(true);
    // And the browser's own controls answer the keyboard: Space pauses the film
    await expect.poll(() => home.filmPaused()).toBe(false);
    await page.keyboard.press('Space');
    await expect.poll(() => home.filmPaused()).toBe(true);
    // And Tab goes through the film's controls before it reaches the chapters
    await home.tabTo(home.chapter('Finding someone you can trust'));
    // When the visitor presses Enter on a chapter
    await page.keyboard.press('Enter');
    // Then the film plays from that chapter, which is the current one
    await expect(home.currentChapter).toHaveText('0:21Finding someone you can trust');
    await expect.poll(async () => Math.floor(await home.filmTime())).toBeGreaterThanOrEqual(21);
    expect(await home.filmTime()).toBeLessThan(43);
    // And Space on a chapter does the same
    await home.tabTo(home.chapter('Growing your business'));
    await page.keyboard.press('Space');
    await expect(home.currentChapter).toHaveText('0:43Growing your business');
    await expect.poll(async () => Math.floor(await home.filmTime())).toBeGreaterThanOrEqual(43);
  });

  test('AC5: without sound the narration is readable, because the captions are in the picture', async ({
    page,
    jb,
  }) => {
    const home = new MarketingHomePage(page);
    await jb.open('marketing-home');
    await home.play.click();
    // Given the film without sound, when it stands at a line of narration in each chapter
    // ("On Sunday, we’re sent out…", "God gives us the power to get wealth.", and 0:44)
    for (const seconds of [2, 23.6, 44.3]) {
      const band = await home.captionBand(seconds);
      // Then the line stands under the picture: light type on the dark caption box
      expect(band.light, `light type at ${seconds} s`).toBeGreaterThan(0.05);
      expect(band.dark, `the caption box at ${seconds} s`).toBeGreaterThan(0.3);
    }
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
      'Send your business’s details now and the Jubilee team will be in touch before launch to prepare your listing. Sending this form does not list your business yet.',
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
      'verified',
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

test.describe('the launch forms at every width (L2-215 AC8)', () => {
  for (const width of [360, 576, 768, 992, 1280]) {
    test(`AC8: at ${width} px the forms fit, every field and button is at least 44 px high, and from 1024 px each form stands beside its heading`, async ({
      page,
      jb,
    }) => {
      const home = new MarketingHomePage(page);
      await page.setViewportSize({ width, height: 800 });
      await jb.open('marketing-home');
      await home.ready();
      expect(await home.horizontalOverflow()).toBe(0);
      for (const [form, heading] of [
        [home.businessForm, home.preRegisterHeading],
        [home.notifyForm, home.notifyHeading],
      ] as const) {
        const heights = await form.controlHeights();
        expect(heights.length).toBeGreaterThan(0);
        for (const height of heights) expect(height).toBeGreaterThanOrEqual(44);
        if (width >= 1024) {
          expect(await home.leftOf(form.form)).toBeGreaterThan(await home.leftOf(heading));
        } else {
          expect(await home.topOf(form.form)).toBeGreaterThan(await home.topOf(heading));
          expect(await home.leftOf(form.form)).toBeLessThanOrEqual(await home.leftOf(heading));
        }
      }
    });
  }
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
  test('AC1: rendering the page calls nothing of the Jubilee API but its forms’ settings', async ({
    page,
    jb,
  }) => {
    const home = new MarketingHomePage(page);
    home.watchRequests();
    await jb.open('marketing-home');
    await home.ready();
    // Both forms read the settings; the page asks for them once (L2-218 AC5)
    expect(home.apiRequests()).toEqual(['http://localhost:4201/api/launch']);
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

  for (const scheme of ['light', 'dark'] as const) {
    test(`AC3: on a device set to ${scheme} the page is light, in Archivo and Inter`, async ({
      page,
      jb,
    }) => {
      const home = new MarketingHomePage(page);
      await page.emulateMedia({ colorScheme: scheme });
      await jb.open('marketing-home', { theme: scheme });
      expect(await home.theme()).toBe('light');
      // Cream paper and ink type, whatever the device prefers
      expect(await home.paperColour()).toBe('rgb(244, 242, 236)');
      expect(await home.fontOf(home.heading)).toMatch(/^"?Archivo/);
      expect(await home.fontOf(home.lead)).toMatch(/^"?Inter/);
    });
  }

  test('L2-112 AC4: "Skip to content" moves focus to main', async ({ page, jb }) => {
    const home = new MarketingHomePage(page);
    await jb.open('marketing-home');
    await home.skipToContent();
    expect(await home.mainFocused()).toBe(true);
  });

  test('AC4: Tab reaches every link, button and field of the page in reading order, each with a focus ring', async ({
    page,
    jb,
  }) => {
    const home = new MarketingHomePage(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await jb.open('marketing-home');
    await home.ready();
    const stops = await home.tabOrder();
    expect(stops.map(({ stop }) => stop)).toEqual([
      'link Skip to content',
      'link Jubilee home',
      'link Why Jubilee',
      'link How it works',
      'link Inside the app',
      'link For businesses',
      'link Launching soon',
      'link Tell me when it launches',
      'link Watch the film',
      'button Play the Jubilee film',
      'button 0:00Why we built Jubilee',
      'button 0:21Finding someone you can trust',
      'button 0:43Growing your business',
      'link Send your business’s details',
      'field Business name (required)',
      'field Your name (required)',
      'field Email (required)',
      'field Phone (optional)',
      'field Category (required)',
      'field Area of Toronto (required)',
      'field Website or social link (optional)',
      'field About your business (required)',
      expect.stringMatching(/^field /),
      'button Send my details',
      'field Email (required)',
      'field First name (optional)',
      expect.stringMatching(/^field /),
      'button Tell me when it launches',
    ]);
    expect(stops.filter(({ ring }) => !ring)).toEqual([]);
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

  test('AC5: with reduced motion pressing play gives way to the film without a zoom', async ({
    page,
    jb,
  }) => {
    const home = new MarketingHomePage(page);
    await jb.open('marketing-home');
    // Without the preference the play button grows and shrinks under the pointer
    expect(await home.playZoomDuration()).toBeGreaterThan(0);
    // Given the visitor prefers reduced motion
    await page.emulateMedia({ reducedMotion: 'reduce' });
    // Then the play button does not zoom
    expect(await home.playZoomDuration()).toBe(0);
    // And when they press play, the still gives way to the film at once
    await home.play.click();
    await expect(home.play).toHaveCount(0);
    await expect(home.video).toHaveAttribute('controls');
  });
});

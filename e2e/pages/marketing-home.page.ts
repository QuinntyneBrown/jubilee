import type { Locator, Page } from '@playwright/test';
import type { Region, Screen } from '../fixtures/visual';

/** The marketing site's one page (L2-183 to L2-186). */
export class MarketingHomePage implements Screen {
  readonly main: Locator;
  readonly topBar: Locator;
  readonly lockup: Locator;
  readonly sectionLinks: Locator;
  readonly openJubilee: Locator;

  readonly opening: Locator;
  readonly heading: Locator;
  readonly lead: Locator;
  readonly startBrowsing: Locator;
  readonly watchTheFilm: Locator;
  readonly note: Locator;

  readonly glimpse: Locator;
  readonly glimpseSearch: Locator;
  readonly glimpseCaption: Locator;
  readonly glimpseNames: Locator;
  readonly glimpseTaglines: Locator;
  readonly glimpseNotes: Locator;

  readonly film: Locator;
  readonly video: Locator;
  readonly play: Locator;
  readonly filmLength: Locator;
  readonly chapters: Locator;
  readonly currentChapter: Locator;

  readonly why: Locator;
  readonly benefits: Locator;
  readonly how: Locator;
  readonly steps: Locator;
  readonly inside: Locator;
  readonly seeAll: Locator;
  readonly cards: Locator;
  readonly forBusinesses: Locator;
  readonly points: Locator;
  readonly listYourBusiness: Locator;
  readonly closing: Locator;
  readonly closingStartBrowsing: Locator;
  readonly footer: Locator;
  readonly headings: Locator;

  private readonly requests: string[] = [];

  constructor(private readonly page: Page) {
    this.main = page.locator('main#main');
    this.topBar = page.locator('header.mkt-nav');
    this.lockup = this.topBar.getByRole('link', { name: 'Jubilee home' });
    this.sectionLinks = this.topBar.getByRole('navigation', { name: 'Sections' }).getByRole('link');
    this.openJubilee = this.topBar.getByRole('link', { name: 'Open Jubilee' });

    this.opening = this.main.locator('section#top');
    this.heading = this.opening.getByRole('heading', { level: 1 });
    this.lead = this.opening.locator('.mkt-hero__lead');
    this.startBrowsing = this.opening.getByRole('link', { name: 'Start browsing' });
    this.watchTheFilm = this.opening.getByRole('link', { name: 'Watch the film' });
    this.note = this.opening.locator('.mkt-hero__note');

    this.glimpse = this.opening.getByRole('group', { name: 'A glimpse of the app' });
    this.glimpseSearch = this.glimpse.locator('.mkt-glimpse__search');
    this.glimpseCaption = this.glimpse.locator('.mkt-glimpse__caption');
    this.glimpseNames = this.glimpse.locator('.mkt-glimpse__name');
    this.glimpseTaglines = this.glimpse.locator('.mkt-glimpse__tagline');
    this.glimpseNotes = this.glimpse.locator('.mkt-note');

    this.film = this.main.locator('section#film');
    this.video = this.film.locator('video.mkt-player__video');
    this.play = this.film.getByRole('button', { name: 'Play the Jubilee film' });
    this.filmLength = this.film.locator('.mkt-player__length');
    this.chapters = this.film.getByRole('list', { name: 'Chapters' }).getByRole('button');
    this.currentChapter = this.film.locator('.mkt-chapter[aria-current="true"]');

    this.why = this.main.locator('section#why');
    this.benefits = this.why.locator('.mkt-rules > li');
    this.how = this.main.locator('section#how');
    this.steps = this.how.locator('.mkt-step');
    this.inside = this.main.locator('section#inside');
    this.seeAll = this.inside.getByRole('link', { name: /^See all/ });
    this.cards = this.inside.locator('a.mkt-card');
    this.forBusinesses = this.main.locator('section#businesses');
    this.points = this.forBusinesses.locator('.mkt-points > li');
    this.listYourBusiness = this.forBusinesses.getByRole('link', {
      name: 'List your business free',
    });
    this.closing = this.main.locator('section.mkt-closing');
    this.closingStartBrowsing = this.closing.getByRole('link', { name: 'Start browsing' });
    this.footer = page.locator('footer.mkt-footer');
    this.headings = this.main.getByRole('heading', { level: 2 });
  }

  chapter(title: string): Locator {
    return this.chapters.filter({ hasText: title });
  }

  sectionLink(name: string): Locator {
    return this.sectionLinks.filter({ hasText: name });
  }

  section(id: string): Locator {
    return this.main.locator(`section#${id}`);
  }

  /** Where the film stands, in seconds. */
  filmTime(): Promise<number> {
    return this.video.evaluate((video: HTMLVideoElement) => video.currentTime);
  }

  /** Starts noting what the page asks for; call before opening it. */
  watchRequests(): void {
    this.page.on('request', (request) => this.requests.push(request.url()));
  }

  /** The requests the page made for the film itself. */
  filmRequests(): string[] {
    return this.requests.filter((url) => url.endsWith('.mp4'));
  }

  /** The requests the page made to the Jubilee API. */
  apiRequests(): string[] {
    return this.requests.filter((url) => new URL(url).pathname.startsWith('/api/'));
  }

  /** The distance of an element's top from the top of the viewport. */
  topOf(locator: Locator): Promise<number> {
    return locator.evaluate((element) => element.getBoundingClientRect().top);
  }

  topBarHeight(): Promise<number> {
    return this.topBar.evaluate((element) => element.getBoundingClientRect().height);
  }

  theme(): Promise<string | undefined> {
    return this.page.locator('body').evaluate((body) => body.dataset['theme']);
  }

  dataPage(): Promise<string | undefined> {
    return this.page.locator('body').evaluate((body) => body.dataset['page']);
  }

  horizontalOverflow(): Promise<number> {
    return this.page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
  }

  /** The names of the links and buttons reached by pressing Tab `presses` times from the top. */
  async tabThrough(presses: number): Promise<string[]> {
    const names: string[] = [];
    for (let press = 0; press < presses; press++) {
      await this.page.keyboard.press('Tab');
      names.push(
        await this.page.evaluate(() => {
          const element = document.activeElement as HTMLElement;
          const text = element.getAttribute('aria-label') ?? element.textContent ?? '';
          return text.replace(/\s+/g, ' ').trim();
        }),
      );
    }
    return names;
  }

  /** Whether the focused element shows a focus ring. */
  focusRingShown(): Promise<boolean> {
    return this.page.evaluate(() => {
      const style = getComputedStyle(document.activeElement as HTMLElement);
      return style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0;
    });
  }

  async ready(): Promise<void> {
    await this.footer.waitFor();
  }

  regions(): Region[] {
    return [
      { name: 'marketing-top-bar', locator: this.topBar },
      { name: 'marketing-opening', locator: this.opening },
      { name: 'marketing-film', locator: this.film },
      { name: 'marketing-why', locator: this.why },
      { name: 'marketing-how', locator: this.how },
      { name: 'marketing-inside', locator: this.inside },
      { name: 'marketing-for-businesses', locator: this.forBusinesses },
      { name: 'marketing-closing', locator: this.closing },
      { name: 'marketing-footer', locator: this.footer },
    ];
  }
}

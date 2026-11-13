import type { Locator, Page, Request } from '@playwright/test';
import type { Region, Screen } from '../fixtures/visual';

/** What an owner types into the business pre-registration form (L2-216). */
export interface BusinessDetails {
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  category: string;
  area: string;
  website: string;
  description: string;
}

/** Naomi Laurent's details for Luzandre.com, as the mocks show them. */
export const naomiDetails: BusinessDetails = {
  businessName: 'Luzandre.com',
  contactName: 'Naomi Laurent',
  email: 'naomi@luzandre.com',
  phone: '416-555-0142',
  category: 'Shops',
  area: 'Leslieville',
  website: 'luzandre.com',
  description: 'Custom Christian apparel, artworks and gifts, made in Toronto.',
};

/**
 * One of the two forms of the launching-soon page (L2-216, L2-217) and what takes its place: the
 * fields by their labels, the button, the notices and the confirmation.
 */
export class LaunchFormPart {
  readonly form: Locator;
  readonly send: Locator;
  readonly summary: Locator;
  readonly summaryLinks: Locator;
  /** A notice above the fields: still sending, the limit or the bot challenge. */
  readonly alert: Locator;
  readonly confirmation: Locator;
  readonly confirmationHeading: Locator;
  readonly consent: Locator;
  /** The messages under the fields. */
  readonly fieldErrors: Locator;
  readonly note: Locator;
  /** The labels of the fields, with their "(required)" or "(optional)". */
  readonly labels: Locator;

  constructor(
    private readonly page: Page,
    readonly section: Locator,
    name: string,
    button: string,
    private readonly path: string,
  ) {
    this.form = section.getByRole('form', { name });
    this.send = this.form.getByRole('button', { name: button });
    this.summary = this.form.locator('.form-summary');
    this.summaryLinks = this.summary.getByRole('link');
    this.alert = this.form.locator('.alert:not(.form-summary)');
    this.confirmation = section.locator('.mkt-confirmation');
    this.confirmationHeading = this.confirmation.getByRole('heading', { level: 3 });
    this.consent = this.form.getByRole('checkbox');
    this.fieldErrors = this.form.locator('.field__error');
    this.note = this.form.locator('.mkt-form__note');
    this.labels = this.form.locator('.field__label');
  }

  field(label: string): Locator {
    // The label ends with its marker, "(required)" or "(optional)".
    return this.form.getByLabel(label);
  }

  /** The message under the field labelled `label`. */
  errorOf(label: string): Locator {
    return this.form
      .locator('.field', { has: this.page.getByLabel(label) })
      .locator('.field__error');
  }

  /** The message under the consent box. */
  readonly consentError = (): Locator =>
    this.form.locator(':is(.choice, jb-checkbox) + .field__error');

  /** Sends the form and resolves with what was sent to the API. */
  async sendAndCapture(): Promise<Request> {
    const sent = this.page.waitForRequest(
      (request) => request.method() === 'POST' && new URL(request.url()).pathname === this.path,
    );
    await this.send.click();
    return sent;
  }

  /** The number of times the form was sent to the API since `watch` was called. */
  watch(): () => number {
    let count = 0;
    this.page.on('request', (request) => {
      if (request.method() === 'POST' && new URL(request.url()).pathname === this.path) count++;
    });
    return () => count;
  }

  /** What the form sent to the API, each time, since `capture` was called. */
  capture(): () => unknown[] {
    const bodies: unknown[] = [];
    this.page.on('request', (request) => {
      if (request.method() === 'POST' && new URL(request.url()).pathname === this.path) {
        bodies.push(request.postDataJSON());
      }
    });
    return () => bodies;
  }

  /** Whether the form shows a state other than its first one: sent, busy, refused or still sending. */
  async inAState(): Promise<boolean> {
    return (
      (await this.confirmation.count()) +
        (await this.summary.count()) +
        (await this.alert.count()) +
        (await this.form.locator('[aria-busy="true"]').count()) >
      0
    );
  }

  /** Whether the element with focus is `locator`. */
  hasFocus(locator: Locator): Promise<boolean> {
    return locator.evaluate((element) => element === document.activeElement);
  }
}

/** The marketing site's one page, in its launching-soon state (L2-183 to L2-186, L2-215 to L2-217). */
export class MarketingHomePage implements Screen {
  readonly main: Locator;
  readonly topBar: Locator;
  readonly lockup: Locator;
  readonly sectionLinks: Locator;
  /** The link in the top bar's place for an action (L2-215 AC2). */
  readonly launchingSoon: Locator;

  readonly opening: Locator;
  readonly heading: Locator;
  readonly lead: Locator;
  /** The label above the heading (L2-215 AC1). */
  readonly badge: Locator;
  readonly tellMe: Locator;
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
  /** The still or the film, with the chapters under it. */
  readonly player: Locator;
  readonly chapterList: Locator;
  readonly play: Locator;
  readonly filmLength: Locator;
  readonly chapters: Locator;
  readonly currentChapter: Locator;

  readonly mission: Locator;
  readonly missionHeading: Locator;
  /** Jubilee's mission (L0-001), under the heading. */
  readonly missionStatement: Locator;

  readonly why: Locator;
  readonly benefits: Locator;
  readonly how: Locator;
  readonly steps: Locator;
  readonly inside: Locator;
  readonly cards: Locator;
  readonly featuredCards: Locator;
  readonly cardNames: Locator;
  readonly cardTags: Locator;
  readonly cardTaglines: Locator;
  readonly cardHighlights: Locator;
  readonly forBusinesses: Locator;
  readonly points: Locator;
  readonly sendDetails: Locator;
  /** "Be listed on launch day.": the business pre-registration (L2-216). */
  readonly preRegister: Locator;
  readonly preRegisterHeading: Locator;
  /** "Jubilee is launching soon.": the launch notification (L2-217). */
  readonly notify: Locator;
  readonly notifyHeading: Locator;
  /** The launch notification form (L2-217). */
  readonly notifyForm: LaunchFormPart;
  /** The business pre-registration form (L2-216). */
  readonly businessForm: LaunchFormPart;
  readonly footer: Locator;
  /** The lockup that signs the footer. */
  readonly footerLockup: Locator;
  readonly headings: Locator;
  /** The heading of each section with what belongs to it: its lead, actions, note or aside. */
  readonly openingHeading: Locator;
  readonly filmHeading: Locator;
  readonly whyHeading: Locator;
  readonly howHeading: Locator;
  readonly insideHeading: Locator;
  readonly forBusinessesHeading: Locator;
  readonly ruleList: Locator;
  readonly stepList: Locator;
  readonly pointList: Locator;

  private readonly requests: string[] = [];

  constructor(protected readonly page: Page) {
    this.main = page.locator('main#main');
    this.topBar = page.locator('header.mkt-nav');
    this.lockup = this.topBar.getByRole('link', { name: 'Jubilee home' });
    this.sectionLinks = this.topBar.getByRole('navigation', { name: 'Sections' }).getByRole('link');
    this.launchingSoon = this.topBar.getByRole('link', { name: 'Launching soon' });

    this.opening = this.main.locator('section#top');
    this.heading = this.opening.getByRole('heading', { level: 1 });
    this.lead = this.opening.locator('h1 + p');
    this.badge = this.opening.locator('.mkt-badge');
    this.tellMe = this.opening.getByRole('link', { name: 'Tell me when it launches' });
    this.watchTheFilm = this.opening.getByRole('link', { name: 'Watch the film' });
    this.note = this.opening.locator('.mkt-hero__note, .mkt-heading__note');

    this.glimpse = this.opening.getByRole('group', { name: 'A preview of the app' });
    this.glimpseSearch = this.glimpse.locator('.mkt-glimpse__search');
    this.glimpseCaption = this.glimpse.locator('.mkt-glimpse__caption');
    this.glimpseNames = this.glimpse.locator('.mkt-glimpse__name');
    this.glimpseTaglines = this.glimpse.locator('.mkt-glimpse__tagline');
    this.glimpseNotes = this.glimpse.locator('.mkt-note');

    this.film = this.main.locator('section#film');
    this.video = this.film.locator('video.mkt-player__video');
    this.player = this.film.locator('.mkt-player');
    this.chapterList = this.film.getByRole('list', { name: 'Chapters' });
    this.play = this.film.getByRole('button', { name: 'Play the Jubilee film' });
    this.filmLength = this.film.locator('.mkt-player__length');
    this.chapters = this.film.getByRole('list', { name: 'Chapters' }).getByRole('button');
    this.currentChapter = this.film.locator('.mkt-chapter[aria-current="true"]');

    this.mission = this.main.locator('section#mission');
    this.missionHeading = this.mission.getByRole('heading', { level: 2 });
    this.missionStatement = this.mission.locator('h2 + p');

    this.why = this.main.locator('section#why');
    this.benefits = this.why.locator('.mkt-rules > li');
    this.ruleList = this.why.locator('.mkt-rules');
    this.how = this.main.locator('section#how');
    this.steps = this.how.locator('.mkt-step');
    this.stepList = this.how.locator('.mkt-steps');
    this.inside = this.main.locator('section#inside');
    this.cards = this.inside.locator('.mkt-card');
    this.featuredCards = this.inside.locator('.mkt-card--featured');
    this.cardNames = this.cards.locator('.mkt-card__name');
    this.cardTags = this.cards.locator('.mkt-card__tag');
    this.cardTaglines = this.cards.locator('.mkt-card__tagline');
    this.cardHighlights = this.cards.locator('.mkt-card__highlight');
    this.forBusinesses = this.main.locator('section#businesses');
    this.points = this.forBusinesses.locator('.mkt-points > li');
    this.pointList = this.forBusinesses.locator('.mkt-points');
    this.sendDetails = this.forBusinesses.getByRole('link', {
      name: 'Send your business’s details',
    });
    this.preRegister = this.main.locator('section#pre-register');
    this.preRegisterHeading = this.preRegister.getByRole('heading', { level: 2 });
    this.notify = this.main.locator('section#notify');
    this.notifyHeading = this.notify.getByRole('heading', { level: 2 });
    this.notifyForm = new LaunchFormPart(
      page,
      this.notify,
      'Launch notification',
      'Tell me when it launches',
      '/api/launch/notifications',
    );
    this.businessForm = new LaunchFormPart(
      page,
      this.preRegister,
      'Business pre-registration',
      'Send my details',
      '/api/launch/businesses',
    );
    this.footer = page.locator('footer.mkt-footer');
    this.footerLockup = this.footer.getByRole('img', { name: 'Jubilee' });
    this.headings = this.main.getByRole('heading', { level: 2 });
    this.openingHeading = this.opening.locator('.mkt-hero__text, .mkt-heading');
    this.filmHeading = this.film.getByRole('heading', { level: 2 });
    this.whyHeading = this.why.locator('.mkt-why__inner > div, .mkt-heading');
    this.howHeading = this.how.locator('.mkt-how__text, .mkt-heading__text');
    this.insideHeading = this.inside.locator('.mkt-inside__head, .mkt-heading');
    this.forBusinessesHeading = this.forBusinesses.locator(
      '.mkt-owners__inner > div, .mkt-heading',
    );
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

  /** Leaves the film unanswered, so a spec does not depend on the film file; call before opening the page. */
  async withoutFilm(): Promise<void> {
    await this.page.route('**/media/*.mp4', (route) => route.abort());
  }

  /** The requests the page made for the film itself. */
  filmRequests(): string[] {
    return this.requests.filter((url) => url.endsWith('.mp4'));
  }

  /** The address of every link on the page, as the browser resolves it. */
  linkAddresses(): Promise<string[]> {
    return this.page
      .getByRole('link')
      .evaluateAll((links) => links.map((link) => (link as HTMLAnchorElement).href));
  }

  /** Everything the page says, as one text. */
  async words(): Promise<string> {
    return (await this.page.locator('body').innerText()).replace(/\s+/g, ' ');
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

  paperColour(): Promise<string> {
    return this.page.locator('body').evaluate((body) => getComputedStyle(body).backgroundColor);
  }

  fontOf(locator: Locator): Promise<string> {
    return locator.evaluate((element) => getComputedStyle(element).fontFamily);
  }

  scrollBehaviour(): Promise<string> {
    return this.page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior);
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

  /** Reaches "Skip to content" with Tab from the top of the page and activates it. */
  async skipToContent(): Promise<void> {
    await this.page.keyboard.press('Tab');
    await this.page.keyboard.press('Enter');
  }

  /** Whether `main` holds the focus. */
  mainFocused(): Promise<boolean> {
    return this.main.evaluate((main) => document.activeElement === main);
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

  /** Fills the launch notification form as Joanna would. */
  async fillNotify(email = 'joanna.adeyemi@example.com', firstName = 'Joanna'): Promise<void> {
    await this.notifyForm.field('Email').fill(email);
    await this.notifyForm.field('First name').fill(firstName);
    await this.notifyForm.consent.check();
  }

  /** Fills the business pre-registration form. */
  async fillBusiness(details: BusinessDetails = naomiDetails): Promise<void> {
    const form = this.businessForm;
    await form.field('Business name').fill(details.businessName);
    await form.field('Your name').fill(details.contactName);
    await form.field('Email').fill(details.email);
    await form.field('Phone').fill(details.phone);
    await form.field('Category').selectOption({ label: details.category });
    await form.field('Area of Toronto').fill(details.area);
    await form.field('Website or social link').fill(details.website);
    await form.field('About your business').fill(details.description);
    await form.consent.check();
  }

  regions(): Region[] {
    return [
      { name: 'marketing-top-bar', locator: this.topBar },
      { name: 'marketing-opening', locator: this.opening },
      { name: 'marketing-film', locator: this.film },
      { name: 'marketing-mission', locator: this.mission },
      { name: 'marketing-why', locator: this.why },
      { name: 'marketing-how', locator: this.how },
      { name: 'marketing-inside', locator: this.inside },
      { name: 'marketing-for-businesses', locator: this.forBusinesses },
      { name: 'marketing-pre-register', locator: this.preRegister },
      { name: 'marketing-notify', locator: this.notify },
      { name: 'marketing-footer', locator: this.footer },
    ];
  }
}

/**
 * The launching-soon page with one of its forms in a state: in the app the form is filled (or
 * left empty) and sent, against the stub of its route; the mock is already in the state.
 */
export class LaunchFormScreen extends MarketingHomePage {
  constructor(
    page: Page,
    private readonly which: 'notify' | 'business',
    private readonly filled: boolean,
    /** The state shows a notice above the fields, which a busy form gets a moment after it is sent. */
    private readonly noticed = false,
  ) {
    super(page);
  }

  get part(): LaunchFormPart {
    return this.which === 'notify' ? this.notifyForm : this.businessForm;
  }

  override async ready(): Promise<void> {
    await super.ready();
    if (await this.part.inAState()) return;
    if (this.filled) {
      if (this.which === 'notify') await this.fillNotify();
      else await this.fillBusiness();
    }
    await this.part.send.click();
    if (this.noticed) {
      await this.part.alert.waitFor();
      return;
    }
    await this.page.waitForFunction(() =>
      document.querySelector('.mkt-form [aria-busy], .alert, .mkt-confirmation'),
    );
  }

  override regions(): Region[] {
    return [{ name: `marketing-${this.which}-form`, locator: this.part.section }];
  }
}

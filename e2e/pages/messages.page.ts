import type { Locator, Page } from '@playwright/test';
import { MOCK_PHOTO } from '../fixtures/photos';
import type { Region, Screen } from '../fixtures/visual';
import { ShellPage } from './shell.page';

/** The list of conversations with its search: the left column of Messages and of a conversation. */
export class InboxListRegion {
  readonly root: Locator;
  readonly search: Locator;
  /** The whole search field above the list. */
  readonly searchField: Locator;
  readonly rows: Locator;
  /** The rows that stand in for conversations while they load. */
  readonly skeletonRows: Locator;
  readonly loading: Locator;
  readonly noResults: Locator;
  readonly clearSearch: Locator;
  readonly error: Locator;

  constructor(page: Page) {
    this.root = page.locator('.inbox__list');
    this.search = this.root.getByRole('searchbox', { name: 'Search messages' });
    this.searchField = this.root.getByRole('search');
    this.rows = this.root.locator('a.thread');
    this.skeletonRows = this.root.locator('li.thread');
    this.loading = this.root.getByText('Loading your messages…');
    this.noResults = this.root.locator('.empty');
    this.clearSearch = this.root.getByRole('button', { name: 'Clear search' });
    this.error = this.root.getByRole('alert');
  }

  row(name: string | RegExp): Locator {
    return this.rows.filter({ hasText: name });
  }

  name(row: Locator): Locator {
    return row.locator('.thread__name');
  }

  time(row: Locator): Locator {
    return row.locator('.thread__time');
  }

  snippet(row: Locator): Locator {
    return row.locator('.thread__snippet');
  }
}

/** The Messages page at /messages. */
export class MessagesPage extends ShellPage implements Screen {
  readonly heading: Locator;
  readonly subtitle: Locator;
  readonly list: InboxListRegion;
  readonly pickPrompt: Locator;
  readonly emptyState: Locator;
  readonly browseBusinesses: Locator;
  readonly errorState: Locator;
  readonly errorReference: Locator;
  readonly tryAgain: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.subtitle = this.main.locator('.subtitle');
    this.list = new InboxListRegion(page);
    this.pickPrompt = this.main.getByRole('heading', { name: 'Pick a conversation' });
    this.emptyState = this.main.getByRole('heading', { name: 'Start a conversation' });
    this.browseBusinesses = this.main.getByRole('link', { name: 'Browse businesses' });
    this.errorState = this.main.getByRole('alert');
    this.errorReference = this.errorState.locator('code');
    this.tryAgain = this.errorState.getByRole('button', { name: 'Try again' });
  }

  async ready(): Promise<void> {
    await this.main.locator('.page-header').waitFor({ state: 'attached' });
  }

  regions(): Region[] {
    return [{ name: 'main', locator: this.main }];
  }
}

/** One bubble of a conversation. */
export class BubbleRegion {
  readonly photo: Locator;
  readonly viewPhoto: Locator;
  readonly photoMissing: Locator;
  readonly time: Locator;
  readonly status: Locator;
  readonly tryAgain: Locator;
  readonly delete: Locator;

  constructor(readonly root: Locator) {
    this.photo = root.getByRole('img');
    this.viewPhoto = root.getByRole('button', { name: 'View photo' });
    this.photoMissing = root.locator('.bubble__photo--missing');
    this.time = root.locator('.bubble__meta');
    this.status = root.getByRole('status');
    this.tryAgain = root.getByRole('button', { name: 'Try again' });
    this.delete = root.getByRole('button', { name: 'Delete' });
  }
}

/** A request's card in a conversation (L2-057 AC4). */
export class RequestCardRegion {
  readonly kind: Locator;
  readonly title: Locator;
  readonly detail: Locator;
  readonly status: Locator;
  readonly viewRequest: Locator;

  constructor(readonly root: Locator) {
    this.kind = root.locator('.request-card__kind');
    this.title = root.locator('.request-card__title');
    this.detail = root.locator('.request-card__meta');
    this.status = root.locator('.badge');
    this.viewRequest = root.getByRole('link', { name: 'View request' });
  }
}

/** A conversation at /messages/:id. */
export class ConversationPage extends ShellPage implements Screen {
  readonly list: InboxListRegion;
  readonly heading: Locator;
  readonly caption: Locator;
  readonly listingLink: Locator;
  readonly more: Locator;
  readonly menu: Locator;
  readonly muted: Locator;
  readonly backLink: Locator;
  /** The head of the conversation: who it is with, and its actions. */
  readonly chatHead: Locator;
  readonly log: Locator;
  readonly days: Locator;
  readonly bubbles: Locator;
  readonly cards: Locator;
  /** Everything in the timeline, in order: day separators, bubbles and cards. */
  readonly timeline: Locator;
  readonly showEarlier: Locator;
  readonly linksInMessages: Locator;
  readonly away: Locator;
  readonly announcement: Locator;
  readonly composer: Locator;
  /** The whole composer: the photo control, the text and "Send". */
  readonly composerForm: Locator;
  readonly send: Locator;
  readonly attach: Locator;
  readonly attachPhoto: Locator;
  readonly photoInput: Locator;
  readonly attachedPhoto: Locator;
  readonly removePhoto: Locator;
  readonly loadingNote: Locator;
  readonly errorState: Locator;
  readonly errorReference: Locator;
  readonly tryAgain: Locator;

  constructor(page: Page) {
    super(page);
    this.list = new InboxListRegion(page);
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.chatHead = this.main.locator('.chat__head');
    this.caption = this.chatHead.locator('.text-caption');
    this.listingLink = this.main.locator('.chat__head').getByRole('link', { name: /listing$/ });
    this.more = this.main.locator('.chat__head').getByRole('button', { name: 'More' });
    // The app opens the menu in an overlay outside main; the mock shows it beside its trigger.
    this.menu = page.getByRole('menu', { name: 'Conversation' });
    this.muted = this.main.locator('.chat__head .badge');
    this.backLink = this.main.getByRole('link', { name: 'Back to messages' });
    this.log = this.main.getByRole('list', { name: 'Messages' });
    this.days = this.log.locator('.chat__day');
    this.bubbles = this.log.locator('.bubble');
    this.cards = this.log.locator('.request-card');
    this.timeline = this.log.locator('> li');
    this.showEarlier = this.log.getByRole('button', { name: 'Show earlier messages' });
    this.linksInMessages = this.bubbles.getByRole('link');
    this.away = this.main.locator('[data-testid="away"]');
    this.announcement = this.main.locator('.chat > [role="status"].visually-hidden');
    this.composer = this.main.getByRole('textbox', { name: /^Message / });
    this.send = this.main.getByRole('button', { name: 'Send', exact: true });
    this.composerForm = this.main.locator('form.composer');
    this.attach = this.composerForm.locator('.attach');
    this.attachPhoto = this.attach.getByRole('button', { name: 'Attach a photo' });
    this.photoInput = this.attach.locator('input[type="file"]');
    this.attachedPhoto = this.attach.getByRole('img', { name: 'Photo to send' });
    this.removePhoto = this.attach.getByRole('button', { name: 'Remove photo' });
    this.loadingNote = this.main.getByText('Loading this conversation…');
    this.errorState = this.main.locator('.chat').getByRole('alert');
    this.errorReference = this.errorState.locator('code');
    this.tryAgain = this.errorState.getByRole('button', { name: 'Try again' });
  }

  menuItem(name: string): Locator {
    return this.menu.getByRole('menuitem', { name, exact: true });
  }

  card(title: string | RegExp): RequestCardRegion {
    return new RequestCardRegion(this.cards.filter({ hasText: title }));
  }

  bubble(text: string | RegExp): BubbleRegion {
    return new BubbleRegion(this.bubbles.filter({ hasText: text }));
  }

  async ready(): Promise<void> {
    await this.main.locator('.chat').waitFor({ state: 'attached' });
  }

  regions(): Region[] {
    return [{ name: 'main', locator: this.main }];
  }
}

/** A conversation with its menu open (L2-061 AC3): the mock shows it open, the app opens it. */
export class ConversationMenuScreen extends ConversationPage {
  override async ready(): Promise<void> {
    await super.ready();
    await this.more.waitFor();
    if (!(await this.menu.isVisible())) await this.more.click();
    await this.menu.waitFor();
  }

  override regions(): Region[] {
    return [
      { name: 'main', locator: this.main },
      { name: 'menu', locator: this.menu },
    ];
  }
}

/**
 * A conversation long enough to scroll: the app brings its composer into view, which puts the
 * first card under the top bar; the mock opens at the top. Compared from the top, as the mock is.
 */
export class ConversationRequestsScreen extends ConversationPage {
  override async ready(): Promise<void> {
    await super.ready();
    await this.cards.first().waitFor();
    await this.composer.waitFor();
    await this.page.evaluate(() => window.scrollTo(0, 0));
  }
}

/** A conversation with a photo chosen in the composer (L2-060 AC5): the app has to be given the file. */
export class ConversationPhotoAttachedScreen extends ConversationPage {
  override async ready(): Promise<void> {
    await super.ready();
    await this.composer.waitFor();
    if ((await this.photoInput.count()) > 0) await this.photoInput.setInputFiles(MOCK_PHOTO);
    await this.attachedPhoto.waitFor();
  }
}

/** A conversation with a photo message on its way (L2-060 AC7): the app has to be made to send it. */
export class ConversationPhotoSendingScreen extends ConversationPage {
  readonly pending: BubbleRegion;

  constructor(page: Page) {
    super(page);
    this.pending = new BubbleRegion(this.log.locator('.bubble--pending'));
  }

  override async ready(): Promise<void> {
    await super.ready();
    await this.composer.waitFor();
    if ((await this.photoInput.count()) > 0) {
      await this.photoInput.setInputFiles(MOCK_PHOTO);
      await this.composer.fill('Here’s the page of the statement I mentioned.');
      await this.send.click();
    }
    await this.pending.photo.waitFor();
  }
}

/** The "Message {business}" dialog (L2-055). */
export class NewMessageDialog {
  readonly root: Locator;
  readonly panel: Locator;
  readonly title: Locator;
  readonly description: Locator;
  readonly message: Locator;
  readonly fieldError: Locator;
  readonly alert: Locator;
  readonly send: Locator;
  readonly cancel: Locator;
  readonly close: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('dialog');
    this.panel = this.root.locator('.dialog__panel');
    this.title = this.root.locator('.dialog__title');
    this.description = this.root.locator('#dlg-desc');
    this.message = this.root.getByRole('textbox', { name: /Your message/ });
    this.fieldError = this.root.locator('.field__error');
    this.alert = this.root.getByRole('alert');
    this.send = this.root.getByRole('button', { name: 'Send message' });
    this.cancel = this.root.getByRole('button', { name: 'Cancel' });
    this.close = this.root.getByRole('button', { name: 'Close' });
  }
}

/** The dialog that asks a business for a meeting (L2-044). */
export class BookMeetingDialog {
  readonly root: Locator;
  readonly title: Locator;
  readonly description: Locator;
  readonly service: Locator;
  readonly day: Locator;
  readonly how: Locator;
  readonly times: Locator;
  readonly note: Locator;
  readonly fieldError: Locator;
  readonly alert: Locator;
  readonly send: Locator;
  readonly cancel: Locator;
  readonly close: Locator;
  readonly viewRequest: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('dialog');
    this.title = this.root.locator('.dialog__title');
    this.description = this.root.locator('#dlg-desc');
    this.service = this.root.getByLabel('Service');
    this.day = this.root.getByLabel('Day');
    this.how = this.root.getByLabel('How');
    this.times = this.root.locator('label.chip');
    this.note = this.root.getByLabel('What would you like to talk about?');
    this.fieldError = this.root.locator('.field__error');
    this.alert = this.root.getByRole('alert');
    this.send = this.root.getByRole('button', { name: 'Send request' });
    this.cancel = this.root.getByRole('button', { name: 'Cancel' });
    this.close = this.root.getByRole('button', { name: 'Close' }).first();
    this.viewRequest = this.root.getByRole('link', { name: 'View request' });
  }

  time(label: string): Locator {
    return this.times.filter({ hasText: label });
  }
}

/** The dialog that asks a business for a quote (L2-045). */
export class RequestQuoteDialog {
  readonly root: Locator;
  readonly title: Locator;
  readonly description: Locator;
  readonly what: Locator;
  readonly neededBy: Locator;
  readonly budget: Locator;
  readonly phone: Locator;
  readonly phoneHelp: Locator;
  readonly fieldError: Locator;
  readonly alert: Locator;
  readonly send: Locator;
  readonly cancel: Locator;
  readonly viewRequest: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('dialog');
    this.title = this.root.locator('.dialog__title');
    this.description = this.root.locator('#dlg-desc');
    this.what = this.root.getByLabel('What do you need?');
    this.neededBy = this.root.getByLabel('Needed by');
    this.budget = this.root.getByLabel('Budget');
    this.phone = this.root.getByLabel('Phone');
    this.phoneHelp = this.root.locator('#d-phone-help');
    this.fieldError = this.root.locator('.field__error');
    this.alert = this.root.getByRole('alert');
    this.send = this.root.getByRole('button', { name: 'Send request' });
    this.cancel = this.root.getByRole('button', { name: 'Cancel' });
    this.viewRequest = this.root.getByRole('link', { name: 'View request' });
  }
}

/** The dialog that asks a shop for a product (L2-046). */
export class RequestItemDialog implements Screen {
  readonly root: Locator;
  /** The parts of the dialog frame. */
  readonly header: Locator;
  readonly footer: Locator;
  /** The well that holds the amounts. */
  readonly amounts: Locator;
  readonly title: Locator;
  readonly description: Locator;
  readonly summary: Locator;
  readonly methods: Locator;
  /** The ways to get the product: legend and radios. */
  readonly methodGroup: Locator;
  readonly address: Locator;
  readonly note: Locator;
  readonly itemAmount: Locator;
  readonly shippingAmount: Locator;
  readonly total: Locator;
  readonly fieldError: Locator;
  readonly alert: Locator;
  readonly send: Locator;
  readonly cancel: Locator;
  readonly keepShopping: Locator;
  readonly viewRequest: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('dialog');
    this.title = this.root.locator('.dialog__title');
    this.description = this.root.locator('#dlg-desc');
    this.header = this.root.locator('.dialog__header');
    this.footer = this.root.locator('.dialog__footer');
    this.amounts = this.root.locator('.well');
    this.summary = this.root.locator('.item-list');
    this.methods = this.root.locator('label.choice');
    this.methodGroup = this.root
      .locator('fieldset')
      .filter({ has: this.root.page().locator('label.choice') });
    this.address = this.root.getByLabel('Shipping address');
    this.note = this.root.getByLabel(/^Note to/);
    this.itemAmount = this.root.locator('dl.dl dd').nth(0);
    this.shippingAmount = this.root.locator('dl.dl dd').nth(1);
    this.total = this.root.locator('dl.dl dd').nth(2);
    this.fieldError = this.root.locator('.field__error');
    this.alert = this.root.getByRole('alert');
    this.send = this.root.getByRole('button', { name: 'Send request' });
    this.cancel = this.root.getByRole('button', { name: 'Cancel' });
    this.keepShopping = this.root.getByRole('link', { name: 'Keep shopping' });
    this.viewRequest = this.root.getByRole('link', { name: 'View request' });
  }

  method(label: string): Locator {
    return this.methods.filter({ hasText: label });
  }

  async ready(): Promise<void> {
    await this.methods.first().waitFor();
  }

  regions(): Region[] {
    return [{ name: 'dialog', locator: this.root }];
  }
}

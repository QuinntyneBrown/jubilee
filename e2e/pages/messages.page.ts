import type { Locator, Page } from '@playwright/test';
import type { Region, Screen } from '../fixtures/visual';
import { ShellPage } from './shell.page';

/** The list of conversations with its search: the left column of Messages and of a conversation. */
export class InboxListRegion {
  readonly root: Locator;
  readonly search: Locator;
  readonly rows: Locator;
  readonly loading: Locator;
  readonly noResults: Locator;
  readonly clearSearch: Locator;
  readonly error: Locator;

  constructor(page: Page) {
    this.root = page.locator('jb-inbox-list');
    this.search = this.root.getByRole('searchbox', { name: 'Search messages' });
    this.rows = this.root.locator('a.thread');
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
  readonly time: Locator;
  readonly status: Locator;
  readonly tryAgain: Locator;
  readonly delete: Locator;

  constructor(readonly root: Locator) {
    this.time = root.locator('.bubble__meta');
    this.status = root.getByRole('status');
    this.tryAgain = root.getByRole('button', { name: 'Try again' });
    this.delete = root.getByRole('button', { name: 'Delete' });
  }
}

/** A conversation at /messages/:id. */
export class ConversationPage extends ShellPage implements Screen {
  readonly list: InboxListRegion;
  readonly heading: Locator;
  readonly caption: Locator;
  readonly listingLink: Locator;
  readonly backLink: Locator;
  readonly log: Locator;
  readonly days: Locator;
  readonly bubbles: Locator;
  readonly showEarlier: Locator;
  readonly linksInMessages: Locator;
  readonly away: Locator;
  readonly composer: Locator;
  readonly send: Locator;
  readonly loadingNote: Locator;
  readonly errorState: Locator;
  readonly errorReference: Locator;
  readonly tryAgain: Locator;

  constructor(page: Page) {
    super(page);
    this.list = new InboxListRegion(page);
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.caption = this.main.locator('.chat__head .text-caption');
    this.listingLink = this.main.locator('.chat__head').getByRole('link', { name: /listing$/ });
    this.backLink = this.main.getByRole('link', { name: 'Back to messages' });
    this.log = this.main.getByRole('list', { name: 'Messages' });
    this.days = this.log.locator('.chat__day');
    this.bubbles = this.log.locator('.bubble');
    this.showEarlier = this.log.getByRole('button', { name: 'Show earlier messages' });
    this.linksInMessages = this.log.getByRole('link');
    this.away = this.main.locator('[data-testid="away"]');
    this.composer = this.main.getByRole('textbox', { name: /^Message / });
    this.send = this.main.getByRole('button', { name: 'Send', exact: true });
    this.loadingNote = this.main.getByText('Loading this conversation…');
    this.errorState = this.main.locator('.chat').getByRole('alert');
    this.errorReference = this.errorState.locator('code');
    this.tryAgain = this.errorState.getByRole('button', { name: 'Try again' });
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

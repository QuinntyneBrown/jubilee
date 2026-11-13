import type { Locator, Page } from '@playwright/test';
import type { Region, Screen } from '../fixtures/visual';
import { AddressField } from './address-field';
import { ShellPage } from './shell.page';

/** `/my-business`: the overview of the owner (L2-085, L2-086). */
export class MyBusinessPage extends ShellPage implements Screen {
  readonly heading: Locator;
  readonly subtitle: Locator;
  readonly publicLink: Locator;
  readonly sections: Locator;
  readonly stats: Locator;
  /** The grid the figures stand in. */
  readonly statGrid: Locator;
  readonly needsReply: Locator;
  readonly replyRows: Locator;
  readonly listingCard: Locator;
  /** "Your address" on the "Your listing" card (L2-244 AC3). */
  readonly address: AddressField;
  readonly pause: Locator;
  readonly awayRow: Locator;
  readonly setAway: Locator;
  readonly changeAway: Locator;
  readonly resume: Locator;
  readonly pausedBanner: Locator;
  /** The banner of an agreement owed to the updated statement of faith (L2-075 AC5, AC6). */
  readonly statementBanner: Locator;
  readonly readAndAgree: Locator;
  readonly alert: Locator;
  readonly empty: Locator;
  readonly reference: Locator;
  readonly tryAgain: Locator;
  readonly loading: Locator;
  /** The select that switches between the owner's businesses (L2-079). */
  readonly switcher: Locator;
  readonly switcherOptions: Locator;
  readonly listAnother: Locator;
  /** "List your business", on the invitation of a member who has none. */
  readonly listYours: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.subtitle = this.main.locator('.subtitle');
    this.publicLink = this.main.getByRole('link', { name: /^(View public|Preview) listing$/ });
    this.sections = this.main.getByRole('navigation', { name: 'My business sections' });
    this.stats = this.main.locator('.stat-grid .stat');
    this.statGrid = this.main.locator('.stat-grid');
    this.needsReply = this.main.locator('section[aria-labelledby="nr"]');
    this.replyRows = this.needsReply.locator('ul.rows > li');
    this.listingCard = this.main.locator('aside .card');
    this.address = new AddressField(this.listingCard);
    this.pause = this.main.getByRole('button', { name: 'Pause listing' });
    this.awayRow = this.listingCard.locator('li.row').filter({ hasText: /Away/ });
    this.setAway = this.awayRow.getByRole('button', { name: 'Set away period' });
    this.changeAway = this.awayRow.getByRole('button', { name: 'Change away period' });
    this.resume = page.getByRole('button', { name: 'Resume listing' });
    this.pausedBanner = page.locator('.banner').filter({ hasText: 'Your listing is paused.' });
    this.statementBanner = page.locator('.banner').filter({ hasText: 'statement of faith' });
    this.readAndAgree = this.statementBanner.getByRole('button', { name: 'Read and agree' });
    this.alert = this.main.locator('.alert[role="status"], .alert[role="alert"]');
    this.empty = this.main.locator('.empty');
    this.reference = this.main.locator('code');
    this.tryAgain = this.main.getByRole('button', { name: 'Try again' });
    this.loading = this.main.getByRole('status');
    this.switcher = this.main.getByRole('combobox', { name: 'Business' });
    this.switcherOptions = this.switcher.getByRole('option');
    this.listAnother = this.main.getByRole('link', { name: 'List another business' });
    this.listYours = this.main.getByRole('link', { name: 'List your business' });
  }

  stat(label: string | RegExp): Locator {
    return this.stats.filter({ hasText: label });
  }

  /** The figure of one stat. */
  statValue(label: string | RegExp): Locator {
    return this.stat(label).locator('.stat__value');
  }

  /** The note under the figure: how it moved. */
  statNote(label: string | RegExp): Locator {
    return this.stat(label).locator('.stat__delta');
  }

  /** Chooses a business in the switcher by the words of its option. */
  async chooseBusiness(label: string): Promise<void> {
    await this.switcher.selectOption({ label });
  }

  section(name: string | RegExp): Locator {
    return this.sections.getByRole('link', { name });
  }

  replyRow(text: string | RegExp): Locator {
    return this.replyRows.filter({ hasText: text });
  }

  async ready(): Promise<void> {
    await this.heading.waitFor();
  }

  regions(): Region[] {
    return [...this.chromeRegions(), { name: 'main', locator: this.main }];
  }
}

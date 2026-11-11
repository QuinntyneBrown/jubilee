import type { Locator, Page } from '@playwright/test';
import type { Region, Screen } from '../fixtures/visual';
import { ShellPage } from './shell.page';

/** `/notifications`: the notification centre (L2-064). */
export class NotificationsPage extends ShellPage implements Screen {
  readonly heading: Locator;
  readonly subtitle: Locator;
  readonly items: Locator;
  readonly markAll: Locator;
  readonly settings: Locator;
  readonly empty: Locator;
  readonly alert: Locator;
  readonly reference: Locator;
  readonly tryAgain: Locator;
  readonly conversations: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.subtitle = this.main.locator('.subtitle');
    this.items = this.main.locator('ul.card--list > li');
    this.markAll = this.main.getByRole('button', { name: 'Mark all as read' });
    this.settings = this.main.getByRole('link', { name: 'Settings' });
    this.empty = this.main.locator('.empty');
    this.alert = this.main.getByRole('alert');
    this.reference = this.main.locator('code');
    this.tryAgain = this.main.getByRole('button', { name: 'Try again' });
    this.conversations = this.topBar.getByRole('link', { name: /^Messages/ });
  }

  item(title: string | RegExp): Locator {
    return this.items.filter({ hasText: title });
  }

  link(title: string | RegExp): Locator {
    return this.item(title).getByRole('link');
  }

  unread(): Locator {
    return this.main.locator('.notif--unread');
  }

  async ready(): Promise<void> {
    await this.heading.waitFor();
  }

  regions(): Region[] {
    return [...this.chromeRegions(), { name: 'main', locator: this.main }];
  }
}

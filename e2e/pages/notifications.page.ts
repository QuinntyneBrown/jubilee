import type { Locator, Page } from '@playwright/test';
import type { Region, Screen } from '../fixtures/visual';
import { ShellPage } from './shell.page';

/** `/notifications`: the notification centre (L2-064). */
export class NotificationsPage extends ShellPage implements Screen {
  readonly heading: Locator;
  readonly subtitle: Locator;
  readonly items: Locator;
  /** Each notification, as the link it is. */
  readonly links: Locator;
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
    this.links = this.main.locator('a.notif');
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

  /** The bag icon on a notification: the icon of a product, as the mock draws it. */
  bagIcon(title: string | RegExp): Locator {
    return this.item(title).locator(
      '.notif__icon svg path[d="M5 8h14l-1 12H6zM9 8V6a3 3 0 0 1 6 0v2"]',
    );
  }

  /** The star icon on a notification: the icon of a review (L2-234 AC5). */
  starIcon(title: string | RegExp): Locator {
    return this.item(title).locator(
      '.notif__icon svg path[d="M12 3l2.4 6.4 6.7.2-5.3 4.2 1.8 6.6L12 16.6l-5.6 3.8 1.8-6.6-5.3-4.2 6.7-.2z"]',
    );
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

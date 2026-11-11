import type { Locator, Page } from '@playwright/test';
import type { Region, Screen } from '../fixtures/visual';
import { ShellPage } from './shell.page';

/** `/my-business`: the overview of the owner (L2-085, L2-086). */
export class MyBusinessPage extends ShellPage implements Screen {
  readonly heading: Locator;
  readonly subtitle: Locator;
  readonly publicLink: Locator;
  readonly sections: Locator;
  readonly stats: Locator;
  readonly needsReply: Locator;
  readonly replyRows: Locator;
  readonly listingCard: Locator;
  readonly pause: Locator;
  readonly resume: Locator;
  readonly pausedBanner: Locator;
  readonly liveBanner: Locator;
  readonly alert: Locator;
  readonly timeline: Locator;
  readonly empty: Locator;
  readonly reference: Locator;
  readonly tryAgain: Locator;
  readonly loading: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.subtitle = this.main.locator('.subtitle');
    this.publicLink = this.main.getByRole('link', { name: /^(View public|Preview) listing$/ });
    this.sections = this.main.getByRole('navigation', { name: 'My business sections' });
    this.stats = this.main.locator('.stat-grid .stat');
    this.needsReply = this.main.locator('section[aria-labelledby="nr"]');
    this.replyRows = this.needsReply.locator('ul.rows > li');
    this.listingCard = this.main.locator('aside .card');
    this.pause = this.main.getByRole('button', { name: 'Pause listing' });
    this.resume = page.getByRole('button', { name: 'Resume listing' });
    this.pausedBanner = page.locator('.banner').filter({ hasText: 'Your listing is paused.' });
    this.liveBanner = page.locator('.banner').filter({ hasText: 'is verified and live.' });
    this.alert = this.main.locator('.alert[role="status"], .alert[role="alert"]');
    this.timeline = this.main.locator('ol.timeline > li');
    this.empty = this.main.locator('.empty');
    this.reference = this.main.locator('code');
    this.tryAgain = this.main.getByRole('button', { name: 'Try again' });
    this.loading = this.main.getByRole('status');
  }

  stat(label: string | RegExp): Locator {
    return this.stats.filter({ hasText: label });
  }

  section(name: string): Locator {
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

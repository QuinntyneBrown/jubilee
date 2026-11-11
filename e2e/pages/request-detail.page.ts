import type { Locator, Page } from '@playwright/test';
import type { Region, Screen } from '../fixtures/visual';
import { ShellPage } from './shell.page';

/** `/requests/:id`: one request, its progress and next steps (L2-048). */
export class RequestDetailPage extends ShellPage implements Screen {
  readonly breadcrumb: Locator;
  readonly heading: Locator;
  readonly subtitle: Locator;
  readonly callout: Locator;
  readonly details: Locator;
  readonly progress: Locator;
  readonly steps: Locator;
  readonly message: Locator;
  readonly cancel: Locator;
  readonly addToCalendar: Locator;
  readonly askAgain: Locator;
  readonly seeOthers: Locator;
  readonly alert: Locator;
  readonly reference: Locator;
  readonly tryAgain: Locator;
  readonly backToRequests: Locator;

  constructor(page: Page) {
    super(page);
    this.breadcrumb = this.main.getByRole('navigation', { name: 'Breadcrumb' });
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.subtitle = this.main.locator('.subtitle');
    this.callout = this.main.locator('.alert[role="status"]');
    this.details = this.main.locator('section[aria-labelledby="rd"]');
    this.progress = this.main.locator('section[aria-labelledby="rp"]');
    this.steps = this.progress.locator('ol.timeline > li');
    this.message = this.main.getByRole('link', { name: 'Message' });
    this.cancel = this.main.getByRole('button', { name: /^Cancel (request|booking)$/ });
    this.addToCalendar = this.main.getByRole('link', { name: 'Add to calendar' });
    this.askAgain = this.main.getByRole('link', { name: 'Ask again' });
    this.seeOthers = this.main.getByRole('link', { name: /^See other / });
    this.alert = this.main.getByRole('alert');
    this.reference = this.main.locator('code');
    this.tryAgain = this.main.getByRole('button', { name: 'Try again' });
    this.backToRequests = this.main.getByRole('link', { name: 'Back to your requests' });
  }

  async ready(): Promise<void> {
    await this.main.locator('h1').waitFor();
  }

  regions(): Region[] {
    return [...this.chromeRegions(), { name: 'main', locator: this.main }];
  }
}

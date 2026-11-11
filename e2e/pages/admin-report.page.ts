import type { Locator, Page } from '@playwright/test';
import type { Region, Screen } from '../fixtures/visual';
import { ShellPage } from './shell.page';

/** `/admin/reports/:id`: one report and the actions on it (L2-105). */
export class AdminReportPage extends ShellPage implements Screen {
  readonly heading: Locator;
  readonly subtitle: Locator;
  readonly report: Locator;
  readonly conversation: Locator;
  readonly history: Locator;
  readonly resolvedNotice: Locator;
  readonly alert: Locator;
  readonly reference: Locator;
  readonly tryAgain: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.subtitle = this.main.locator('.subtitle');
    this.report = this.main.locator('section[aria-labelledby="rep"]');
    this.conversation = this.main.locator('section[aria-labelledby="conv"]');
    this.history = this.main.locator('section[aria-labelledby="hist"]');
    this.resolvedNotice = this.main.locator('.alert[role="status"]');
    this.alert = this.main.getByRole('alert');
    this.reference = this.main.locator('code');
    this.tryAgain = this.main.getByRole('button', { name: 'Try again' });
  }

  action(name: string): Locator {
    return this.main.getByRole('button', { name, exact: true });
  }

  async ready(): Promise<void> {
    await this.heading.waitFor();
  }

  regions(): Region[] {
    return [...this.chromeRegions(), { name: 'main', locator: this.main }];
  }
}

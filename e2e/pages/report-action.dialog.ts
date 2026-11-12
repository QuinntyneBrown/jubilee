import type { Locator, Page } from '@playwright/test';
import type { Region, Screen } from '../fixtures/visual';
import { AdminReportPage } from './admin-report.page';

/** The dialog that collects the resolution note (and message) for a report action (L2-105). */
export class ReportActionDialog {
  readonly root: Locator;
  readonly title: Locator;
  readonly note: Locator;
  readonly message: Locator;
  /** What the author of a review taken down reads (L2-236 AC3). */
  readonly reason: Locator;
  readonly description: Locator;
  readonly error: Locator;
  readonly alert: Locator;
  readonly cancel: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('dialog');
    this.title = this.root.locator('.dialog__title');
    this.note = this.root.getByRole('textbox', { name: /Resolution note/ });
    this.message = this.root.getByRole('textbox', { name: /^Message/ });
    this.reason = this.root.getByRole('textbox', { name: /^Reason the author will read/ });
    this.description = this.root.locator('#dlg-desc');
    this.error = this.root.locator('.field__error');
    this.alert = this.root.getByRole('alert');
    this.cancel = this.root.getByRole('button', { name: 'Cancel' });
  }

  confirm(label: string): Locator {
    return this.root.getByRole('button', { name: label, exact: true });
  }
}

/** The report of a review with "Take the review down" opened (L2-236 AC3). */
export class TakeDownScreen extends ReportActionDialog implements Screen {
  constructor(protected readonly page: Page) {
    super(page);
  }

  async ready(): Promise<void> {
    // The mock is drawn with the dialog open.
    if (await this.root.isVisible()) return;
    await new AdminReportPage(this.page).action('Take the review down').click();
    await this.reason.waitFor();
  }

  regions(): Region[] {
    return [{ name: 'dialog', locator: this.root }];
  }
}

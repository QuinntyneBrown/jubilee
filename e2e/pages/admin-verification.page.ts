import type { Locator, Page } from '@playwright/test';
import type { Region, Screen } from '../fixtures/visual';
import { AdminShellPage } from './admin-shell.page';

/** `/verifications/:id`: the review of one submitted listing (L2-100). */
export class AdminVerificationPage extends AdminShellPage implements Screen {
  readonly heading: Locator;
  readonly subtitle: Locator;
  readonly breadcrumb: Locator;
  readonly owner: Locator;
  /** The headings of the page's panels, in order. */
  readonly panels: Locator;
  readonly checklist: Locator;
  readonly checks: Locator;
  readonly requestChanges: Locator;
  readonly approve: Locator;
  readonly decline: Locator;
  readonly notices: Locator;
  readonly alert: Locator;
  readonly reference: Locator;
  readonly tryAgain: Locator;
  readonly preview: Locator;
  readonly space: Locator;
  readonly spacePreview: Locator;
  readonly previewHeading: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.subtitle = this.main.locator('.subtitle');
    this.breadcrumb = this.main.getByRole('navigation', { name: 'Breadcrumb' });
    this.owner = this.main.locator('section[aria-labelledby="own"]');
    this.panels = this.main.getByRole('heading', { level: 2 });
    this.checklist = this.main.locator('section[aria-labelledby="chk"]');
    this.checks = this.checklist.getByRole('checkbox');
    this.requestChanges = this.main.getByRole('button', { name: 'Request changes' });
    this.approve = this.main.getByRole('button', { name: 'Approve and publish' });
    this.decline = this.main.getByRole('button', { name: 'Decline listing' });
    this.notices = this.main.locator('.alert[role="status"]');
    this.alert = this.main.getByRole('alert');
    this.reference = this.main.locator('code');
    this.tryAgain = this.main.getByRole('button', { name: 'Try again' });
    this.preview = this.main.locator('aside .biz-card');
    this.space = this.main.locator('section[aria-labelledby="spc"]');
    this.spacePreview = this.main.locator('aside .space-card');
    this.previewHeading = this.main.locator('aside h2');
  }

  /** The value of one row of the space card, by its term. */
  spaceRow(term: string): Locator {
    return this.space
      .locator('.dl__item')
      .filter({ has: this.page.getByText(term, { exact: true }) })
      .locator('dd');
  }

  check(label: string | RegExp): Locator {
    return this.checklist.getByRole('checkbox', { name: label });
  }

  async ready(): Promise<void> {
    await this.heading.waitFor();
  }

  regions(): Region[] {
    return [...this.chromeRegions(), { name: 'main', locator: this.main }];
  }
}

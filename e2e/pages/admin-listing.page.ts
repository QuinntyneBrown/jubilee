import type { Locator, Page } from '@playwright/test';
import type { Region, Screen } from '../fixtures/visual';
import { AdminShellPage } from './admin-shell.page';

/** `/listings/:id`: one published listing, its owner and the takedown (L2-100, L2-101). */
export class AdminListingPage extends AdminShellPage implements Screen {
  readonly heading: Locator;
  readonly subtitle: Locator;
  readonly breadcrumb: Locator;
  readonly owner: Locator;
  /** The headings of the page's panels, in order. */
  readonly panels: Locator;
  readonly takeDown: Locator;
  readonly flags: Locator;
  /** The notice of a takedown (L2-100 AC5, L2-101 AC3). */
  readonly takedown: Locator;
  readonly alert: Locator;
  readonly reference: Locator;
  readonly tryAgain: Locator;
  readonly backToListings: Locator;
  readonly preview: Locator;
  readonly previewHeading: Locator;
  readonly space: Locator;
  readonly spacePreview: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.subtitle = this.main.locator('.subtitle');
    this.breadcrumb = this.main.getByRole('navigation', { name: 'Breadcrumb' });
    this.owner = this.main.locator('section[aria-labelledby="own"]');
    this.panels = this.main.getByRole('heading', { level: 2 });
    this.takeDown = this.main.getByRole('button', { name: 'Take down listing' });
    this.flags = this.main.locator('.alert').filter({ hasText: 'Flagged' });
    this.takedown = this.main
      .locator('.alert')
      .filter({ has: this.page.locator('.alert__title', { hasText: 'Taken down' }) });
    this.alert = this.main.getByRole('alert');
    this.reference = this.main.locator('code');
    this.tryAgain = this.main.getByRole('button', { name: 'Try again' });
    this.backToListings = this.main.getByRole('link', { name: 'Back to listings' });
    this.preview = this.main.locator('aside .biz-card');
    this.previewHeading = this.main.locator('aside h2');
    this.space = this.main.locator('section[aria-labelledby="spc"]');
    this.spacePreview = this.main.locator('aside .space-card');
  }

  /** The value of one row of the owner card or the space card, by its term. */
  ownerRow(term: string): Locator {
    return this.owner
      .locator('.dl__item')
      .filter({ has: this.page.getByText(term, { exact: true }) })
      .locator('dd');
  }

  spaceRow(term: string): Locator {
    return this.space
      .locator('.dl__item')
      .filter({ has: this.page.getByText(term, { exact: true }) })
      .locator('dd');
  }

  async ready(): Promise<void> {
    await this.heading.waitFor();
  }

  regions(): Region[] {
    return [...this.chromeRegions(), { name: 'main', locator: this.main }];
  }
}

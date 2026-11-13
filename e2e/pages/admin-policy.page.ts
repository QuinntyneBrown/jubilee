import type { Locator, Page } from '@playwright/test';
import type { Region, Screen } from '../fixtures/visual';
import { AdminShellPage } from './admin-shell.page';

/**
 * `/policies/:slug` of the admin application: the editor of one policy page, its preview and its
 * kept versions (L2-226).
 */
export class AdminPolicyPage extends AdminShellPage implements Screen {
  readonly heading: Locator;
  readonly subtitle: Locator;
  readonly form: Locator;
  readonly title: Locator;
  readonly lead: Locator;
  readonly sections: Locator;
  readonly addSection: Locator;
  readonly publish: Locator;
  readonly formAlert: Locator;
  readonly preview: Locator;
  readonly previewNote: Locator;
  readonly document: Locator;
  readonly versions: Locator;
  readonly versionRows: Locator;
  readonly error: Locator;
  readonly reference: Locator;
  readonly tryAgain: Locator;
  readonly loading: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.subtitle = this.main.locator('.page-header .subtitle');
    this.form = this.main.getByRole('form', { name: 'Edit' });
    this.title = this.form.getByLabel('Title', { exact: true });
    this.lead = this.form.getByLabel('Lead');
    this.sections = this.form.getByRole('region');
    this.addSection = this.form.getByRole('button', { name: 'Add a section' });
    this.publish = this.form.getByRole('button', { name: /^Publish version/ });
    this.formAlert = this.form.getByRole('alert');
    this.preview = this.main.getByRole('region', { name: 'Preview' });
    this.previewNote = this.preview.getByRole('status');
    this.document = this.preview.locator('article.policy-document');
    this.versions = this.main.getByRole('region', { name: 'Kept versions' });
    this.versionRows = this.versions.locator('li');
    this.error = this.main.locator('.empty--error');
    this.reference = this.error.locator('code');
    this.tryAgain = this.main.getByRole('button', { name: 'Try again' });
    this.loading = this.main.getByRole('status').filter({ hasText: 'Loading the policy' });
  }

  section(n: number): Locator {
    return this.form.getByRole('region', { name: `Section ${n}` });
  }

  sectionHeading(n: number): Locator {
    return this.section(n).getByLabel('Heading');
  }

  sectionText(n: number): Locator {
    return this.section(n).getByLabel('Text');
  }

  removeSection(n: number): Locator {
    return this.section(n).getByRole('button', { name: `Remove section ${n}` });
  }

  fieldError(field: Locator): Locator {
    return field
      .locator('xpath=ancestor::*[contains(@class, "field")][1]')
      .locator('.field__error');
  }

  async ready(): Promise<void> {
    await this.heading.waitFor();
  }

  regions(): Region[] {
    return [...this.chromeRegions(), { name: 'main', locator: this.main }];
  }
}

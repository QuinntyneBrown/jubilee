import type { Locator, Page } from '@playwright/test';
import type { Region, Screen } from '../fixtures/visual';
import { ShellPage } from './shell.page';

/** "List your business": the form, the live preview and the state after submitting. */
export class ListBusinessPage extends ShellPage implements Screen {
  readonly heading: Locator;
  readonly products: Locator;
  readonly services: Locator;
  readonly name: Locator;
  readonly tagline: Locator;
  readonly taglineCount: Locator;
  readonly category: Locator;
  readonly place: Locator;
  readonly placeLabel: Locator;
  readonly church: Locator;
  readonly pastorEmail: Locator;
  readonly agree: Locator;
  readonly addItem: Locator;
  readonly itemRows: Locator;
  readonly saveDraft: Locator;
  readonly submit: Locator;
  readonly summary: Locator;
  readonly summaryLinks: Locator;
  readonly fieldError: Locator;
  readonly alert: Locator;
  readonly saved: Locator;
  readonly confirmNotice: Locator;
  readonly loadError: Locator;
  readonly tryAgain: Locator;
  readonly preview: Locator;
  readonly previewName: Locator;
  readonly previewTagline: Locator;
  readonly previewTag: Locator;
  readonly doneHeading: Locator;
  readonly doneText: Locator;
  readonly timeline: Locator;
  readonly goToMyBusiness: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.products = this.main.getByRole('radio', { name: /Products/ });
    this.services = this.main.getByRole('radio', { name: /Services/ });
    this.name = this.main.locator('#name');
    this.tagline = this.main.locator('#tagline');
    this.taglineCount = this.main.locator('#tagline ~ .field__help');
    this.category = this.main.locator('#cat');
    this.place = this.main.locator('#area');
    this.placeLabel = this.main.locator('label[for="area"]');
    this.church = this.main.locator('#ref-church');
    this.pastorEmail = this.main.locator('#ref-email');
    this.agree = this.main.getByRole('checkbox', { name: /statement of faith/ });
    this.addItem = this.main.getByRole('button', { name: /^Add a (product|service)$/ });
    this.itemRows = this.main
      .locator('.item-list > li')
      .filter({ has: page.locator('.item-list__name') });
    this.saveDraft = this.main.getByRole('button', { name: 'Save draft' });
    this.submit = this.main.getByRole('button', { name: 'Submit for verification' });
    this.summary = this.main.locator('#summary');
    this.summaryLinks = this.summary.getByRole('link');
    this.fieldError = this.main.locator('.field__error');
    this.alert = this.main.getByRole('alert');
    this.saved = this.main.getByRole('status').filter({ hasText: 'Draft saved' });
    this.confirmNotice = this.main.getByRole('status').filter({ hasText: 'Confirm your e-mail' });
    this.loadError = this.main.locator('.empty--error');
    this.tryAgain = this.main.getByRole('button', { name: 'Try again' });
    this.preview = this.main.getByRole('complementary');
    this.previewName = this.preview.locator('.biz-card__name');
    this.previewTagline = this.preview.locator('.biz-card__tagline');
    this.previewTag = this.preview.locator('.media__tag');
    this.doneHeading = this.main.getByRole('heading', { level: 1 });
    this.doneText = this.main.locator('.empty__text');
    this.timeline = this.main.locator('.timeline li');
    this.goToMyBusiness = this.main.getByRole('link', { name: 'Go to My business' });
  }

  async ready(): Promise<void> {
    await this.main.locator('.split, .empty').first().waitFor({ state: 'attached' });
  }

  regions(): Region[] {
    return [{ name: 'main', locator: this.main }];
  }

  /** Fills the fields a valid submission needs. */
  async fillValid(): Promise<void> {
    await this.name.fill('Luzandre.com');
    await this.tagline.fill('Unique & custom Christian apparel, artworks & gifts');
    await this.church.fill('Grace Toronto Church');
    await this.pastorEmail.fill('daniel.okoro@gracetoronto.example');
    await this.agree.check();
  }
}

/** The dialog that adds a product or a service to the listing being written. */
export class ListingItemDialog {
  readonly root: Locator;
  readonly title: Locator;
  readonly name: Locator;
  readonly detail: Locator;
  readonly pricing: Locator;
  readonly price: Locator;
  readonly fieldError: Locator;
  readonly add: Locator;
  readonly cancel: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('dialog');
    this.title = this.root.locator('.dialog__title');
    this.name = this.root.locator('#d-name');
    this.detail = this.root.locator('#d-meta');
    this.pricing = this.root.locator('#d-pricing');
    this.price = this.root.locator('#d-price');
    this.fieldError = this.root.locator('.field__error');
    this.add = this.root.getByRole('button', { name: /^Add (product|service)$/ });
    this.cancel = this.root.getByRole('button', { name: 'Cancel' });
  }
}

import type { Locator, Page } from '@playwright/test';
import type { Region, Screen } from '../fixtures/visual';
import { ShellPage } from './shell.page';

/** "List your business": the form, the live preview and the state after submitting. */
export class ListBusinessPage extends ShellPage implements Screen {
  readonly heading: Locator;
  readonly products: Locator;
  /** The two cards of "What do you offer?". */
  readonly offerCards: Locator;
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
  readonly spacePreview: Locator;
  readonly previewName: Locator;
  readonly previewTagline: Locator;
  readonly previewTag: Locator;
  readonly doneHeading: Locator;
  readonly doneText: Locator;
  readonly timeline: Locator;
  readonly goToMyBusiness: Locator;
  /** The fields of a space (L2-197, L2-198). */
  readonly space: SpaceFields;

  constructor(page: Page) {
    super(page);
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.products = this.main.getByRole('radio', { name: /Products/ });
    this.offerCards = this.main.locator('.choice-cards');
    this.services = this.main.getByRole('radio', { name: /Services/ });
    this.name = this.main.locator('#name');
    this.tagline = this.main.locator('#tagline');
    this.taglineCount = this.main.locator('#tagline-count');
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
    this.spacePreview = this.preview.locator('.space-card');
    this.previewName = this.preview.locator('.biz-card__name');
    this.previewTagline = this.preview.locator('.biz-card__tagline');
    this.previewTag = this.preview.locator('.media__tag');
    this.doneHeading = this.main.getByRole('heading', { level: 1 });
    this.doneText = this.main.locator('.empty__text');
    this.timeline = this.main.locator('.timeline li');
    this.goToMyBusiness = this.main.getByRole('link', { name: 'Go to My business' });
    this.space = new SpaceFields(page, this.main);
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

/** The space form of List your business (L2-197 to L2-199). */
export class SpaceFields {
  readonly offer: Locator;
  readonly nameLabel: Locator;
  readonly nameHelp: Locator;
  readonly taglineLabel: Locator;
  readonly terms: Locator;
  readonly price: Locator;
  readonly priceLabel: Locator;
  readonly available: Locator;
  readonly availableLabel: Locator;
  readonly minimum: Locator;
  readonly minimumLabel: Locator;
  readonly neighbourhood: Locator;
  readonly neighbourhoodHelp: Locator;
  readonly address: Locator;
  readonly addressHelp: Locator;
  readonly place: Locator;
  readonly facts: Locator;
  readonly includedGroup: Locator;
  readonly included: Locator;
  readonly rules: Locator;
  readonly household: Locator;
  readonly householdLabel: Locator;
  readonly householdHelp: Locator;
  readonly photosHelp: Locator;
  readonly agreement: Locator;
  readonly previewHeading: Locator;
  readonly previewCard: Locator;
  readonly previewTitle: Locator;
  readonly previewPrice: Locator;
  readonly previewBadge: Locator;
  readonly previewPending: Locator;

  constructor(
    readonly page: Page,
    main: Locator,
  ) {
    this.offer = main.getByRole('radio', { name: /^A space/ });
    this.nameLabel = main.locator('label[for="name"]');
    this.nameHelp = main.locator('#name-help');
    this.taglineLabel = main.locator('label[for="tagline"]');
    this.terms = main.getByRole('group', { name: 'How are you renting it?' });
    this.price = main.locator('#price');
    this.priceLabel = main.locator('label[for="price"]');
    this.available = main.locator('#avail');
    this.availableLabel = main.locator('label[for="avail"]');
    this.minimum = main.locator('#min');
    this.minimumLabel = main.locator('label[for="min"]');
    this.neighbourhood = main.locator('#area');
    this.neighbourhoodHelp = main.locator('#area-help');
    this.address = main.locator('#address');
    this.addressHelp = main.locator('#address-help');
    this.place = main.locator('#place');
    this.facts = main.locator('#facts');
    this.includedGroup = main.getByRole('group', { name: 'What’s included' });
    this.included = this.includedGroup.getByRole('button');
    this.rules = main.locator('#rules');
    this.household = main.locator('#household');
    this.householdLabel = main.locator('label[for="household"]');
    this.householdHelp = main.locator('#household-help');
    this.photosHelp = main.getByRole('group', { name: 'Photos' });
    this.agreement = main.getByRole('checkbox', { name: /statement of faith/ });
    const preview = main.getByRole('complementary');
    this.previewHeading = preview.getByRole('heading');
    this.previewCard = preview.locator('.space-card');
    this.previewTitle = this.previewCard.locator('.space-card__title');
    this.previewPrice = this.previewCard.locator('.space-card__price');
    this.previewBadge = this.previewCard.locator('.space-card__badge');
    this.previewPending = this.previewCard.locator('.perk');
  }

  term(name: string): Locator {
    return this.terms.getByRole('radio', { name: new RegExp(`^${name}`) });
  }

  includedChip(name: string): Locator {
    return this.includedGroup.getByRole('button', { name, exact: true });
  }

  /** Fills the space fields a valid long-term submission needs. */
  async fillValid(): Promise<void> {
    await this.price.fill('1850');
    await this.available.fill('Dec 1');
    await this.neighbourhood.fill('The Annex');
    await this.address.fill('27 Brunswick Ave, lower unit, Toronto');
  }

  /** Writes the basement apartment of the design reference, as the preview shows it. */
  async fillExample(name: Locator): Promise<void> {
    await name.fill('Bright basement apartment in the Annex');
    await this.fillValid();
    await this.facts.fill('1 bedroom\n1 bath');
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

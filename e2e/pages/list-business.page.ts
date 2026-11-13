import type { Locator, Page } from '@playwright/test';
import type { Region, Screen } from '../fixtures/visual';
import { AddressField } from './address-field';
import { ShellPage } from './shell.page';

/** "List your business": the form, the live preview and the state after publishing. */
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
  /** The optional green line of the card (L2-072 AC1). */
  readonly highlight: Locator;
  readonly highlightLabel: Locator;
  readonly highlightHelp: Locator;
  /** The page's line under its heading. */
  readonly intro: Locator;
  /** Every group of fields the form has, by its legend. */
  readonly legends: Locator;
  readonly agree: Locator;
  readonly addItem: Locator;
  readonly itemRows: Locator;
  readonly saveDraft: Locator;
  readonly publish: Locator;
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
  /** The green lines of the preview card: the highlight, when there is one, then the mark. */
  readonly previewPerks: Locator;
  /** The card of "How members see you". */
  readonly previewCard: Locator;
  readonly doneHeading: Locator;
  /** "Your address" on the state after publishing (L2-244 AC2). */
  readonly addressHeading: Locator;
  readonly address: AddressField;
  readonly doneText: Locator;
  readonly timeline: Locator;
  readonly goToMyBusiness: Locator;
  readonly viewPublicListing: Locator;
  readonly addMore: Locator;
  /** The fields of a space (L2-198, L2-199). */
  readonly space: SpaceFields;
  /** The fields of a software platform (L2-249, L2-250). */
  readonly platform: PlatformFields;

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
    this.highlight = this.main.locator('#perk');
    this.highlightLabel = this.main.locator('label[for="perk"]');
    this.highlightHelp = this.main.locator('#perk-help');
    this.intro = this.main.locator('.subtitle');
    this.legends = this.main.locator('legend');
    this.agree = this.main.getByRole('checkbox', { name: /statement of faith/ });
    this.addItem = this.main.getByRole('button', { name: /^Add a (product|service)$/ });
    this.itemRows = this.main
      .locator('.item-list > li')
      .filter({ has: page.locator('.item-list__name') });
    this.saveDraft = this.main.getByRole('button', { name: 'Save draft' });
    this.publish = this.main.getByRole('button', { name: 'Publish listing' });
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
    this.previewPerks = this.preview.locator('.biz-card .perk');
    this.previewCard = this.preview.locator('.biz-card');
    this.doneHeading = this.main.getByRole('heading', { level: 1 });
    this.addressHeading = this.main.getByRole('heading', { name: 'Your address' });
    this.address = new AddressField(this.main);
    this.doneText = this.main.locator('.empty__text');
    this.timeline = this.main.locator('.timeline li');
    this.goToMyBusiness = this.main.getByRole('link', { name: 'Go to My business' });
    this.viewPublicListing = this.main.getByRole('link', { name: 'View public listing' });
    this.addMore = this.main.getByRole('link', { name: /^Add more/ });
    this.space = new SpaceFields(page, this.main);
    this.platform = new PlatformFields(this.main);
  }

  async ready(): Promise<void> {
    await this.main.locator('.split, .empty').first().waitFor({ state: 'attached' });
  }

  regions(): Region[] {
    return [{ name: 'main', locator: this.main }];
  }

  /** Writes the shop of the design reference, as the preview of the mock shows it. */
  async fillExample(): Promise<void> {
    await this.name.fill('Luzandre.com');
    await this.tagline.fill('Unique & custom Christian apparel, artworks & gifts that bring joy');
    await this.highlight.fill('Ships across Canada');
  }

  /** The button that takes a product or a service out of the draft again. */
  removeItem(name: string): Locator {
    return this.main.getByRole('button', { name: `Remove ${name}`, exact: true });
  }

  /** Fills the fields a valid submission needs. */
  async fillValid(): Promise<void> {
    await this.name.fill('Luzandre.com');
    await this.tagline.fill('Unique & custom Christian apparel, artworks & gifts');
    await this.agree.check();
  }
}

/** The platform form of List your business (L2-249 to L2-251). */
export class PlatformFields {
  readonly offer: Locator;
  readonly offerText: Locator;
  readonly nameLabel: Locator;
  readonly nameHelp: Locator;
  readonly taglineLabel: Locator;
  readonly website: Locator;
  readonly websiteHelp: Locator;
  readonly websiteError: Locator;
  readonly does: Locator;
  readonly doesHelp: Locator;
  readonly doesCount: Locator;
  readonly doesError: Locator;
  readonly forWhom: Locator;
  readonly forHelp: Locator;
  readonly forCount: Locator;
  readonly forError: Locator;
  readonly pricing: Locator;
  readonly pricingHelp: Locator;
  readonly pricingCount: Locator;
  readonly pricingError: Locator;
  /** "Members go to your website to use it. Jubilee takes no payment." */
  readonly note: Locator;
  readonly photosNote: Locator;
  readonly agreement: Locator;
  readonly previewHeading: Locator;

  constructor(main: Locator) {
    this.offer = main.getByRole('radio', { name: /^A software platform/ });
    this.offerText = main
      .locator('.choice-card')
      .filter({ hasText: 'A software platform' })
      .locator('.choice-card__text');
    this.nameLabel = main.locator('label[for="name"]');
    this.nameHelp = main.locator('#name-help');
    this.taglineLabel = main.locator('label[for="tagline"]');
    this.website = main.locator('#website');
    this.websiteHelp = main.locator('#website-help');
    this.websiteError = main.locator('#website-error');
    this.does = main.locator('#does');
    this.doesHelp = main.locator('#does-help');
    this.doesCount = main.locator('#does-count');
    this.doesError = main.locator('#does-error');
    this.forWhom = main.locator('#for');
    this.forHelp = main.locator('#for-help');
    this.forCount = main.locator('#for-count');
    this.forError = main.locator('#for-error');
    this.pricing = main.locator('#pricing');
    this.pricingHelp = main.locator('#pricing-help');
    this.pricingCount = main.locator('#pricing-count');
    this.pricingError = main.locator('#pricing-error');
    this.note = main.locator('#platform-note');
    this.photosNote = main.getByRole('group', { name: 'Photos' }).locator('.field__help');
    this.agreement = main.locator('.choice', {
      has: main.page().getByRole('checkbox', { name: /statement of faith/ }),
    });
    this.previewHeading = main.getByRole('complementary').getByRole('heading');
  }

  /** Writes Lanternread, with every field a valid platform needs and the agreement. */
  async fillValid(list: ListBusinessPage): Promise<void> {
    await list.name.fill('Lanternread');
    await list.tagline.fill('A reading log families keep together');
    await this.website.fill('https://lanternread.example');
    await this.does.fill('Families log the books their children read.');
    await this.forWhom.fill('Families with children aged 4 to 12.');
    await this.pricing.fill('Free for families.');
    await list.agree.check();
  }
}

/** The space form of List your business (L2-198 to L2-200). */
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

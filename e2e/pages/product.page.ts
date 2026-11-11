import type { Locator, Page } from '@playwright/test';
import type { Region, Screen } from '../fixtures/visual';
import { ProductCardPart } from './business.page';
import { ShellPage } from './shell.page';

/** The product page at /b/:slug/p/:product. */
export class ProductPage extends ShellPage implements Screen {
  readonly breadcrumb: Locator;
  readonly breadcrumbLinks: Locator;
  readonly breadcrumbCurrent: Locator;
  readonly mediaTile: Locator;
  readonly mediaTag: Locator;
  readonly heading: Locator;
  readonly price: Locator;
  readonly deliveryLine: Locator;
  readonly soldBy: Locator;
  readonly shopLink: Locator;
  readonly optionGroup: Locator;
  /** The chips of the option, one per choice. */
  readonly optionChips: Locator;
  readonly optionError: Locator;
  readonly quantity: Locator;
  readonly quantityError: Locator;
  readonly requestButton: Locator;
  /** The actions of the head: request, message, save. */
  readonly actions: Locator;
  readonly messageLink: Locator;
  readonly paymentNote: Locator;
  readonly soldOutAlert: Locator;
  readonly alertButton: Locator;
  readonly alertStatus: Locator;
  readonly details: Locator;
  readonly description: Locator;
  readonly detailTerms: Locator;
  readonly detailValues: Locator;
  readonly more: Locator;
  readonly moreCards: Locator;
  readonly visitShop: Locator;
  readonly errorState: Locator;
  readonly errorReference: Locator;
  readonly tryAgain: Locator;
  readonly backToShop: Locator;
  readonly saveButton: Locator;
  readonly loadingStatus: Locator;
  /** The quantity's label, input and error together. */
  readonly quantityField: Locator;

  constructor(page: Page) {
    super(page);
    this.breadcrumb = this.main.getByRole('navigation', { name: 'Breadcrumb' });
    this.saveButton = this.main.getByRole('button', { name: /^Save/ });
    this.breadcrumbLinks = this.breadcrumb.getByRole('link');
    this.breadcrumbCurrent = this.breadcrumb.locator('[aria-current="page"]');
    this.mediaTile = this.main.locator('.media').first();
    this.mediaTag = this.mediaTile.locator('.media__tag');
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.price = this.main.locator('.detail-head .price');
    this.deliveryLine = this.main.locator('.detail-head .price + .text-muted');
    this.soldBy = this.main.locator('.detail-head__kicker');
    this.shopLink = this.soldBy.getByRole('link');
    this.optionGroup = this.main.locator('.detail-head fieldset');
    this.optionChips = this.optionGroup.locator('label.chip');
    this.optionError = this.optionGroup.locator('.field__error');
    this.quantity = this.main.getByLabel('Quantity');
    this.quantityError = this.main.locator('#qty-error');
    this.quantityField = this.main.locator('.field:has(#qty)');
    this.requestButton = this.main.getByRole('button', { name: 'Request this item' });
    this.actions = this.main.locator('.detail-head__actions');
    this.messageLink = this.main.locator('.detail-head__actions .btn--icon');
    this.paymentNote = this.main.locator('.detail-head > .text-caption');
    this.soldOutAlert = this.main.locator('.detail-head .alert');
    this.alertButton = this.main.getByRole('button', { name: 'Tell me when it’s back' });
    this.alertStatus = this.main.locator('.detail-head__actions .inline-status');
    this.details = this.main.getByRole('region', { name: 'Details' });
    this.description = this.details.locator('p');
    this.detailTerms = this.details.locator('dt');
    this.detailValues = this.details.locator('dd');
    this.more = this.main.locator('section[aria-labelledby="more"]');
    this.moreCards = this.more.locator('a.product-card');
    this.visitShop = this.more.getByRole('link', { name: 'Visit shop' });
    this.errorState = this.main.locator('.empty--error');
    this.errorReference = this.errorState.locator('code');
    this.tryAgain = this.errorState.getByRole('button', { name: 'Try again' });
    this.backToShop = this.errorState.getByRole('link', { name: /^Back to / });
    this.loadingStatus = this.main.getByRole('status');
  }

  option(label: string): Locator {
    return this.optionGroup.getByRole('radio', { name: label, exact: true });
  }

  /** Chooses an option by its chip, as a member taps it. */
  async choose(label: string): Promise<void> {
    await this.optionGroup.locator('label.chip', { hasText: new RegExp(`^${label}$`) }).click();
  }

  moreCard(index: number): ProductCardPart {
    return new ProductCardPart(this.moreCards.nth(index));
  }

  /** Resolves once the page has loaded or failed; the loading state has its own screen. */
  async ready(): Promise<void> {
    await this.main.locator('.detail-head, .empty--error').first().waitFor({ state: 'attached' });
  }

  regions(): Region[] {
    return [...this.chromeRegions(), { name: 'main', locator: this.main }];
  }
}

/** The product page as its default mock shows it: size M chosen. */
export class ProductWithSizeScreen extends ProductPage {
  override async ready(): Promise<void> {
    await super.ready();
    if (!(await this.option('M').isChecked())) await this.choose('M');
  }
}

/** The product page after "Request this item" without a size and with 30 items. */
export class ProductInvalidScreen extends ProductPage {
  override async ready(): Promise<void> {
    await super.ready();
    if (await this.optionError.isVisible()) return;
    await this.quantity.fill('30');
    await this.requestButton.click();
    await this.optionError.waitFor();
    // The failed request moves focus to the first field to fix; captured at rest, unfocused.
    await this.page.locator(':focus').blur();
  }
}

/** The product page while its data is still on the way. */
export class ProductLoadingScreen extends ProductPage {
  override async ready(): Promise<void> {
    await this.main.locator('.skeleton').first().waitFor({ state: 'attached' });
  }
}

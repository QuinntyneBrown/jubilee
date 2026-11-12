import type { Locator, Page } from '@playwright/test';
import type { Region, Screen } from '../fixtures/visual';
import { BusinessCard } from './business-card';
import { ShellPage } from './shell.page';

/** One row of "Services" or "Custom work" (`li.row`). */
export class ServiceRow {
  readonly title: Locator;
  readonly detail: Locator;
  readonly price: Locator;
  readonly action: Locator;

  constructor(readonly root: Locator) {
    this.title = root.locator('.row__title');
    this.detail = root.locator('.row__meta');
    this.price = root.locator('.row__price');
    this.action = root.locator('.btn');
  }
}

/** One product card (`a.product-card`). */
export class ProductCardPart {
  readonly name: Locator;
  readonly shopName: Locator;
  readonly price: Locator;
  readonly badge: Locator;

  constructor(readonly root: Locator) {
    this.name = root.locator('.biz-card__name');
    this.shopName = root.locator('.biz-card__tagline');
    this.price = root.locator('.price');
    this.badge = root.locator('.media__tag');
  }
}

/** The listing page at /b/:slug, in its service business and shop layouts. */
export class BusinessPage extends ShellPage implements Screen {
  readonly backLink: Locator;
  readonly mediaTile: Locator;
  readonly mediaLabel: Locator;
  /** The cover photo in the tile at the head of the page (L2-221). */
  readonly coverPhoto: Locator;
  /** The WebP source of the cover's picture. */
  readonly coverWebp: Locator;
  /** "Photos": the photos after the cover. */
  readonly photos: Locator;
  readonly photoImages: Locator;
  readonly photoWebpSources: Locator;
  /** The head of the page: kicker, name, what the business offers and its actions. */
  readonly detailHead: Locator;
  readonly kicker: Locator;
  readonly kickerIcon: Locator;
  readonly verifiedLabel: Locator;
  readonly categoryLink: Locator;
  readonly heading: Locator;
  readonly ownerName: Locator;
  readonly tagline: Locator;
  readonly credentialTags: Locator;
  /** "Replies fast" beside the credentials (L2-054). */
  readonly repliesFast: Locator;
  readonly actions: Locator;
  readonly primaryAction: Locator;
  readonly messageLink: Locator;
  readonly bookLink: Locator;
  readonly saveButton: Locator;
  readonly shareLink: Locator;
  readonly highlight: Locator;
  readonly services: Locator;
  readonly serviceRows: Locator;
  readonly servicesEmpty: Locator;
  readonly about: Locator;
  readonly ownerBanner: Locator;
  readonly goToMyBusiness: Locator;
  /** The banner of a listing that is not public, with its status (L2-219). */
  readonly previewBanner: Locator;
  readonly previewTitle: Locator;
  readonly products: Locator;
  readonly productCount: Locator;
  readonly productCards: Locator;
  readonly productsEmpty: Locator;
  readonly details: Locator;
  readonly detailTerms: Locator;
  readonly detailValues: Locator;
  readonly related: Locator;
  readonly relatedCards: Locator;
  readonly seeAll: Locator;
  readonly reportLink: Locator;
  readonly loadingStatus: Locator;
  readonly skeletons: Locator;
  readonly errorState: Locator;
  readonly errorReference: Locator;
  readonly tryAgain: Locator;
  readonly errorBackToBrowse: Locator;

  constructor(page: Page) {
    super(page);
    this.backLink = this.main.locator('a.back-link');
    this.mediaTile = this.main.locator('.split .media').first();
    this.mediaLabel = this.mediaTile.locator('.media__tag');
    this.coverPhoto = this.mediaTile.locator('img');
    this.coverWebp = this.mediaTile.locator('picture > source[type="image/webp"]');
    this.photos = this.main.getByRole('region', { name: 'Photos' });
    this.photoImages = this.photos.locator('.media img');
    this.photoWebpSources = this.photos.locator('.media picture > source[type="image/webp"]');
    this.detailHead = this.main.locator('.detail-head');
    this.kicker = this.main.locator('.detail-head__kicker');
    this.kickerIcon = this.kicker.locator('svg');
    this.verifiedLabel = this.kicker.getByRole('link', { name: 'Verified Christian business' });
    this.categoryLink = this.kicker.getByRole('link').last();
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.ownerName = this.main.locator('.detail-head p > strong');
    this.tagline = this.main.locator('.detail-head .lead');
    this.credentialTags = this.main.locator('.detail-head .tag');
    this.repliesFast = this.main.locator('.detail-head .badge');
    this.actions = this.main.locator('.detail-head__actions');
    this.primaryAction = this.actions.locator('.btn--primary');
    this.bookLink = this.actions.getByRole('link', { name: 'Book a meeting' });
    this.messageLink = this.actions.getByRole('link', { name: 'Message', exact: true });
    this.saveButton = this.actions.getByRole('button', { name: 'Save' });
    this.shareLink = this.actions.getByRole('link', { name: /^Share/ });
    this.highlight = this.main.locator('.detail-head .perk');
    this.services = this.main.getByRole('region', { name: /^(Services|Custom work)$/ });
    this.serviceRows = this.services.locator('li.row');
    this.servicesEmpty = this.services.locator('.empty');
    this.about = this.main.getByRole('region', { name: 'About' });
    this.ownerBanner = this.main.locator('.alert').first();
    this.goToMyBusiness = this.ownerBanner.getByRole('link', { name: 'Go to My business' });
    this.previewBanner = this.main.locator('.alert.alert--warning').first();
    this.previewTitle = this.previewBanner.locator('.alert__title');
    this.products = this.main.getByRole('region', { name: 'Products' });
    this.productCount = this.products.locator('.section-head .text-caption');
    this.productCards = this.products.locator('a.product-card');
    this.productsEmpty = this.products.locator('.empty');
    this.details = this.main.getByRole('complementary', { name: 'Details' });
    this.detailTerms = this.details.locator('dt');
    this.detailValues = this.details.locator('dd');
    this.related = this.main.getByRole('region', { name: /^More in / });
    this.relatedCards = this.related.locator('a.biz-card');
    this.seeAll = this.related.getByRole('link', { name: 'See all' });
    this.reportLink = this.main.getByRole('link', { name: 'Report this listing' });
    this.loadingStatus = this.main.getByRole('status');
    this.skeletons = this.main.locator('.skeleton');
    this.errorState = this.main.getByRole('alert');
    this.errorReference = this.errorState.locator('code');
    this.tryAgain = this.errorState.getByRole('button', { name: 'Try again' });
    this.errorBackToBrowse = this.errorState.getByRole('link', { name: 'Back to browse' });
  }

  serviceRow(index: number): ServiceRow {
    return new ServiceRow(this.serviceRows.nth(index));
  }

  productCard(index: number): ProductCardPart {
    return new ProductCardPart(this.productCards.nth(index));
  }

  relatedCard(index: number): BusinessCard {
    return new BusinessCard(this.relatedCards.nth(index));
  }

  /** The value of one row of "Details", by its term. */
  detail(term: string): Locator {
    return this.details.locator(`dt:text-is("${term}") + dd`);
  }

  emptyAction(name: string): Locator {
    return this.servicesEmpty.getByRole('link', { name });
  }

  /** True when the heading is cut off instead of wrapping. */
  async headingIsTruncated(): Promise<boolean> {
    return this.heading.evaluate((el) => el.scrollWidth > el.clientWidth + 1);
  }

  /** Resolves once the page has loaded or failed; the loading state has its own screen. */
  async ready(): Promise<void> {
    await this.main.locator('.detail-head, .empty--error').first().waitFor({ state: 'attached' });
  }

  regions(): Region[] {
    return [...this.chromeRegions(), { name: 'main', locator: this.main }];
  }
}

/** The business page while its data is still on the way. */
export class BusinessLoadingScreen extends BusinessPage {
  override async ready(): Promise<void> {
    await this.main.locator('.skeleton').first().waitFor({ state: 'attached' });
  }
}

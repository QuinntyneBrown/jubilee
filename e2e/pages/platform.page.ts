import type { Locator, Page } from '@playwright/test';
import type { Region, Screen } from '../fixtures/visual';
import { BusinessCard } from './business-card';
import { ShellPage } from './shell.page';

/** The page of a software platform at /b/:slug (L2-254). */
export class PlatformPage extends ShellPage implements Screen {
  readonly backLink: Locator;
  readonly mediaTile: Locator;
  readonly kicker: Locator;
  readonly heading: Locator;
  readonly founder: Locator;
  readonly line: Locator;
  readonly actions: Locator;
  /** The link out to the platform's own website, the page's main action (L2-255). */
  readonly visit: Locator;
  /** What the link out does, said under the actions (L2-254 AC2). */
  readonly visitNote: Locator;
  readonly messageFounder: Locator;
  readonly save: Locator;
  readonly share: Locator;
  readonly editListing: Locator;
  readonly highlight: Locator;
  readonly does: Locator;
  readonly doesText: Locator;
  readonly forWhom: Locator;
  readonly forWhomText: Locator;
  readonly details: Locator;
  readonly detailTerms: Locator;
  /** The "Website" row of Details: the same link out. */
  readonly websiteLink: Locator;
  readonly reviews: Locator;
  readonly more: Locator;
  readonly moreCards: Locator;
  readonly seeAll: Locator;
  readonly reportLink: Locator;
  readonly ownerBanner: Locator;
  readonly loadingStatus: Locator;
  readonly skeletons: Locator;
  readonly errorState: Locator;
  readonly errorReference: Locator;
  readonly tryAgain: Locator;
  /** Everything a business or a space offers and a platform does not (L2-254 AC3). */
  readonly requestActions: Locator;
  readonly servicesSection: Locator;
  readonly productsSection: Locator;

  constructor(page: Page) {
    super(page);
    this.backLink = this.main.locator('a.back-link');
    this.mediaTile = this.main.locator('.split').first().locator('.media').first();
    this.kicker = this.main.locator('.detail-head__kicker');
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.founder = this.main.locator('.detail-head strong');
    this.line = this.main.locator('.detail-head .lead');
    this.actions = this.main.locator('.detail-head__actions');
    this.visit = this.actions.getByRole('link', { name: /^Visit / });
    this.visitNote = this.main.locator('.detail-head .text-caption');
    this.messageFounder = this.actions.getByRole('link', { name: 'Message founder' });
    this.save = this.actions.getByRole('button', { name: /^Save/ });
    this.share = this.actions.getByRole('link', { name: /^Share/ });
    this.editListing = this.actions.getByRole('link', { name: 'Edit listing' });
    this.highlight = this.main.locator('.detail-head .perk');
    this.does = this.main.getByRole('region', { name: 'What it does' });
    this.doesText = this.does.locator('p');
    this.forWhom = this.main.getByRole('region', { name: 'Who it is for' });
    this.forWhomText = this.forWhom.locator('p');
    this.details = this.main.getByRole('complementary', { name: 'Details' });
    this.detailTerms = this.details.locator('dt');
    this.websiteLink = this.details.getByRole('link');
    this.reviews = this.main.locator('section.reviews');
    this.more = this.main.getByRole('region', { name: 'More in Software platforms' });
    this.moreCards = this.more.locator('a.biz-card');
    this.seeAll = this.more.getByRole('link', { name: 'See all' });
    this.reportLink = this.main.getByRole('link', { name: 'Report this listing' });
    this.ownerBanner = this.main.locator('.alert');
    this.loadingStatus = this.main.getByRole('status').first();
    this.skeletons = this.main.locator('.skeleton');
    this.errorState = this.main.getByRole('alert');
    this.errorReference = this.errorState.locator('code');
    this.tryAgain = this.errorState.getByRole('button', { name: 'Try again' });
    this.requestActions = this.main.getByRole('link', {
      name: /Book a meeting|Ask for a quote|Request|Shop products/,
    });
    this.servicesSection = this.main.getByRole('region', { name: 'Services' });
    this.productsSection = this.main.getByRole('region', { name: 'Products' });
  }

  /** The value of a Details row. */
  detail(term: string): Locator {
    return this.details.locator('dt', { hasText: term }).locator('xpath=following-sibling::dd[1]');
  }

  moreCard(index: number): BusinessCard {
    return new BusinessCard(this.moreCards.nth(index));
  }

  /** The requests the page made that did not go to Jubilee itself or its API. */
  watchForeignRequests(): string[] {
    const foreign: string[] = [];
    this.page.on('request', (request) => {
      const { hostname } = new URL(request.url());
      if (hostname !== 'localhost') foreign.push(request.url());
    });
    return foreign;
  }

  async ready(): Promise<void> {
    await this.main
      .locator('.detail-head, .empty, .skeleton')
      .first()
      .waitFor({ state: 'attached' });
  }

  regions(): Region[] {
    return [...this.chromeRegions(), { name: 'main', locator: this.main }];
  }
}

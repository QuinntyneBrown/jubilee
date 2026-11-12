import type { Locator, Page } from '@playwright/test';
import type { Region, Screen } from '../fixtures/visual';
import { SpaceCard } from './space-card';
import { ShellPage } from './shell.page';

/** The booking card of a space: the rent, the minimum stay and the one thing to do (L2-206 AC1). */
export class BookingCard {
  readonly price: Locator;
  readonly minimum: Locator;
  readonly callToAction: Locator;
  readonly messageHost: Locator;
  readonly save: Locator;
  readonly note: Locator;
  /** "Sent to {host}" once the member has an open request (L2-206 AC9). */
  readonly sent: Locator;

  constructor(readonly root: Locator) {
    this.price = root.locator('.booking-card__price');
    this.minimum = root.locator('.booking-card__minimum');
    this.callToAction = root.locator('.booking-card__actions .btn--primary');
    this.messageHost = root.getByRole('link', { name: 'Message host' });
    this.save = root.getByRole('button', { name: /^Save/ });
    this.note = root.locator('.booking-card__note');
    this.sent = root.locator('.booking-card__sent');
  }
}

/** The page of a space at /b/:slug (L2-205). */
export class SpacePage extends ShellPage implements Screen {
  readonly backLink: Locator;
  readonly mediaTile: Locator;
  readonly kicker: Locator;
  readonly heading: Locator;
  readonly line: Locator;
  readonly bookingCard: BookingCard;
  readonly place: Locator;
  readonly placeHeading: Locator;
  readonly factsList: Locator;
  readonly facts: Locator;
  readonly rowsList: Locator;
  readonly rows: Locator;
  readonly included: Locator;
  readonly includedList: Locator;
  readonly includedItems: Locator;
  readonly rules: Locator;
  readonly rulesList: Locator;
  readonly ruleItems: Locator;
  readonly household: Locator;
  readonly householdText: Locator;
  readonly hostCard: Locator;
  readonly hostName: Locator;
  readonly hostVerified: Locator;
  readonly hostAbout: Locator;
  readonly more: Locator;
  readonly moreCards: Locator;
  readonly bookingBar: Locator;
  readonly bookingBarPrice: Locator;
  readonly bookingBarAction: Locator;
  readonly reportLink: Locator;
  readonly loadingStatus: Locator;
  readonly skeletons: Locator;
  readonly errorState: Locator;
  readonly errorReference: Locator;

  constructor(page: Page) {
    super(page);
    this.backLink = this.main.locator('a.back-link');
    this.mediaTile = this.main.locator('.split').first().locator('.media').first();
    this.kicker = this.main.locator('.detail-head__kicker');
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.line = this.main.locator('.detail-head .lead');
    this.bookingCard = new BookingCard(this.main.locator('.booking-card'));
    this.place = this.main.locator('section.section:has(.space-facts)');
    this.placeHeading = this.place.getByRole('heading', { level: 2 });
    this.factsList = this.place.locator('ul.space-facts');
    this.facts = this.factsList.locator('.space-facts__item');
    this.rowsList = this.place.locator('dl.dl--rows');
    this.rows = this.rowsList.locator('> div');
    this.included = this.main.getByRole('region', { name: 'What’s included' });
    this.includedList = this.included.locator('ul.included-list');
    this.includedItems = this.includedList.locator('.included-list__item');
    this.rules = this.main.getByRole('region', { name: 'House rules' });
    this.rulesList = this.rules.locator('ul.house-rules');
    this.ruleItems = this.rulesList.locator('.house-rules__item');
    this.household = this.main.getByRole('region', { name: 'Who lives here' });
    this.householdText = this.household.locator('.household__text');
    this.hostCard = this.main.getByRole('region', { name: 'Your host' });
    this.hostName = this.hostCard.locator('.host-card__name');
    this.hostVerified = this.hostCard.locator('.host-card__verified');
    this.hostAbout = this.hostCard.locator('.host-card__about');
    this.more = this.main.getByRole('region', { name: 'More rooms & rentals' });
    this.moreCards = this.more.locator('a.space-card');
    this.bookingBar = page.locator('.booking-bar');
    this.bookingBarPrice = this.bookingBar.locator('.booking-bar__price');
    this.bookingBarAction = this.bookingBar.locator('.btn--primary');
    this.reportLink = this.main.getByRole('link', { name: 'Report this listing' });
    this.loadingStatus = this.main.getByRole('status');
    this.skeletons = this.main.locator('.skeleton');
    this.errorState = this.main.getByRole('alert');
    this.errorReference = this.errorState.locator('code');
  }

  row(term: string): Locator {
    return this.rows.filter({ has: this.page.locator('dt', { hasText: term }) }).locator('dd');
  }

  moreCard(index: number): SpaceCard {
    return new SpaceCard(this.moreCards.nth(index));
  }

  async ready(): Promise<void> {
    await this.main
      .locator('.booking-card, .empty, .skeleton')
      .first()
      .waitFor({ state: 'attached' });
  }

  regions(): Region[] {
    return [...this.chromeRegions(), { name: 'main', locator: this.main }];
  }
}

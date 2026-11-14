import type { Locator, Page } from '@playwright/test';
import { BASELINE } from '../fixtures/jb-test';
import type { Region, Screen } from '../fixtures/visual';
import { ShellPage } from './shell.page';

/** A size's radio is named by its label, then ", sold out" or its ages. */
const sizeName = (label: string) => new RegExp(`^${label}(,| |$)`);

/** The Purpose Tee page at /purpose-tee (L2-263 – L2-265). */
export class PurposeTeePage extends ShellPage implements Screen {
  readonly backToBrowse: Locator;
  readonly bagButton: Locator;
  readonly bagCount: Locator;
  readonly gallery: Locator;
  readonly stageImage: Locator;
  readonly frontThumb: Locator;
  readonly backThumb: Locator;
  readonly head: Locator;
  readonly kicker: Locator;
  readonly heading: Locator;
  readonly price: Locator;
  readonly description: Locator;
  readonly fit: Locator;
  readonly fitNote: Locator;
  readonly sizes: Locator;
  readonly sizeStatus: Locator;
  readonly nudge: Locator;
  readonly guideToggle: Locator;
  readonly guide: Locator;
  readonly guideCaption: Locator;
  readonly guideRows: Locator;
  readonly quantity: Locator;
  readonly quantityValue: Locator;
  readonly fewer: Locator;
  readonly more: Locator;
  readonly addToBag: Locator;
  readonly addButton: Locator;
  readonly addedLine: Locator;
  readonly checkOut: Locator;
  readonly deliveryNote: Locator;
  readonly disclosures: Locator;
  readonly story: Locator;
  readonly storyHeading: Locator;
  readonly storyParagraphs: Locator;
  readonly loadingStatus: Locator;
  readonly errorState: Locator;
  readonly errorReference: Locator;
  readonly tryAgain: Locator;
  readonly errorBackToBrowse: Locator;

  constructor(page: Page) {
    super(page);
    this.backToBrowse = this.main.locator('a.back-link');
    this.bagButton = this.main.locator('.bag-button');
    this.bagCount = this.bagButton.locator('.bag-button__count');
    this.gallery = this.main.getByRole('region', { name: 'Pictures of the tee' });
    this.stageImage = this.gallery.locator('.tee-gallery__stage').getByRole('img');
    const thumbs = this.gallery.getByRole('group', { name: 'Show the tee from' });
    this.frontThumb = thumbs.getByRole('button', { name: 'Front' });
    this.backThumb = thumbs.getByRole('button', { name: 'Back' });
    this.head = this.main.locator('.merch-head');
    this.kicker = this.head.locator('.merch-head__kicker');
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.price = this.head.locator('.merch-head__price');
    this.description = this.head.locator('.merch-head__text');
    this.fit = this.main.getByRole('group', { name: 'Fit' });
    this.fitNote = this.main.locator('.segmented-choice__note');
    this.sizes = this.main.locator('fieldset.size-picker');
    this.sizeStatus = this.sizes.locator('.size-picker__status');
    this.nudge = this.sizes.locator('.size-picker__nudge');
    this.guideToggle = this.sizes.getByRole('button', { name: 'Size guide' });
    this.guide = this.sizes.getByRole('table');
    this.guideCaption = this.guide.locator('caption');
    this.guideRows = this.guide.locator('tbody tr');
    this.quantity = this.main.locator('.add-to-bag').getByRole('group', { name: 'Quantity' });
    this.quantityValue = this.quantity.locator('output');
    this.fewer = this.quantity.getByRole('button', { name: 'One fewer' });
    this.more = this.quantity.getByRole('button', { name: 'One more' });
    this.addToBag = this.main.locator('.add-to-bag');
    this.addButton = this.addToBag.locator('.add-to-bag__button');
    this.addedLine = this.addToBag.locator('.add-to-bag__line');
    this.checkOut = this.addToBag.getByRole('button', { name: 'Check out' });
    this.deliveryNote = this.main.getByText(/Ships across Canada/);
    this.disclosures = this.main.locator('.accordion summary');
    this.story = this.main.locator('section.merch-story');
    this.storyHeading = this.story.getByRole('heading', { level: 2 });
    this.storyParagraphs = this.story.locator('p');
    this.loadingStatus = this.main
      .getByRole('status')
      .filter({ hasText: 'Loading the Purpose Tee…' });
    this.errorState = this.main.locator('.empty--error');
    this.errorReference = this.errorState.locator('code');
    this.tryAgain = this.errorState.getByRole('button', { name: 'Try again' });
    this.errorBackToBrowse = this.errorState.getByRole('link', { name: 'Back to browse' });
  }

  fitOption(name: string): Locator {
    return this.fit.getByRole('radio', { name, exact: true });
  }

  size(label: string): Locator {
    return this.sizes.getByRole('radio', { name: sizeName(label) });
  }

  /** The sizes offered, in order. */
  sizeLabels(): Promise<string[]> {
    return this.sizes
      .getByRole('radio')
      .evaluateAll((radios) => radios.map((radio) => (radio as HTMLInputElement).value));
  }

  async chooseFit(name: string): Promise<void> {
    await this.fit.locator('label', { hasText: new RegExp(`^${name}$`) }).click();
  }

  async chooseSize(label: string): Promise<void> {
    await this.sizes
      .locator('label.size-picker__size')
      .filter({ has: this.page.getByRole('radio', { name: sizeName(label) }) })
      .click();
  }

  disclosure(name: string): Locator {
    return this.disclosures.filter({ hasText: name });
  }

  /** Resolves once the page has loaded or failed. */
  async ready(): Promise<void> {
    await this.main.locator('.merch-head, .empty--error, .skeleton').first().waitFor();
  }

  regions(): Region[] {
    return [
      ...this.chromeRegions(),
      { name: 'gallery', locator: this.gallery },
      { name: 'head', locator: this.head },
      { name: 'fit', locator: this.fit },
      { name: 'sizes', locator: this.sizes },
      { name: 'add-to-bag', locator: this.addToBag },
      { name: 'story', locator: this.story },
      { name: 'main', locator: this.main },
    ];
  }
}

/** The page loading: its skeleton and the announcement. */
export class PurposeTeeLoadingScreen extends PurposeTeePage {
  override async ready(): Promise<void> {
    await this.main.locator('.skeleton').first().waitFor();
  }

  override regions(): Region[] {
    return [...this.chromeRegions(), { name: 'main', locator: this.main }];
  }
}

/** The page that could not load. */
export class PurposeTeeErrorScreen extends PurposeTeePage {
  override async ready(): Promise<void> {
    await this.errorState.waitFor();
  }

  override regions(): Region[] {
    return [...this.chromeRegions(), { name: 'error', locator: this.errorState }];
  }
}

/** The back of the tee chosen in the gallery. */
export class PurposeTeeBackScreen extends PurposeTeePage {
  override async ready(): Promise<void> {
    await super.ready();
    if (BASELINE) return;
    await this.backThumb.click();
  }
}

/** The size guide open under the sizes, for Men’s. */
export class PurposeTeeSizeGuideScreen extends PurposeTeePage {
  override async ready(): Promise<void> {
    await super.ready();
    if (BASELINE) return;
    await this.guideToggle.click();
    await this.guide.waitFor();
  }
}

/** "Add to bag" pressed with no size chosen: the nudge beside "Size". */
export class PurposeTeePickSizeScreen extends PurposeTeePage {
  override async ready(): Promise<void> {
    await super.ready();
    if (BASELINE) return;
    await this.chooseFit('Youth');
    await this.chooseSize('XS');
    await this.chooseFit('Men’s');
    await this.addButton.click();
    await this.nudge.waitFor();
  }
}

/** Women’s XL chosen, with two left. */
export class PurposeTeeLowStockScreen extends PurposeTeePage {
  override async ready(): Promise<void> {
    await super.ready();
    if (BASELINE) return;
    await this.chooseFit('Women’s');
    await this.chooseSize('XL');
  }
}

/** Youth chosen, XL sold out, M chosen. */
export class PurposeTeeSoldOutSizeScreen extends PurposeTeePage {
  override async ready(): Promise<void> {
    await super.ready();
    if (BASELINE) return;
    await this.chooseFit('Youth');
    await this.chooseSize('M');
  }
}

/** Youth chosen with every size sold out. */
export class PurposeTeeFitSoldOutScreen extends PurposeTeePage {
  override async ready(): Promise<void> {
    await super.ready();
    if (BASELINE) return;
    await this.chooseFit('Youth');
  }
}

/** Men’s L added to the bag. */
export class PurposeTeeAddedScreen extends PurposeTeePage {
  override async ready(): Promise<void> {
    await super.ready();
    if (BASELINE) return;
    await this.addButton.click();
    await this.checkOut.waitFor();
  }
}

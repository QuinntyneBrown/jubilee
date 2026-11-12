import type { Locator, Page } from '@playwright/test';
import type { Region, Screen } from '../fixtures/visual';
import { ShellPage } from './shell.page';

/** The Write a review screen at /b/:slug/review (L2-226, L2-227), with its posted state. */
export class WriteReviewPage extends ShellPage implements Screen {
  readonly backLink: Locator;
  /** The listing being reviewed: its tile, name and category or host. */
  readonly subject: Locator;
  readonly subjectName: Locator;
  readonly subjectMeta: Locator;
  readonly heading: Locator;
  readonly stars: Locator;
  readonly starWord: Locator;
  readonly ratingError: Locator;
  readonly itemGroup: Locator;
  readonly items: Locator;
  readonly textLabel: Locator;
  readonly prompt: Locator;
  readonly text: Locator;
  readonly counter: Locator;
  readonly textError: Locator;
  readonly notes: Locator;
  readonly post: Locator;
  readonly alert: Locator;
  /** The page of a member who may not write: "You can review … after …". */
  readonly notEligible: Locator;
  /** The posted state. */
  readonly posted: Locator;
  readonly postedTitle: Locator;
  readonly postedText: Locator;
  readonly postedStars: Locator;
  readonly postedWord: Locator;
  readonly postedItem: Locator;
  readonly postedBody: Locator;
  readonly seeIt: Locator;
  readonly backToBrowse: Locator;

  constructor(page: Page) {
    super(page);
    this.backLink = this.main.locator('a.back-link');
    this.subject = this.main.locator('.review-subject');
    this.subjectName = this.main.locator('.review-subject__name');
    this.subjectMeta = this.main.locator('.review-subject__meta');
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.stars = this.main.getByRole('radiogroup', { name: 'Your rating' });
    this.starWord = this.main.locator('.star-scale__word');
    this.ratingError = this.main.locator('.star-scale__error');
    this.itemGroup = this.main.getByRole('group', { name: /^Which (service|product)\?$/ });
    this.items = this.itemGroup.getByRole('radio');
    this.textLabel = this.main.locator('label[for="rv-text"]');
    this.prompt = this.main.locator('#rv-text-help');
    this.text = this.main.getByRole('textbox', { name: 'Tell others about it' });
    this.counter = this.main.locator('#rv-text-count');
    this.textError = this.main.locator('#rv-text-error');
    this.notes = this.main.locator('form .text-muted');
    this.post = this.main.getByRole('button', { name: /^(Post review|Posting…)$/ });
    this.alert = this.main.getByRole('alert');
    this.notEligible = this.main.locator('.empty');
    this.posted = this.main.locator('.review-posted');
    this.postedTitle = this.posted.getByRole('heading', { level: 1 });
    this.postedText = this.posted.locator('.review-posted__text');
    this.postedStars = this.posted.locator('[role="img"]');
    this.postedWord = this.posted.locator('.review-posted__rating > span:not([role])');
    this.postedItem = this.posted.locator('.review-posted__item');
    this.postedBody = this.posted.locator('.review-posted__body');
    this.seeIt = this.posted.getByRole('link', { name: /^See it on (their page|the listing)$/ });
    this.backToBrowse = this.posted.getByRole('link', { name: 'Back to browse' });
  }

  /** One star of the scale: "{n} of 5: {word}". */
  star(n: number): Locator {
    return this.stars.getByRole('radio', { name: new RegExp(`^${n} of 5`) });
  }

  /** Chooses a star by touch or click, on the star drawn over the radio. */
  async rate(n: number): Promise<void> {
    await this.stars
      .locator('.star-scale__star')
      .nth(n - 1)
      .click();
  }

  /** Chooses an item by its chip. */
  async choose(name: string): Promise<void> {
    await this.itemGroup.locator('label').filter({ hasText: name }).click();
  }

  item(name: string): Locator {
    return this.itemGroup.getByRole('radio', { name, exact: true });
  }

  async ready(): Promise<void> {
    await this.main.locator('form, .review-posted, .empty').first().waitFor({ state: 'attached' });
  }

  regions(): Region[] {
    return [...this.chromeRegions(), { name: 'main', locator: this.main }];
  }
}

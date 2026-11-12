import type { Locator, Page } from '@playwright/test';
import type { Region, Screen } from '../fixtures/visual';
import { ShellPage } from './shell.page';

/** The feedback page: the full forms and "Your feedback" (L2-212, L2-213). */
export class FeedbackPage extends ShellPage implements Screen {
  readonly heading: Locator;
  readonly back: Locator;
  readonly kindTabs: Locator;
  readonly form: Locator;
  readonly alert: Locator;
  readonly submit: Locator;
  readonly mayContact: Locator;

  readonly stars: Locator;
  readonly starWord: Locator;
  readonly starsError: Locator;
  /** The parts of Jubilee, each with its score. */
  readonly scoreRows: Locator;
  readonly better: Locator;

  readonly where: Locator;
  readonly whereError: Locator;
  readonly happened: Locator;
  readonly happenedError: Locator;
  readonly expected: Locator;
  readonly frequency: Locator;
  /** The whole screenshots control: the button, the files and the refusal. */
  readonly screenshots: Locator;
  readonly addScreenshots: Locator;
  readonly screenshotFiles: Locator;
  readonly screenshotError: Locator;
  readonly alsoAttached: Locator;

  readonly forCards: Locator;
  readonly forTeam: Locator;
  readonly forBusiness: Locator;
  readonly forHint: Locator;
  readonly which: Locator;
  readonly whichError: Locator;
  readonly chips: Locator;
  readonly chipsError: Locator;
  readonly note: Locator;
  readonly showOnPage: Locator;

  /** The confirmation that replaces the form once feedback was sent. */
  readonly confirmation: Locator;
  readonly confirmationTitle: Locator;
  readonly confirmationText: Locator;
  readonly backToJubilee: Locator;

  readonly history: Locator;
  readonly historyItems: Locator;
  readonly historyEmpty: Locator;
  readonly historyLoading: Locator;
  readonly historyError: Locator;
  readonly historyRetry: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.back = this.main.locator('a.back-link');
    this.kindTabs = this.main.getByRole('tablist', { name: 'Kind of feedback' });
    this.form = this.main.locator('form');
    this.alert = this.form.getByRole('alert');
    this.submit = this.form.locator('button[type="submit"]');
    this.mayContact = this.form.getByRole('checkbox', { name: 'You can message me about this' });

    this.stars = this.form.getByRole('radiogroup', { name: /^Overall, how’s Jubilee working/ });
    this.starWord = this.form.locator('.star-scale__word');
    this.starsError = this.form.locator('.star-scale__error');
    this.scoreRows = this.form.locator('.score-rows');
    this.better = this.form.getByRole('textbox', { name: /^What would make it better\?/ });

    this.where = this.form.getByRole('combobox', { name: /^Where did it happen\?/ });
    this.whereError = this.form.locator('#feedback-where-error');
    this.happened = this.form.getByRole('textbox', { name: /^What happened\?/ });
    this.happenedError = this.form.locator('#feedback-happened-error');
    this.expected = this.form.getByRole('textbox', { name: /^What did you expect\?/ });
    this.frequency = this.form.getByRole('group', { name: /^How often\?/ });
    this.screenshots = this.form.locator('.file-list');
    this.addScreenshots = this.form.getByRole('button', { name: 'Add screenshots' });
    this.screenshotFiles = this.form.getByRole('list', { name: 'Screenshots added' });
    this.screenshotError = this.form.locator('.file-list__error');
    this.alsoAttached = this.form.locator('#feedback-shots-attached');

    this.forCards = this.form.locator('.choice-cards');
    this.forTeam = this.form.getByRole('radio', { name: /^The Jubilee team/ });
    this.forBusiness = this.form.getByRole('radio', { name: /^A business/ });
    this.forHint = this.form.locator('#feedback-for-help');
    this.which = this.form.getByRole('combobox', { name: /^Which one\?/ });
    this.whichError = this.form.locator('#feedback-which-error');
    this.chips = this.form.getByRole('group', { name: /^What stood out\?/ });
    this.chipsError = this.form.locator('#feedback-stood-error');
    this.note = this.form.getByRole('textbox', { name: 'Your note' });
    this.showOnPage = this.form.getByRole('checkbox', {
      name: 'Jubilee may show this on their page with my first name',
    });

    this.confirmation = this.main.locator('.empty');
    this.confirmationTitle = this.confirmation.locator('.empty__title');
    this.confirmationText = this.confirmation.locator('.empty__text');
    this.backToJubilee = this.confirmation.getByRole('link', { name: 'Back to Jubilee' });

    this.history = this.main.getByRole('region', { name: 'Your feedback' });
    this.historyItems = this.history.locator('.feedback-history__item');
    this.historyEmpty = this.history.locator('.feedback-history__empty');
    this.historyLoading = this.history.locator('.feedback-history__list[aria-busy="true"]');
    this.historyError = this.history.getByRole('alert');
    this.historyRetry = this.history.getByRole('button', { name: 'Try again' });
  }

  kind(name: 'Rate' | 'Report a bug' | 'Kudos'): Locator {
    return this.kindTabs.getByRole('tab', { name, exact: true });
  }

  /** The star of a rating, by its number. The radio is drawn over, so it is chosen through its label. */
  star(rating: number): Locator {
    return this.stars.locator('.star-scale__star').nth(rating - 1);
  }

  starRadio(rating: number): Locator {
    return this.stars.getByRole('radio', { name: new RegExp(`^${rating} of 5`) });
  }

  /** The scores of one part of Jubilee, by the name of the part. */
  area(name: string): Locator {
    return this.form.getByRole('group', { name: `${name}, from 1 to 5` });
  }

  /** One score of a part: the drawn option, which is what a member presses. */
  score(area: string, score: number): Locator {
    return this.area(area)
      .locator('.score-scale__option')
      .nth(score - 1);
  }

  scoreRadio(area: string, score: number): Locator {
    return this.area(area).getByRole('radio', { name: String(score), exact: true });
  }

  often(name: 'Just once' | 'Sometimes' | 'Every time'): Locator {
    return this.frequency.getByRole('button', { name, exact: true });
  }

  /** Chooses files as the file picker would. */
  async attach(...files: { name: string; mimeType: string; buffer: Buffer }[]): Promise<void> {
    const chooser = this.page.waitForEvent('filechooser');
    await this.addScreenshots.click();
    await (await chooser).setFiles(files);
  }

  screenshot(name: string): Locator {
    return this.screenshotFiles.getByRole('listitem').filter({ hasText: name });
  }

  removeScreenshot(name: string): Locator {
    return this.screenshotFiles.getByRole('button', { name: `Remove ${name}` });
  }

  chip(name: string): Locator {
    return this.chips.getByRole('button', { name, exact: true });
  }

  /** One item of "Your feedback", by a part of its title. */
  item(title: string | RegExp): Locator {
    return this.historyItems.filter({ hasText: title });
  }

  status(item: Locator): Locator {
    return item.locator('.feedback-history__status');
  }

  reply(item: Locator): Locator {
    return item.locator('.feedback-history__reply');
  }

  date(item: Locator): Locator {
    return item.locator('time');
  }

  /** How far the form and "Your feedback" stand apart: side by side, or one under the other. */
  async historyIsBeside(): Promise<boolean> {
    const form = await this.kindTabs.boundingBox();
    const history = await this.history.boundingBox();
    if (!form || !history) throw new Error('The form or the history is not on screen.');
    return history.x > form.x + form.width / 2 && history.y < form.y + 200;
  }

  async ready(): Promise<void> {
    await this.heading.or(this.confirmationTitle).first().waitFor();
    await this.history.waitFor();
  }

  regions(): Region[] {
    return [...this.chromeRegions(), { name: 'main', locator: this.main }];
  }
}

import type { Locator, Page } from '@playwright/test';

/** The one question after a request was sent or a listing was submitted (L2-211). */
export class MomentCheck {
  readonly root: Locator;
  readonly question: Locator;
  /** The five scores, one group to assistive technology. */
  readonly scores: Locator;
  /** The words at the two ends of the scores. */
  readonly ends: Locator;
  readonly note: Locator;
  readonly send: Locator;
  readonly thanks: Locator;
  readonly alert: Locator;

  constructor(page: Page) {
    this.root = page.locator('.moment-check');
    this.question = this.root.locator('.moment-check__question');
    this.scores = this.root.getByRole('group');
    this.ends = this.root.locator('.moment-check__ends');
    this.note = this.root.getByRole('textbox', { name: /^What got in the way\?/ });
    this.send = this.root.getByRole('button', { name: 'Send', exact: true });
    this.thanks = this.root.locator('.moment-check__thanks');
    this.alert = this.root.getByRole('alert');
  }

  /** One score: the drawn option, which is what a member presses. */
  score(score: number): Locator {
    return this.root.locator('.score-scale__option').nth(score - 1);
  }

  scoreRadio(score: number): Locator {
    return this.scores.getByRole('radio', { name: String(score), exact: true });
  }
}

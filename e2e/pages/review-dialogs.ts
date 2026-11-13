import type { Locator, Page } from '@playwright/test';

/** What every review dialog shares: its frame, title, alert and buttons. */
class ReviewDialog {
  readonly root: Locator;
  readonly title: Locator;
  readonly description: Locator;
  readonly alert: Locator;
  readonly cancel: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('dialog');
    this.title = this.root.locator('.dialog__title');
    this.description = this.root.locator('#dlg-desc');
    this.alert = this.root.getByRole('alert');
    this.cancel = this.root.getByRole('button', { name: 'Cancel' });
  }
}

/** "Edit your review" (L2-233 AC1 to AC4). */
export class EditReviewDialog extends ReviewDialog {
  readonly stars: Locator;
  readonly ratingError: Locator;
  readonly text: Locator;
  readonly textError: Locator;
  readonly save: Locator;
  /** The choice of what the review is about; absent when there is nothing to choose (L2-260 AC4). */
  readonly itemGroup: Locator;
  readonly checkboxes: Locator;

  constructor(page: Page) {
    super(page);
    this.stars = this.root.getByRole('radiogroup', { name: 'Your rating' });
    this.itemGroup = this.root.getByRole('group', { name: /^Which (service|product)\?$/ });
    this.checkboxes = this.root.getByRole('checkbox');
    this.ratingError = this.root.locator('.star-scale__error');
    this.text = this.root.getByRole('textbox', { name: 'Tell others about it' });
    this.textError = this.root.locator('#er-text-error');
    this.save = this.root.getByRole('button', { name: /^(Save changes|Saving…)$/ });
  }

  star(n: number): Locator {
    return this.stars.getByRole('radio', { name: new RegExp(`^${n} of 5`) });
  }

  async rate(n: number): Promise<void> {
    await this.stars
      .locator('.star-scale__star')
      .nth(n - 1)
      .click();
  }
}

/** "Remove your review?" (L2-233 AC5). */
export class RemoveReviewDialog extends ReviewDialog {
  readonly remove: Locator;

  constructor(page: Page) {
    super(page);
    this.remove = this.root.getByRole('button', { name: 'Remove review' });
  }
}

/** "Reply to {author}" and "Edit your reply" (L2-234). */
export class ReplyReviewDialog extends ReviewDialog {
  readonly text: Locator;
  readonly error: Locator;
  readonly post: Locator;

  constructor(page: Page) {
    super(page);
    this.text = this.root.getByRole('textbox', { name: 'Your reply' });
    this.error = this.root.locator('#rr-text-error');
    this.post = this.root.getByRole('button', { name: /^(Post reply|Save reply)$/ });
  }
}

/** "Report this review" (L2-236). */
export class ReportReviewDialog extends ReviewDialog {
  readonly note: Locator;
  readonly reasonError: Locator;
  readonly send: Locator;
  readonly done: Locator;

  constructor(page: Page) {
    super(page);
    this.note = this.root.getByRole('textbox', { name: /Tell us more/ });
    this.reasonError = this.root.locator('#rp-why-error');
    this.send = this.root.getByRole('button', { name: 'Send report' });
    this.done = this.root.getByRole('button', { name: 'Done' });
  }

  reason(label: string | RegExp): Locator {
    return this.root.getByRole('radio', { name: label });
  }
}

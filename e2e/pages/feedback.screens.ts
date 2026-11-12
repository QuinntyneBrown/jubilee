import type { Locator, Page } from '@playwright/test';
import { BASELINE } from '../fixtures/jb-test';
import type { Region, Screen } from '../fixtures/visual';
import { FeedbackDialog } from './feedback.dialog';
import { FeedbackPage } from './feedback.page';
import { ListBusinessPage } from './list-business.page';
import { MomentCheck } from './moment-check';
import { ShellPage } from './shell.page';

// The states of member feedback that have no address of their own (L2-210 to L2-213): each
// screen does what a member does to reach the state. The mock is already in it.

/** A member's screen with the launcher at its bottom right. */
export class FeedbackLauncherScreen extends ShellPage implements Screen {
  async ready(): Promise<void> {
    await this.feedbackLauncher.waitFor();
  }

  regions(): Region[] {
    return [{ name: 'feedback-launcher', locator: this.feedbackLauncher }];
  }
}

/** The feedback panel, open on "Rate" with nothing chosen. */
export class FeedbackPanelScreen extends ShellPage implements Screen {
  readonly panel: FeedbackDialog;

  constructor(page: Page) {
    super(page);
    this.panel = new FeedbackDialog(page);
  }

  async ready(): Promise<void> {
    if (!BASELINE) {
      await this.feedbackLauncher.click();
      await this.panel.title.waitFor();
      await this.arrange();
    }
    await this.panel.title.waitFor();
    await this.panel.settled();
  }

  /** What a member does in the open panel to reach the state. */
  protected async arrange(): Promise<void> {
    // The panel opens in this state.
  }

  regions(): Region[] {
    return [{ name: 'panel', locator: this.panel.panel }];
  }
}

/** The panel with four stars chosen. */
export class FeedbackPanelRateChosenScreen extends FeedbackPanelScreen {
  protected override async arrange(): Promise<void> {
    await this.panel.star(4).click();
  }
}

/** The panel on "Report a bug". */
export class FeedbackPanelBugScreen extends FeedbackPanelScreen {
  protected override async arrange(): Promise<void> {
    await this.panel.tab('Report a bug').click();
    await this.panel.bugText.waitFor();
  }
}

/** The panel on "Kudos" with nothing chosen. */
export class FeedbackPanelKudosScreen extends FeedbackPanelScreen {
  protected override async arrange(): Promise<void> {
    await this.panel.tab('Kudos').click();
    await this.panel.chips.waitFor();
  }
}

/** The panel on "Kudos" with two chips pressed. */
export class FeedbackPanelKudosReadyScreen extends FeedbackPanelKudosScreen {
  protected override async arrange(): Promise<void> {
    await super.arrange();
    await this.panel.chip('Found someone I trust').click();
    await this.panel.chip('Quick replies').click();
    // Captured at rest: the chip that was pressed last keeps no focus ring or hover.
    await this.panel.chip('Quick replies').blur();
    await this.page.mouse.move(0, 0);
  }
}

/** The panel after a rating was sent. */
export class FeedbackPanelSentScreen extends FeedbackPanelScreen {
  protected override async arrange(): Promise<void> {
    await this.panel.star(5).click();
    await this.panel.send.click();
    await this.panel.done.waitFor();
  }
}

/** The feedback page after "Send feedback" without a rating. */
export class FeedbackRateInvalidScreen extends FeedbackPage {
  override async ready(): Promise<void> {
    await super.ready();
    if (await this.starsError.isVisible()) return;
    await this.submit.click();
    await this.starsError.waitFor();
    // The refusal moves focus to the stars; captured at rest, unfocused.
    await this.page.locator(':focus').blur();
  }
}

/** The feedback page after "Send bug report" with nothing filled in. */
export class FeedbackBugInvalidScreen extends FeedbackPage {
  override async ready(): Promise<void> {
    await super.ready();
    if (await this.whereError.isVisible()) return;
    await this.submit.click();
    await this.whereError.waitFor();
    await this.page.locator(':focus').blur();
  }
}

/** The bug report with two screenshots added. */
export class FeedbackBugScreenshotsScreen extends FeedbackPage {
  override async ready(): Promise<void> {
    await super.ready();
    if (BASELINE) return;
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]);
    await this.attach(
      { name: 'request-still-sending.png', mimeType: 'image/png', buffer: png },
      { name: 'your-requests-list.jpg', mimeType: 'image/jpeg', buffer: jpeg },
    );
    await this.screenshot('your-requests-list.jpg').waitFor();
    await this.page.locator(':focus').blur();
    await this.page.mouse.move(0, 0);
  }

  /** The control alone: what the mock has typed in the other fields is not what this screen sets. */
  override regions(): Region[] {
    return [{ name: 'screenshots', locator: this.screenshots }];
  }
}

/** The listing that was just submitted, with the question under what happens next (L2-211). */
export class ListBusinessSubmittedScreen extends ListBusinessPage {
  readonly check: MomentCheck;

  constructor(page: Page) {
    super(page);
    this.check = new MomentCheck(page);
  }

  override async ready(): Promise<void> {
    if (!BASELINE) {
      await super.ready();
      await this.fillValid();
      await this.submit.click();
      await this.check.question.waitFor();
      await this.answer();
      await this.page.mouse.move(0, 0);
    }
    await this.check.question.waitFor();
  }

  /** What the member answers. */
  protected async answer(): Promise<void> {
    // Nothing yet: the question as it is asked.
  }

  /** The question alone. */
  get checkIn(): Locator {
    return this.check.root;
  }

  override regions(): Region[] {
    return [{ name: 'check-in', locator: this.check.root }];
  }
}

/** The question after a low score: the field and "Send". */
export class ListBusinessCheckInLowScreen extends ListBusinessSubmittedScreen {
  protected override async answer(): Promise<void> {
    await this.check.score(2).click();
    await this.check.note.waitFor();
  }
}

/** The question after a high score: the line of thanks. */
export class ListBusinessCheckInThanksScreen extends ListBusinessSubmittedScreen {
  protected override async answer(): Promise<void> {
    await this.check.score(5).click();
    await this.check.thanks.waitFor();
  }
}

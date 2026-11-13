import type { Locator, Page } from '@playwright/test';

/** The feedback panel a member opens from the launcher (L2-210). */
export class FeedbackDialog {
  readonly root: Locator;
  /** The frame of the panel: the bottom sheet, or the card in the corner. */
  readonly panel: Locator;
  readonly title: Locator;
  /** The line under the title once feedback was sent. */
  readonly thanks: Locator;
  readonly close: Locator;
  readonly tabs: Locator;
  readonly alert: Locator;
  readonly stars: Locator;
  readonly starWord: Locator;
  readonly note: Locator;
  readonly bugText: Locator;
  readonly attached: Locator;
  readonly chips: Locator;
  readonly fullForm: Locator;
  readonly send: Locator;
  readonly done: Locator;
  readonly footer: Locator;

  constructor(private readonly page: Page) {
    this.root = page.getByRole('dialog');
    this.panel = this.root.locator('.dialog__panel');
    this.title = this.root.locator('.dialog__title');
    this.thanks = this.root.locator('.dialog__desc');
    this.close = this.root.getByRole('button', { name: 'Close' });
    this.tabs = this.root.getByRole('tablist', { name: 'Kind of feedback' });
    this.alert = this.root.getByRole('alert');
    this.stars = this.root.getByRole('radiogroup');
    this.starWord = this.root.locator('.star-scale__word');
    this.note = this.root.getByRole('textbox', { name: 'Your note' });
    this.bugText = this.root.getByRole('textbox', { name: 'What went wrong?' });
    this.attached = this.root.locator('.field__help');
    this.chips = this.root.getByRole('group', { name: 'What made your day?' });
    this.fullForm = this.root.getByRole('link', { name: 'Full form' });
    this.send = this.root.getByRole('button', { name: /^Send (rating|report|kudos)/ });
    this.done = this.root.getByRole('button', { name: 'Done' });
    this.footer = this.root.locator('.dialog__footer');
  }

  /** Waits until the panel has finished arriving, so its place can be measured. */
  async settled(): Promise<void> {
    await this.panel.evaluate((panel) =>
      Promise.all(panel.getAnimations().map((animation) => animation.finished)),
    );
  }

  /**
   * The longest time, in ms, the panel takes to arrive: its animations and those of its scrim
   * (L2-161).
   */
  async arrivalMs(): Promise<number> {
    return this.panel.evaluate((panel) => {
      const overlay = panel.closest('.cdk-overlay-container') ?? document.body;
      return Math.max(
        0,
        ...overlay
          .getAnimations({ subtree: true })
          .map((animation) => Number(animation.effect?.getComputedTiming().duration ?? 0)),
      );
    });
  }

  /**
   * What a member can press in the panel over less than the target size (L2-162): each by its
   * text or name, with the size of the area a press reaches. The area is measured by pressing
   * points out from the middle of the target, so a hit area larger than what is drawn counts and
   * a neighbour drawn over it does not. A star is pressed through its label.
   */
  async targetsSmallerThan(size: number): Promise<string[]> {
    return this.panel.evaluate((panel, min) => {
      const targets = panel.querySelectorAll<HTMLElement>(
        'button, a[href], select, input:not([type="radio"]), label:has(input[type="radio"])',
      );
      const reach = (target: HTMLElement, x: number, y: number, dx: number, dy: number) => {
        let steps = 0;
        while (steps < min) {
          const hit = document.elementFromPoint(x + dx * (steps + 1), y + dy * (steps + 1));
          if (!hit || !target.contains(hit)) break;
          steps++;
        }
        return steps;
      };
      const small: string[] = [];
      for (const target of targets) {
        if (!target.checkVisibility()) continue;
        target.scrollIntoView({ block: 'center', behavior: 'instant' });
        const box = target.getBoundingClientRect();
        const x = box.x + box.width / 2;
        const y = box.y + box.height / 2;
        const width = reach(target, x, y, -1, 0) + reach(target, x, y, 1, 0) + 1;
        const height = reach(target, x, y, 0, -1) + reach(target, x, y, 0, 1) + 1;
        if (width < min || height < min) {
          const name = target.getAttribute('aria-label') ?? target.textContent?.trim();
          small.push(`${name} ${width}x${height}`);
        }
      }
      return small;
    }, size);
  }

  /** Presses the scrim, beside the panel. */
  async pressScrim(): Promise<void> {
    await this.page.mouse.click(8, 8);
  }

  tab(name: 'Rate' | 'Report a bug' | 'Kudos'): Locator {
    return this.tabs.getByRole('tab', { name, exact: true });
  }

  /** The star of a rating, by its number. The radio is drawn over, so it is chosen through its label. */
  star(rating: number): Locator {
    return this.stars.locator('.star-scale__star').nth(rating - 1);
  }

  starRadio(rating: number): Locator {
    return this.stars.getByRole('radio', { name: new RegExp(`^${rating} of 5`) });
  }

  chip(name: string): Locator {
    return this.chips.getByRole('button', { name, exact: true });
  }
}

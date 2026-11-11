import type { Locator, Page } from '@playwright/test';

/** `/error`: an unhandled failure on a page load (L2-115). */
export class ServerErrorPage {
  readonly heading: Locator;
  readonly text: Locator;
  readonly reference: Locator;
  readonly tryAgain: Locator;
  readonly getHelp: Locator;
  private readonly main: Locator;

  constructor(page: Page) {
    this.main = page.locator('main');
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.text = this.main.locator('.empty__text');
    this.reference = this.main.locator('code');
    this.tryAgain = this.main.getByRole('button', { name: 'Try again' });
    this.getHelp = this.main.getByRole('link', { name: 'Get help' });
  }

  async content(): Promise<string> {
    return (await this.main.textContent()) ?? '';
  }
}

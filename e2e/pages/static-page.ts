import type { Locator, Page } from '@playwright/test';

/**
 * The static server error and maintenance pages (`/static/server-error.html`, `/static/maintenance.html`):
 * the copies the app's host serves when the app cannot answer a page load (L2-115 AC3, L2-117 AC1, ADR 0056).
 */
export class StaticPage {
  readonly heading: Locator;
  readonly text: Locator;
  readonly brand: Locator;
  readonly tryAgain: Locator;
  readonly checkAgain: Locator;
  readonly getHelp: Locator;
  readonly reference: Locator;
  readonly scripts: Locator;
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
    const main = page.locator('main');
    this.heading = main.getByRole('heading', { level: 1 });
    this.text = main.locator('.empty__text');
    this.brand = main.getByRole('link', { name: 'jubilee' });
    this.tryAgain = main.getByRole('link', { name: 'Try again' });
    this.checkAgain = main.getByRole('link', { name: 'Check again' });
    this.getHelp = main.getByRole('link', { name: 'Get help' });
    this.reference = main.locator('code');
    this.scripts = page.locator('script');
  }

  /** The family the heading is drawn in, once the page's fonts are loaded. */
  async headingFont(): Promise<{ family: string; loaded: boolean }> {
    return this.heading.evaluate(async (el) => {
      await document.fonts.ready;
      return {
        family: getComputedStyle(el).fontFamily,
        loaded: document.fonts.check(`700 1rem Archivo`),
      };
    });
  }

  async goto(path: string): Promise<void> {
    await this.page.goto(path);
  }
}

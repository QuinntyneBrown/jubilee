import type { Locator, Page } from '@playwright/test';

/** The chrome around every app page. Page objects of screens extend it. */
export class ShellPage {
  readonly main: Locator;

  constructor(protected readonly page: Page) {
    this.main = page.locator('main#main');
  }
}

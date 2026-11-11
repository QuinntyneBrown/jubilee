import type { Locator, Page } from '@playwright/test';

/** One of the statement of faith, terms of use and privacy notice (L2-107 to L2-109). */
export class PolicyPage {
  readonly title: Locator;
  readonly lead: Locator;
  readonly sectionHeadings: Locator;
  readonly bullets: Locator;
  readonly updated: Locator;
  readonly tryAgain: Locator;
  private readonly article: Locator;

  constructor(private readonly page: Page) {
    this.article = page.locator('article.prose');
    this.title = this.article.getByRole('heading', { level: 1 });
    this.lead = this.article.locator('p.lead');
    this.sectionHeadings = this.article.getByRole('heading', { level: 2 });
    this.bullets = this.article.locator('li');
    this.updated = this.article.locator('.text-caption');
    this.tryAgain = page.getByRole('button', { name: 'Try again' });
  }

  async open(path: string): Promise<void> {
    await this.page.goto(path);
  }

  link(name: string): Locator {
    return this.article.getByRole('link', { name });
  }

  text(text: string | RegExp): Locator {
    return this.article.getByText(text);
  }
}

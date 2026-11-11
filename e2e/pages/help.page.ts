import type { Locator, Page } from '@playwright/test';

/** The help page (L2-110): questions as disclosures, and the way to reach a person. */
export class HelpPage {
  readonly title: Locator;
  readonly questions: Locator;
  /** The frame all the questions sit in. */
  readonly accordion: Locator;
  readonly contactLine: Locator;
  readonly emailLink: Locator;
  readonly errorState: Locator;
  readonly tryAgain: Locator;
  private readonly main: Locator;
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
    this.main = page.locator('main');
    this.title = this.main.getByRole('heading', { level: 1 });
    this.questions = this.main.locator('.accordion summary');
    this.accordion = this.main.locator('.accordion');
    this.contactLine = this.main.getByText(
      'Write to us and a person answers within one business day.',
    );
    this.emailLink = this.main.getByRole('link', { name: 'E-mail help@jubilee.example' });
    this.errorState = this.main.getByRole('heading', { name: 'We couldn’t load Help' });
    this.tryAgain = this.main.getByRole('button', { name: 'Try again' });
  }

  /** Resolves when the questions are drawn. */
  async ready(): Promise<void> {
    await this.questions.first().waitFor();
  }

  question(name: string): Locator {
    return this.questions.filter({ hasText: name });
  }

  /** The answer under a question; visible only while the question is open. */
  answer(name: string): Locator {
    return this.main
      .locator('.accordion details')
      .filter({ has: this.page.locator('summary', { hasText: name }) })
      .locator('.accordion__body');
  }
}

import type { Locator, Page } from '@playwright/test';
import type { Region, Screen } from '../fixtures/visual';
import { ShellPage } from './shell.page';

/** `/reference/:token`: the form a pastor or elder answers without an account, and its closed states. */
export class ChurchReferencePage extends ShellPage implements Screen {
  readonly heading: Locator;
  readonly intro: Locator;
  readonly question: Locator;
  readonly answers: Locator;
  readonly name: Locator;
  readonly role: Locator;
  readonly note: Locator;
  readonly noteHelp: Locator;
  readonly send: Locator;
  readonly summary: Locator;
  readonly summaryLinks: Locator;
  readonly fieldError: Locator;
  readonly alert: Locator;
  readonly status: Locator;
  readonly text: Locator;
  readonly tellUs: Locator;
  readonly tryAgain: Locator;
  readonly aboutJubilee: Locator;
  readonly reference: Locator;
  readonly referrerPolicy: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.intro = this.main.locator('p.text-muted');
    this.question = this.main.locator('legend');
    this.answers = this.main.getByRole('radio');
    this.name = this.main.locator('#name');
    this.role = this.main.locator('#role');
    this.note = this.main.locator('#note');
    this.noteHelp = this.main.locator('#note-help');
    this.send = this.main.getByRole('button', { name: 'Send my answer' });
    this.summary = this.main.locator('#summary');
    this.summaryLinks = this.summary.getByRole('link');
    this.fieldError = this.main.locator('.field__error');
    this.alert = this.main.getByRole('alert');
    this.status = this.main.getByRole('status');
    this.text = this.main.locator('.empty__text');
    this.tellUs = this.main.getByRole('button', { name: 'tell us' });
    this.tryAgain = this.main.getByRole('button', { name: 'Try again' });
    this.aboutJubilee = this.main.getByRole('link', { name: 'About Jubilee' });
    this.reference = this.main.locator('code');
    this.referrerPolicy = page.locator('meta[name="referrer"]');
  }

  answer(label: string | RegExp): Locator {
    return this.main.getByRole('radio', { name: label });
  }

  async ready(): Promise<void> {
    await this.main.locator('.auth-card > *').first().waitFor({ state: 'attached' });
  }

  regions(): Region[] {
    return [{ name: 'main', locator: this.main }];
  }
}

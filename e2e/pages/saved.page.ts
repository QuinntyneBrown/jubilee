import type { Locator, Page } from '@playwright/test';
import type { Region, Screen } from '../fixtures/visual';
import { ShellPage } from './shell.page';

/** `/saved`: the member's private saved list (L2-042). */
export class SavedPage extends ShellPage implements Screen {
  readonly heading: Locator;
  readonly subtitle: Locator;
  readonly cards: Locator;
  readonly empty: Locator;
  readonly browse: Locator;
  readonly alert: Locator;
  readonly reference: Locator;
  readonly tryAgain: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.subtitle = this.main.locator('.subtitle');
    this.cards = this.main.locator('li.saved-card');
    this.empty = this.main.locator('.empty');
    this.browse = this.main.getByRole('link', { name: 'Browse businesses' });
    this.alert = this.main.getByRole('alert');
    this.reference = this.alert.locator('code');
    this.tryAgain = this.main.getByRole('button', { name: 'Try again' });
  }

  card(name: string | RegExp): Locator {
    return this.cards.filter({ hasText: name });
  }

  remove(name: string): Locator {
    return this.main.getByRole('button', { name: `Remove ${name} from saved` });
  }

  async ready(): Promise<void> {
    await this.heading.waitFor();
  }

  regions(): Region[] {
    return [...this.chromeRegions(), { name: 'main', locator: this.main }];
  }
}

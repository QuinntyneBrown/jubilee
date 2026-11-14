import type { Locator, Page } from '@playwright/test';
import type { Region, Screen } from '../fixtures/visual';
import { AdminOverviewPage } from './admin-overview.page';

/**
 * The jump palette of the admin application (L2-273): the dialog "Jump to" with its field and the
 * list of tables and records, the chosen one marked `aria-selected`.
 */
export class JumpPaletteDialog {
  readonly dialog: Locator;
  readonly panel: Locator;
  readonly field: Locator;
  readonly list: Locator;
  readonly options: Locator;
  readonly chosen: Locator;
  readonly none: Locator;

  constructor(readonly page: Page) {
    this.dialog = page.getByRole('dialog', { name: 'Jump to' });
    this.panel = page.locator('.palette__panel');
    this.field = this.dialog.getByRole('combobox', { name: 'Jump to a table or record' });
    this.list = this.dialog.getByRole('listbox', { name: 'Tables and records' });
    this.options = this.list.getByRole('option');
    this.chosen = this.list.locator('[role="option"][aria-selected="true"]');
    this.none = this.list.locator('.palette__none');
  }

  /** The names the options show, in order. */
  labels(): Locator {
    return this.options.locator('.palette__label');
  }

  /** The group of a table, or "{table, singular} · {ID}" of a record. */
  metas(): Locator {
    return this.options.locator('.palette__meta');
  }

  /** Opens the palette with ⌘K or Ctrl K, as the platform names it. */
  async openWithKeys(modifier: 'Meta' | 'Control' = 'Control'): Promise<void> {
    await this.page.keyboard.press(`${modifier}+k`);
    await this.dialog.waitFor();
  }

  async search(text: string): Promise<void> {
    await this.field.fill(text);
  }
}

/** The overview with the palette open and nothing typed (L2-273 AC2). */
export class JumpPaletteScreen extends AdminOverviewPage implements Screen {
  readonly palette = new JumpPaletteDialog(this.page);
  /** What the field holds when the screen is ready. */
  protected readonly text: string = '';

  override async ready(): Promise<void> {
    await this.heading.waitFor();
    if (!(await this.palette.dialog.isVisible())) await this.palette.openWithKeys();
    if (this.text) await this.palette.search(this.text);
    await (this.text === 'pastor mike' ? this.palette.none : this.palette.chosen).waitFor();
  }

  override regions(): Region[] {
    return [{ name: 'palette', locator: this.palette.panel }];
  }
}

/** The palette with "ruth" typed: records across the tables (L2-273 AC3). */
export class JumpPaletteResultsScreen extends JumpPaletteScreen {
  protected override readonly text = 'ruth';
}

/** The palette with "pastor mike" typed: nothing matches (L2-273 AC5). */
export class JumpPaletteNoneScreen extends JumpPaletteScreen {
  protected override readonly text = 'pastor mike';
}

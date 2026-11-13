import type { Locator, Page } from '@playwright/test';

/** The product editor (L2-091): add or change a product. */
export class ProductEditorDialog {
  readonly root: Locator;
  readonly title: Locator;
  /** The line under the title: when what is saved becomes public. */
  readonly note: Locator;
  readonly name: Locator;
  readonly price: Locator;
  readonly stock: Locator;
  readonly description: Locator;
  readonly errors: Locator;
  readonly alert: Locator;
  readonly submit: Locator;
  readonly cancel: Locator;
  readonly close: Locator;
  readonly keepEditing: Locator;
  readonly discard: Locator;

  /** The tile beside "Add photo": the product's photo, or its icon (L2-091 AC9). */
  readonly photoTile: Locator;
  readonly photoImage: Locator;
  /** "Add photo", "Change photo" or, while a photo uploads, "Adding photo…". */
  readonly photoButton: Locator;
  readonly removePhoto: Locator;
  /** The file input the photo button opens; hidden, so a test sets its files. */
  readonly picker: Locator;
  readonly photoCaption: Locator;
  readonly photoError: Locator;

  /** "Minimum order" and the options (L2-091 AC8). */
  readonly minimum: Locator;
  readonly options: Locator;
  readonly optionsHelp: Locator;
  readonly optionName: Locator;
  readonly addOption: Locator;
  readonly optionsError: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('dialog');
    this.title = this.root.locator('.dialog__title');
    this.note = this.root.locator('#dlg-desc');
    this.name = this.root.getByLabel(/^Product name/);
    this.price = this.root.getByLabel(/^Price/);
    this.stock = this.root.getByLabel(/^In stock/);
    this.description = this.root.getByLabel(/^Description/);
    this.errors = this.root.locator('.field__error');
    this.alert = this.root.getByRole('alert');
    this.submit = this.root.locator('.dialog__footer .btn--primary');
    this.cancel = this.root.getByRole('button', { name: 'Cancel' });
    this.close = this.root.getByRole('button', { name: 'Close' });
    this.keepEditing = this.root.getByRole('button', { name: 'Keep editing' });
    this.discard = this.root.getByRole('button', { name: 'Discard', exact: true });

    this.photoTile = this.root.locator('.media--thumb');
    this.photoImage = this.photoTile.locator('img');
    this.photoButton = this.root.getByRole('button', {
      name: /^(Add photo|Change photo|Adding photo…)$/,
    });
    this.removePhoto = this.root.getByRole('button', { name: 'Remove photo' });
    this.picker = this.root.getByLabel('Choose a photo');
    this.photoCaption = this.root.getByText('JPG or PNG, 5 MB at most');
    this.photoError = this.root.locator('#d-photo-error');

    this.minimum = this.root.getByLabel(/^Minimum order/);
    this.options = this.root.getByRole('group', { name: 'Options' });
    this.optionsHelp = this.options.locator('.field__help').first();
    this.optionName = this.root.getByLabel('What the options choose');
    this.addOption = this.root.getByRole('button', { name: 'Add option' });
    this.optionsError = this.options.locator('.field__error');
  }

  option(n: number): Locator {
    return this.root.getByLabel(`Option ${n}`, { exact: true });
  }

  optionStock(n: number): Locator {
    return this.root.getByLabel(`Stock of option ${n}`, { exact: true });
  }

  removeOption(n: number): Locator {
    return this.root.getByRole('button', { name: `Remove option ${n}`, exact: true });
  }
}

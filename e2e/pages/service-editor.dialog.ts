import type { Locator, Page } from '@playwright/test';

/** The service editor (L2-094): add or change a service. */
export class ServiceEditorDialog {
  readonly root: Locator;
  readonly title: Locator;
  readonly name: Locator;
  readonly detail: Locator;
  readonly pricing: Locator;
  readonly price: Locator;
  readonly action: Locator;
  readonly duration: Locator;
  readonly video: Locator;
  readonly inPerson: Locator;
  readonly place: Locator;
  readonly errors: Locator;
  readonly alert: Locator;
  readonly submit: Locator;
  readonly cancel: Locator;
  readonly keepEditing: Locator;
  readonly discard: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('dialog');
    this.title = this.root.locator('.dialog__title');
    this.name = this.root.getByLabel(/^Service name/);
    this.detail = this.root.getByLabel(/^Short detail/);
    this.pricing = this.root.getByLabel('Pricing');
    this.price = this.root.getByLabel(/^Price/);
    this.action = this.root.getByLabel('Members can');
    this.duration = this.root.getByLabel(/^Meeting length/);
    this.video = this.root.getByLabel('Video call');
    this.inPerson = this.root.getByLabel('In person');
    this.place = this.root.getByLabel(/^Place/);
    this.errors = this.root.locator('.field__error');
    this.alert = this.root.getByRole('alert');
    this.submit = this.root.locator('.dialog__footer .btn--primary');
    this.cancel = this.root.getByRole('button', { name: 'Cancel' });
    this.keepEditing = this.root.getByRole('button', { name: 'Keep editing' });
    this.discard = this.root.getByRole('button', { name: 'Discard', exact: true });
  }
}

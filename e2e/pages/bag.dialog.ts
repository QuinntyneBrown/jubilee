import type { Locator, Page } from '@playwright/test';
import { BASELINE } from '../fixtures/jb-test';
import type { Region, Screen } from '../fixtures/visual';

/** One line of the bag: a size of the tee and its quantity (L2-266 AC1). */
export class BagLinePart {
  readonly name: Locator;
  readonly meta: Locator;
  readonly amount: Locator;
  readonly quantity: Locator;
  readonly quantityValue: Locator;
  readonly fewer: Locator;
  readonly more: Locator;
  readonly remove: Locator;
  readonly problem: Locator;

  constructor(readonly root: Locator) {
    this.name = root.locator('.bag-line__name');
    this.meta = root.locator('.bag-line__meta');
    this.amount = root.locator('.bag-line__amount');
    this.quantity = root.getByRole('group', { name: /^Quantity of / });
    this.quantityValue = this.quantity.locator('output');
    this.fewer = this.quantity.getByRole('button', { name: 'One fewer' });
    this.more = this.quantity.getByRole('button', { name: 'One more' });
    this.remove = root.getByRole('button', { name: /^Remove / });
    this.problem = root.locator('.bag-line__problem');
  }
}

/** The bag (L2-266, L2-267): its lines, the delivery, the totals and "Check out". */
export class BagDialog implements Screen {
  readonly root: Locator;
  readonly title: Locator;
  readonly description: Locator;
  readonly close: Locator;
  readonly lines: Locator;
  readonly emptyText: Locator;
  readonly chooseSize: Locator;
  readonly delivery: Locator;
  readonly ship: Locator;
  readonly pickup: Locator;
  readonly totals: Locator;
  readonly shirts: Locator;
  readonly shipping: Locator;
  readonly total: Locator;
  readonly taxNote: Locator;
  readonly alert: Locator;
  readonly keepShopping: Locator;
  readonly checkOut: Locator;
  readonly footer: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('dialog', { name: 'Your bag' });
    this.title = this.root.locator('.dialog__title');
    this.description = this.root.locator('#dlg-desc');
    this.close = this.root.getByRole('button', { name: 'Close' });
    this.lines = this.root.locator('li.bag-line');
    this.emptyText = this.root.getByText(/^Your bag is empty\./);
    this.chooseSize = this.root.getByRole('button', { name: 'Choose a size' });
    this.delivery = this.root.getByRole('group', { name: 'How would you like to get it?' });
    this.ship = this.delivery.getByRole('radio', { name: /^Ship to me/ });
    this.pickup = this.delivery.getByRole('radio', { name: /^Pick up at the Jubilee gathering/ });
    this.totals = this.root.locator('dl');
    this.shirts = this.totals.locator('dt:has-text("Shirts") + dd');
    this.shipping = this.totals.locator('dt:has-text("Shipping") + dd');
    this.total = this.totals.locator('dt:has-text("Total before tax") + dd');
    this.taxNote = this.root.getByText(/Tax is added on Stripe/);
    this.alert = this.root.locator('.alert');
    this.footer = this.root.locator('.dialog__footer');
    this.keepShopping = this.footer.getByRole('button', { name: 'Keep shopping' });
    this.checkOut = this.footer.getByRole('button', { name: /^(Check out|Opening checkout)/ });
  }

  line(fitAndSize: string): BagLinePart {
    return new BagLinePart(
      this.lines.filter({
        has: this.root.page().getByRole('group', { name: `Quantity of ${fitAndSize}` }),
      }),
    );
  }

  /** The dialog's container has no box of its own: its title says whether it is open. */
  async ready(): Promise<void> {
    await this.title.waitFor();
  }

  regions(): Region[] {
    return [
      { name: 'dialog', locator: this.root.locator('.dialog__panel') },
      { name: 'lines', locator: this.root.locator('ul') },
      { name: 'footer', locator: this.footer },
    ];
  }
}

/** The bag opened from the Purpose Tee page. */
export class BagScreen extends BagDialog {
  constructor(protected readonly page: Page) {
    super(page);
  }

  override async ready(): Promise<void> {
    // The mock is the dialog already open; the app opens it from the Bag button.
    if (!BASELINE) await this.page.locator('main#main .bag-button').click();
    await super.ready();
  }
}

/** The bag with "Pick up at the Jubilee gathering" chosen. */
export class BagPickupScreen extends BagScreen {
  override async ready(): Promise<void> {
    await super.ready();
    if (BASELINE) return;
    await this.pickup.check();
  }
}

/** "Check out" pressed: opening, or what the server answered. */
export class BagCheckoutScreen extends BagScreen {
  override async ready(): Promise<void> {
    await super.ready();
    if (BASELINE) return;
    await this.checkOut.click();
    await this.root.locator('.alert, [aria-busy="true"]').first().waitFor();
  }
}

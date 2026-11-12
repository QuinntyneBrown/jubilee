import type { Locator } from '@playwright/test';

/** One space card (`a.space-card`): a room or rental in a grid (L2-203). */
export class SpaceCard {
  readonly badge: Locator;
  readonly price: Locator;
  readonly unit: Locator;
  readonly title: Locator;
  readonly facts: Locator;
  readonly area: Locator;
  readonly available: Locator;
  readonly mediaTile: Locator;

  constructor(readonly root: Locator) {
    this.badge = root.locator('.space-card__badge');
    this.price = root.locator('.space-card__price');
    this.unit = root.locator('.space-card__unit');
    this.title = root.locator('.space-card__title');
    this.facts = root.locator('.space-card__facts');
    this.area = root.locator('.space-card__area');
    this.available = root.locator('.space-card__available');
    this.mediaTile = root.locator('.media');
  }
}

/** The term filter of rooms and rentals: "Any length" and the four terms, as toggles (L2-201 AC2). */
export class TermFilter {
  readonly chips: Locator;

  constructor(readonly root: Locator) {
    this.chips = root.getByRole('button');
  }

  chip(name: string): Locator {
    return this.root.getByRole('button', { name, exact: true });
  }

  async choose(name: string): Promise<void> {
    await this.chip(name).click();
  }
}

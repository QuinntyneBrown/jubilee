import type { Locator } from '@playwright/test';

/** One business card (`a.biz-card`): the large tile of featured and category lists. */
export class BusinessCard {
  readonly name: Locator;
  readonly tagline: Locator;
  readonly highlight: Locator;
  readonly verifiedMark: Locator;
  readonly verifiedIcon: Locator;
  readonly mediaTile: Locator;
  readonly categoryLabel: Locator;

  constructor(readonly root: Locator) {
    this.name = root.locator('.biz-card__name');
    this.tagline = root.locator('.biz-card__tagline');
    this.highlight = root.locator('.perk');
    this.verifiedMark = root.locator('.verified');
    this.verifiedIcon = this.verifiedMark.locator('svg');
    this.mediaTile = root.locator('.media');
    this.categoryLabel = root.locator('.media__tag');
  }

  /** Number of text lines the tagline occupies. */
  async taglineLines(): Promise<number> {
    return this.tagline.evaluate((el) => {
      const style = getComputedStyle(el);
      return Math.round(el.getBoundingClientRect().height / parseFloat(style.lineHeight));
    });
  }

  /** True when the name is cut off instead of wrapping. */
  async nameIsTruncated(): Promise<boolean> {
    return this.name.evaluate(
      (el) => el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight,
    );
  }
}

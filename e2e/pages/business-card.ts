import type { Locator } from '@playwright/test';

/** The heart `jb-saveable` draws beside a card's link: a sibling of the link, never inside it. */
export function heartOf(card: Locator): Locator {
  return card.locator('xpath=../button[contains(@class, "saveable__heart")]');
}

/** One business card (`a.biz-card`): the large tile of featured and category lists. */
export class BusinessCard {
  readonly name: Locator;
  readonly tagline: Locator;
  readonly highlight: Locator;
  /** "Replies fast", when the business answers within a day (L2-054). */
  readonly repliesFast: Locator;
  readonly mediaTile: Locator;
  readonly categoryLabel: Locator;
  /** The heart beside the card's link (`jb-saveable`, L2-041 AC7). */
  readonly heart: Locator;

  constructor(readonly root: Locator) {
    this.name = root.locator('.biz-card__name');
    this.tagline = root.locator('.biz-card__tagline');
    this.highlight = root.locator('.perk');
    this.repliesFast = root.locator('.biz-card__meta .badge');
    this.mediaTile = root.locator('.media');
    this.categoryLabel = root.locator('.media__tag');
    this.heart = heartOf(root);
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

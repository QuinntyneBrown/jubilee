import type { Locator, Page } from '@playwright/test';

/** One review of the list (`article.review`). */
export class ReviewPart {
  readonly author: Locator;
  readonly avatar: Locator;
  readonly label: Locator;
  readonly meta: Locator;
  readonly stars: Locator;
  readonly item: Locator;
  readonly verified: Locator;
  readonly text: Locator;
  readonly reply: Locator;
  readonly replyHead: Locator;
  readonly replyText: Locator;
  readonly edit: Locator;
  readonly remove: Locator;
  readonly replyButton: Locator;
  readonly editReply: Locator;
  readonly report: Locator;

  constructor(readonly root: Locator) {
    this.author = root.locator('.review__author');
    this.avatar = root.locator('.review__avatar');
    this.label = root.locator('.review__label');
    this.meta = root.locator('.review__meta');
    this.stars = root.locator('.review__rating [role="img"]');
    this.item = root.locator('.review__item');
    this.verified = root.locator('.review__verified');
    this.text = root.locator('.review__text');
    this.reply = root.locator('.review__reply');
    this.replyHead = root.locator('.review__reply-head');
    this.replyText = root.locator('.review__reply-text');
    const actions = root.locator('.review__actions');
    this.edit = actions.getByRole('button', { name: 'Edit', exact: true });
    this.remove = actions.getByRole('button', { name: 'Remove', exact: true });
    this.replyButton = actions.getByRole('button', { name: /^Reply to / });
    this.editReply = actions.getByRole('button', { name: /^Edit reply to / });
    this.report = actions.getByRole('button', { name: /^Report .*review$/ });
  }
}

/**
 * The "Reviews" section of a listing or a product page (L2-228, L2-229, L2-231) and the rating
 * under the name that leads to it.
 */
export class ReviewsRegion {
  readonly root: Locator;
  readonly heading: Locator;
  /** The rating under the listing's name: a link to the section, or "No reviews yet". */
  readonly ratingLink: Locator;
  readonly write: Locator;
  readonly notice: Locator;
  /** The summary: the average, its stars, the count, the bars and the note. */
  readonly summary: Locator;
  readonly average: Locator;
  readonly summaryStars: Locator;
  readonly count: Locator;
  readonly bars: Locator;
  readonly note: Locator;
  readonly mine: Locator;
  readonly filterText: Locator;
  readonly clear: Locator;
  readonly sort: Locator;
  readonly list: Locator;
  readonly reviews: Locator;
  readonly none: Locator;
  readonly showAll: Locator;
  readonly status: Locator;
  readonly empty: Locator;
  readonly loadingStatus: Locator;
  readonly skeletons: Locator;
  readonly error: Locator;
  readonly errorReference: Locator;
  readonly tryAgain: Locator;

  constructor(page: Page) {
    const main = page.locator('main');
    this.root = main.locator('section.reviews');
    this.heading = this.root.getByRole('heading', { level: 2, name: 'Reviews' });
    this.ratingLink = main.locator('.rating-link');
    this.write = this.root.getByRole('link', { name: 'Write a review' });
    this.notice = this.root.locator('.reviews__notice');
    this.summary = this.root.locator('.rating-summary');
    this.average = this.root.locator('.rating-summary__average');
    this.summaryStars = this.root.locator('.rating-summary [role="img"]');
    this.count = this.root.locator('.rating-summary__count');
    this.bars = this.root.locator('.rating-summary__bar');
    this.note = this.root.locator('.rating-summary__note');
    this.mine = this.root.locator('.reviews__mine article.review');
    this.filterText = this.root.locator('.reviews__filter');
    this.clear = this.root.getByRole('button', { name: 'Clear' });
    this.sort = this.root.getByRole('combobox', { name: 'Sort reviews' });
    this.list = this.root.locator('.reviews__list');
    this.reviews = this.list.locator('article.review');
    this.none = this.root.locator('.reviews__none');
    this.showAll = this.root.getByRole('button', { name: /^Show all \d+ reviews$/ });
    this.status = this.root.locator('.reviews__main [role="status"]');
    this.empty = this.root.locator('.reviews__empty');
    this.loadingStatus = this.root.getByRole('status').filter({ hasText: 'Loading the reviews' });
    this.skeletons = this.root.locator('.skeleton');
    this.error = this.root.getByRole('alert');
    this.errorReference = this.error.locator('code');
    this.tryAgain = this.error.getByRole('button', { name: 'Try again' });
  }

  /** The bar of one star rating: "{s} stars, {n} reviews". */
  bar(stars: number): Locator {
    return this.root.getByRole('button', { name: new RegExp(`^${stars} stars, `) });
  }

  review(index: number): ReviewPart {
    return new ReviewPart(this.reviews.nth(index));
  }

  byAuthor(author: string): ReviewPart {
    return new ReviewPart(this.root.locator('article.review').filter({ hasText: author }));
  }

  myReview(): ReviewPart {
    return new ReviewPart(this.mine);
  }
}

/** The rating a card carries from three reviews (L2-231); absent below three. */
export interface CardRating {
  average: number;
  count: number;
}

/** The average, the count and the counts of 5, 4, 3, 2 and 1 stars (L2-229 AC2). */
export interface ReviewSummary {
  average: number;
  count: number;
  breakdown: readonly number[];
}

export interface ReviewReply {
  from: string;
  text: string;
  at: string;
  editedAt: string | null;
}

/** One review as anyone reads it: first name and last initial only (L2-239 AC1). */
export interface ListingReview {
  id: string;
  author: string;
  initials: string;
  rating: number;
  itemId: string | null;
  itemName: string;
  text: string;
  createdAt: string;
  editedAt: string | null;
  mine: boolean;
  reply: ReviewReply | null;
}

/** Who may write a review (L2-226, L2-238 AC1). */
export type ReviewWriting = 'sign-in' | 'eligible' | 'not-eligible' | 'written' | 'owner';

/** Who the caller is to the listing. */
export type ReviewViewer = 'visitor' | 'member' | 'owner';

/** The reviews of a listing or of one of its products (L2-238 AC1). */
export interface ListingReviews {
  summary: ReviewSummary;
  viewer: ReviewViewer;
  writing: ReviewWriting;
  items: ListingReview[];
}

export interface ReviewItemOption {
  id: string;
  name: string;
}

/** What the Write a review screen needs (L2-238 AC2). `itemLegend` is null when nothing is chosen. */
export interface ReviewForm {
  listing: {
    slug: string;
    name: string;
    kind: 'services' | 'shop' | 'space';
    categoryName: string;
    categorySlug: string;
    ownerName: string | null;
  };
  items: ReviewItemOption[];
  itemLegend: 'service' | 'product' | null;
  authorName: string;
}

export interface ReviewRequest {
  rating: number | null;
  itemId: string | null;
  text: string;
}

/** The reasons of the Report this review dialog (L2-236 AC1). */
export type ReviewReportReason =
  'not-a-real-dealing' | 'abusive' | 'private-details' | 'advertising' | 'other';

export interface ReviewReportRequest {
  reason: ReviewReportReason | null;
  note: string;
}

/** The orders of the reviews (L2-230). */
export type ReviewSort = 'relevant' | 'newest' | 'highest' | 'lowest';

/** The words of each star, from one to five (L2-227 AC2). */
export const STAR_WORDS = ['Poor', 'Not great', 'Okay', 'Good', 'Excellent'] as const;

/** At least this many characters, once trimmed (L2-228 AC2). */
export const REVIEW_MIN_LENGTH = 40;
export const REVIEW_MAX_LENGTH = 2000;
export const REPLY_MAX_LENGTH = 1000;
export const REVIEW_REPORT_NOTE_MAX_LENGTH = 1000;

const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

/**
 * Sorts reviews (L2-230, ADR 0066). "Most relevant" puts the reviews of the last 12 months first,
 * then the longer text, then the newer; the others sort by date or by stars, newer first on a tie.
 */
export function sortReviews(
  reviews: readonly ListingReview[],
  sort: ReviewSort,
  now: Date,
): ListingReview[] {
  const time = (r: ListingReview) => Date.parse(r.createdAt);
  const newer = (a: ListingReview, b: ListingReview) => time(b) - time(a);
  const recent = (r: ListingReview) => (now.getTime() - time(r) < YEAR_MS ? 0 : 1);
  const order: Record<ReviewSort, (a: ListingReview, b: ListingReview) => number> = {
    relevant: (a, b) => recent(a) - recent(b) || b.text.length - a.text.length || newer(a, b),
    newest: newer,
    highest: (a, b) => b.rating - a.rating || newer(a, b),
    lowest: (a, b) => a.rating - b.rating || newer(a, b),
  };
  return [...reviews].sort(order[sort]);
}

/** The reviews with the given number of stars, or all of them (L2-230 AC1). */
export function filterReviews(
  reviews: readonly ListingReview[],
  stars: number | null,
): ListingReview[] {
  return stars === null ? [...reviews] : reviews.filter((r) => r.rating === stars);
}

/** The member's own review first, then the rest in the chosen order (L2-229 AC7). */
export function mineFirst(reviews: readonly ListingReview[]): ListingReview[] {
  return [...reviews.filter((r) => r.mine), ...reviews.filter((r) => !r.mine)];
}

/** The average to one decimal, as the cards and the summary show it ("4.6"). */
export function formatAverage(average: number): string {
  return average.toFixed(1);
}

/** The summary counted again from the reviews shown (L2-238 AC9), after an edit or a removal. */
export function summarize(reviews: readonly ListingReview[]): ReviewSummary {
  const breakdown = [5, 4, 3, 2, 1].map((s) => reviews.filter((r) => r.rating === s).length);
  const count = reviews.length;
  const total = reviews.reduce((sum, r) => sum + r.rating, 0);
  const average = count === 0 ? 0 : Math.round((total / count) * 10 + Number.EPSILON) / 10;
  return { average, count, breakdown };
}

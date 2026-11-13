import { ChangeDetectionStrategy, Component, booleanAttribute, input } from '@angular/core';
import { Stars } from '../stars/stars';

/** The owner's reply as a review shows it (L2-229 AC5). */
export interface ReviewReplyView {
  from: string;
  /** The date, already written out: "4 Nov 2026". */
  date: string;
  edited: boolean;
  text: string;
}

/** What a review shows (L2-229 AC4). Dates come written out: "3 Nov 2026". */
export interface ReviewView {
  author: string;
  initials: string;
  rating: number;
  itemName: string;
  date: string;
  edited: boolean;
  text: string;
  reply: ReviewReplyView | null;
}

let nextId = 0;

/**
 * One review: the author's initials, name and date; the stars and the item; the text as
 * written; the reply; and the viewer's actions, projected as `[slot=actions]`.
 *
 *     <article jb-review [review]="view" [mine]="true">
 *       <button jb-button slot="actions" size="sm">Edit</button>
 *     </article>
 *
 * `mine` sets it on a tinted ground, labelled "Your review", dated "Posted {date}" (L2-229 AC7).
 * The text is shown as text, never as markup (L2-238 AC8).
 */
@Component({
  selector: 'article[jb-review]',
  imports: [Stars],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'review',
    '[class.review--mine]': 'mine()',
    '[attr.aria-labelledby]': 'headingId',
  },
  templateUrl: './review.html',
  styleUrl: './review.scss',
})
export class Review {
  readonly review = input.required<ReviewView>();
  readonly mine = input(false, { transform: booleanAttribute });
  protected readonly headingId = `jb-review-${nextId++}`;
}

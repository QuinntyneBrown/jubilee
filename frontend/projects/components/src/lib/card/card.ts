import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * The surface a page groups content on, on the element that is the group:
 *
 *     <section jb-card heading="Your data" headingId="dat" class="stack">…</section>
 *     <dl jb-card variant="well" class="dl">…</dl>
 *     <section jb-card variant="danger" heading="Delete account" headingId="dz">…</section>
 *
 * `heading` draws the title; with `headingId` the card is also named by it
 * (`aria-labelledby`). A card that places its own `h2[jb-card-title]` names itself with
 * `labelledBy`. `narrow` keeps it to the width of a form; `list` and `flush` remove the padding
 * for a list of items or a picture that runs to the edge.
 */
@Component({
  selector:
    'div[jb-card], section[jb-card], aside[jb-card], form[jb-card], li[jb-card], ul[jb-card], dl[jb-card]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.card]': "variant() !== 'well'",
    '[class.well]': "variant() === 'well'",
    '[class.danger-zone]': "variant() === 'danger'",
    '[class.card--flush]': 'flush()',
    '[class.card--list]': 'list()',
    '[class.card--narrow]': 'narrow()',
    '[class.card--interactive]': 'interactive()',
    '[class.card--selected]': 'selected()',
    '[attr.aria-labelledby]': 'labelledBy() ?? (heading() ? headingId() : null)',
  },
  templateUrl: './card.html',
  styleUrl: './card.scss',
})
export class Card {
  readonly variant = input<'card' | 'well' | 'danger'>('card');
  readonly heading = input<string | null>(null);
  readonly headingId = input<string | null>(null);
  /** The id of a title the card places itself. */
  readonly labelledBy = input<string | null>(null);
  readonly flush = input(false, { transform: booleanAttribute });
  readonly list = input(false, { transform: booleanAttribute });
  readonly narrow = input(false, { transform: booleanAttribute });
  readonly interactive = input(false, { transform: booleanAttribute });
  readonly selected = input(false, { transform: booleanAttribute });
}

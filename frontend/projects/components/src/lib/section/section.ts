import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * A titled part of a page, on the element that is the part:
 *
 *     <section jb-section heading="From the shops" headingId="shops"
 *              actionLabel="All shops" [actionLink]="['/c', 'shops']">…</section>
 *
 * `heading` draws the section head; with `headingId` the section is also named by it
 * (`aria-labelledby`). The action beside the heading is a link (`actionLabel`, `actionLink`) or
 * whatever is projected with `slot="action"`. A section that writes its own heading names
 * itself with `labelledBy`. `divided` rules it off from what is above.
 */
@Component({
  selector: 'section[jb-section], aside[jb-section], div[jb-section]',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'section',
    '[class.section--divided]': 'divided()',
    '[attr.aria-labelledby]': 'labelledBy() ?? (heading() ? headingId() : null)',
  },
  templateUrl: './section.html',
  styleUrl: './section.scss',
})
export class Section {
  readonly heading = input<string | null>(null);
  readonly headingId = input<string | null>(null);
  /** The level of the heading: 2 under the page's `h1`, 3 inside another section. */
  readonly level = input<2 | 3>(2);
  readonly actionLabel = input<string | null>(null);
  readonly actionLink = input<string | readonly unknown[] | null>(null);
  /** Words read after the action's label by assistive technology only (" rooms and rentals"). */
  readonly actionHint = input<string | null>(null);
  /** The id of a heading the section writes itself. */
  readonly labelledBy = input<string | null>(null);
  readonly divided = input(false, { transform: booleanAttribute });
}

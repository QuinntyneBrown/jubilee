import { NgTemplateOutlet } from '@angular/common';
import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * The heading of a marketing section: its words, the accent phrase that ends them and, under it,
 * a lead, actions and a note.
 *
 *     <jb-marketing-heading headingId="why-title" text="Trust," accent="built in."
 *                           lead="The recommendations you already ask your church for." />
 *
 * `size` is the type: `display` for the page's one `h1`, `section`, `film` (centred) and
 * `closing` (centred and larger). `[slot=actions]` are the links under the lead; with `split`,
 * `[slot=aside]` is a link that sits at the far end of the heading from the tablet layout.
 * It reads --jb-mkt-accent; an ink section gives it the accent and lead colours for ink.
 */
@Component({
  selector: 'jb-marketing-heading',
  imports: [NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'mkt-heading',
    '[class.mkt-heading--display]': 'size() === "display"',
    '[class.mkt-heading--film]': 'size() === "film"',
    '[class.mkt-heading--closing]': 'size() === "closing"',
    '[class.mkt-heading--measure]': 'measure()',
    '[class.mkt-heading--split]': 'split()',
    '[class.mkt-heading--lead-narrow]': 'leadWidth() === "narrow"',
    '[class.mkt-heading--lead-medium]': 'leadWidth() === "medium"',
    '[class.mkt-heading--lead-wide]': 'leadWidth() === "wide"',
  },
  templateUrl: './marketing-heading.html',
  styleUrl: './marketing-heading.scss',
})
export class MarketingHeading {
  /** 1 for the page's heading, 2 for a section's. */
  readonly level = input<1 | 2>(2);
  readonly size = input<'display' | 'section' | 'film' | 'closing'>('section');
  /** The id of the heading, for the section's `aria-labelledby`. */
  readonly headingId = input.required<string>();
  readonly text = input.required<string>();
  /** The phrase that ends the heading, in the accent colour. */
  readonly accent = input.required<string>();
  readonly lead = input<string>();
  /** How wide the lead may run: `full` is the width of the heading. */
  readonly leadWidth = input<'full' | 'narrow' | 'medium' | 'wide'>('full');
  /** A line of small print under the actions. */
  readonly note = input<string>();
  /** Keeps the heading and its lead to a reading measure. */
  readonly measure = input(false, { transform: booleanAttribute });
  /** Puts `[slot=aside]` at the far end of the heading from the tablet layout. */
  readonly split = input(false, { transform: booleanAttribute });
}

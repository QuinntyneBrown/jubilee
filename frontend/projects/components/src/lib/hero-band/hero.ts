import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * The band of brand ink a landing page opens with: a line above the heading, the page's `h1`,
 * a lead under it and whatever the page offers next (actions, a search, category chips).
 *
 *     <section jb-hero greeting="Morning, Joanna" heading="Do business with…" [lead]="count()">
 *       <ul jb-chip-row>…</ul>
 *     </section>
 *
 * A lead that is more than words is projected with `ngProjectAs="[slot=lead]"`. `slot="search"`
 * takes the search box a phone shows here, where the top bar has none.
 */
@Component({
  selector: 'section[jb-hero]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'hero' },
  templateUrl: './hero.html',
  styleUrl: './hero.scss',
})
export class Hero {
  readonly greeting = input<string | null>(null);
  readonly heading = input.required<string>();
  readonly lead = input<string | null>(null);
}

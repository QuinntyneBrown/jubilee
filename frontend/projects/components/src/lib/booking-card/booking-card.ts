import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Icon } from '../icon/icon';
import { formatRent } from '../space-card/space-terms';

/** The request a member has open on a space: who it went to and what happens next (L2-205). */
export interface BookingSent {
  heading: string;
  text: string;
}

/**
 * The rent, the minimum stay and the one thing to do on the page of a space (L2-205 AC1). The
 * call to action is projected with `slot="action"`; it is hidden under 48rem, where the
 * `jb-booking-bar` carries it. The other actions (message, save) are projected as they are:
 *
 *     <div jb-booking-card [rent]="120" per="night" minimum="2 nights min.">
 *       <a slot="action" jb-button variant="primary" size="lg" …>Request to book</a>
 *       <a jb-button iconOnly size="lg" … aria-label="Message host">…</a>
 *     </div>
 *
 * With `sent`, the card says the request went and drops the payment line; the page leaves out
 * the call to action.
 */
@Component({
  selector: 'div[jb-booking-card]',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'booking-card' },
  templateUrl: './booking-card.html',
  styleUrl: './booking-card.scss',
})
export class BookingCard {
  /** The rent in whole dollars. */
  readonly rent = input.required<number>();
  readonly per = input.required<'night' | 'month'>();
  /** "2 nights min.", or null when the space has no minimum. */
  readonly minimum = input<string | null>(null);
  readonly sent = input<BookingSent | null>(null);

  protected readonly price = computed(() => formatRent(this.rent()));
}

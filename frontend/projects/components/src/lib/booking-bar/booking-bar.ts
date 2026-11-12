import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { formatRent } from '../space-card/space-terms';

/**
 * The rent and the call to action of a space, fixed above the tab bar under 48rem (L2-204 AC4):
 *
 *     <jb-booking-bar [rent]="120" per="night">
 *       <a jb-button variant="primary" size="lg" …>Request to book</a>
 *     </jb-booking-bar>
 *
 * The host stays in the flow and keeps the bar's height, so the end of the page is never under
 * the bar. From 48rem it draws nothing: the booking card carries the call to action.
 */
@Component({
  selector: 'jb-booking-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './booking-bar.html',
  styleUrl: './booking-bar.scss',
})
export class BookingBar {
  /** The rent in whole dollars. */
  readonly rent = input.required<number>();
  readonly per = input.required<'night' | 'month'>();

  protected readonly price = computed(() => formatRent(this.rent()));
}

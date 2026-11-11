import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Where a request stands (L2-043). */
export type RequestCardStatus = 'new' | 'confirmed' | 'declined' | 'cancelled' | 'completed';

const TONE: Record<RequestCardStatus, string> = {
  new: 'badge--warning',
  confirmed: 'badge--success',
  declined: 'badge--danger',
  cancelled: '',
  completed: '',
};

/**
 * A booking, quote or order request in the timeline of a conversation:
 *
 *     <li jb-request-card kind="Booking request" heading="Discovery meeting"
 *         detail="Thu 12 Nov, 10:00–10:30 a.m. · Video" status="confirmed"
 *         statusLabel="Confirmed" link="/requests/42"></li>
 *
 * The status is said in words; its colour only repeats it.
 */
@Component({
  selector: 'li[jb-request-card]',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'request-card' },
  templateUrl: './request-card.html',
  styleUrl: './request-card.scss',
})
export class RequestCard {
  /** "Booking request", "Quote request" or "Order request". */
  readonly kind = input.required<string>();
  readonly heading = input.required<string>();
  readonly detail = input<string | null>(null);
  readonly status = input.required<RequestCardStatus>();
  readonly statusLabel = input.required<string>();
  /** Where "View request" goes. */
  readonly link = input.required<string>();

  protected readonly tone = computed(() => TONE[this.status()] ?? '');
}

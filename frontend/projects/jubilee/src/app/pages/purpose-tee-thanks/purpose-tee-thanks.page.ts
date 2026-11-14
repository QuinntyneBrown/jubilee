import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BagStore, MERCH_API, MerchOrder, errorReference, money, orderSummary } from 'api';
import { Button, EmptyState, Icon } from 'components';

/** How often a pending order is asked again, and for how long (L2-269 AC3). */
const ASK_EVERY_MS = 3000;
const ASK_FOR_MS = 60_000;

type ThanksState =
  | { status: 'checking' }
  | { status: 'paid'; order: MerchOrder }
  | { status: 'pending'; long: boolean }
  | { status: 'not-paid' }
  | { status: 'not-found' }
  | { status: 'error'; reference: string };

/**
 * PurposeTeeThanksPage (L2-269): where the provider's hosted checkout returns the buyer. It reads
 * the order by its reference and says whether it is paid; a paid order empties the bag. It shows
 * nothing of the buyer (L2-269 AC7).
 */
@Component({
  selector: 'jb-purpose-tee-thanks-page',
  imports: [Button, EmptyState, Icon, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'jb-page container page' },
  templateUrl: './purpose-tee-thanks.page.html',
})
export class PurposeTeeThanksPage implements OnInit {
  private readonly api = inject(MERCH_API);
  private readonly bag = inject(BagStore);
  private readonly route = inject(ActivatedRoute);

  protected readonly state = signal<ThanksState>({ status: 'checking' });
  private timer: ReturnType<typeof setTimeout> | undefined;
  /** Says it is taking longer a minute after the order was first found pending. */
  private longTimer: ReturnType<typeof setTimeout> | undefined;
  private long = false;

  private readonly reference = this.route.snapshot.queryParamMap.get('order');
  private readonly cancelled = this.route.snapshot.queryParamMap.get('cancelled') === '1';

  /** "Order PT-4F7K2Q: Men’s L and Women’s M, $66.67 CAD with shipping and tax. …" (AC2). */
  protected readonly paidText = computed(() => {
    const current = this.state();
    if (current.status !== 'paid') return '';
    const { order } = current;
    const next =
      order.delivery === 'pickup'
        ? 'Pick it up at the next Jubilee gathering in Toronto; we’ll e-mail you the date and place.'
        : 'It ships in 3 to 5 business days.';
    return (
      `Order ${order.number}: ${orderSummary(order.lines)}, ${money(order.totalCents)} CAD with ` +
      `shipping and tax. We’ve e-mailed your receipt to the address you gave at checkout. ${next} ` +
      'Every shirt helps keep Jubilee free for the Christian business people of Toronto.'
    );
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      clearTimeout(this.timer);
      clearTimeout(this.longTimer);
    });
  }

  ngOnInit(): void {
    if (!this.reference) {
      this.state.set({ status: 'not-found' });
      return;
    }
    this.ask();
  }

  /** "Try again" and "Check again". */
  protected again(): void {
    this.state.set({ status: 'checking' });
    this.ask();
  }

  private ask(): void {
    clearTimeout(this.timer);
    this.api.order(this.reference!).subscribe({
      next: (order) => this.answered(order),
      error: (error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 404) {
          this.state.set({ status: 'not-found' });
        } else {
          this.state.set({ status: 'error', reference: errorReference(error, 'JB-MERCH-503') });
        }
      },
    });
  }

  private answered(order: MerchOrder): void {
    if (order.status === 'paid') {
      this.bag.clear();
      this.state.set({ status: 'paid', order });
      return;
    }
    if (order.status === 'expired' || this.cancelled) {
      this.state.set({ status: 'not-paid' });
      return;
    }
    this.state.set({ status: 'pending', long: this.long });
    if (this.long) return;
    this.longTimer ??= setTimeout(() => {
      this.long = true;
      clearTimeout(this.timer);
      if (this.state().status === 'pending') this.state.set({ status: 'pending', long: true });
    }, ASK_FOR_MS);
    this.timer = setTimeout(() => this.ask(), ASK_EVERY_MS);
  }
}

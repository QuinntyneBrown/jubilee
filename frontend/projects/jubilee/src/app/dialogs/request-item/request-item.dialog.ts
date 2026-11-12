import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { BookedRequest, DeliveryMethod, OrderOptions, REQUESTS_API } from 'api';
import {
  MediaTile,
  formatPrice,
  Button,
  Alert,
  Field,
  Textarea,
  RadioGroup,
  DialogFrame,
  DialogBody,
  DialogFooter,
  Card,
  ItemList,
  ItemListItem,
  RowMeta,
  ItemListName,
  DescriptionList,
  DescriptionItem,
  Price,
  MomentCheck,
} from 'components';
import { TimeoutError, timeout } from 'rxjs';
import { newKey } from 'api';
import { momentCheckIn } from '../../services/moment-check-in';
import { FormDraftDirective } from '../../drafts/form-draft.directive';

export interface RequestItemData {
  shopSlug: string;
  productSlug: string;
  /** The option chosen on the product page; null for a product without options. */
  option: string | null;
  quantity: number;
}

type View = 'loading' | 'form' | 'busy' | 'success' | 'failed' | 'unavailable';

/** A submission that takes longer than this fails instead of spinning (L2-127 AC2). */
const SUBMIT_TIMEOUT_MS = 10_000;

const POSTAL_CODE = /[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d/;

/** Two decimals, as the estimate shows them: 3400 → "$34.00". */
function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * RequestItemDialog (L2-046): the shop's delivery choices, an address for shipping, a note and an
 * estimate that follows the choice at once. The estimate is display only: the server computes the
 * amounts from stored data and the request carries no price. Nothing is charged.
 */
@Component({
  selector: 'jb-request-item-dialog',
  imports: [
    FormDraftDirective,
    FormsModule,
    RouterLink,
    MediaTile,
    Button,
    Alert,
    Field,
    Textarea,
    RadioGroup,
    DialogFrame,
    DialogBody,
    DialogFooter,
    Card,
    ItemList,
    ItemListItem,
    RowMeta,
    ItemListName,
    DescriptionList,
    DescriptionItem,
    Price,
    MomentCheck,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './request-item.dialog.html',
})
export class RequestItemDialog implements OnInit {
  /** The one question of the confirmation (L2-211). */
  protected readonly checkIn = momentCheckIn('request-sent');
  private readonly ref = inject<DialogRef<void>>(DialogRef);
  private readonly api = inject(REQUESTS_API);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly data = inject<RequestItemData>(DIALOG_DATA);

  protected readonly view = signal<View>('loading');
  protected readonly options = signal<OrderOptions | null>(null);
  protected readonly methodId = signal('');
  protected readonly deliveryOptions = computed(() =>
    (this.options()?.deliveryMethods ?? []).map((method) => ({
      value: method.id,
      label: method.label,
      hint: method.detail,
    })),
  );
  protected readonly address = signal('');
  protected readonly note = signal('');
  protected readonly addressProblem = signal('');
  protected readonly stockProblem = signal('');
  protected readonly booked = signal<BookedRequest | null>(null);
  protected readonly failure = signal({ title: '', text: '' });
  protected readonly busy = computed(() => this.view() === 'busy');
  private readonly key = newKey();

  protected readonly method = computed<DeliveryMethod | null>(
    () => this.options()?.deliveryMethods.find((m) => m.id === this.methodId()) ?? null,
  );
  protected readonly ships = computed(() => this.method()?.kind === 'ship');

  /** Item, shipping and the estimated total; free shipping applies at the shop's threshold. */
  protected readonly estimate = computed(() => {
    const options = this.options();
    const method = this.method();
    if (!options || !method) return null;
    const item = options.product.priceCents * this.data.quantity;
    const threshold = options.freeShippingOverCents;
    const free = method.kind === 'ship' && threshold !== null && item >= threshold;
    const shipping = free ? 0 : method.feeCents;
    return {
      item: money(item),
      shipping: free || shipping === 0 ? 'Free' : money(shipping),
      total: `${money(item + shipping)} + tax`,
    };
  });

  /** "Naomi confirms stock and tells you how to pay, usually within a few hours. Made to order: …" */
  protected readonly sentText = computed(() => {
    const options = this.options();
    if (!options) return '';
    const reply = options.usuallyReplies ? `, usually ${options.usuallyReplies}` : '';
    const lead = options.leadTime ? ` ${options.leadTime}` : '';
    return `${options.ownerFirstName} confirms stock and tells you how to pay${reply}.${lead}`;
  });

  protected readonly unitPrice = (cents: number): string => formatPrice(cents);

  ngOnInit(): void {
    this.api.orderOptions(this.data.shopSlug, this.data.productSlug).subscribe({
      next: (options) => {
        this.options.set(options);
        const first = options.deliveryMethods[0];
        if (!first) {
          this.view.set('unavailable');
          return;
        }
        this.methodId.set(first.id);
        this.address.set(options.lastShippingAddress ?? '');
        this.view.set('form');
      },
      error: () => this.view.set('unavailable'),
    });
  }

  protected pickMethod(id: string): void {
    this.methodId.set(id);
    this.addressProblem.set('');
  }

  protected send(): void {
    if (this.busy()) return;
    const options = this.options();
    const method = this.method();
    if (!options || !method) return;
    this.stockProblem.set('');
    if (method.kind === 'ship' && !POSTAL_CODE.test(this.address())) {
      this.addressProblem.set(ADDRESS_REQUIRED);
      this.view.set('form');
      this.focusFirstInvalid();
      return;
    }
    this.addressProblem.set('');
    this.view.set('busy');
    this.api
      .requestItem({
        listingSlug: this.data.shopSlug,
        productSlug: this.data.productSlug,
        option: this.data.option,
        quantity: this.data.quantity,
        deliveryMethodId: method.id,
        shippingAddress: method.kind === 'ship' ? this.address().trim() : null,
        note: this.note().trim() || null,
        idempotencyKey: this.key,
      })
      .pipe(timeout(SUBMIT_TIMEOUT_MS))
      .subscribe({
        next: (booked) => {
          this.booked.set(booked);
          this.view.set('success');
          // "Send request" is gone with the form, so the focus it held goes to "View request".
          setTimeout(() =>
            this.host.nativeElement.querySelector<HTMLElement>('[cdkFocusInitial]')?.focus(),
          );
        },
        error: (error: unknown) => this.fail(error),
      });
  }

  private fail(error: unknown): void {
    if (error instanceof HttpErrorResponse) {
      const code = (error.error as { code?: string } | null)?.code;
      const errors = (error.error as { errors?: Record<string, string> } | null)?.errors ?? {};
      if (error.status === 422) {
        this.view.set('form');
        if (errors['shippingAddress']) {
          this.addressProblem.set(ADDRESS_REQUIRED);
          this.focusFirstInvalid();
        }
        const stock = errors['quantity'];
        if (stock?.startsWith('ONLY_LEFT:')) {
          this.stockProblem.set(
            `Only ${stock.slice('ONLY_LEFT:'.length)} left. Lower the quantity to continue.`,
          );
        } else if (stock) {
          this.stockProblem.set('That quantity isn’t available. Lower the quantity to continue.');
        }
        return;
      }
      if (error.status === 403 && code === 'EMAIL_UNCONFIRMED') {
        this.failure.set({
          title: 'Confirm your e-mail first',
          text: 'We sent you a link when you joined. Open it, then send your request. What you typed is still here.',
        });
        this.view.set('failed');
        return;
      }
    }
    this.failure.set(error instanceof TimeoutError ? TOO_SLOW : SEND_FAILED);
    this.view.set('failed');
  }

  private focusFirstInvalid(): void {
    setTimeout(() =>
      this.host.nativeElement.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
    );
  }

  protected close(): void {
    if (!this.busy()) this.ref.close();
  }
}

const ADDRESS_REQUIRED = 'Enter the address to ship to, with postal code.';

const SEND_FAILED = {
  title: 'We couldn’t send that',
  text: 'Your connection dropped before it reached us. Nothing was sent and what you typed is still here. Try again.',
};

const TOO_SLOW = {
  title: 'We couldn’t send that',
  text: 'It took too long, so we stopped. Nothing was sent and what you typed is still here. Try again.',
};

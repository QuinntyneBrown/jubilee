import { DialogRef } from '@angular/cdk/dialog';
import { DOCUMENT } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  BagLine,
  BagStore,
  Delivery,
  MERCH_API,
  MerchProduct,
  MerchSize,
  isRateLimited,
  maxQuantity,
  money,
  price,
  shippingCents,
  tryAgainIn,
} from 'api';
import {
  Alert,
  BagLine as BagLineView,
  Button,
  DescriptionItem,
  DescriptionList,
  DialogBody,
  DialogFooter,
  DialogFrame,
  Icon,
  List,
  QuantityStepper,
  RadioGroup,
} from 'components';

/** What the last checkout answered, when it did not open the hosted page (L2-267 AC4 – AC7). */
type Outcome =
  | { kind: 'invalid' }
  | { kind: 'unavailable' }
  | { kind: 'failed'; reference: string }
  | { kind: 'rate-limited'; wait: string };

/**
 * BagDialog (L2-266, L2-267): the bag kept on the device, read again against the API's prices and
 * stock, the delivery, the totals before tax, and "Check out", which sends the lines and goes to
 * the provider's hosted page. Jubilee never sees the card (L2-270 AC1).
 */
@Component({
  selector: 'jb-bag-dialog',
  imports: [
    Alert,
    BagLineView,
    Button,
    DescriptionItem,
    DescriptionList,
    DialogBody,
    DialogFooter,
    DialogFrame,
    Icon,
    List,
    QuantityStepper,
    RadioGroup,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './bag.dialog.html',
})
export class BagDialog implements OnInit {
  private readonly ref = inject(DialogRef);
  private readonly api = inject(MERCH_API);
  private readonly document = inject(DOCUMENT);
  protected readonly bag = inject(BagStore);

  protected readonly product = signal<MerchProduct | null>(null);
  /** The product could not be read again: the totals cannot be shown. */
  protected readonly unchecked = signal(false);
  protected readonly delivery = signal<Delivery>('ship');
  protected readonly busy = signal(false);
  protected readonly outcome = signal<Outcome | null>(null);
  /** Sizes whose price changed since they were added (L2-267 AC4). */
  private readonly repriced = signal<ReadonlySet<string>>(new Set());

  protected readonly money = money;
  protected readonly price = price;

  protected readonly description = computed(() => {
    const count = this.bag.count();
    if (!count) return 'Nothing in it yet.';
    return `${count} shirt${count === 1 ? '' : 's'}. Prices are before tax.`;
  });

  protected readonly deliveries = computed(() => {
    const product = this.product();
    const fee = product ? price(product.shippingCents) : '';
    const free = product ? price(product.freeShippingFromCents) : '';
    return [
      {
        value: 'ship' as Delivery,
        label: 'Ship to me',
        hint: `Canada Post · ${fee}, free from ${free} · 3–5 business days`,
      },
      {
        value: 'pickup' as Delivery,
        label: 'Pick up at the Jubilee gathering in Toronto',
        hint: 'Free · we e-mail you the date and place',
      },
    ];
  });

  protected readonly shipping = computed(() => {
    const product = this.product();
    return product ? shippingCents(product, this.bag.subtotalCents(), this.delivery()) : 0;
  });
  protected readonly total = computed(() => this.bag.subtotalCents() + this.shipping());

  /**
   * Checkout waits while the prices are unread, while it is not open and after too many tries. A
   * line with a problem does not block it: the server says again what to change (L2-267 AC4).
   */
  protected readonly blocked = computed(() => {
    const kind = this.outcome()?.kind;
    return !this.product() || kind === 'unavailable' || kind === 'rate-limited';
  });

  ngOnInit(): void {
    this.check();
  }

  protected close(): void {
    if (!this.busy()) this.ref.close();
  }

  protected size(line: BagLine): MerchSize | null {
    for (const fit of this.product()?.fits ?? []) {
      const size = fit.sizes.find((s) => s.sku === line.sku);
      if (size) return size;
    }
    return null;
  }

  protected max(line: BagLine): number {
    return maxQuantity(this.size(line));
  }

  /** What is wrong with a line, in words (L2-267 AC4). */
  protected problem(line: BagLine): string | null {
    const stock = this.stockProblem(line);
    if (stock) return stock;
    return this.repriced().has(line.sku) ? `The price is now ${money(line.unitPriceCents)}.` : null;
  }

  protected setQuantity(line: BagLine, quantity: number): void {
    this.bag.setQuantity(line.sku, Math.min(quantity, Math.max(line.quantity, this.max(line))));
    this.outcome.set(null);
  }

  protected remove(line: BagLine): void {
    this.bag.remove(line.sku);
    this.outcome.set(null);
  }

  protected chooseDelivery(delivery: Delivery): void {
    this.delivery.set(delivery);
  }

  /** L2-267 AC1: sends the lines and goes to the provider's hosted page. */
  protected checkout(): void {
    if (this.busy() || this.blocked()) return;
    this.busy.set(true);
    this.outcome.set(null);
    this.api
      .checkout({
        lines: this.bag.lines().map((l) => ({
          sku: l.sku,
          quantity: l.quantity,
          unitPriceCents: l.unitPriceCents,
        })),
        delivery: this.delivery(),
      })
      .subscribe({
        next: ({ url }) => this.document.location.assign(url),
        error: (error: unknown) => {
          this.busy.set(false);
          this.failed(error);
        },
      });
  }

  private failed(error: unknown): void {
    if (isRateLimited(error)) {
      this.outcome.set({ kind: 'rate-limited', wait: tryAgainIn(error) });
      return;
    }
    if (error instanceof HttpErrorResponse && error.status === 422) {
      this.outcome.set({ kind: 'invalid' });
      this.check((error.error?.errors ?? {}) as Record<string, string>);
      return;
    }
    if (error instanceof HttpErrorResponse && error.error?.code === 'checkout_unavailable') {
      this.outcome.set({ kind: 'unavailable' });
      return;
    }
    this.outcome.set({ kind: 'failed', reference: 'JB-MERCH-503' });
  }

  /**
   * L2-266 AC4: the prices and what is left are read again; a size that is gone is dropped. After a
   * 422, what the server said is left is what the bag shows (L2-267 AC4).
   */
  private check(errors: Record<string, string> = {}): void {
    this.api.product().subscribe({
      next: (product) => {
        this.product.set(withLeft(product, this.saidLeft(errors)));
        this.unchecked.set(false);
        const repriced = new Set(this.repriced());
        for (const line of this.bag.lines()) {
          if (!this.size(line)) {
            this.bag.remove(line.sku);
          } else if (line.unitPriceCents !== product.unitPriceCents) {
            this.bag.reprice(line.sku, product.unitPriceCents);
            repriced.add(line.sku);
          }
        }
        this.repriced.set(repriced);
      },
      error: () => this.unchecked.set(true),
    });
  }

  /** `ONLY_LEFT:n` and `SOLD_OUT` per line, as the left of its size. */
  private saidLeft(errors: Record<string, string>): Map<string, number> {
    const lines = this.bag.lines();
    const left = new Map<string, number>();
    for (const [key, code] of Object.entries(errors)) {
      const line = lines[Number(/^lines\[(\d+)\]\.quantity$/.exec(key)?.[1] ?? -1)];
      if (!line) continue;
      if (code === 'SOLD_OUT') left.set(line.sku, 0);
      const only = /^ONLY_LEFT:(\d+)$/.exec(code);
      if (only) left.set(line.sku, Number(only[1]));
    }
    return left;
  }

  private stockProblem(line: BagLine): string | null {
    const size = this.size(line);
    if (!size || size.left === null) return null;
    const name = `${line.fit} ${line.size}`;
    if (size.left === 0) return `${name} is sold out. Remove it to check out.`;
    if (line.quantity > size.left) {
      return `Only ${size.left} left in ${name}. Lower the quantity to check out.`;
    }
    return null;
  }
}

/** The product with the `left` the server said for some sizes. */
function withLeft(product: MerchProduct, left: ReadonlyMap<string, number>): MerchProduct {
  if (!left.size) return product;
  return {
    ...product,
    fits: product.fits.map((fit) => ({
      ...fit,
      sizes: fit.sizes.map((s) => (left.has(s.sku) ? { ...s, left: left.get(s.sku)! } : s)),
    })),
  };
}

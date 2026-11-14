import { Dialog } from '@angular/cdk/dialog';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  BagStore,
  LoadState,
  MERCH_API,
  MerchFitKey,
  MerchProduct,
  errorReference,
  maxQuantity,
  price,
} from 'api';
import {
  Accordion,
  AccordionItem,
  AddToBag,
  BackLink,
  BagButton,
  Button,
  EmptyState,
  Icon,
  MerchHead,
  MerchStory,
  QuantityStepper,
  SegmentedChoice,
  SizeChoice,
  SizePicker,
  Skeleton,
  TeeGallery,
  TeeView,
} from 'components';
import { BagDialog } from '../../dialogs/bag/bag.dialog';

/**
 * PurposeTeePage (L2-263 – L2-265): Jubilee's own shirt. The buyer chooses the view, the fit, the
 * size and the quantity and adds it to the bag kept on the device; every price and count is the
 * API's (L2-263 AC5). Open to anyone, signed in or not.
 */
@Component({
  selector: 'jb-purpose-tee-page',
  imports: [
    Accordion,
    AccordionItem,
    AddToBag,
    BackLink,
    BagButton,
    Button,
    EmptyState,
    Icon,
    MerchHead,
    MerchStory,
    QuantityStepper,
    RouterLink,
    SegmentedChoice,
    SizePicker,
    Skeleton,
    TeeGallery,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'jb-page container page' },
  templateUrl: './purpose-tee.page.html',
})
export class PurposeTeePage implements OnInit {
  private readonly api = inject(MERCH_API);
  private readonly dialog = inject(Dialog);
  protected readonly bag = inject(BagStore);
  private readonly sizePicker = viewChild(SizePicker);

  protected readonly state = signal<LoadState<MerchProduct>>({ status: 'loading' });
  protected readonly view = signal<TeeView>('front');
  protected readonly fitKey = signal<MerchFitKey>('mens');
  protected readonly sizeLabel = signal<string | null>('L');
  protected readonly quantity = signal(1);
  protected readonly guideOpen = signal(false);
  protected readonly nudge = signal(false);
  /** What was just added ("Men’s L · Black"), until the choice changes (L2-265 AC4). */
  protected readonly added = signal<string | null>(null);

  protected readonly price = price;

  protected readonly product = computed(() => {
    const current = this.state();
    return current.status === 'loaded' ? current.value : null;
  });
  protected readonly fits = computed(
    () => this.product()?.fits.map((f) => ({ value: f.key, label: f.name })) ?? [],
  );
  protected readonly fit = computed(
    () => this.product()?.fits.find((f) => f.key === this.fitKey()) ?? null,
  );
  protected readonly sizes = computed<SizeChoice[]>(
    () =>
      this.fit()?.sizes.map((s) => ({
        value: s.label,
        label: s.label,
        ages: s.ages,
        soldOut: s.left === 0,
      })) ?? [],
  );
  protected readonly size = computed(
    () => this.fit()?.sizes.find((s) => s.label === this.sizeLabel()) ?? null,
  );
  protected readonly max = computed(() => maxQuantity(this.size()));
  protected readonly soldOut = computed(
    () => !!this.fit() && this.fit()!.sizes.every((s) => s.left === 0),
  );

  /** The line under the sizes (L2-264 AC4, AC6). */
  protected readonly status = computed(() => {
    const fit = this.fit();
    if (!fit) return null;
    if (this.soldOut()) return `Every ${fit.name} size is sold out. Choose another fit.`;
    const size = this.size();
    if (!size) return null;
    if (size.left !== null && size.left <= 3) {
      return `Only ${size.left} left in ${fit.name} ${size.label}.`;
    }
    return `${fit.name} ${size.label}: ${size.chest}″ chest, ${size.length}″ long.`;
  });

  protected readonly guide = computed(
    () =>
      this.fit()?.sizes.map((s) => ({
        label: s.label,
        ages: s.ages,
        chest: s.chest,
        length: s.length,
      })) ?? [],
  );
  protected readonly guideCaption = computed(() => {
    const fit = this.fit();
    return fit ? `${fit.name}, garment laid flat, in inches. ${fit.guideNote}` : null;
  });

  protected readonly amount = computed(() =>
    price((this.product()?.unitPriceCents ?? 0) * this.quantity()),
  );

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.state.set({ status: 'loading' });
    this.api.product().subscribe({
      next: (value) => {
        this.state.set({ status: 'loaded', value });
        this.keepSellableSize();
      },
      error: (error: unknown) =>
        this.state.set({ status: 'error', reference: errorReference(error, 'JB-MERCH-503') }),
    });
  }

  /** L2-264 AC2: the size is kept when the new fit has it and can sell it. */
  protected chooseFit(key: string): void {
    this.fitKey.set(key as MerchFitKey);
    this.keepSellableSize();
    this.changed();
  }

  protected chooseSize(label: string): void {
    this.sizeLabel.set(label);
    this.nudge.set(false);
    this.quantity.update((q) => Math.min(q, this.max()));
    this.changed();
  }

  protected setQuantity(quantity: number): void {
    this.quantity.set(Math.max(1, Math.min(quantity, this.max())));
    this.changed();
  }

  /** L2-265 AC2, AC3. */
  protected add(): void {
    const product = this.product();
    const fit = this.fit();
    const size = this.size();
    if (!product || !fit) return;
    if (!size || size.left === 0) {
      this.nudge.set(true);
      this.sizePicker()?.focusFirst();
      return;
    }
    this.bag.add(
      {
        sku: size.sku,
        fit: fit.name,
        size: size.label,
        quantity: this.quantity(),
        unitPriceCents: product.unitPriceCents,
      },
      maxQuantity(size),
    );
    this.added.set(`${fit.name} ${size.label} · ${product.colour}`);
  }

  /** The bag (L2-266); focus returns to what opened it (AC5). */
  protected openBag(): void {
    this.dialog.open(BagDialog, {
      ariaLabelledBy: 'dlg-title',
      ariaDescribedBy: 'dlg-desc',
      ariaModal: true,
      backdropClass: 'backdrop',
      restoreFocus: true,
    });
  }

  private keepSellableSize(): void {
    const size = this.size();
    if (!size || size.left === 0) this.sizeLabel.set(null);
    this.quantity.update((q) => Math.min(q, this.max()));
  }

  private changed(): void {
    this.added.set(null);
  }
}

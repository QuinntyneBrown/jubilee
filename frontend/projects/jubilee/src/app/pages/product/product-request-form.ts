import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  input,
  linkedSignal,
  output,
  viewChild,
  viewChildren,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProductPage } from 'api';
import { Icon } from 'components';

/** A valid selection, handed to the order request (L2-035 AC2). */
export interface ProductSelection {
  option: string | null;
  quantity: number;
}

/**
 * The option, quantity and "Request this item" of a product page (L2-035 AC2, AC3). It checks
 * the selection before a request starts: an option must be chosen, and the quantity is a whole
 * number from the minimum order quantity to the bound of the chosen option. A sold-out product
 * disables both and offers "Tell me when it's back" in place of the request (L2-036 AC1).
 */
@Component({
  selector: 'jb-product-request-form',
  imports: [RouterLink, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: contents' },
  templateUrl: './product-request-form.html',
})
export class ProductRequestForm {
  readonly product = input.required<ProductPage>();
  /** The member has an open back-in-stock alert for this product (L2-036 AC2). */
  readonly alertRequested = input(false);
  readonly requested = output<ProductSelection>();
  /** "Tell me when it's back" was pressed; the button is where focus returns to. */
  readonly alertAsked = output<HTMLElement>();

  // Another product starts again: nothing chosen, at its minimum order quantity, no errors.
  protected readonly chosen = linkedSignal<ProductPage, string | null>({
    source: this.product,
    computation: () => null,
  });
  protected readonly quantity = linkedSignal(() => String(this.product().minimumQuantity));
  protected readonly optionError = linkedSignal<ProductPage, string | null>({
    source: this.product,
    computation: () => null,
  });
  protected readonly quantityError = linkedSignal<ProductPage, string | null>({
    source: this.product,
    computation: () => null,
  });

  private readonly optionInputs = viewChildren<ElementRef<HTMLInputElement>>('optionInput');
  private readonly quantityInput = viewChild<ElementRef<HTMLInputElement>>('quantityInput');

  /** The bound of the chosen option, or before one is chosen the largest of them. */
  protected readonly max = computed(() => {
    const product = this.product();
    const option = product.options.find((o) => o.label === this.chosen());
    return option?.maxQuantity ?? product.maxQuantity;
  });

  protected choose(label: string): void {
    this.chosen.set(label);
    this.optionError.set(null);
  }

  protected submit(): void {
    const product = this.product();
    const needsOption = product.options.length > 0 && this.chosen() === null;
    this.optionError.set(
      needsOption ? `Choose a ${(product.optionName ?? 'option').toLowerCase()}.` : null,
    );
    const quantity = this.checkQuantity();

    if (needsOption) {
      this.optionInputs()[0]?.nativeElement.focus();
      return;
    }
    if (quantity === null) {
      this.quantityInput()?.nativeElement.focus();
      return;
    }
    this.requested.emit({ option: this.chosen(), quantity });
  }

  /** The quantity, or null after showing why it cannot be requested. */
  private checkQuantity(): number | null {
    const text = this.quantity().trim();
    const value = /^\d+$/.test(text) ? Number(text) : NaN;
    const max = this.max();
    const minimum = this.product().minimumQuantity;
    let error: string | null = null;
    if (!(value >= 1 && value <= max)) error = `Choose a number from 1 to ${max}.`;
    else if (value < minimum) error = `This item has a minimum of ${minimum}.`;
    this.quantityError.set(error);
    return error ? null : value;
  }
}

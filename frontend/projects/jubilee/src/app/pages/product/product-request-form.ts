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
 * number from the minimum order quantity to the bound of the chosen option.
 */
@Component({
  selector: 'jb-product-request-form',
  imports: [RouterLink, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: contents' },
  template: `
    @let item = product();
    @if (item.options.length) {
      <fieldset [attr.aria-describedby]="optionError() ? 'option-error' : null">
        <legend>{{ item.optionName }}</legend>
        <div class="cluster" style="gap: var(--space-2)">
          @for (option of item.options; track option.label) {
            <label class="chip" style="position: relative"
              ><input
                #optionInput
                type="radio"
                name="option"
                class="visually-hidden"
                [value]="option.label"
                [checked]="chosen() === option.label"
                [disabled]="item.soldOut"
                (change)="choose(option.label)"
              />{{ option.label }}</label
            >
          }
        </div>
        @if (optionError(); as error) {
          <span class="field__error" id="option-error">{{ error }}</span>
        }
      </fieldset>
    }
    <div class="field" style="max-width: 8rem">
      <label class="field__label" for="qty">Quantity</label>
      <input
        #quantityInput
        class="input"
        id="qty"
        type="number"
        inputmode="numeric"
        [min]="item.minimumQuantity"
        [max]="max()"
        [value]="quantity()"
        [disabled]="item.soldOut"
        [attr.aria-invalid]="quantityError() ? 'true' : null"
        [attr.aria-describedby]="quantityError() ? 'qty-error' : null"
        (input)="quantity.set(quantityInput.value)"
      />
      @if (quantityError(); as error) {
        <span class="field__error" id="qty-error">{{ error }}</span>
      }
    </div>
    <ng-content select="[slot=status]" />
    <div class="detail-head__actions">
      @if (item.soldOut) {
        <ng-content select="[slot=sold-out-action]" />
      } @else {
        <button class="btn btn--primary btn--lg" type="button" (click)="submit()">
          <svg jb-icon name="bag"></svg>Request this item
        </button>
      }
      <a
        class="btn btn--icon btn--lg"
        [routerLink]="['/b', item.shop.slug, 'message']"
        [attr.aria-label]="'Message ' + item.shop.name"
        style="width: var(--control-height-lg)"
        ><svg jb-icon name="message"></svg
      ></a>
    </div>
  `,
})
export class ProductRequestForm {
  readonly product = input.required<ProductPage>();
  readonly requested = output<ProductSelection>();

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

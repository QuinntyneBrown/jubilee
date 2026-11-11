import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, ElementRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DraftItem, ItemPriceKind, OfferKind } from 'api';
import { Icon, Button, Field, FieldControl } from 'components';

export interface ListingItemData {
  kind: OfferKind;
}

/** "185.00", "185" or "$1,185.50" as cents; null when it is not an amount above zero. */
export function centsOf(text: string): number | null {
  const cleaned = text.replace(/[$,\s]/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const cents = Math.round(Number(cleaned) * 100);
  return cents > 0 ? cents : null;
}

/**
 * ListingItemDialog (L2-073): adds a product or a service to the listing being written. It holds
 * the first fields of the product and service editors of a later journey; the item is kept in the
 * draft and is not public until the listing is verified.
 */
@Component({
  selector: 'jb-listing-item-dialog',
  imports: [FormsModule, Icon, Button, Field, FieldControl],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'dialog', '(click)': 'closeIfOutside($event)' },
  templateUrl: './listing-item.dialog.html',
})
export class ListingItemDialog {
  private readonly ref = inject<DialogRef<DraftItem | undefined>>(DialogRef);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly data = inject<ListingItemData>(DIALOG_DATA);

  protected readonly isService = this.data.kind === 'services';
  protected readonly name = signal('');
  protected readonly detail = signal('');
  protected readonly pricing = signal<ItemPriceKind>(this.isService ? 'ask' : 'amount');
  protected readonly price = signal('');
  protected readonly nameProblem = signal('');
  protected readonly priceProblem = signal('');

  protected add(): void {
    const name = this.name().trim();
    const kind = this.isService ? this.pricing() : 'amount';
    const cents = kind === 'amount' ? centsOf(this.price()) : null;
    this.nameProblem.set(name ? '' : `Enter the ${this.isService ? 'service' : 'product'} name.`);
    this.priceProblem.set(kind === 'amount' && cents === null ? 'Enter a price, like 24.00.' : '');
    if (this.nameProblem() || this.priceProblem()) {
      setTimeout(() =>
        this.host.nativeElement.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
      );
      return;
    }
    this.ref.close({
      name,
      detail: this.isService ? this.detail().trim() || null : null,
      priceKind: kind,
      priceCents: cents,
    });
  }

  protected close(): void {
    this.ref.close(undefined);
  }

  protected closeIfOutside(event: Event): void {
    if (event.target === event.currentTarget) this.close();
  }
}

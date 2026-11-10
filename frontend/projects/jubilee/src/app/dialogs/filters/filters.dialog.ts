import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  AREAS,
  AreaServed,
  CategoryFilters,
  DIRECTORY_API,
  ListingSort,
  OFFERS,
  OfferFilter,
  SORTS,
} from 'api';
import { CountPipe, Icon } from 'components';
import { Subscription } from 'rxjs';

export interface FiltersDialogData {
  slug: string;
  filters: CategoryFilters;
  sort: ListingSort;
  /** How many businesses the applied filters show, so the button has a count at once. */
  count: number;
}

/** What the member chose; absent when the sheet was closed without applying. */
export interface FiltersDialogResult {
  filters: CategoryFilters;
  sort: ListingSort;
}

/**
 * FiltersDialog (L2-024): the filters of a category as a sheet, used under 768 px. The boxes
 * change a draft; the primary button shows how many businesses the draft matches and applies
 * it. Closing the sheet any other way changes nothing.
 */
@Component({
  selector: 'jb-filters-dialog',
  imports: [CountPipe, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // The kit's `.dialog` fills the viewport and places the panel; a press outside the panel
  // closes the sheet, as a press on the backdrop does.
  host: { class: 'dialog', '(click)': 'closeIfOutside($event)' },
  templateUrl: './filters.dialog.html',
})
export class FiltersDialog {
  private readonly api = inject(DIRECTORY_API);
  private readonly ref = inject<DialogRef<FiltersDialogResult>>(DialogRef);
  private readonly data = inject<FiltersDialogData>(DIALOG_DATA);
  private counting?: Subscription;

  protected readonly offerOptions = OFFERS;
  protected readonly areaOptions = AREAS;
  protected readonly sortOptions = SORTS;

  protected readonly offers = signal<OfferFilter[]>(this.data.filters.offers);
  protected readonly areas = signal<AreaServed[]>(this.data.filters.areas);
  protected readonly sort = signal<ListingSort>(this.data.sort);
  protected readonly count = signal(this.data.count);

  protected toggleOffer(value: OfferFilter, on: boolean): void {
    this.offers.update((list) => (on ? [...list, value] : list.filter((v) => v !== value)));
    this.recount();
  }

  protected toggleArea(value: AreaServed, on: boolean): void {
    this.areas.update((list) => (on ? [...list, value] : list.filter((v) => v !== value)));
    this.recount();
  }

  protected clearAll(): void {
    this.offers.set([]);
    this.areas.set([]);
    this.recount();
  }

  protected setSort(value: string): void {
    this.sort.set(value as ListingSort);
  }

  protected apply(): void {
    this.ref.close({
      filters: { offers: this.offers(), areas: this.areas() },
      sort: this.sort(),
    });
  }

  protected closeIfOutside(event: Event): void {
    if (event.target === event.currentTarget) this.close();
  }

  protected close(): void {
    this.ref.close();
  }

  private recount(): void {
    this.counting?.unsubscribe();
    this.counting = this.api
      .countCategory(this.data.slug, { offers: this.offers(), areas: this.areas() })
      // A failed count keeps the last number; applying still shows the true result.
      .subscribe({ next: (count) => this.count.set(count), error: () => undefined });
  }
}

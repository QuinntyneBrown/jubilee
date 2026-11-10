import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { formatServicePrice } from '../format/format';

/** What a service row shows (L2-033 AC2). */
export interface ServiceRowView {
  id: string;
  name: string;
  detail: string;
  priceKind: 'free' | 'amount' | 'ask';
  priceCents: number | null;
  action: 'book' | 'ask';
}

/**
 * One row of "Services" or "Custom work": name, short detail, price and the action that opens
 * the booking or quote request for that service.
 * `<li jb-service-row [service]="s" [actionLink]="['/b', slug, 'book']"></li>`
 */
@Component({
  selector: 'li[jb-service-row]',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'row' },
  templateUrl: './service-row.html',
})
export class ServiceRow {
  readonly service = input.required<ServiceRowView>();
  /** Where the action leads; the service's id is added as `?service=`. */
  readonly actionLink = input.required<readonly string[]>();
  protected readonly price = computed(() =>
    formatServicePrice(this.service().priceKind, this.service().priceCents),
  );
  protected readonly label = computed(() => (this.service().action === 'book' ? 'Book' : 'Ask'));
}

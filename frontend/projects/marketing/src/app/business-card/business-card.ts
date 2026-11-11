import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MarketingBusiness } from '../content';

/**
 * A photo card for a business on the marketing page:
 * `<a jb-marketing-business-card [business]="business" href="…"></a>`.
 */
@Component({
  selector: 'a[jb-marketing-business-card]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'mkt-card', '[class.mkt-card--featured]': 'featured()' },
  templateUrl: './business-card.html',
})
export class MarketingBusinessCard {
  readonly business = input.required<MarketingBusiness>();
  readonly featured = input(false, { transform: booleanAttribute });
}

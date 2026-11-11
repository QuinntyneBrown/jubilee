import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon } from '../icon/icon';

/** What a photo business card shows. */
export interface PhotoBusinessCardView {
  name: string;
  tagline: string;
  /** The label on the photo: "Shop", or the first word of the category. */
  tag: string;
  highlight?: string;
  /** The address of the photo. It is decorative: the name beside it says who it is. */
  photo: string;
}

/**
 * The business card with a photo, as the marketing site draws a business:
 * `<a jb-photo-business-card [business]="business" href="…"></a>`. `featured` is the large
 * card that leads a `jb-photo-card-grid`. Every business shown is verified, and the card says so
 * in words beside the check.
 */
@Component({
  selector: 'a[jb-photo-business-card]',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'mkt-card', '[class.mkt-card--featured]': 'featured()' },
  templateUrl: './photo-business-card.html',
  styleUrl: './photo-business-card.scss',
})
export class PhotoBusinessCard {
  readonly business = input.required<PhotoBusinessCardView>();
  readonly featured = input(false, { transform: booleanAttribute });
}

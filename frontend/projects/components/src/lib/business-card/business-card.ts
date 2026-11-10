import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { categoryTile } from '../media-tile/category-tile';
import { MediaTile } from '../media-tile/media-tile';
import { VerifiedMark } from '../verified-mark/verified-mark';

/** What a business card shows (L2-027). */
export interface BusinessCardView {
  name: string;
  tagline: string;
  highlight: string | null;
  categorySlug: string;
  verified: boolean;
}

/**
 * The business card: `<a jb-business-card [business]="b" [routerLink]="['/b', b.slug]"></a>`.
 * The name wraps and is never truncated; the kit clamps the tagline to two lines.
 */
@Component({
  selector: 'a[jb-business-card]',
  imports: [MediaTile, VerifiedMark],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'biz-card' },
  templateUrl: './business-card.html',
})
export class BusinessCard {
  readonly business = input.required<BusinessCardView>();
  protected readonly tile = computed(() => categoryTile(this.business().categorySlug));
}

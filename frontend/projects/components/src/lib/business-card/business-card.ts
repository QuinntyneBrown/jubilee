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
  template: `
    <div jb-media-tile [tint]="tile().tint" [icon]="tile().icon" [tag]="tile().label"></div>
    <h3 class="biz-card__name">{{ business().name }}</h3>
    <p class="biz-card__tagline">{{ business().tagline }}</p>
    <p class="biz-card__meta">
      @if (business().highlight; as highlight) {
        <span class="perk">{{ highlight }}</span>
      }
      @if (business().verified) {
        <span jb-verified-mark></span>
      }
    </p>
  `,
})
export class BusinessCard {
  readonly business = input.required<BusinessCardView>();
  protected readonly tile = computed(() => categoryTile(this.business().categorySlug));
}

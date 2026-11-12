import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconName } from '../icon/icons';
import { TileTint } from '../media-tile/category-tile';
import { MediaTile } from '../media-tile/media-tile';
import { Price } from '../price/price';
import { RatingInline } from '../rating-inline/rating-inline';

/**
 * What a product card shows (L2-027): photo or tile, product name, shop name and price, and
 * "Sold out" on the tile of a sold-out product (L2-034 AC3).
 */
export interface ProductCardView {
  name: string;
  shopName: string;
  priceCents: number;
  perUnit: boolean;
  tile: { tint: TileTint; icon: IconName };
  soldOut?: boolean;
  /** The average and count from three reviews; absent below three (L2-230). */
  rating?: { average: number; count: number } | null;
}

/** The product card: `<a jb-product-card [product]="p" [routerLink]="…"></a>`. */
@Component({
  selector: 'a[jb-product-card]',
  imports: [MediaTile, Price, RatingInline],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'biz-card product-card' },
  templateUrl: './product-card.html',
  styleUrl: './product-card.scss',
})
export class ProductCard {
  readonly product = input.required<ProductCardView>();
  /** False on the shop's own pages, where the shop's name goes without saying. */
  readonly showShop = input(true);
}

import { Injectable } from '@angular/core';
import { ListingKind } from 'api';

/**
 * What the app has learnt of each listing's layout from the lists it showed, so a listing page
 * can name a shop as a shop while it loads or fails to load (L2-034 AC4). A listing in Shops
 * starts as a shop; the listing page itself has the last word once it arrives.
 */
@Injectable({ providedIn: 'root' })
export class ListingKindHints {
  private readonly kinds = new Map<string, ListingKind>();

  /** Remembers listings seen in a list, by their category. */
  rememberCategory(listings: readonly { slug: string }[], categorySlug: string): void {
    for (const listing of listings) {
      this.kinds.set(listing.slug, categorySlug === 'shops' ? 'shop' : 'services');
    }
  }

  remember(slug: string, kind: ListingKind): void {
    this.kinds.set(slug, kind);
  }

  /** The layout the listing is known to have; a listing never seen loads as a business. */
  kindOf(slug: string): ListingKind {
    return this.kinds.get(slug) ?? 'services';
  }
}

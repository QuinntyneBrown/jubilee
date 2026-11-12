import { Injectable } from '@angular/core';
import { ListingKind } from 'api';

/**
 * What the app has learnt of listings and products from the lists it showed, so a page can
 * name what it is opening while it loads or fails to load (L2-034 AC4, L2-118). A listing in
 * Shops starts as a shop; each page has the last word once it arrives.
 */
@Injectable({ providedIn: 'root' })
export class ListingHints {
  private readonly kinds = new Map<string, ListingKind>();
  private readonly names = new Map<string, string>();

  /** Remembers listings seen in a list, by their category. */
  rememberCategory(
    listings: readonly { slug: string; name: string }[],
    categorySlug: string,
  ): void {
    for (const listing of listings) {
      this.remember(listing.slug, categorySlug === 'shops' ? 'shop' : 'services', listing.name);
    }
  }

  /** Remembers spaces seen on the rooms shelf, in Rooms & rentals or in search. */
  rememberSpaces(spaces: readonly { slug: string; name: string }[]): void {
    for (const space of spaces) this.remember(space.slug, 'space', space.name);
  }

  remember(slug: string, kind: ListingKind, name: string): void {
    this.kinds.set(slug, kind);
    this.names.set(slug, name);
  }

  /** Remembers products seen on cards, with their shops. */
  rememberProducts(
    products: readonly { slug: string; businessSlug: string; name: string; shopName: string }[],
  ): void {
    for (const product of products) {
      this.remember(product.businessSlug, 'shop', product.shopName);
      this.names.set(`${product.businessSlug}/${product.slug}`, product.name);
    }
  }

  /** The layout the listing is known to have; a listing never seen loads as a business. */
  kindOf(slug: string): ListingKind {
    return this.kinds.get(slug) ?? 'services';
  }

  nameOf(slug: string): string | null {
    return this.names.get(slug) ?? null;
  }

  productNameOf(slug: string, product: string): string | null {
    return this.names.get(`${slug}/${product}`) ?? null;
  }
}

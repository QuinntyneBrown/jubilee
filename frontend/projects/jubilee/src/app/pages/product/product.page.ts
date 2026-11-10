import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LISTINGS_API, ProductPage as ProductPageModel } from 'api';
import { EmptyState, Icon, MediaTile, PricePipe, ProductCard } from 'components';
import { Subscription } from 'rxjs';
import { ListingHints } from '../../services/listing-hints';
import { LoadState, errorReference } from '../../services/load-state';
import { ProductRequestForm, ProductSelection } from './product-request-form';

/**
 * The product page at /b/:slug/p/:product (L2-035): the product with its options, quantity and
 * "Request this item", its details and "More from {shop}". The request itself opens on the
 * order request route of a later journey (ADR 0007).
 */
@Component({
  selector: 'jb-product-page',
  imports: [RouterLink, EmptyState, Icon, MediaTile, PricePipe, ProductCard, ProductRequestForm],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'jb-page container page' },
  templateUrl: './product.page.html',
})
export class ProductPage {
  private readonly api = inject(LISTINGS_API);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly title = inject(Title);
  private readonly hints = inject(ListingHints);
  private request?: Subscription;

  protected readonly slug = signal('');
  protected readonly productSlug = signal('');
  protected readonly state = signal<LoadState<ProductPageModel>>({ status: 'loading' });

  /** The shop's name, known before the product loads when it was reached from a list. */
  protected readonly shopName = computed(() => {
    const state = this.state();
    return state.status === 'loaded' ? state.value.shop.name : this.hints.nameOf(this.slug());
  });

  protected readonly productName = computed(() => {
    const state = this.state();
    return state.status === 'loaded'
      ? state.value.name
      : this.hints.productNameOf(this.slug(), this.productSlug());
  });

  constructor() {
    const params = this.route.paramMap.subscribe((map) => {
      this.slug.set(map.get('slug') ?? '');
      this.productSlug.set(map.get('product') ?? '');
      this.load();
    });
    inject(DestroyRef).onDestroy(() => {
      params.unsubscribe();
      this.request?.unsubscribe();
    });
  }

  protected load(): void {
    this.request?.unsubscribe();
    this.state.set({ status: 'loading' });
    this.request = this.api.getProduct(this.slug(), this.productSlug()).subscribe({
      next: (product) => {
        this.hints.remember(product.shop.slug, 'shop', product.shop.name);
        this.hints.rememberProducts(product.more);
        this.state.set({ status: 'loaded', value: product });
        this.title.setTitle(`${product.name} · Jubilee`);
      },
      error: (error: unknown) => {
        // A product that is missing or of a shop that is not public is the not-found page.
        if (error instanceof HttpErrorResponse && error.status === 404) {
          void this.router.navigate(['/404'], { skipLocationChange: true });
          return;
        }
        this.state.set({ status: 'error', reference: errorReference(error, 'JB-PRD-503') });
      },
    });
  }

  /** Hands a valid selection to the order request (journey 9; ADR 0007). */
  protected startRequest(selection: ProductSelection): void {
    void this.router.navigate(['/b', this.slug(), 'p', this.productSlug(), 'request'], {
      queryParams: { option: selection.option ?? undefined, quantity: selection.quantity },
    });
  }
}

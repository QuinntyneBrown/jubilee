import { Dialog } from '@angular/cdk/dialog';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LISTINGS_API, ProductPage as ProductPageModel } from 'api';
import { EmptyState, Icon, MediaTile, PricePipe, ProductCard } from 'components';
import { Subscription } from 'rxjs';
import { RequestItemData, RequestItemDialog } from '../../dialogs/request-item/request-item.dialog';
import {
  SignInRequiredData,
  SignInRequiredDialog,
} from '../../dialogs/sign-in-required/sign-in-required.dialog';
import { ListingHints } from '../../services/listing-hints';
import { LoadState, errorReference } from '../../services/load-state';
import { SessionService } from '../../services/session.service';
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
  private readonly session = inject(SessionService);
  private readonly dialog = inject(Dialog);
  private request?: Subscription;
  private composeRef?: { close: () => void };
  private readonly requesting = signal(false);

  protected readonly slug = signal('');
  protected readonly productSlug = signal('');
  protected readonly state = signal<LoadState<ProductPageModel>>({ status: 'loading' });
  protected readonly alertRequested = signal(false);

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
    const urls = this.route.url.subscribe((segments) =>
      this.requesting.set(segments.length === 5 && segments[4].path === 'request'),
    );
    effect(() => {
      const state = this.state();
      const requesting = this.requesting();
      untracked(() => {
        if (requesting && state.status === 'loaded' && !this.composeRef) {
          this.openOrder(state.value);
        }
        if (!requesting) this.composeRef?.close();
      });
    });
    inject(DestroyRef).onDestroy(() => {
      urls.unsubscribe();
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
        this.alertRequested.set(product.stockAlertRequested);
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

  /**
   * "Tell me when it's back" (L2-036 AC2): a member's alert is saved and the status takes the
   * button's place; a visitor is asked to join or sign in first (L2-012).
   */
  protected askForAlert(product: ProductPageModel, button: HTMLElement): void {
    if (!this.session.member()) {
      this.dialog.open<void, SignInRequiredData>(SignInRequiredDialog, {
        data: { title: 'Join to be told when it’s back', returnUrl: this.router.url },
        ariaLabelledBy: 'dlg-title',
        ariaDescribedBy: 'dlg-desc',
        ariaModal: true,
        backdropClass: 'backdrop',
        restoreFocus: button,
      });
      return;
    }
    this.api.requestStockAlert(product.id).subscribe({
      next: () => this.alertRequested.set(true),
    });
  }

  /**
   * "Request this item" (L2-046): a member asks the shop in a dialog over the product; a visitor
   * is asked to join or sign in first and comes back to the same selection.
   */
  private openOrder(product: ProductPageModel): void {
    const query = this.route.snapshot.queryParamMap;
    const option = query.get('option');
    const quantity = Number(query.get('quantity')) || product.minimumQuantity;
    const back = this.router.url;
    const leave = (): void => {
      this.composeRef = undefined;
      setTimeout(() => {
        if (!this.router.getCurrentNavigation() && this.requesting()) {
          void this.router.navigate(['/b', this.slug(), 'p', this.productSlug()], {
            replaceUrl: true,
          });
        }
      });
    };
    const ref = this.session.member()
      ? this.dialog.open<void, RequestItemData>(RequestItemDialog, {
          data: { shopSlug: this.slug(), productSlug: this.productSlug(), option, quantity },
          ariaLabelledBy: 'dlg-title',
          ariaDescribedBy: 'dlg-desc',
          ariaModal: true,
          backdropClass: 'backdrop',
        })
      : this.dialog.open<void, SignInRequiredData>(SignInRequiredDialog, {
          data: { title: `Join to request ${product.name}`, returnUrl: back },
          ariaLabelledBy: 'dlg-title',
          ariaDescribedBy: 'dlg-desc',
          ariaModal: true,
          backdropClass: 'backdrop',
        });
    this.composeRef = ref;
    ref.closed.subscribe(leave);
  }

  /** Hands a valid selection to the order request (journey 9; ADR 0007). */
  protected startRequest(selection: ProductSelection): void {
    void this.router.navigate(['/b', this.slug(), 'p', this.productSlug(), 'request'], {
      queryParams: { option: selection.option ?? undefined, quantity: selection.quantity },
    });
  }
}

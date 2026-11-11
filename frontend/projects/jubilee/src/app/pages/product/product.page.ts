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
import {
  EmptyState,
  Icon,
  MediaTile,
  PricePipe,
  ProductCard,
  Button,
  Skeleton,
  DetailHead,
  DetailHeadKicker,
  Section,
  Breadcrumb,
  BreadcrumbItem,
} from 'components';
import { Subscription } from 'rxjs';
import { RequestItemData, RequestItemDialog } from '../../dialogs/request-item/request-item.dialog';
import {
  SignInRequiredData,
  SignInRequiredDialog,
} from '../../dialogs/sign-in-required/sign-in-required.dialog';
import { ListingHints } from '../../services/listing-hints';
import { LoadState, errorReference } from '../../services/load-state';
import { SavedStore } from '../../services/saved.store';
import { PendingActionService } from '../../services/pending-action.service';
import { SessionService } from '../../services/session.service';
import { ProductRequestForm, ProductSelection } from './product-request-form';

/**
 * The product page at /b/:slug/p/:product (L2-035): the product with its options, quantity and
 * "Request this item", its details and "More from {shop}". The request itself opens on the
 * order request route of a later journey (ADR 0007).
 */
@Component({
  selector: 'jb-product-page',
  imports: [
    RouterLink,
    EmptyState,
    Icon,
    MediaTile,
    PricePipe,
    ProductCard,
    ProductRequestForm,
    Button,
    Skeleton,
    DetailHead,
    DetailHeadKicker,
    Section,
    Breadcrumb,
  ],
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
  private readonly pending = inject(PendingActionService);
  private readonly dialog = inject(Dialog);
  private readonly savedStore = inject(SavedStore);
  private request?: Subscription;
  private composeRef?: { close: () => void };
  private readonly requesting = signal(false);

  protected readonly slug = signal('');
  protected readonly productSlug = signal('');
  protected readonly state = signal<LoadState<ProductPageModel>>({ status: 'loading' });
  protected readonly alertRequested = signal(false);

  /** Whether the member has saved this product (L2-041). */
  protected readonly saved = computed(() => {
    const state = this.state();
    return (
      state.status === 'loaded' &&
      this.savedStore.isSaved({
        kind: 'product',
        shopSlug: state.value.shop.slug,
        slug: state.value.slug,
        name: state.value.name,
      })
    );
  });

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
  /** The trail: Browse, the shop once its name is known, then the product. */
  protected readonly crumbs = computed<BreadcrumbItem[]>(() => {
    const shop = this.shopName();
    return [
      { label: 'Browse', link: '/' },
      ...(shop ? [{ label: shop, link: ['/b', this.slug()] }] : []),
      { label: this.productName() ?? 'Product' },
    ];
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
    effect(() => {
      // Coming back from sign-in with ?save=1 saves the product the visitor pressed the heart for (L2-012).
      const state = this.state();
      const member = this.session.member();
      untracked(() => {
        if (!member) return;
        this.savedStore.load();
        if (state.status === 'loaded' && this.route.snapshot.queryParamMap.get('save') === '1') {
          const target = {
            kind: 'product',
            shopSlug: state.value.shop.slug,
            slug: state.value.slug,
            name: state.value.name,
          } as const;
          if (!this.savedStore.isSaved(target)) this.savedStore.save(target);
          void this.router.navigate([], { queryParams: { save: null }, replaceUrl: true });
        }
      });
    });
    inject(DestroyRef).onDestroy(() => {
      urls.unsubscribe();
      params.unsubscribe();
      this.request?.unsubscribe();
    });
  }

  /** The product's own path: the key of the action started on this page. */
  private pagePath(): string {
    return `/b/${this.slug()}/p/${this.productSlug()}`;
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
        // The alert the visitor asked for before signing in is saved without a second press (L2-012 AC2).
        if (
          this.session.member() &&
          !product.stockAlertRequested &&
          this.pending.take('stock-alert', this.pagePath())
        ) {
          this.api
            .requestStockAlert(product.id)
            .subscribe({ next: () => this.alertRequested.set(true) });
        }
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

  /** The heart (L2-041): a member saves or unsaves at once; a visitor is asked to join or sign in first. */
  protected toggleSave(product: ProductPageModel, button: HTMLElement): void {
    if (!this.session.member()) {
      this.dialog.open<void, SignInRequiredData>(SignInRequiredDialog, {
        data: {
          title: `Join to save ${product.name}`,
          returnUrl: `/b/${product.shop.slug}/p/${product.slug}?save=1`,
        },
        ariaLabelledBy: 'dlg-title',
        ariaDescribedBy: 'dlg-desc',
        ariaModal: true,
        backdropClass: 'backdrop',
        restoreFocus: button,
      });
      return;
    }
    this.savedStore.toggle({
      kind: 'product',
      shopSlug: product.shop.slug,
      slug: product.slug,
      name: product.name,
    });
  }

  /**
   * "Tell me when it's back" (L2-036 AC2): a member's alert is saved and the status takes the
   * button's place; a visitor is asked to join or sign in first (L2-012).
   */
  protected askForAlert(product: ProductPageModel, button: HTMLElement): void {
    if (!this.session.member()) {
      this.pending.remember({ kind: 'stock-alert', returnPath: this.pagePath() });
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

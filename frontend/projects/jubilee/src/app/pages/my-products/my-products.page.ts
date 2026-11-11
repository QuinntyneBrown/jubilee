import { Dialog } from '@angular/cdk/dialog';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { CATALOGUE_API, DeletedItem, OwnerProduct, OwnerProducts } from 'api';
import {
  EmptyState,
  Icon,
  IconName,
  MediaTile,
  TileTint,
  formatPrice,
  Button,
  RowListSkeleton,
  Badge,
  WorkspaceHeader,
} from 'components';
import { DeleteItemData, DeleteItemDialog } from '../../dialogs/delete-item/delete-item.dialog';
import {
  ProductEditorData,
  ProductEditorDialog,
  ProductSaved,
} from '../../dialogs/product-editor/product-editor.dialog';
import { LoadState, errorReference as errorRef } from '../../services/load-state';
import { ToastService } from '../../toasts/toast.service';

/** My products at /my-business/products (L2-089, L2-090): the shop's catalogue, with add, edit, delete and reorder. */
@Component({
  selector: 'jb-my-products-page',
  imports: [EmptyState, Icon, MediaTile, WorkspaceHeader, Button, RowListSkeleton, Badge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'jb-page container page' },
  templateUrl: './my-products.page.html',
})
export class MyProductsPage implements OnInit {
  private readonly api = inject(CATALOGUE_API);
  private readonly dialog = inject(Dialog);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastService);

  protected readonly skeleton = [1, 2, 3, 4];
  protected readonly state = signal<LoadState<OwnerProducts>>({ status: 'loading' });
  protected readonly moving = signal(false);
  /** What the screen reader hears after a row moves (L2-090). */
  protected readonly announcement = signal('');

  protected readonly products = computed(() => {
    const state = this.state();
    return state.status === 'loaded' ? state.value : null;
  });

  protected readonly errorReference = computed(() => {
    const state = this.state();
    return state.status === 'error' ? state.reference : '';
  });

  protected readonly summary = computed(() => {
    const products = this.products();
    if (!products) return '';
    const count = `${products.total} ${products.total === 1 ? 'product' : 'products'}`;
    return products.soldOut > 0 ? `${count} · ${products.soldOut} sold out` : count;
  });

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.state.set({ status: 'loading' });
    this.fetch();
  }

  private fetch(): void {
    this.api.products().subscribe({
      next: (value) => this.state.set({ status: 'loaded', value }),
      error: (error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 403) {
          void this.router.navigateByUrl('/forbidden');
          return;
        }
        this.state.set({ status: 'error', reference: errorRef(error, 'JB-PRD-503') });
      },
    });
  }

  protected price(product: OwnerProduct): string {
    return formatPrice(product.priceCents, product.perUnit);
  }

  protected tint(product: OwnerProduct): TileTint {
    return product.tint as TileTint;
  }

  protected icon(product: OwnerProduct): IconName {
    return product.icon as IconName;
  }

  protected title(product: OwnerProduct): string {
    return product.minimumQuantity > 1
      ? `${product.name} (min. ${product.minimumQuantity})`
      : product.name;
  }

  protected add(products: OwnerProducts): void {
    if (products.total >= products.max) {
      this.toasts.show({
        tone: 'warning',
        title: `You can list up to ${products.max} products.`,
        text: 'Delete one to add another.',
      });
      return;
    }
    this.edit(null);
  }

  protected edit(product: OwnerProduct | null): void {
    const ref = this.dialog.open<ProductSaved, ProductEditorData>(ProductEditorDialog, {
      data: { product },
      disableClose: true,
      ...this.dialogOptions(),
    });
    ref.closed.subscribe((saved) => {
      if (!saved) return;
      const slug = this.products()?.slug;
      this.fetch();
      this.toasts.show(
        saved.created
          ? {
              tone: 'success',
              title: 'Product added',
              text: `“${saved.product.name}” is live in your shop.`,
              action: slug
                ? {
                    label: 'View in shop',
                    run: () => void this.router.navigate(['/b', slug, 'p', saved.product.slug]),
                  }
                : undefined,
            }
          : {
              tone: 'success',
              title: 'Product updated',
              text: `“${saved.product.name}” is updated.`,
            },
      );
    });
  }

  protected remove(product: OwnerProduct): void {
    const ref = this.dialog.open<DeletedItem, DeleteItemData>(DeleteItemDialog, {
      data: { kind: 'product', id: product.id, name: product.name, pastRequests: product.requests },
      ...this.dialogOptions(),
    });
    ref.closed.subscribe((deleted) => {
      if (!deleted) return;
      this.fetch();
      this.toasts.show({
        tone: 'success',
        title: 'Product deleted',
        text: `“${deleted.name}” is gone from your shop.`,
      });
    });
  }

  /** Moves a product up or down by one place (L2-090). */
  protected move(products: OwnerProducts, product: OwnerProduct, by: -1 | 1): void {
    if (this.moving()) return;
    const index = products.rows.indexOf(product);
    const target = index + by;
    if (target < 0 || target >= products.rows.length) return;
    this.moving.set(true);
    this.api.moveProduct(product.id, target + 1).subscribe({
      next: (value) => {
        this.moving.set(false);
        this.state.set({ status: 'loaded', value });
        this.announcement.set(
          `${product.name} moved to position ${target + 1} of ${value.rows.length}.`,
        );
        setTimeout(() =>
          document
            .querySelector<HTMLElement>(
              `[aria-label="Move ${product.name} ${by === -1 ? 'up' : 'down'}"]:not([disabled])`,
            )
            ?.focus(),
        );
      },
      error: () => {
        this.moving.set(false);
        this.toasts.show({
          tone: 'danger',
          title: 'Couldn’t move the product',
          text: 'The order is unchanged. Try again.',
        });
      },
    });
  }

  private dialogOptions() {
    return {
      ariaLabelledBy: 'dlg-title',
      ariaDescribedBy: 'dlg-desc',
      ariaModal: true,
      backdropClass: 'backdrop',
    };
  }
}

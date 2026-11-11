import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { SAVED_API, SavedItem } from 'api';
import { BusinessCard, EmptyState, Icon, ProductCard, Button } from 'components';
import { LoadState, errorReference } from '../../services/load-state';
import { SavedStore } from '../../services/saved.store';

/** The saved page at /saved (L2-042): what the member saved, newest first, private to them. */
@Component({
  selector: 'jb-saved-page',
  imports: [RouterLink, BusinessCard, EmptyState, Icon, ProductCard, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'jb-page container page' },
  templateUrl: './saved.page.html',
})
export class SavedPage implements OnInit {
  private readonly api = inject(SAVED_API);
  private readonly store = inject(SavedStore);

  protected readonly state = signal<LoadState<true>>({ status: 'loading' });
  protected readonly placeholders = [1, 2, 3];
  protected readonly list = this.store.list;

  protected readonly subtitle = computed(() => {
    const state = this.state();
    const list = this.list();
    if (state.status === 'loading') return 'Loading your saved list\u2026';
    if (state.status === 'error' || !list) return 'Businesses and products you\u2019ve hearted.';
    if (list.items.length === 0) return 'Nothing saved yet';
    const parts: string[] = [];
    if (list.businessCount > 0 || list.productCount === 0)
      parts.push(`${list.businessCount} ${list.businessCount === 1 ? 'business' : 'businesses'}`);
    if (list.productCount > 0)
      parts.push(`${list.productCount} ${list.productCount === 1 ? 'product' : 'products'}`);
    return parts.join(' \u00b7 ');
  });

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.state.set({ status: 'loading' });
    this.api.list().subscribe({
      next: (list) => {
        this.store.adopt(list);
        this.state.set({ status: 'loaded', value: true });
      },
      error: (error: unknown) =>
        this.state.set({ status: 'error', reference: errorReference(error, 'JB-SAV-503') }),
    });
  }

  protected remove(item: SavedItem, focusAfter: HTMLElement | null): void {
    this.store.removeItem(item, () => setTimeout(() => focusAfter?.focus()));
  }
}

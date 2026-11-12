import { Injectable, computed, inject, signal } from '@angular/core';
import { SEARCH_API, SearchResultKind, SearchResults, SearchStart } from 'api';
import { Subscription } from 'rxjs';
import { errorReference } from 'api';

export type SearchState =
  | { status: 'loading'; query: string }
  | { status: 'start'; value: SearchStart }
  | { status: 'results'; value: SearchResults }
  | { status: 'error'; query: string; reference: string };

/**
 * SearchStore: the search for the query in the URL (L2-029). An empty query loads the empty
 * search page instead and never calls the search endpoint with it (L2-031). Provided by the page.
 */
@Injectable()
export class SearchStore {
  private readonly api = inject(SEARCH_API);
  private request?: Subscription;
  private query = '';

  private readonly current = signal<SearchState>({ status: 'loading', query: '' });
  private readonly selected = signal<SearchResultKind | null>(null);

  readonly state = this.current.asReadonly();

  /** The tab on show: the one the person chose, else the first group that has results. */
  readonly tab = computed<SearchResultKind>(() => {
    const chosen = this.selected();
    if (chosen) return chosen;
    const state = this.current();
    if (state.status !== 'results') return 'business';
    const { businessCount, serviceCount, productCount } = state.value;
    if (businessCount > 0) return 'business';
    if (serviceCount > 0) return 'service';
    return productCount > 0 ? 'product' : 'business';
  });

  choose(kind: SearchResultKind): void {
    this.selected.set(kind);
  }

  /** Loads what the URL asks for; a query of only whitespace is the empty search page. */
  open(raw: string | null): void {
    const query = (raw ?? '').trim();
    if (query !== this.query) this.selected.set(null);
    this.query = query;
    this.load();
  }

  load(): void {
    this.request?.unsubscribe();
    if (this.query === '') {
      this.current.set({ status: 'loading', query: '' });
      this.request = this.api.getStart().subscribe({
        next: (value) => this.current.set({ status: 'start', value }),
        error: (error: unknown) =>
          this.current.set({
            status: 'error',
            query: '',
            reference: errorReference(error, 'JB-SRCH-503'),
          }),
      });
      return;
    }
    const query = this.query;
    this.current.set({ status: 'loading', query });
    this.request = this.api.search(query).subscribe({
      next: (value) => this.current.set({ status: 'results', value }),
      error: (error: unknown) =>
        this.current.set({
          status: 'error',
          query,
          reference: errorReference(error, 'JB-SRCH-503'),
        }),
    });
  }

  removeRecent(id: string): void {
    this.api.removeRecent(id).subscribe(() => {
      const state = this.current();
      if (state.status !== 'start') return;
      this.current.set({
        status: 'start',
        value: { ...state.value, recent: state.value.recent.filter((r) => r.id !== id) },
      });
    });
  }

  clearRecent(): void {
    this.api.clearRecent().subscribe(() => {
      const state = this.current();
      if (state.status !== 'start') return;
      this.current.set({ status: 'start', value: { ...state.value, recent: [] } });
    });
  }
}

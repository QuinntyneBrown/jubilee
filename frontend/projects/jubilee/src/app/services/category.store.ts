import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AreaServed,
  CategoryFilters,
  CategoryPage,
  CategoryQuery,
  DIRECTORY_API,
  ListingSort,
  OfferFilter,
  categoryQueryParams,
  parseCategoryQuery,
} from 'api';
import { Subscription } from 'rxjs';
import { LoadState, errorReference } from './load-state';

/** One applied filter: its group and its value. */
export type AppliedFilter =
  { group: 'offers'; value: OfferFilter } | { group: 'areas'; value: AreaServed };

export type CategoryState = LoadState<CategoryPage> | { status: 'not-found' };

/**
 * CategoryStore: owns the category query. The query lives in the URL, so every change is a
 * navigation and every navigation loads the results; a copied link reproduces the page
 * (L2-024). Provided by the category page.
 */
@Injectable()
export class CategoryStore {
  private readonly api = inject(DIRECTORY_API);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private request?: Subscription;
  private slug = '';

  private readonly currentQuery = signal<CategoryQuery>(parseCategoryQuery(new URLSearchParams()));
  private readonly currentState = signal<CategoryState>({ status: 'loading' });
  private readonly lastAdded = signal<AppliedFilter | null>(null);

  readonly query = this.currentQuery.asReadonly();
  readonly state = this.currentState.asReadonly();

  /** Loads what the URL asks for. Called for every change of the slug or the query string. */
  open(slug: string, params: { get(name: string): string | null }): void {
    if (slug !== this.slug) this.lastAdded.set(null);
    this.slug = slug;
    const query = parseCategoryQuery(params);
    // A query string that says the same thing another way (a page below 1, a value outside
    // the allowed set) is rewritten to the one form that is shared and cached.
    const canonical = categoryQueryParams(query);
    const differs = ['offers', 'areas', 'sort', 'page'].some(
      (name) => (params.get(name) ?? undefined) !== canonical[name],
    );
    if (differs) return this.navigate(query, true);
    this.currentQuery.set(query);
    this.load();
  }

  load(): void {
    const query = this.currentQuery();
    this.request?.unsubscribe();
    this.currentState.set({ status: 'loading' });
    this.request = this.api.getCategory(this.slug, query).subscribe({
      next: (value) => {
        this.currentState.set({ status: 'loaded', value });
        // The server replaces an out-of-range page with the nearest valid one (L2-026).
        if (value.page !== query.page) this.navigate({ ...query, page: value.page }, true);
      },
      error: (error: unknown) =>
        this.currentState.set(
          error instanceof HttpErrorResponse && error.status === 404
            ? { status: 'not-found' }
            : { status: 'error', reference: errorReference(error, 'JB-CAT-503') },
        ),
    });
  }

  isOn(filter: AppliedFilter): boolean {
    const query = this.currentQuery();
    return filter.group === 'offers'
      ? query.offers.includes(filter.value)
      : query.areas.includes(filter.value);
  }

  toggle(filter: AppliedFilter): void {
    const on = this.isOn(filter);
    this.lastAdded.set(on ? null : filter);
    this.applyFilters(
      on ? without(this.currentQuery(), filter) : withFilter(this.currentQuery(), filter),
    );
  }

  remove(filter: AppliedFilter): void {
    this.lastAdded.set(null);
    this.applyFilters(without(this.currentQuery(), filter));
  }

  clear(): void {
    this.lastAdded.set(null);
    this.applyFilters({ offers: [], areas: [] });
  }

  /** Applies a set of filters, and optionally a sort order; both return to page 1. */
  applyFilters(filters: CategoryFilters, sort: ListingSort = this.currentQuery().sort): void {
    this.navigate({ offers: filters.offers, areas: filters.areas, sort, page: 1 });
  }

  sortBy(sort: ListingSort): void {
    this.navigate({ ...this.currentQuery(), sort, page: 1 });
  }

  /**
   * The filter the no-results state offers to remove: the one added last on this device, or
   * the last one in the URL when the page was opened from a link.
   */
  mostRecentFilter(): AppliedFilter | null {
    const last = this.lastAdded();
    if (last && this.isOn(last)) return last;
    const { offers, areas } = this.currentQuery();
    if (areas.length) return { group: 'areas', value: areas[areas.length - 1] };
    if (offers.length) return { group: 'offers', value: offers[offers.length - 1] };
    return null;
  }

  private navigate(query: CategoryQuery, replaceUrl = false): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: categoryQueryParams(query),
      replaceUrl,
    });
  }
}

function withFilter(query: CategoryFilters, filter: AppliedFilter): CategoryFilters {
  return filter.group === 'offers'
    ? { offers: [...query.offers, filter.value], areas: query.areas }
    : { offers: query.offers, areas: [...query.areas, filter.value] };
}

function without(query: CategoryFilters, filter: AppliedFilter): CategoryFilters {
  return {
    offers: query.offers.filter((value) => value !== filter.value),
    areas: query.areas.filter((value) => value !== filter.value),
  };
}

import { Dialog } from '@angular/cdk/dialog';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AREAS, CATEGORIES, FilterSuggestion, ListingSort, OFFERS, SORTS } from 'api';
import {
  BusinessCard,
  CardGridSkeleton,
  EmptyState,
  Icon,
  Pagination,
  formatCount,
  Button,
  Field,
  Select,
  Chip,
  PageHeader,
  Breadcrumb,
  CardGrid,
} from 'components';
import { combineLatest } from 'rxjs';
import {
  FiltersDialog,
  FiltersDialogData,
  FiltersDialogResult,
} from '../../dialogs/filters/filters.dialog';
import { AppliedFilter, CategoryStore } from '../../services/category.store';

interface FilterChip {
  filter: AppliedFilter;
  label: string;
}

const CHIPS: readonly FilterChip[] = [
  ...OFFERS.map((offer): FilterChip => ({
    filter: { group: 'offers', value: offer.value },
    label: offer.label,
  })),
  ...AREAS.map((area): FilterChip => ({
    filter: { group: 'areas', value: area.value },
    label: `Serves ${area.label}`,
  })),
];

function chipLabel(filter: { group: string; value: string }): string {
  return CHIPS.find((chip) => chip.filter.value === filter.value)?.label ?? filter.value;
}

function businesses(count: number): string {
  return `${formatCount(count)} ${count === 1 ? 'business' : 'businesses'}`;
}

/**
 * The page of one category (L2-023 to L2-026): breadcrumb, heading, count line, filters (chips
 * from 768 px, a sheet below), sort, business cards and pagination.
 */
@Component({
  selector: 'jb-category-page',
  imports: [
    RouterLink,
    BusinessCard,
    CardGridSkeleton,
    EmptyState,
    Icon,
    Pagination,
    Button,
    Field,
    Select,
    Chip,
    PageHeader,
    Breadcrumb,
    CardGrid,
  ],
  providers: [CategoryStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'jb-page container page' },
  templateUrl: './category.page.html',
})
export class CategoryPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(Dialog);
  protected readonly store = inject(CategoryStore);

  protected readonly chips = CHIPS;
  protected readonly sorts = SORTS;
  private readonly heading = viewChild<PageHeader>('heading');
  private readonly slug = toSignal(this.route.paramMap, { requireSync: true });

  /** The category as the catalogue knows it; the API is the authority on unknown slugs. */
  protected readonly category = computed(() => {
    const slug = this.slug().get('category') ?? '';
    return CATEGORIES.find((category) => category.slug === slug) ?? null;
  });

  protected readonly filterCount = computed(
    () => this.store.query().offers.length + this.store.query().areas.length,
  );

  protected readonly subtitle = computed(() => {
    const state = this.store.state();
    if (state.status === 'loading') return 'Loading businesses…';
    if (state.status !== 'loaded') return this.category()?.blurb ?? '';
    const page = state.value;
    if (page.totalCount === 0) return 'No businesses yet';
    if (this.filterCount() > 0) {
      return `${formatCount(page.matchCount)} of ${businesses(page.totalCount)} ${
        page.matchCount === 1 ? 'matches' : 'match'
      } your filters`;
    }
    const count = `${formatCount(page.totalCount)} verified ${
      page.totalCount === 1 ? 'business' : 'businesses'
    }`;
    if (!page.fact) return count;
    return `${count} · ${formatCount(page.fact.count)} ${
      page.fact.count === 1 ? 'takes' : 'take'
    } emergency calls`;
  });

  protected readonly recentFilter = computed(() => {
    const filter = this.store.mostRecentFilter();
    return filter ? { filter, label: chipLabel(filter) } : null;
  });

  constructor() {
    combineLatest([this.route.paramMap, this.route.queryParamMap]).subscribe(([params, query]) =>
      this.store.open(params.get('category') ?? '', query),
    );

    // An unknown category is the not-found page, at the URL that was asked for (L2-113).
    effect(() => {
      if (this.store.state().status === 'not-found') {
        void this.router.navigate(['/404'], { skipLocationChange: true });
      }
    });

    // After a page change, focus moves to the results heading (L2-026).
    let shownPage: number | null = null;
    effect(() => {
      const state = this.store.state();
      if (state.status !== 'loaded') return;
      if (shownPage !== null && shownPage !== state.value.page) {
        this.heading()?.focus();
      }
      shownPage = state.value.page;
    });
  }

  protected suggestion(suggestions: FilterSuggestion[]): string {
    const sentences = suggestions
      .filter((s) => s.count > 0)
      .map(
        (s) =>
          `Without “${chipLabel(s.removed)}”, ${businesses(s.count)} ${
            s.count === 1 ? 'matches' : 'match'
          }.`,
      );
    return ['Try removing one.', ...sentences].join(' ');
  }

  protected sortBy(value: string): void {
    this.store.sortBy(value as ListingSort);
  }

  protected openFilters(slug: string, count: number): void {
    const query = this.store.query();
    this.dialog
      .open<FiltersDialogResult, FiltersDialogData>(FiltersDialog, {
        data: {
          slug,
          filters: { offers: query.offers, areas: query.areas },
          sort: query.sort,
          count,
        },
        ariaLabelledBy: 'filters-title',
        ariaModal: true,
        backdropClass: 'backdrop',
      })
      .closed.subscribe((result) => {
        if (result) this.store.applyFilters(result.filters, result.sort);
      });
  }
}

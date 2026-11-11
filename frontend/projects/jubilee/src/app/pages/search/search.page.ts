import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CATEGORIES, SearchHit, SearchResultKind } from 'api';
import {
  EmptyState,
  Icon,
  MatchExplanation,
  Button,
  Input,
  Chip,
  ChipRow,
  Skeleton,
  Badge,
  Row,
  RowMeta,
  RowTitle,
  Rows,
  PageHeader,
  Section,
} from 'components';
import { SearchStore } from '../../services/search.store';

interface SearchTab {
  kind: SearchResultKind;
  label: string;
}

const TABS: readonly SearchTab[] = [
  { kind: 'business', label: 'Businesses' },
  { kind: 'service', label: 'Services' },
  { kind: 'product', label: 'Products' },
];

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/**
 * The search page (L2-029 to L2-032): results grouped under Businesses, Services and Products with
 * the reason each matched; the empty search page; no results; and the load-error state. The
 * query lives in the URL.
 */
@Component({
  selector: 'jb-search-page',
  imports: [
    RouterLink,
    EmptyState,
    Icon,
    MatchExplanation,
    Button,
    Input,
    Chip,
    ChipRow,
    Skeleton,
    Badge,
    Row,
    RowMeta,
    RowTitle,
    Rows,
    PageHeader,
    Section,
  ],
  providers: [SearchStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'jb-page container page' },
  templateUrl: './search.page.html',
})
export class SearchPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly store = inject(SearchStore);
  protected readonly tabs = TABS;

  protected readonly summary = computed(() => {
    const state = this.store.state();
    if (state.status !== 'results') return '';
    const { businessCount, serviceCount, productCount } = state.value;
    return [
      plural(businessCount, 'business', 'businesses'),
      plural(serviceCount, 'service', 'services'),
      plural(productCount, 'product', 'products'),
    ].join(' · ');
  });

  protected readonly shown = computed(() => {
    const state = this.store.state();
    if (state.status !== 'results') return [];
    const kind = this.store.tab();
    return state.value.hits.filter((hit) => hit.kind === kind);
  });

  constructor() {
    this.route.queryParamMap.subscribe((params) => this.store.open(params.get('q')));
  }

  protected count(kind: SearchResultKind): number {
    const state = this.store.state();
    if (state.status !== 'results') return 0;
    const value = state.value;
    return kind === 'business'
      ? value.businessCount
      : kind === 'service'
        ? value.serviceCount
        : value.productCount;
  }

  protected categoryName(slug: string): string {
    return CATEGORIES.find((category) => category.slug === slug)?.name ?? '';
  }

  protected link(hit: SearchHit): string[] {
    return hit.productSlug ? ['/b', hit.slug, 'p', hit.productSlug] : ['/b', hit.slug];
  }

  protected icon(hit: SearchHit): 'wrench' | 'bag' | 'store' {
    return hit.kind === 'product' ? 'bag' : hit.kind === 'service' ? 'wrench' : 'store';
  }

  /** The tabs move with the arrow keys; only the selected one is in the tab order. */
  protected moveTab(event: KeyboardEvent, index: number): void {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = TABS[(index + step + TABS.length) % TABS.length];
    this.store.choose(next.kind);
    queueMicrotask(() => document.getElementById(`tab-${next.kind}`)?.focus());
  }

  protected submit(event: Event, query: string): void {
    event.preventDefault();
    const q = query.trim();
    void this.router.navigate(['/search'], { queryParams: q ? { q } : {} });
  }
}

import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CATEGORIES, SearchHit, SearchResultKind } from 'api';
import {
  EmptyState,
  Icon,
  MatchExplanation,
  Button,
  Chip,
  ChipRow,
  Skeleton,
  Row,
  RowMeta,
  RowTitle,
  Rows,
  PageHeader,
  Section,
  TabListItem,
  TabList,
  SearchField,
  MediaTile,
  CardGrid,
  SpaceCard,
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
    CardGrid,
    SpaceCard,
    EmptyState,
    Icon,
    MatchExplanation,
    Button,
    Chip,
    ChipRow,
    Skeleton,
    Row,
    RowMeta,
    RowTitle,
    Rows,
    PageHeader,
    Section,
    TabList,
    SearchField,
    MediaTile,
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
  protected readonly tabs = computed<TabListItem<SearchResultKind>[]>(() =>
    TABS.map((tab) => ({ key: tab.kind, label: tab.label, count: this.count(tab.kind) })),
  );

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
  /** Spaces are listed as space cards (L2-203 AC1); every other hit is a row. */
  protected readonly spaces = computed(() => this.shown().flatMap((hit) => hit.space ?? []));
  protected readonly rows = computed(() => this.shown().filter((hit) => !hit.space));

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

  protected submit(query: string): void {
    const q = query.trim();
    void this.router.navigate(['/search'], { queryParams: q ? { q } : {} });
  }
}

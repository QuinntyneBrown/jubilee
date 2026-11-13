import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  ADMIN_API,
  AdminListingRow,
  AdminListings,
  ClockService,
  LoadState,
  errorReference,
  threadTime,
} from 'api';
import {
  Badge,
  BadgeTone,
  Button,
  EmptyState,
  Icon,
  PageHeader,
  RowListSkeleton,
  SearchField,
  Table,
  TableCell,
  TableScroll,
} from 'components';

/**
 * The listings at /listings (L2-099, ADR 0057): every published listing, newest first, with a
 * search by name. Nobody approves a listing; the Jubilee team looks through what was published.
 */
@Component({
  selector: 'jb-admin-listings-page',
  imports: [
    RouterLink,
    Badge,
    Button,
    EmptyState,
    Icon,
    PageHeader,
    RowListSkeleton,
    SearchField,
    Table,
    TableCell,
    TableScroll,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'jb-page container page' },
  templateUrl: './admin-listings.page.html',
})
export class AdminListingsPage implements OnInit {
  private readonly api = inject(ADMIN_API);
  private readonly clock = inject(ClockService);

  protected readonly state = signal<LoadState<AdminListings>>({ status: 'loading' });
  /** The search the list shows. */
  protected readonly search = signal('');

  protected readonly subtitle = computed(() => {
    const state = this.state();
    if (state.status === 'loading') return 'Loading the listings…';
    if (state.status === 'error') return 'Every published listing, newest first.';
    const { total, publishedThisWeek } = state.value;
    return `${total} ${total === 1 ? 'listing' : 'listings'} · ${publishedThisWeek} published in the last 7 days`;
  });

  ngOnInit(): void {
    this.load('');
  }

  protected load(search: string): void {
    const term = search.trim();
    this.search.set(term);
    this.state.set({ status: 'loading' });
    this.api.listings(term).subscribe({
      next: (listings) => this.state.set({ status: 'loaded', value: listings }),
      error: (error: unknown) =>
        this.state.set({ status: 'error', reference: errorReference(error, 'JB-ADM-503') }),
    });
  }

  protected published(row: AdminListingRow): string {
    return threadTime(row.publishedAt, this.clock.now());
  }

  protected tone(row: AdminListingRow): BadgeTone | '' {
    return row.status === 'live' ? 'success' : row.status === 'paused' ? '' : 'warning';
  }
}

import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LISTINGS_API, ListingPage, ReplyTimeBand } from 'api';
import {
  BusinessCard,
  CountPipe,
  EmptyState,
  Icon,
  MediaTile,
  ProductCard,
  ServiceRow,
  VerifiedBusinessLabel,
  categoryTile,
} from 'components';
import { Subscription } from 'rxjs';
import { ListingHints } from '../../services/listing-hints';
import { LoadState, errorReference } from '../../services/load-state';

const REPLIES: Record<ReplyTimeBand, string> = {
  'few-hours': 'Usually within a few hours',
  day: 'Usually within a day',
  'few-days': 'Usually within a few days',
};

const MONTH = new Intl.DateTimeFormat('en-CA', {
  month: 'long',
  year: 'numeric',
  timeZone: 'America/Toronto',
});

interface DetailRow {
  term: string;
  value: string;
}

/**
 * The listing page at /b/:slug (L2-033): header with the verified label and the actions, the
 * services, About, Details and "More in {category}". Actions of later journeys are links to
 * their routes (ADR 0007).
 */
@Component({
  selector: 'jb-business-page',
  imports: [
    RouterLink,
    BusinessCard,
    CountPipe,
    EmptyState,
    Icon,
    MediaTile,
    ProductCard,
    ServiceRow,
    VerifiedBusinessLabel,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'jb-page container page' },
  templateUrl: './business.page.html',
})
export class BusinessPage {
  private readonly api = inject(LISTINGS_API);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly title = inject(Title);
  private readonly hints = inject(ListingHints);
  private request?: Subscription;
  private slug = '';

  protected readonly state = signal<LoadState<ListingPage>>({ status: 'loading' });
  private readonly slugValue = signal('');
  protected readonly placeholders = [1, 2, 3, 4];

  /** What the page calls the listing: a shop, or a business. Known before it loads when the
   * listing was reached from a list (L2-034 AC4). */
  protected readonly thing = computed(() => {
    const state = this.state();
    const kind = state.status === 'loaded' ? state.value.kind : this.hints.kindOf(this.slugValue());
    return kind === 'shop' ? 'shop' : 'business';
  });

  protected readonly tile = computed(() => {
    const state = this.state();
    return state.status === 'loaded' ? categoryTile(state.value.category.slug) : null;
  });

  protected readonly details = computed<DetailRow[]>(() => {
    const state = this.state();
    if (state.status !== 'loaded') return [];
    const { details } = state.value;
    const rows: (DetailRow | null)[] = [
      row('Where', details.where),
      row('Hours', details.hours),
      row('Languages', details.languages),
      row('Delivery', details.delivery),
      row('Made to order', details.madeToOrder),
      row('On Jubilee since', MONTH.format(new Date(details.onJubileeSince))),
      row('Replies', details.replies ? REPLIES[details.replies] : null),
    ];
    return rows.filter((r): r is DetailRow => r !== null);
  });

  constructor() {
    const params = this.route.paramMap.subscribe((map) => {
      this.slug = map.get('slug') ?? '';
      this.slugValue.set(this.slug);
      this.load();
    });
    inject(DestroyRef).onDestroy(() => {
      params.unsubscribe();
      this.request?.unsubscribe();
    });
  }

  protected load(): void {
    this.request?.unsubscribe();
    this.state.set({ status: 'loading' });
    this.request = this.api.getListing(this.slug).subscribe({
      next: (listing) => {
        this.hints.remember(listing.slug, listing.kind, listing.name);
        this.hints.rememberProducts(listing.products);
        this.hints.rememberCategory(listing.related, listing.category.slug);
        this.state.set({ status: 'loaded', value: listing });
        this.title.setTitle(`${listing.name} · Jubilee`);
      },
      error: (error: unknown) => {
        // A listing that is not public is the not-found page, at its own URL (L2-028 AC3).
        if (error instanceof HttpErrorResponse && error.status === 404) {
          void this.router.navigate(['/404'], { skipLocationChange: true });
          return;
        }
        this.state.set({ status: 'error', reference: errorReference(error, 'JB-BIZ-503') });
      },
    });
  }

  /** The route of an action of a later journey on this listing (ADR 0007). */
  protected link(action: string): string[] {
    return ['/b', this.slug, action];
  }
}

function row(term: string, value: string | null): DetailRow | null {
  return value ? { term, value } : null;
}

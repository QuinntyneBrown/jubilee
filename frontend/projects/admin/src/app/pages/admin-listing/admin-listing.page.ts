import { Dialog } from '@angular/cdk/dialog';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  ADMIN_API,
  AdminListing,
  AdminListingSpace,
  ClockService,
  FLAG_TEXT,
  LoadState,
  clockTime,
  dayHeading,
  errorReference,
  monthYear,
} from 'api';
import {
  Alert,
  Badge,
  BadgeTone,
  Breadcrumb,
  BusinessCardPreview,
  Button,
  Card,
  DescriptionItem,
  DescriptionList,
  EmptyState,
  Icon,
  PageHeader,
  Skeleton,
  SpaceCardPreview,
  SpaceCardView,
  categoryTile,
  formatRent,
} from 'components';
import {
  TakeDownListingData,
  TakeDownListingDialog,
} from '../../dialogs/take-down-listing/take-down-listing.dialog';

/** A space's term as the owner chose it (L2-197). */
const TERM_NAMES: Record<AdminListingSpace['term'], string> = {
  'short-stay': 'Short stay',
  'long-term': 'Long term',
  room: 'Room',
  roommate: 'Roommate',
};

/**
 * One published listing at /listings/:id (L2-100, L2-101, ADR 0057): where it stands, its owner,
 * its flags, how members see it, and "Take down listing".
 */
@Component({
  selector: 'jb-admin-listing-page',
  imports: [
    RouterLink,
    Alert,
    Badge,
    Breadcrumb,
    BusinessCardPreview,
    Button,
    Card,
    DescriptionItem,
    DescriptionList,
    EmptyState,
    Icon,
    PageHeader,
    Skeleton,
    SpaceCardPreview,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'jb-page container page' },
  templateUrl: './admin-listing.page.html',
})
export class AdminListingPage implements OnInit {
  private readonly api = inject(ADMIN_API);
  private readonly dialog = inject(Dialog);
  private readonly clock = inject(ClockService);

  private readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';

  protected readonly state = signal<LoadState<AdminListing>>({ status: 'loading' });
  /** True once this moderator took the listing down on this screen (L2-101 AC3). */
  protected readonly justTakenDown = signal(false);

  protected readonly listing = computed(() => {
    const state = this.state();
    return state.status === 'loaded' ? state.value : null;
  });
  protected readonly canTakeDown = computed(() => {
    const listing = this.listing();
    return listing !== null && !listing.isOwnListing && listing.takenDown === null;
  });
  protected readonly flags = computed(() =>
    (this.listing()?.flags ?? []).map((flag) => FLAG_TEXT[flag] ?? flag),
  );
  protected readonly tile = computed(() => {
    const listing = this.listing();
    return listing ? categoryTile(listing.categorySlug) : null;
  });
  /** A space's rows, in the order the owner filled them in (L2-200 AC3). */
  protected readonly spaceRows = computed(() => {
    const space = this.listing()?.space;
    if (!space) return null;
    const rows: { term: string; value: string }[] = [
      { term: 'Term', value: TERM_NAMES[space.term] },
      { term: 'Rent', value: `${formatRent(space.rent)} per ${space.per}` },
      { term: 'Available', value: space.available },
      { term: 'Minimum stay', value: space.minimumStayLabel },
      { term: 'Neighbourhood', value: space.neighbourhood },
      { term: 'The space', value: space.place },
      { term: 'Key facts', value: space.facts.join(' · ') },
      { term: 'What’s included', value: space.included.join(' · ') },
    ];
    if (space.household) rows.push({ term: 'Household', value: space.household });
    rows.push({ term: 'House rules', value: space.rules.join(' · ') });
    return rows.filter((row) => row.value !== '');
  });
  protected readonly spacePreview = computed<SpaceCardView | null>(() => {
    const listing = this.listing();
    const space = listing?.space;
    if (!listing || !space) return null;
    return {
      name: listing.name,
      term: space.term,
      rent: space.rent,
      per: space.per,
      facts: space.facts,
      neighbourhood: space.neighbourhood,
      available: space.available,
    };
  });

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.state.set({ status: 'loading' });
    this.api.listing(this.id).subscribe({
      next: (listing) => this.state.set({ status: 'loaded', value: listing }),
      error: (error: unknown) =>
        this.state.set({ status: 'error', reference: errorReference(error, 'JB-ADM-502') }),
    });
  }

  protected when(iso: string | null): string {
    if (!iso) return '';
    return `${dayHeading(iso, this.clock.now()).split(' · ')[0].toLowerCase()}, ${clockTime(iso)}`;
  }

  /** "Tue 10 Nov", without "Today": the day a listing was taken down (L2-100 AC5). */
  protected day(iso: string): string {
    return dayHeading(iso, this.clock.now()).split(' · ').at(-1) ?? '';
  }

  protected time(iso: string): string {
    return clockTime(iso);
  }

  protected since(iso: string): string {
    return monthYear(iso);
  }

  /** "Laurent Photography · Live, Laurent Studio · Draft", or "None" (L2-079 AC3). */
  protected otherListings(listing: AdminListing): string {
    const others = listing.owner.otherListings;
    return others.length === 0
      ? 'None'
      : others.map((other) => `${other.name} · ${other.stageLabel}`).join(', ');
  }

  protected first(listing: AdminListing): string {
    return listing.owner.name.split(' ')[0] || listing.owner.name;
  }

  protected tone(listing: AdminListing): BadgeTone | '' {
    switch (listing.status) {
      case 'live':
        return 'success';
      case 'paused':
        return '';
      case 'on-hold':
        return 'warning';
      default:
        return 'danger';
    }
  }

  protected takeDown(listing: AdminListing): void {
    const ref = this.dialog.open<AdminListing, TakeDownListingData>(TakeDownListingDialog, {
      data: { id: listing.id, name: listing.name, ownerFirstName: this.first(listing) },
    });
    ref.closed.subscribe((result) => {
      if (!result) return;
      this.justTakenDown.set(true);
      this.state.set({ status: 'loaded', value: result });
    });
  }
}

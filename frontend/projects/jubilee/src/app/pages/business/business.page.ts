import { NgTemplateOutlet } from '@angular/common';
import { RequiresConnection } from '../../directives/requires-connection';
import { Dialog } from '@angular/cdk/dialog';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  LISTINGS_API,
  ListingPage,
  ListingPagePhoto,
  ListingStatus,
  ReplyTimeBand,
  ReviewItemOption,
  SpaceDetails,
} from 'api';
import {
  BusinessCard,
  CountPipe,
  EmptyState,
  Icon,
  MediaTile,
  ProductCard,
  ServiceRow,
  categoryTile,
  Button,
  Alert,
  RowListSkeleton,
  Skeleton,
  Perk,
  Tag,
  Badge,
  Card,
  Rows,
  DetailHead,
  DetailHeadActions,
  Section,
  BackLink,
  DescriptionList,
  DescriptionItem,
  CardGrid,
  CardGridSkeleton,
  BookingBar,
  BookingCard,
  BookingSent,
  DetailHeadKicker,
  HostCard,
  HouseRules,
  Household,
  IncludedList,
  SpaceCard,
  SpaceFacts,
  TERM_TILES,
  availability,
  formatRent,
  Saveable,
  RatingLink,
} from 'components';
import { CardHearts } from '../../services/card-hearts';
import { Subscription } from 'rxjs';
import { BookMeetingData, BookMeetingDialog } from '../../dialogs/book-meeting/book-meeting.dialog';
import {
  ReportListingData,
  ReportListingDialog,
} from '../../dialogs/report-listing/report-listing.dialog';
import { RequestQuoteDialog } from '../../dialogs/request-quote/request-quote.dialog';
import {
  RequestSpaceData,
  RequestSpaceDialog,
} from '../../dialogs/request-space/request-space.dialog';
import {
  ShareListingData,
  ShareListingDialog,
} from '../../dialogs/share-listing/share-listing.dialog';
import {
  NewMessageData,
  NewMessageDialog,
  NewMessageResult,
} from '../../dialogs/new-message/new-message.dialog';
import {
  SignInRequiredData,
  SignInRequiredDialog,
} from '../../dialogs/sign-in-required/sign-in-required.dialog';
import { ListingHints } from '../../services/listing-hints';
import { LoadState, errorReference } from 'api';
import { SavedStore } from '../../services/saved.store';
import { SessionService } from '../../services/session.service';
import { ListingReviewsStore } from '../../services/listing-reviews.store';
import { ListingReviews } from './listing-reviews';

const REPLIES: Record<ReplyTimeBand, string> = {
  'few-hours': 'Usually within a few hours',
  day: 'Usually within a day',
  'few-days': 'Usually within a few days',
};

const WHO_REPLIES: Record<ReplyTimeBand, string> = {
  'few-hours': 'usually replies within a few hours',
  day: 'usually replies within a day',
  'few-days': 'usually replies within a few days',
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

const STATUS_WORDS: Record<ListingStatus, string> = {
  live: 'Live',
  draft: 'Draft · not published yet',
  paused: 'Paused · not public',
  'on-hold': 'On hold while we look into a report · not public',
};

/**
 * The listing page at /b/:slug (L2-033): header with the category and the actions, the
 * services, About, Details and "More in {category}". Actions of later journeys are links to
 * their routes (ADR 0007).
 */
@Component({
  selector: 'jb-business-page',
  imports: [
    Saveable,
    NgTemplateOutlet,
    RequiresConnection,
    RouterLink,
    BusinessCard,
    CountPipe,
    EmptyState,
    Icon,
    MediaTile,
    ProductCard,
    ServiceRow,
    Button,
    Alert,
    RowListSkeleton,
    Skeleton,
    Perk,
    Tag,
    Badge,
    Card,
    Rows,
    DetailHead,
    DetailHeadActions,
    Section,
    BackLink,
    DescriptionList,
    DescriptionItem,
    CardGrid,
    CardGridSkeleton,
    BookingBar,
    BookingCard,
    DetailHeadKicker,
    HostCard,
    HouseRules,
    Household,
    IncludedList,
    SpaceCard,
    SpaceFacts,
    RatingLink,
    ListingReviews,
  ],
  providers: [ListingReviewsStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'jb-page container page' },
  templateUrl: './business.page.html',
})
export class BusinessPage {
  /** The hearts of the cards (L2-041 AC7, ADR 0054). */
  protected readonly hearts = inject(CardHearts);
  private readonly api = inject(LISTINGS_API);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly title = inject(Title);
  private readonly document = inject(DOCUMENT);
  /** The canonical link in the head while a listing shows (L2-243 AC7). */
  private canonical: HTMLLinkElement | null = null;
  private readonly hints = inject(ListingHints);
  private request?: Subscription;
  private readonly session = inject(SessionService);
  private readonly dialog = inject(Dialog);
  private readonly savedStore = inject(SavedStore);
  /** The listing's reviews: the rating under the name and the "Reviews" section (L2-229). */
  protected readonly reviews = inject(ListingReviewsStore);
  private slug = '';
  /** Which dialog the address asks for: /b/:slug/message, /book, /request (a space) and so on. */
  private readonly composing = signal<Composing | null>(null);
  private composeRef?: { close: () => void };
  /** The page has gone: a dialog that closes after it must not change the address. */
  private left = false;

  protected readonly state = signal<LoadState<ListingPage>>({ status: 'loading' });
  private readonly slugValue = signal('');
  protected readonly placeholders = [1, 2, 3, 4];

  /** Whether the member has saved this business (L2-041). */
  protected readonly saved = computed(() => {
    const state = this.state();
    return (
      state.status === 'loaded' &&
      this.savedStore.isSaved({ kind: 'business', slug: state.value.slug, name: state.value.name })
    );
  });

  /** The status of a listing that is not public, in the words of the owner workspace (L2-219 AC2). */
  protected statusWords(status: ListingStatus): string {
    return STATUS_WORDS[status];
  }

  /** What the page calls the listing: a shop, a space or a business. Known before it loads when
   * the listing was reached from a list (L2-034 AC4, L2-205 AC5). */
  protected readonly thing = computed(() => {
    const state = this.state();
    const kind = state.status === 'loaded' ? state.value.kind : this.hints.kindOf(this.slugValue());
    return kind === 'shop' ? 'shop' : kind === 'space' ? 'space' : 'business';
  });

  /** The rows under the facts of a space (L2-205 AC1): when, how long, where and the rent. */
  protected readonly spaceRows = computed<DetailRow[]>(() => {
    const state = this.state();
    const space = state.status === 'loaded' ? state.value.space : null;
    if (!space) return [];
    const available = availability(space.term, space.available);
    const rows: (DetailRow | null)[] = [
      row('Available', available === 'Available now' ? 'Now' : available),
      row('Minimum stay', space.minimumStayLabel),
      row('Neighbourhood', space.neighbourhood),
      row('Rent', `${formatRent(space.rent)} per ${space.per}`),
    ];
    return rows.filter((r): r is DetailRow => r !== null);
  });

  /** The member's open request on the space: the card says it went (L2-206). */
  protected readonly sent = computed<BookingSent | null>(() => {
    const state = this.state();
    if (state.status !== 'loaded' || !state.value.openRequestId) return null;
    const listing = state.value;
    return {
      heading: `Sent to ${hostFirstName(listing)}`,
      text: `You’ll hear back in Messages, ${replies(listing)}. The exact address is shared once they accept.`,
    };
  });

  /** The owner's photos, the cover first (L2-221). An answer from before photos were public has none. */
  private readonly photos = computed<ListingPagePhoto[]>(() => {
    const state = this.state();
    return state.status === 'loaded' ? (state.value.photos ?? []) : [];
  });

  /** The cover stands in place of the tinted tile (L2-221 AC1). */
  protected readonly cover = computed(() => this.photos()[0] ?? null);

  /** The photos after the cover, shown under "Photos". */
  protected readonly galleryPhotos = computed(() => this.photos().slice(1));

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
    this.hearts.attach();
    const params = this.route.paramMap.subscribe((map) => {
      const slug = map.get('slug') ?? '';
      // The address was moved to the listing's current slug below: the listing is already here.
      if (slug === this.slug && this.state().status === 'loaded') return;
      this.slug = slug;
      this.slugValue.set(this.slug);
      this.load();
    });
    const urls = this.route.url.subscribe((segments) =>
      this.composing.set(
        segments.length === 3 && (COMPOSING as readonly string[]).includes(segments[2].path)
          ? (segments[2].path as Composing)
          : null,
      ),
    );
    effect(() => {
      const state = this.state();
      const composing = this.composing();
      untracked(() => {
        if (composing && state.status === 'loaded' && !this.composeRef) {
          if (composing === 'book' || composing === 'quote')
            this.openRequest(state.value, composing);
          else if (composing === 'request') this.openSpaceRequest(state.value);
          else if (composing === 'share') this.openShare(state.value);
          else if (composing === 'report') this.openReport(state.value);
          else this.compose(state.value);
        }
        if (!composing) this.composeRef?.close();
      });
    });
    effect(() => {
      // Hearts need to know what is saved; a visitor has no list. Coming back from sign-in with ?save=1
      // saves the item the visitor pressed the heart for (L2-012).
      const state = this.state();
      const member = this.session.member();
      untracked(() => {
        if (!member) return;
        this.savedStore.load();
        if (state.status === 'loaded' && this.route.snapshot.queryParamMap.get('save') === '1') {
          const target = {
            kind: 'business',
            slug: state.value.slug,
            name: state.value.name,
          } as const;
          if (!this.savedStore.isSaved(target)) this.savedStore.save(target);
          void this.router.navigate([], { queryParams: { save: null }, replaceUrl: true });
        }
      });
    });
    inject(DestroyRef).onDestroy(() => {
      this.left = true;
      this.canonical?.remove();
      params.unsubscribe();
      urls.unsubscribe();
      this.request?.unsubscribe();
    });
  }

  /**
   * Names the listing's page in the app as its canonical link (L2-243 AC7): a crawler that came by
   * the listing's address, https://{slug}.jubilee.to, indexes the listing once.
   */
  private nameCanonical(slug: string): void {
    if (!this.canonical) {
      this.canonical = this.document.createElement('link');
      this.canonical.rel = 'canonical';
      this.document.head.appendChild(this.canonical);
    }
    this.canonical.href = `${this.document.location.origin}/b/${slug}`;
  }

  protected load(): void {
    this.request?.unsubscribe();
    this.state.set({ status: 'loading' });
    this.request = this.api.getListing(this.slug).subscribe({
      next: (listing) => {
        if (listing.slug !== this.slug) this.moveTo(listing.slug);
        this.hints.remember(listing.slug, listing.kind, listing.name);
        this.hints.rememberProducts(listing.products);
        this.hints.rememberCategory(listing.related, listing.category.slug);
        this.state.set({ status: 'loaded', value: listing });
        this.title.setTitle(`${listing.name} · Jubilee`);
        this.nameCanonical(listing.slug);
        // A listing that is not public shows no reviews (L2-226 AC7).
        if (listing.status === 'live') this.reviews.load(listing.slug);
        // A listing view counts for the owner's statistics; their own visits do not (L2-037),
        // and a preview is not a visit by the public (L2-219 AC3).
        if (listing.viewerRelation !== 'owner' && listing.status === 'live') {
          this.api.recordView(listing.slug).subscribe({ error: () => undefined });
        }
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

  /**
   * An old link of a renamed listing was redirected to its current slug (L2-113 AC2): the address
   * shows the current one, and what the page sends from here uses it.
   */
  private moveTo(slug: string): void {
    const from = `/b/${this.slug}`;
    this.slug = slug;
    this.slugValue.set(slug);
    void this.router.navigateByUrl(this.router.url.replace(from, `/b/${slug}`), {
      replaceUrl: true,
    });
  }

  /**
   * "Send a message" (L2-055): a member writes to the business in a dialog and carries on in
   * Messages; a visitor is asked to join or sign in first and comes back here (L2-012).
   */
  private compose(listing: ListingPage): void {
    const leave = (): void => {
      this.composeRef = undefined;
      // A "Sign in" or "Join" link navigates on its own; do not undo that.
      setTimeout(() => {
        if (!this.left && !this.router.getCurrentNavigation() && this.composing()) {
          void this.router.navigate(['/b', this.slug], { replaceUrl: true });
        }
      });
    };
    if (!this.session.member()) {
      const ref = this.dialog.open<void, SignInRequiredData>(SignInRequiredDialog, {
        data: { title: `Join to message ${listing.name}`, returnUrl: `/b/${this.slug}/message` },
        ariaLabelledBy: 'dlg-title',
        ariaDescribedBy: 'dlg-desc',
        ariaModal: true,
        backdropClass: 'backdrop',
      });
      this.composeRef = ref;
      ref.closed.subscribe(leave);
      return;
    }
    const who = listing.ownerName?.split(',')[0].trim() || listing.name;
    const replies = listing.details.replies ? ` ${WHO_REPLIES[listing.details.replies]}` : '';
    const ref = this.dialog.open<NewMessageResult, NewMessageData>(NewMessageDialog, {
      data: {
        slug: listing.slug,
        businessName: listing.name,
        answeredBy: listing.ownerName ? who.split(' ')[0] : listing.name,
        intro: replies ? `${who}${replies}.` : `Your message goes to ${who}.`,
      },
      ariaLabelledBy: 'dlg-title',
      ariaDescribedBy: 'dlg-desc',
      ariaModal: true,
      backdropClass: 'backdrop',
    });
    this.composeRef = ref;
    ref.closed.subscribe((conversationId) => {
      if (conversationId) {
        this.composeRef = undefined;
        void this.router.navigate(['/messages', conversationId]);
      } else {
        leave();
      }
    });
  }

  /**
   * "Book a meeting" (L2-044): a member asks for a time in a dialog; a visitor is asked to join
   * or sign in first and comes back to the same service.
   */
  private openRequest(listing: ListingPage, kind: 'book' | 'quote'): void {
    const service = this.route.snapshot.queryParamMap.get('service');
    const back = `/b/${this.slug}/${kind}${service ? `?service=${service}` : ''}`;
    const leave = (): void => {
      this.composeRef = undefined;
      setTimeout(() => {
        if (!this.left && !this.router.getCurrentNavigation() && this.composing()) {
          void this.router.navigate(['/b', this.slug], { replaceUrl: true });
        }
      });
    };
    const ref = this.session.member()
      ? this.dialog.open<void, BookMeetingData>(
          kind === 'book' ? BookMeetingDialog : RequestQuoteDialog,
          {
            data: { slug: listing.slug, serviceId: service },
            ariaLabelledBy: 'dlg-title',
            ariaDescribedBy: 'dlg-desc',
            ariaModal: true,
            backdropClass: 'backdrop',
          },
        )
      : this.dialog.open<void, SignInRequiredData>(SignInRequiredDialog, {
          data: {
            title:
              kind === 'book'
                ? `Join to book ${listing.name}`
                : `Join to ask ${listing.name} for a quote`,
            returnUrl: back,
          },
          ariaLabelledBy: 'dlg-title',
          ariaDescribedBy: 'dlg-desc',
          ariaModal: true,
          backdropClass: 'backdrop',
        });
    this.composeRef = ref;
    ref.closed.subscribe(leave);
  }

  /**
   * The call to action of a space (L2-206): a member asks for it in a dialog by its term; a
   * visitor is asked to join or sign in first and comes back to the same dialog (AC2). A sent
   * request turns the booking card into "Sent to …" (AC9).
   */
  private openSpaceRequest(listing: ListingPage): void {
    const space = listing.space;
    if (!space || listing.openRequestId || listing.viewerRelation === 'owner') {
      this.leaveDialog();
      return;
    }
    if (!this.session.member()) {
      const ref = this.dialog.open<void, SignInRequiredData>(SignInRequiredDialog, {
        data: { title: `Join to request ${listing.name}`, returnUrl: `/b/${this.slug}/request` },
        ariaLabelledBy: 'dlg-title',
        ariaDescribedBy: 'dlg-desc',
        ariaModal: true,
        backdropClass: 'backdrop',
      });
      this.composeRef = ref;
      ref.closed.subscribe(() => this.leaveDialog());
      return;
    }
    const ref = this.dialog.open<string, RequestSpaceData>(RequestSpaceDialog, {
      data: {
        slug: listing.slug,
        name: listing.name,
        neighbourhood: space.neighbourhood,
        term: space.term,
        rent: space.rent,
        minimumStay: space.minimumStay,
        minimumStayLabel: space.minimumStayLabel,
        callToAction: space.callToAction,
        hostFirstName: hostFirstName(listing),
        replies: replies(listing),
      },
      ariaLabelledBy: 'dlg-title',
      ariaDescribedBy: 'dlg-desc',
      ariaModal: true,
      backdropClass: 'backdrop',
    });
    this.composeRef = ref;
    ref.closed.subscribe((requestId) => {
      if (requestId) {
        this.state.update((state) =>
          state.status === 'loaded'
            ? { status: 'loaded', value: { ...state.value, openRequestId: requestId } }
            : state,
        );
      }
      this.leaveDialog();
    });
  }

  /** "Share" (L2-038): anyone, signed in or not, gets the listing's link. */
  private openShare(listing: ListingPage): void {
    const ref = this.dialog.open<void, ShareListingData>(ShareListingDialog, {
      data: { slug: listing.slug, address: listing.address, businessName: listing.name },
      ariaLabelledBy: 'dlg-title',
      ariaDescribedBy: 'dlg-desc',
      ariaModal: true,
      backdropClass: 'backdrop',
    });
    this.composeRef = ref;
    ref.closed.subscribe(() => this.leaveDialog());
  }

  /** "Report this listing" (L2-039): a member reports it privately; a visitor is asked to sign in first (AC6). */
  private openReport(listing: ListingPage): void {
    const ref = this.session.member()
      ? this.dialog.open<void, ReportListingData>(ReportListingDialog, {
          data: { slug: listing.slug, businessName: listing.name },
          ariaLabelledBy: 'dlg-title',
          ariaDescribedBy: 'dlg-desc',
          ariaModal: true,
          backdropClass: 'backdrop',
        })
      : this.dialog.open<void, SignInRequiredData>(SignInRequiredDialog, {
          data: { title: `Join to report ${listing.name}`, returnUrl: `/b/${this.slug}/report` },
          ariaLabelledBy: 'dlg-title',
          ariaDescribedBy: 'dlg-desc',
          ariaModal: true,
          backdropClass: 'backdrop',
        });
    this.composeRef = ref;
    ref.closed.subscribe(() => this.leaveDialog());
  }

  /** The dialog closed: the address goes back to the listing, unless a link in the dialog navigates on its own. */
  private leaveDialog(): void {
    this.composeRef = undefined;
    setTimeout(() => {
      if (!this.left && !this.router.getCurrentNavigation() && this.composing()) {
        void this.router.navigate(['/b', this.slug], { replaceUrl: true });
      }
    });
  }

  /** The heart (L2-041): a member saves or unsaves at once; a visitor is asked to join or sign in first. */
  protected toggleSave(listing: ListingPage, button: HTMLElement): void {
    if (!this.session.member()) {
      this.dialog.open<void, SignInRequiredData>(SignInRequiredDialog, {
        data: { title: `Join to save ${listing.name}`, returnUrl: `/b/${listing.slug}?save=1` },
        ariaLabelledBy: 'dlg-title',
        ariaDescribedBy: 'dlg-desc',
        ariaModal: true,
        backdropClass: 'backdrop',
        restoreFocus: button,
      });
      return;
    }
    this.savedStore.toggle({ kind: 'business', slug: listing.slug, name: listing.name });
  }

  /**
   * What a review of this listing may be about, for the Edit dialog (L2-233 AC1): a business's
   * services. A shop's review keeps the product it is about, and a space's is about the stay.
   */
  protected reviewItems(listing: ListingPage): ReviewItemOption[] {
    return listing.kind === 'services'
      ? listing.services.map(({ id, name }) => ({ id, name }))
      : [];
  }

  /** The tile that stands for a space's photo, by its term. */
  protected spaceTile(space: SpaceDetails): (typeof TERM_TILES)[keyof typeof TERM_TILES] {
    return TERM_TILES[space.term];
  }

  /** The route of an action of a later journey on this listing (ADR 0007). */
  protected link(action: string): string[] {
    return ['/b', this.slug, action];
  }
}

const COMPOSING = ['message', 'book', 'quote', 'request', 'share', 'report'] as const;
type Composing = (typeof COMPOSING)[number];

/** "Paul" of "Paul & Marta Kowalski": who a member writes to about a space. */
function hostFirstName(listing: ListingPage): string {
  return listing.ownerName?.split(/[ ,&]/)[0].trim() || listing.name;
}

/** "usually within a day": how soon the host answers, a day when there is too little to say. */
function replies(listing: ListingPage): string {
  return listing.details.replies
    ? WHO_REPLIES[listing.details.replies].replace('replies ', '')
    : 'usually within a day';
}

function row(term: string, value: string | null): DetailRow | null {
  return value ? { term, value } : null;
}

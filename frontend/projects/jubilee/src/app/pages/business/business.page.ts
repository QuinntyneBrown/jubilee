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
import { LoadState, errorReference } from '../../services/load-state';
import { SessionService } from '../../services/session.service';

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
  private readonly session = inject(SessionService);
  private readonly dialog = inject(Dialog);
  private slug = '';
  /** True while the address is /b/:slug/message: "Send a message" opens the message dialog. */
  private readonly composing = signal(false);
  private composeRef?: { close: () => void };

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
    const urls = this.route.url.subscribe((segments) =>
      this.composing.set(segments.at(-1)?.path === 'message'),
    );
    effect(() => {
      const state = this.state();
      const composing = this.composing();
      untracked(() => {
        if (composing && state.status === 'loaded' && !this.composeRef) this.compose(state.value);
        if (!composing) this.composeRef?.close();
      });
    });
    inject(DestroyRef).onDestroy(() => {
      params.unsubscribe();
      urls.unsubscribe();
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
        // A listing view counts for the owner's statistics; their own visits do not (L2-037).
        if (listing.viewerRelation !== 'owner') {
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
   * "Send a message" (L2-055): a member writes to the business in a dialog and carries on in
   * Messages; a visitor is asked to join or sign in first and comes back here (L2-012).
   */
  private compose(listing: ListingPage): void {
    const leave = (): void => {
      this.composeRef = undefined;
      // A "Sign in" or "Join" link navigates on its own; do not undo that.
      setTimeout(() => {
        if (!this.router.getCurrentNavigation() && this.composing()) {
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

  /** The route of an action of a later journey on this listing (ADR 0007). */
  protected link(action: string): string[] {
    return ['/b', this.slug, action];
  }
}

function row(term: string, value: string | null): DetailRow | null {
  return value ? { term, value } : null;
}

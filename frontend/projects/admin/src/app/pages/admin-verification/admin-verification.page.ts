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
import { ADMIN_API, DecisionResult, ReferenceState, ReviewSpace, VerificationReview } from 'api';
import {
  EmptyState,
  Icon,
  categoryTile,
  Button,
  Alert,
  FieldError,
  Checkbox,
  Skeleton,
  Badge,
  BadgeTone,
  Card,
  PageHeader,
  Breadcrumb,
  DescriptionList,
  DescriptionItem,
  BusinessCardPreview,
  SpaceCardPreview,
  SpaceCardView,
  formatRent,
} from 'components';
import {
  ApproveListingDialog,
  ApproveListingData,
} from '../../dialogs/approve-listing/approve-listing.dialog';
import {
  DeclineListingDialog,
  DeclineListingData,
} from '../../dialogs/decline-listing/decline-listing.dialog';
import {
  RequestChangesDialog,
  RequestChangesData,
} from '../../dialogs/request-changes/request-changes.dialog';
import { ClockService } from 'api';
import { LoadState, errorReference } from 'api';
import { dayHeading, clockTime } from 'api';

const ANSWERS: Record<string, { label: string; tone: BadgeTone }> = {
  vouches: { label: 'Knows them and can vouch', tone: 'success' },
  'cant-vouch': { label: 'Knows them but can’t vouch', tone: 'danger' },
  'doesnt-know': { label: 'Doesn’t know them', tone: 'danger' },
};

/** A space's term as the owner chose it (L2-196). */
const TERM_NAMES: Record<ReviewSpace['term'], string> = {
  'short-stay': 'Short stay',
  'long-term': 'Long term',
  room: 'Room',
  roommate: 'Roommate',
};

const WAITING_STATES: ReferenceState[] = ['waiting', 'expired', 'deleted'];

/**
 * The review of one submitted listing at /verifications/:id (L2-100 to L2-104): the owner,
 * the church reference's private answer, the checklist and the three decisions.
 */
@Component({
  selector: 'jb-admin-verification-page',
  imports: [
    RouterLink,
    EmptyState,
    Icon,
    Button,
    Alert,
    FieldError,
    Checkbox,
    Skeleton,
    Badge,
    Card,
    PageHeader,
    Breadcrumb,
    DescriptionList,
    DescriptionItem,
    BusinessCardPreview,
    SpaceCardPreview,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'jb-page container page' },
  templateUrl: './admin-verification.page.html',
})
export class AdminVerificationPage implements OnInit {
  private readonly api = inject(ADMIN_API);
  private readonly dialog = inject(Dialog);
  private readonly clock = inject(ClockService);

  private readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';

  protected readonly state = signal<LoadState<VerificationReview>>({ status: 'loading' });
  /** The checklist as ticked on screen; saved to the server on every change. */
  protected readonly ticked = signal<string[]>([]);
  protected readonly saveFailed = signal(false);
  protected readonly decided = signal<DecisionResult | null>(null);

  protected readonly review = computed(() => {
    const state = this.state();
    return state.status === 'loaded' ? state.value : null;
  });
  protected readonly tile = computed(() => {
    const review = this.review();
    return review ? categoryTile(review.categorySlug) : null;
  });
  /** Only a listing that is ready to review, or needs a decision, can still be decided. */
  protected readonly open = computed(() => {
    const review = this.review();
    return (
      review !== null &&
      !review.isOwnListing &&
      (review.stage === 'ready-to-review' || review.stage === 'needs-a-decision')
    );
  });
  protected readonly canApprove = computed(
    () => this.open() && !this.review()?.cannotDecideBecause,
  );
  protected readonly canDecline = computed(
    () => this.open() && this.review()?.stage === 'needs-a-decision',
  );
  protected readonly unticked = computed(
    () => (this.review()?.checklist.length ?? 0) - this.ticked().length,
  );
  protected readonly answer = computed(() => {
    const answer = this.review()?.reference.answer;
    return answer ? ANSWERS[answer] : null;
  });
  /** A space's rows, in the order the owner filled them in (L2-199 AC3). */
  protected readonly spaceRows = computed(() => {
    const space = this.review()?.space;
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
    const review = this.review();
    const space = review?.space;
    if (!review || !space) return null;
    return {
      name: review.name,
      term: space.term,
      rent: space.rent,
      per: space.per,
      facts: space.facts,
      neighbourhood: space.neighbourhood,
      available: space.available,
    };
  });
  protected readonly noAnswer = computed(() => {
    const state = this.review()?.reference.state;
    return state !== undefined && WAITING_STATES.includes(state);
  });

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.state.set({ status: 'loading' });
    this.api.review(this.id).subscribe({
      next: (review) => {
        this.ticked.set(review.checklist.filter((c) => c.ticked).map((c) => c.key));
        this.state.set({ status: 'loaded', value: review });
      },
      error: (error: unknown) =>
        this.state.set({ status: 'error', reference: errorReference(error, 'JB-ADM-502') }),
    });
  }

  protected tick(key: string, on: boolean): void {
    const before = this.ticked();
    const next = on ? [...before, key] : before.filter((k) => k !== key);
    this.ticked.set(next);
    this.saveFailed.set(false);
    this.api.saveChecklist(this.id, next).subscribe({
      error: () => {
        this.ticked.set(before);
        this.saveFailed.set(true);
      },
    });
  }

  protected when(iso: string): string {
    return `${dayHeading(iso, this.clock.now()).split(' · ')[0].toLowerCase()}, ${clockTime(iso)}`;
  }

  protected approve(review: VerificationReview): void {
    this.open$<ApproveListingData>(ApproveListingDialog, {
      id: review.id,
      name: review.name,
      ownerFirstName: this.first(review),
      category: review.categoryName,
      unticked: this.unticked(),
    });
  }

  protected requestChanges(review: VerificationReview): void {
    this.open$<RequestChangesData>(RequestChangesDialog, {
      id: review.id,
      ownerFirstName: this.first(review),
    });
  }

  protected decline(review: VerificationReview): void {
    this.open$<DeclineListingData>(DeclineListingDialog, {
      id: review.id,
      name: review.name,
      ownerFirstName: this.first(review),
    });
  }

  private first(review: VerificationReview): string {
    return review.owner.name.split(' ')[0];
  }

  private open$<D>(component: new (...args: never[]) => unknown, data: D): void {
    const ref = this.dialog.open<DecisionResult, D>(component as never, {
      data,
      ariaLabelledBy: 'dlg-title',
      ariaDescribedBy: 'dlg-desc',
      ariaModal: true,
      backdropClass: 'backdrop',
    });
    ref.closed.subscribe((result) => {
      if (!result) return;
      this.decided.set(result);
      this.load();
    });
  }
}

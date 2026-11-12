import { Dialog } from '@angular/cdk/dialog';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable, switchMap, of } from 'rxjs';
import {
  CATEGORIES,
  DraftItem,
  LISTING_DRAFTS_API,
  ListingDraft,
  ListingDraftBody,
  OfferKind,
  SpaceDraft,
  SpaceTerm,
  SubmittedListing,
} from 'api';
import { FormsModule } from '@angular/forms';
import {
  Chip,
  SpaceCardPreview,
  SpaceCardView,
  Textarea,
  InputGroup,
  InputAddon,
  Icon,
  MediaTile,
  categoryTile,
  formatPrice,
  Button,
  Alert,
  FormSummary,
  FieldError,
  FieldHelp,
  Field,
  Input,
  Select,
  Checkbox,
  ChoiceCard,
  ChoiceCards,
  Skeleton,
  Card,
  ItemList,
  ItemListItem,
  ItemListName,
  Timeline,
  TimelineStep,
  Price,
  EmptyState,
  BusinessCardPreview,
} from 'components';
import { ListingItemDialog } from '../../dialogs/listing-item/listing-item.dialog';
import { SessionService } from '../../services/session.service';
import { clockTime, newKey } from 'api';

type FieldName =
  | 'name'
  | 'tagline'
  | 'categorySlug'
  | 'rent'
  | 'available'
  | 'neighbourhood'
  | 'address'
  | 'household'
  | 'church'
  | 'pastorEmail'
  | 'agreed';

/** The server names a space's fields `space.rent` and so on (L2-190). */
const SPACE_FIELDS: Record<string, FieldName> = {
  'space.rent': 'rent',
  'space.available': 'available',
  'space.neighbourhood': 'neighbourhood',
  'space.address': 'address',
  'space.household': 'household',
};

/** The four terms as the form offers them (L2-190 AC1). */
const TERM_CHOICES: readonly { value: SpaceTerm; label: string; text: string }[] = [
  {
    value: 'short-stay',
    label: 'Short stays',
    text: 'Nights or weekends: a guest suite, a hall by the hour.',
  },
  {
    value: 'long-term',
    label: 'Long term',
    text: 'A whole apartment, suite or house, by the month.',
  },
  { value: 'room', label: 'Rooms', text: 'A private room in a home you live in.' },
  { value: 'roommate', label: 'Roommates', text: 'Share a place you rent with someone new.' },
];

/** The minimum stays a term offers (L2-190 AC2): nights for a Short stay, months otherwise. */
const NIGHTS = [
  { value: '1', label: '1 night' },
  { value: '2', label: '2 nights' },
  { value: '3', label: '3 nights' },
  { value: '7', label: '1 week' },
];
const MONTHS = [
  { value: '1', label: 'Month to month' },
  { value: '4', label: '4 months' },
  { value: '6', label: '6 months' },
  { value: '12', label: '12-month lease' },
];

/** "The space" (L2-190 AC3). */
const PLACES = [
  'Private room',
  'Basement apartment',
  'Guest suite',
  'Entire house',
  'Condo',
  'Event hall',
];

/** "What’s included" (L2-190 AC3). */
const INCLUSIONS = [
  'Utilities',
  'Wi-Fi',
  'Laundry',
  'Furnished',
  'Parking',
  'Private bath',
  'Kitchen use',
  'Pets OK',
];

const MAX_RENT = 50_000;

/** The element each field's summary link and first-invalid focus go to. */
const FIELD_ID: Record<FieldName, string> = {
  name: 'name',
  tagline: 'tagline',
  categorySlug: 'cat',
  rent: 'price',
  available: 'avail',
  neighbourhood: 'area',
  address: 'address',
  household: 'household',
  church: 'ref-church',
  pastorEmail: 'ref-email',
  agreed: 'agree',
};

const FIELD_ORDER: FieldName[] = [
  'name',
  'tagline',
  'categorySlug',
  'rent',
  'available',
  'neighbourhood',
  'address',
  'household',
  'church',
  'pastorEmail',
  'agreed',
];
const AUTOSAVE_MS = 10_000;
const TAGLINE_MAX = 90;

/** FieldName-level wording (L2-071 to L2-079). Codes come from the server or from the same checks here. */
export function messageFor(field: FieldName, code: string, space = false): string {
  if (code.startsWith('TOO_LONG')) {
    const n = code.split(':')[1] ?? '';
    return `Shorten this to ${TAGLINE_MAX} characters. It has ${n}.`;
  }
  switch (field) {
    case 'name':
      return space
        ? 'Enter a title that says what it is and where.'
        : 'Enter your business name as customers know it.';
    case 'tagline':
      return space ? 'Enter one line renters should know.' : 'Enter one line on what you do.';
    case 'rent':
      return code === 'TOO_HIGH'
        ? 'Enter a rent of $50,000 or less.'
        : 'Enter the rent in whole dollars, like 950.';
    case 'available':
      return 'Say when renters can move in, like Mar 1 or Now.';
    case 'neighbourhood':
      return 'Enter the neighbourhood, like The Annex.';
    case 'address':
      return 'Enter the exact address. Renters only see it once you accept them.';
    case 'household':
      return 'Tell renters who lives there in a line or two.';
    case 'categorySlug':
      return 'Choose a category.';
    case 'church':
      return 'Enter your church’s name.';
    case 'pastorEmail':
      return code === 'OWN_EMAIL'
        ? 'Your reference must be someone other than you.'
        : 'Enter your pastor’s e-mail address, like name@church.ca.';
    case 'agreed':
      return space
        ? 'Agree to the statement of faith and the rental terms to submit your space.'
        : 'Agree to the statement of faith to submit your listing.';
  }
}

/** The summary's shorter wording ("Enter your business name"). */
function summaryFor(field: FieldName, code: string, space: boolean): string {
  if (code.startsWith('TOO_LONG') || code === 'OWN_EMAIL') return messageFor(field, code, space);
  const text = messageFor(field, code, space);
  switch (field) {
    case 'name':
      return space ? 'Enter a listing title' : 'Enter your business name';
    case 'pastorEmail':
      return 'Enter your pastor’s e-mail address';
    case 'agreed':
      return space
        ? 'Agree to the statement of faith and the rental terms'
        : 'Agree to the statement of faith';
    default:
      return text.replace(/\.$/, '');
  }
}

/**
 * ListBusinessPage (L2-071 to L2-079): the member writes the listing, sees how it will look, saves a
 * draft and submits it for verification. Items are added through a dialog, never inline.
 */
@Component({
  selector: 'jb-list-business-page',
  imports: [
    FormsModule,
    RouterLink,
    Icon,
    MediaTile,
    Button,
    Alert,
    FormSummary,
    Field,
    FieldError,
    FieldHelp,
    Input,
    Select,
    Checkbox,
    ChoiceCard,
    ChoiceCards,
    Skeleton,
    Card,
    ItemList,
    ItemListItem,
    ItemListName,
    Timeline,
    TimelineStep,
    Price,
    EmptyState,
    BusinessCardPreview,
    Chip,
    SpaceCardPreview,
    Textarea,
    InputGroup,
    InputAddon,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './list-business.page.html',
})
export class ListBusinessPage {
  private readonly api = inject(LISTING_DRAFTS_API);
  private readonly dialog = inject(Dialog);
  private readonly route = inject(ActivatedRoute);
  protected readonly session = inject(SessionService);

  protected readonly categories = CATEGORIES;
  protected readonly format = formatPrice;
  protected readonly taglineMax = TAGLINE_MAX;

  protected readonly loading = signal(true);
  protected readonly loadFailed = signal(false);

  protected readonly kind = signal<OfferKind>('products');
  protected readonly name = signal('');
  protected readonly tagline = signal('');
  protected readonly categorySlug = signal('shops');
  protected readonly place = signal('');
  protected readonly church = signal('');
  protected readonly pastorEmail = signal('');
  protected readonly agreed = signal(false);
  protected readonly items = signal<DraftItem[]>([]);

  // A space (L2-189, L2-190).
  protected readonly termChoices = TERM_CHOICES;
  protected readonly places = PLACES;
  protected readonly inclusions = INCLUSIONS;
  protected readonly term = signal<SpaceTerm>('long-term');
  protected readonly rent = signal('');
  protected readonly available = signal('');
  protected readonly minimumStay = signal('1');
  protected readonly neighbourhood = signal('');
  protected readonly address = signal('');
  protected readonly spacePlace = signal(PLACES[0]);
  protected readonly facts = signal('');
  protected readonly included = signal<string[]>([]);
  protected readonly household = signal('');
  protected readonly rules = signal('');

  protected readonly errors = signal<Partial<Record<FieldName, string>>>({});
  protected readonly summary = computed(() =>
    FIELD_ORDER.filter((f) => this.errors()[f]).map((f) => ({
      field: f,
      id: FIELD_ID[f],
      text: summaryFor(f, this.codes[f] ?? '', this.isSpace()),
    })),
  );
  protected readonly failed = signal('');
  protected readonly busy = signal(false);
  protected readonly savedAt = signal<string | null>(null);
  protected readonly submitted = signal<SubmittedListing | null>(null);

  protected readonly tile = computed(() => categoryTile(this.categorySlug()));
  protected readonly isServices = computed(() => this.kind() === 'services');
  protected readonly isSpace = computed(() => this.kind() === 'space');
  protected readonly nightly = computed(() => this.term() === 'short-stay');
  protected readonly minimumChoices = computed(() => (this.nightly() ? NIGHTS : MONTHS));
  /** A Room or a Roommate says who lives there (L2-190 AC4). */
  protected readonly householdLabel = computed(() =>
    this.term() === 'room'
      ? 'Who lives in the home'
      : this.term() === 'roommate'
        ? 'Who you are, and who you’re looking for'
        : null,
  );

  /** How renters will see the space while it is written (L2-189 AC3). */
  protected readonly spacePreview = computed<SpaceCardView>(() => ({
    name: this.name().trim() || 'Your listing title',
    term: this.term(),
    rent: wholeDollars(this.rent()) ?? 0,
    per: this.nightly() ? 'night' : 'month',
    facts: lines(this.facts()),
    neighbourhood: this.neighbourhood().trim() || 'Neighbourhood',
    available: this.available().trim(),
  }));
  protected readonly placeLabel = computed(() =>
    this.isServices() ? 'Area you serve' : 'Store address',
  );
  protected readonly taglineCount = computed(() => this.tagline().length);

  private draftId: string | null = null;
  private codes: Partial<Record<FieldName, string>> = {};
  private readonly key = newKey();
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.clearTimer());
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.loadFailed.set(false);
    const wanted = this.route.snapshot.queryParamMap.get('draft');
    // /list?kind=space opens the space form (L2-189 AC2); a saved draft has the last word.
    if (this.route.snapshot.queryParamMap.get('kind') === 'space') this.kind.set('space');
    const source: Observable<ListingDraft | null> =
      wanted === 'new' ? of(null) : wanted ? this.api.get(wanted) : this.api.current();
    source.subscribe({
      next: (draft) => {
        if (draft) this.apply(draft);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.loadFailed.set(true);
      },
    });
  }

  private apply(draft: ListingDraft): void {
    this.draftId = draft.id;
    this.kind.set(draft.kind);
    this.name.set(draft.name);
    this.tagline.set(draft.tagline);
    this.categorySlug.set(draft.categorySlug ?? 'shops');
    this.place.set(draft.place ?? '');
    this.church.set(draft.church);
    this.pastorEmail.set(draft.pastorEmail);
    this.agreed.set(draft.agreed);
    this.items.set(draft.items);
    const space = draft.space;
    if (space) {
      this.term.set(space.term);
      this.rent.set(space.rent ? String(space.rent) : '');
      this.available.set(space.available);
      this.minimumStay.set(String(space.minimumStay));
      this.neighbourhood.set(space.neighbourhood);
      this.address.set(space.address);
      this.spacePlace.set(space.place || PLACES[0]);
      this.facts.set(space.facts.join('\n'));
      this.included.set([...space.included]);
      this.household.set(space.household ?? '');
      this.rules.set(space.rules.join('\n'));
    }
  }

  /** A change of term keeps what was typed; only a minimum stay the new term lacks resets (AC5). */
  protected setTerm(term: SpaceTerm): void {
    if (term === this.term()) return;
    this.term.set(term);
    if (!this.minimumChoices().some((c) => c.value === this.minimumStay())) {
      this.minimumStay.set(this.minimumChoices()[0].value);
    }
    this.clear('household');
    this.touched();
  }

  protected toggleIncluded(item: string): void {
    this.included.update((list) =>
      list.includes(item) ? list.filter((i) => i !== item) : [...list, item],
    );
    this.touched();
  }

  protected setKind(kind: OfferKind): void {
    if (kind === this.kind()) return;
    this.kind.set(kind);
    this.items.set([]);
    this.touched();
  }

  /** Called on every edit: the draft saves itself once the member has been idle. */
  protected touched(): void {
    this.savedAt.set(null);
    this.clearTimer();
    this.timer = setTimeout(() => this.saveDraft(true), AUTOSAVE_MS);
  }

  private clearTimer(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  private body(): ListingDraftBody {
    return {
      kind: this.kind(),
      name: this.name().trim(),
      tagline: this.tagline().trim(),
      categorySlug: this.isSpace() ? null : this.categorySlug() || null,
      highlight: null,
      place: this.isSpace() ? null : this.place().trim() || null,
      church: this.church().trim(),
      pastorEmail: this.pastorEmail().trim(),
      agreed: this.agreed(),
      items: this.isSpace() ? [] : this.items(),
      space: this.isSpace() ? this.spaceBody() : null,
      idempotencyKey: null,
    };
  }

  private spaceBody(): SpaceDraft {
    return {
      term: this.term(),
      rent: wholeDollars(this.rent()),
      available: this.available().trim(),
      minimumStay: Number(this.minimumStay()),
      neighbourhood: this.neighbourhood().trim(),
      address: this.address().trim(),
      place: this.spacePlace(),
      facts: lines(this.facts()),
      included: INCLUSIONS.filter((item) => this.included().includes(item)),
      household: this.householdLabel() ? this.household().trim() || null : null,
      rules: lines(this.rules()),
    };
  }

  private persist(body: ListingDraftBody): Observable<ListingDraft> {
    const id = this.draftId;
    return id ? this.api.save(id, body) : this.api.create(body);
  }

  protected saveDraft(auto = false): void {
    if (this.busy()) return;
    this.clearTimer();
    this.persist(this.body()).subscribe({
      next: (draft) => {
        this.draftId = draft.id;
        this.savedAt.set(clockTime(draft.updatedAt));
      },
      error: (error) => {
        if (!auto) this.failed.set(this.problemText(error));
      },
    });
  }

  protected removeItem(index: number): void {
    this.items.update((list) => list.filter((_, i) => i !== index));
    this.touched();
  }

  protected addItem(): void {
    this.dialog
      .open<DraftItem | undefined>(ListingItemDialog, {
        data: { kind: this.kind() },
        ariaLabelledBy: 'dlg-title',
        ariaDescribedBy: 'dlg-desc',
        panelClass: 'dialog-overlay',
        backdropClass: 'dialog-backdrop',
      })
      .closed.subscribe((item) => {
        if (!item) return;
        this.items.update((list) => [...list, item]);
        this.touched();
      });
  }

  private check(): Partial<Record<FieldName, string>> {
    const codes: Partial<Record<FieldName, string>> = {};
    if (!this.name().trim()) codes.name = 'REQUIRED';
    const tagline = this.tagline().trim();
    if (!tagline) codes.tagline = 'REQUIRED';
    else if (tagline.length > TAGLINE_MAX) codes.tagline = `TOO_LONG:${tagline.length}`;
    if (this.isSpace()) {
      const rent = wholeDollars(this.rent());
      if (!rent) codes.rent = 'REQUIRED';
      else if (rent > MAX_RENT) codes.rent = 'TOO_HIGH';
      if (!this.available().trim()) codes.available = 'REQUIRED';
      if (!this.neighbourhood().trim()) codes.neighbourhood = 'REQUIRED';
      if (!this.address().trim()) codes.address = 'REQUIRED';
      if (this.householdLabel() && !this.household().trim()) codes.household = 'REQUIRED';
    } else if (!this.categorySlug()) codes.categorySlug = 'REQUIRED';
    if (!this.church().trim()) codes.church = 'REQUIRED';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.pastorEmail().trim()))
      codes.pastorEmail = 'INVALID';
    if (!this.agreed()) codes.agreed = 'REQUIRED';
    return codes;
  }

  private show(codes: Partial<Record<FieldName, string>>): void {
    this.codes = codes;
    const errors: Partial<Record<FieldName, string>> = {};
    for (const field of FIELD_ORDER) {
      const code = codes[field];
      if (code) errors[field] = messageFor(field, code, this.isSpace());
    }
    this.errors.set(errors);
    if (Object.keys(errors).length) {
      setTimeout(() => document.getElementById('summary')?.focus());
    }
  }

  protected submit(): void {
    if (this.busy() || this.session.unconfirmed()) return;
    this.failed.set('');
    const codes = this.check();
    this.show(codes);
    if (Object.keys(codes).length) return;
    this.clearTimer();
    this.busy.set(true);
    const body = { ...this.body(), idempotencyKey: this.key };
    this.persist(this.body())
      .pipe(
        switchMap((draft) => {
          this.draftId = draft.id;
          return this.api.submit(draft.id, body);
        }),
      )
      .subscribe({
        next: (listing) => {
          this.busy.set(false);
          this.submitted.set(listing);
          window.scrollTo({ top: 0 });
        },
        error: (error) => {
          this.busy.set(false);
          if (error instanceof HttpErrorResponse && error.status === 422 && error.error?.errors) {
            this.show(fieldCodes(error.error.errors as Record<string, string>));
            return;
          }
          this.failed.set(this.problemText(error));
        },
      });
  }

  private problemText(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.status === 409 && error.error?.detail) {
      return error.error.detail as string;
    }
    return 'We couldn’t save that. Try again.';
  }

  protected clear(field: FieldName): void {
    if (!this.errors()[field]) return;
    this.errors.update((e) => ({ ...e, [field]: undefined }));
  }
}

/** The server's codes by the form's field names: `space.rent` is the rent field. */
function fieldCodes(errors: Record<string, string>): Partial<Record<FieldName, string>> {
  const codes: Partial<Record<FieldName, string>> = {};
  for (const [key, code] of Object.entries(errors)) {
    const field = (SPACE_FIELDS[key] ?? key) as FieldName;
    if (field in FIELD_ID) codes[field] = code;
  }
  return codes;
}

/** "1,850" or "$950" as whole dollars; null when there is no number. */
function wholeDollars(text: string): number | null {
  const digits = text.replace(/[^0-9]/g, '');
  return digits ? Number(digits) : null;
}

/** One entry per line, without the empty ones (key facts, house rules). */
function lines(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

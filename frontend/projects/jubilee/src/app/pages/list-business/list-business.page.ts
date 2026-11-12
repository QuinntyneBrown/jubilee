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
  SpaceTerm,
  SubmittedListing,
} from 'api';
import { FormsModule } from '@angular/forms';
import {
  Chip,
  SpaceCardPreview,
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
import {
  INCLUSIONS,
  PLACES,
  SPACE_FIELDS,
  SpaceForm,
  TERM_CHOICES,
  spaceMessage,
} from '../../services/space-form';

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
    case 'available':
    case 'neighbourhood':
    case 'address':
    case 'household':
      return spaceMessage(field, code);
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

  // A space (L2-197, L2-198), its fields held by the form the editor shares (L2-208).
  private readonly space = new SpaceForm();
  protected readonly termChoices = TERM_CHOICES;
  protected readonly places = PLACES;
  protected readonly inclusions = INCLUSIONS;
  protected readonly term = this.space.term;
  protected readonly rent = this.space.rent;
  protected readonly available = this.space.available;
  protected readonly minimumStay = this.space.minimumStay;
  protected readonly neighbourhood = this.space.neighbourhood;
  protected readonly address = this.space.address;
  protected readonly spacePlace = this.space.place;
  protected readonly facts = this.space.facts;
  protected readonly included = this.space.included;
  protected readonly household = this.space.household;
  protected readonly rules = this.space.rules;

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
  protected readonly nightly = this.space.nightly;
  protected readonly minimumChoices = this.space.minimumChoices;
  protected readonly householdLabel = this.space.householdLabel;
  /** How renters will see the space while it is written (L2-197 AC3). */
  protected readonly spacePreview = computed(() => this.space.preview(this.name()));
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
    // /list?kind=space opens the space form (L2-197 AC2); a saved draft has the last word.
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
    if (draft.space) this.space.apply(draft.space);
  }

  /** A change of term keeps what was typed; only a minimum stay the new term lacks resets (AC5). */
  protected setTerm(term: SpaceTerm): void {
    if (!this.space.setTerm(term)) return;
    this.clear('household');
    this.touched();
  }

  protected toggleIncluded(item: string): void {
    this.space.toggleIncluded(item);
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
      space: this.isSpace() ? this.space.body() : null,
      idempotencyKey: null,
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
    if (this.isSpace()) Object.assign(codes, this.space.check());
    else if (!this.categorySlug()) codes.categorySlug = 'REQUIRED';
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

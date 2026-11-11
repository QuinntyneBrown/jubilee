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
  SubmittedListing,
} from 'api';
import { FormsModule } from '@angular/forms';
import {
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
  Perk,
} from 'components';
import { ListingItemDialog } from '../../dialogs/listing-item/listing-item.dialog';
import { SessionService } from '../../services/session.service';
import { clockTime, newKey } from '../../services/message-time';

type FieldName = 'name' | 'tagline' | 'categorySlug' | 'church' | 'pastorEmail' | 'agreed';

/** The element each field's summary link and first-invalid focus go to. */
const FIELD_ID: Record<FieldName, string> = {
  name: 'name',
  tagline: 'tagline',
  categorySlug: 'cat',
  church: 'ref-church',
  pastorEmail: 'ref-email',
  agreed: 'agree',
};

const FIELD_ORDER: FieldName[] = [
  'name',
  'tagline',
  'categorySlug',
  'church',
  'pastorEmail',
  'agreed',
];
const AUTOSAVE_MS = 10_000;
const TAGLINE_MAX = 90;

/** FieldName-level wording (L2-071 to L2-079). Codes come from the server or from the same checks here. */
export function messageFor(field: FieldName, code: string): string {
  if (code.startsWith('TOO_LONG')) {
    const n = code.split(':')[1] ?? '';
    return `Shorten this to ${TAGLINE_MAX} characters. It has ${n}.`;
  }
  switch (field) {
    case 'name':
      return 'Enter your business name as customers know it.';
    case 'tagline':
      return 'Enter one line on what you do.';
    case 'categorySlug':
      return 'Choose a category.';
    case 'church':
      return 'Enter your church’s name.';
    case 'pastorEmail':
      return code === 'OWN_EMAIL'
        ? 'Your reference must be someone other than you.'
        : 'Enter your pastor’s e-mail address, like name@church.ca.';
    case 'agreed':
      return 'Agree to the statement of faith to submit your listing.';
  }
}

/** The summary's shorter wording ("Enter your business name"). */
function summaryFor(field: FieldName, code: string): string {
  if (code.startsWith('TOO_LONG') || code === 'OWN_EMAIL') return messageFor(field, code);
  const text = messageFor(field, code);
  switch (field) {
    case 'name':
      return 'Enter your business name';
    case 'pastorEmail':
      return 'Enter your pastor’s e-mail address';
    case 'agreed':
      return 'Agree to the statement of faith';
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
    Perk,
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

  protected readonly errors = signal<Partial<Record<FieldName, string>>>({});
  protected readonly summary = computed(() =>
    FIELD_ORDER.filter((f) => this.errors()[f]).map((f) => ({
      field: f,
      id: FIELD_ID[f],
      text: summaryFor(f, this.codes[f] ?? ''),
    })),
  );
  protected readonly failed = signal('');
  protected readonly busy = signal(false);
  protected readonly savedAt = signal<string | null>(null);
  protected readonly submitted = signal<SubmittedListing | null>(null);

  protected readonly tile = computed(() => categoryTile(this.categorySlug()));
  protected readonly isServices = computed(() => this.kind() === 'services');
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
      categorySlug: this.categorySlug() || null,
      highlight: null,
      place: this.place().trim() || null,
      church: this.church().trim(),
      pastorEmail: this.pastorEmail().trim(),
      agreed: this.agreed(),
      items: this.items(),
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
    if (!this.categorySlug()) codes.categorySlug = 'REQUIRED';
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
      if (code) errors[field] = messageFor(field, code);
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
            this.show(error.error.errors as Partial<Record<FieldName, string>>);
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

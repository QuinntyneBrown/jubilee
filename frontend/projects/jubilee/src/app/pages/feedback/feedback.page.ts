import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  BugFrequency,
  BugPlace,
  ClockService,
  FEEDBACK_API,
  FeedbackArea,
  FeedbackItem,
  KUDOS_CHIPS,
  KudosBusiness,
  KudosChip,
  RATING_WORDS,
  feedbackStatusLabel,
  feedbackTitle,
  newKey,
  threadTime,
} from 'api';
import {
  Alert,
  BackLink,
  Button,
  Checkbox,
  Chip,
  ChoiceCard,
  ChoiceCards,
  EmptyState,
  FeedbackHistory,
  FeedbackHistoryItem,
  Field,
  FieldHelp,
  FileList,
  FileListItem,
  PageHeader,
  ScoreRow,
  ScoreRows,
  ScoreScale,
  Select,
  StarScale,
  TabList,
  TabListItem,
  Textarea,
} from 'components';
import { Observable, concatMap, from, map, of, switchMap, tap, timeout, toArray } from 'rxjs';
import { APP_VERSION } from '../../app-version';
import {
  ANSWER_MAX,
  FeedbackFailure,
  NOTE_MAX,
  SUBMIT_TIMEOUT_MS,
  feedbackFailure,
} from '../../dialogs/feedback/feedback-words';
import { MAX_PHOTO_BYTES, PhotoAttachmentService } from '../../services/photo-attachment.service';
import { SessionService } from '../../services/session.service';
import { FormDraftDirective } from '../../drafts/form-draft.directive';

type Tab = 'rate' | 'bug' | 'kudos';
type View = 'form' | 'busy' | 'failed' | 'sent';
type FieldName = 'rating' | 'where' | 'happened' | 'expected' | 'chips' | 'business' | 'note';

/** A screenshot the member chose; `storedId` is set once it was uploaded. */
interface Screenshot extends FileListItem {
  file: Blob;
  storedId: string | null;
}

const TABS: TabListItem<Tab>[] = [
  { key: 'rate', label: 'Rate', icon: 'star' },
  { key: 'bug', label: 'Report a bug', icon: 'bug' },
  { key: 'kudos', label: 'Kudos', icon: 'heart' },
];

const SUBMIT: Record<Tab, string> = {
  rate: 'Send feedback',
  bug: 'Send bug report',
  kudos: 'Send kudos',
};

const AREAS: { key: FeedbackArea; name: string; detail: string }[] = [
  { key: 'finding', name: 'Finding businesses', detail: 'Browse, search and categories' },
  { key: 'listing', name: 'Listing your business', detail: 'Creating and editing a listing' },
  {
    key: 'messaging',
    name: 'Messages and requests',
    detail: 'Meetings, quotes and order requests',
  },
  { key: 'trust', name: 'Trust and safety', detail: 'Reports and honest listings' },
];

const PLACES: { value: BugPlace; label: string }[] = [
  { value: 'browse', label: 'Browse and search' },
  { value: 'business', label: 'A business or product page' },
  { value: 'listing', label: 'Listing a business' },
  { value: 'messages', label: 'Messages' },
  { value: 'requests', label: 'Requests' },
  { value: 'account', label: 'Signing in or joining' },
  { value: 'other', label: 'Somewhere else' },
];

const FREQUENCIES: { value: BugFrequency; label: string }[] = [
  { value: 'once', label: 'Just once' },
  { value: 'sometimes', label: 'Sometimes' },
  { value: 'every-time', label: 'Every time' },
];

/** The words of each refusal, by field and by the code the API names (L2-214). */
const MESSAGES: Record<string, string> = {
  'rating:RATING_REQUIRED': 'Choose a rating from 1 to 5.',
  'where:PLACE_REQUIRED': 'Choose where it happened.',
  'where:PLACE_UNKNOWN': 'Choose where it happened.',
  'happened:HAPPENED_REQUIRED': 'Tell us what happened.',
  'happened:HAPPENED_TOO_LONG': 'Use 2,000 characters or fewer.',
  'expected:EXPECTED_TOO_LONG': 'Use 2,000 characters or fewer.',
  'chips:KUDOS_REQUIRED': 'Choose what stood out or write a note.',
  'business:BUSINESS_REQUIRED': 'Choose the business.',
  'business:BUSINESS_NOT_CONTACTED': 'Choose a business you’ve sent a request or a message to.',
  'note:NOTE_TOO_LONG': 'Use 1,000 characters or fewer.',
};

/** Where focus goes for each field that was refused, in the order of the forms. */
const FOCUS: [FieldName, string][] = [
  ['where', '#feedback-where'],
  ['happened', '#feedback-happened'],
  ['expected', '#feedback-expected'],
  ['business', '#feedback-which'],
  ['chips', '#feedback-stood-group button'],
  ['note', '#feedback-note'],
];

const MAX_SCREENSHOTS = 3;
const REFUSED_FILE = 'Use a JPEG or PNG of 5 MB or less.';
const TOO_MANY_FILES = 'You can add up to three screenshots.';

/**
 * FeedbackPage at /feedback/:tab (L2-212, L2-213): the full forms to rate Jubilee, report a bug
 * and send kudos, beside what the member sent before. Each tab keeps its own answers and its own
 * idempotency key, which a retry reuses (L2-132); a failure keeps everything (L2-128).
 */
@Component({
  selector: 'jb-feedback-page',
  imports: [
    FormDraftDirective,
    FormsModule,
    RouterLink,
    Alert,
    BackLink,
    Button,
    Checkbox,
    Chip,
    ChoiceCard,
    ChoiceCards,
    EmptyState,
    FeedbackHistory,
    Field,
    FieldHelp,
    FileList,
    PageHeader,
    ScoreRow,
    ScoreRows,
    ScoreScale,
    Select,
    StarScale,
    TabList,
    Textarea,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'jb-page container page' },
  templateUrl: './feedback.page.html',
})
export class FeedbackPage implements OnInit {
  private readonly api = inject(FEEDBACK_API);
  private readonly router = inject(Router);
  private readonly session = inject(SessionService);
  private readonly clock = inject(ClockService);
  private readonly photos = inject(PhotoAttachmentService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly version = inject(APP_VERSION);
  private readonly stars = viewChild(StarScale);

  protected readonly tabs = TABS;
  protected readonly words = RATING_WORDS;
  protected readonly areas = AREAS;
  protected readonly places = PLACES;
  protected readonly frequencies = FREQUENCIES;
  protected readonly kudosChips = KUDOS_CHIPS;
  protected readonly noteMax = NOTE_MAX;
  protected readonly answerMax = ANSWER_MAX;

  private readonly param = toSignal(
    inject(ActivatedRoute).paramMap.pipe(map((params) => params.get('tab'))),
    { initialValue: null },
  );
  protected readonly tab = computed<Tab>(() => {
    const tab = this.param();
    return tab === 'bug' || tab === 'kudos' ? tab : 'rate';
  });

  protected readonly view = signal<View>('form');
  protected readonly busy = computed(() => this.view() === 'busy');
  protected readonly failure = signal<FeedbackFailure>({ title: '', text: '' });
  protected readonly problems = signal<Partial<Record<FieldName, string>>>({});
  protected readonly submitLabel = computed(() => SUBMIT[this.tab()]);
  protected readonly confirmation = signal({ heading: '', text: '' });
  protected readonly mayContact = signal(false);

  // Rate.
  protected readonly rating = signal<number | null>(null);
  protected readonly scores = signal<Partial<Record<FeedbackArea, number>>>({});
  protected readonly better = signal('');

  // Report a bug.
  protected readonly where = signal<BugPlace | ''>('');
  protected readonly happened = signal('');
  protected readonly expected = signal('');
  protected readonly frequency = signal<BugFrequency | null>(null);
  protected readonly screenshots = signal<readonly Screenshot[]>([]);
  protected readonly screenshotError = signal<string | null>(null);
  protected readonly screenshotsFull = computed(() => this.screenshots().length >= MAX_SCREENSHOTS);

  // Kudos.
  protected readonly forBusiness = signal(false);
  protected readonly businesses = signal<readonly KudosBusiness[] | null>(null);
  protected readonly noBusiness = computed(() => this.businesses()?.length === 0);
  protected readonly business = signal('');
  protected readonly chips = signal<readonly KudosChip[]>([]);
  protected readonly note = signal('');
  protected readonly showOnPage = signal(false);

  // Your feedback.
  protected readonly historyState = signal<'loading' | 'error' | 'loaded'>('loading');
  private readonly sentItems = signal<readonly FeedbackItem[]>([]);
  protected readonly history = computed<FeedbackHistoryItem[]>(() => {
    const now = this.clock.now();
    return this.sentItems().map((item) => ({
      id: item.id,
      kind: item.kind,
      title: feedbackTitle(item),
      date: threadTime(item.createdAt, now),
      dateTime: item.createdAt,
      reference: item.reference,
      status: feedbackStatusLabel(item.status),
      reply: item.reply,
    }));
  });

  /** The key of the send of each tab; a retry of that send reuses it (L2-132). */
  private readonly keys: Record<Tab, string> = { rate: newKey(), bug: newKey(), kudos: newKey() };
  private nextScreenshot = 0;

  constructor() {
    // An address that names no tab opens Rate.
    effect(() => {
      const param = this.param();
      if (param !== null && param !== this.tab()) {
        void this.router.navigate(['/feedback', this.tab()], { replaceUrl: true });
      }
    });
  }

  ngOnInit(): void {
    this.loadHistory();
    this.api.kudosBusinesses().subscribe({
      next: (businesses) => this.businesses.set(businesses),
      // Without the list kudos go to the team; "A business" stays as it is until it is known.
      error: () => this.businesses.set(null),
    });
  }

  protected loadHistory(): void {
    this.historyState.set('loading');
    this.api.mine().subscribe({
      next: (items) => {
        this.sentItems.set(items);
        this.historyState.set('loaded');
      },
      error: () => this.historyState.set('error'),
    });
  }

  protected choose(tab: Tab): void {
    if (this.busy() || tab === this.tab()) return;
    this.view.set('form');
    this.problems.set({});
    void this.router.navigate(['/feedback', tab]);
  }

  protected score(area: FeedbackArea, score: number | null): void {
    this.scores.update((scores) => {
      const next = { ...scores };
      if (score === null) delete next[area];
      else next[area] = score;
      return next;
    });
  }

  protected often(frequency: BugFrequency): void {
    this.frequency.update((chosen) => (chosen === frequency ? null : frequency));
  }

  protected toggle(chip: KudosChip): void {
    this.chips.update((chosen) =>
      chosen.includes(chip) ? chosen.filter((other) => other !== chip) : [...chosen, chip],
    );
  }

  /** Keeps the pictures that can be sent, up to three, and says why the others were refused. */
  protected async addScreenshots(files: File[]): Promise<void> {
    let refused: string | null = null;
    const accepted: Screenshot[] = [];
    for (const file of files) {
      if (this.screenshots().length + accepted.length >= MAX_SCREENSHOTS) {
        refused = TOO_MANY_FILES;
        break;
      }
      if (file.size > MAX_PHOTO_BYTES || !(await this.photos.typeOf(file))) {
        refused = REFUSED_FILE;
        continue;
      }
      accepted.push({
        id: `shot-${this.nextScreenshot++}`,
        name: file.name,
        file,
        storedId: null,
      });
    }
    this.screenshots.update((shots) => [...shots, ...accepted]);
    this.screenshotError.set(refused);
  }

  protected removeScreenshot(id: string): void {
    this.screenshots.update((shots) => shots.filter((shot) => shot.id !== id));
    this.screenshotError.set(null);
  }

  protected submit(): void {
    if (this.busy()) return;
    const found = this.check();
    this.problems.set(found);
    if (Object.keys(found).length > 0) {
      this.view.set('form');
      this.focusFirstInvalid(found);
      return;
    }
    const tab = this.tab();
    this.view.set('busy');
    this.request(tab)
      .pipe(timeout(SUBMIT_TIMEOUT_MS))
      .subscribe({
        next: (item) => {
          this.confirmation.set(this.confirmationFor(item));
          if (this.historyState() === 'loaded') this.sentItems.update((items) => [item, ...items]);
          this.view.set('sent');
        },
        error: (error: unknown) => this.fail(error),
      });
  }

  /** What is missing from the form of the tab on show (L2-212 AC3, AC5, AC9). */
  private check(): Partial<Record<FieldName, string>> {
    const found: Partial<Record<FieldName, string>> = {};
    switch (this.tab()) {
      case 'rate':
        if (this.rating() === null) found.rating = MESSAGES['rating:RATING_REQUIRED'];
        break;
      case 'bug':
        if (!this.where()) found.where = MESSAGES['where:PLACE_REQUIRED'];
        if (!this.happened().trim()) found.happened = MESSAGES['happened:HAPPENED_REQUIRED'];
        break;
      default:
        if (this.forBusiness() && !this.business()) {
          found.business = MESSAGES['business:BUSINESS_REQUIRED'];
        }
        if (this.chips().length === 0 && !this.note().trim()) {
          found.chips = MESSAGES['chips:KUDOS_REQUIRED'];
        }
    }
    return found;
  }

  private request(tab: Tab): Observable<FeedbackItem> {
    const mayContact = this.mayContact() ? { mayContact: true } : {};
    switch (tab) {
      case 'rate': {
        const note = this.better().trim();
        const areas = this.scores();
        return this.api.sendRating(
          {
            rating: this.rating() ?? 0,
            ...(note ? { note } : {}),
            ...(Object.keys(areas).length > 0 ? { areas } : {}),
            ...mayContact,
          },
          this.keys.rate,
        );
      }
      case 'bug': {
        const expected = this.expected().trim();
        const frequency = this.frequency();
        return this.uploadScreenshots().pipe(
          switchMap((screenshotIds) =>
            this.api.sendBugReport(
              {
                where: this.where() || undefined,
                happened: this.happened().trim(),
                ...(expected ? { expected } : {}),
                ...(frequency ? { frequency } : {}),
                screen: 'feedback',
                version: this.version,
                ...(screenshotIds.length > 0 ? { screenshotIds } : {}),
                ...mayContact,
              },
              this.keys.bug,
            ),
          ),
        );
      }
      default: {
        const note = this.note().trim();
        const toBusiness = this.forBusiness();
        // The chips travel in the order the form shows them.
        const chips = KUDOS_CHIPS.map((chip) => chip.value).filter((chip) =>
          this.chips().includes(chip),
        );
        return this.api.sendKudos(
          {
            ...(toBusiness ? { business: this.business() } : {}),
            chips,
            ...(note ? { note } : {}),
            ...(toBusiness && this.showOnPage() ? { showOnPage: true } : {}),
            ...mayContact,
          },
          this.keys.kudos,
        );
      }
    }
  }

  /** Uploads the pictures that were not uploaded yet, in order, and gives the ids of all (L2-212 AC6). */
  private uploadScreenshots(): Observable<string[]> {
    const shots = this.screenshots();
    if (shots.length === 0) return of([]);
    return from(shots).pipe(
      concatMap((shot) =>
        shot.storedId
          ? of(shot.storedId)
          : this.api.uploadScreenshot(shot.file).pipe(
              map((stored) => stored.id),
              tap((storedId) =>
                this.screenshots.update((all) =>
                  all.map((other) => (other.id === shot.id ? { ...other, storedId } : other)),
                ),
              ),
            ),
      ),
      toArray(),
    );
  }

  private fail(error: unknown): void {
    if (error instanceof HttpErrorResponse && error.status === 422) {
      const body = error.error as { code?: string; errors?: Record<string, string> } | null;
      const errors = body?.errors ?? {};
      if (body?.code === 'INVALID_IMAGE' || body?.code === 'TOO_LARGE' || errors['screenshots']) {
        // A picture the server refused: it goes, so the report can be sent without it.
        this.screenshots.update((shots) => shots.filter((shot) => shot.storedId));
        this.screenshotError.set(
          errors['screenshots'] === 'TOO_MANY_SCREENSHOTS' ? TOO_MANY_FILES : REFUSED_FILE,
        );
        this.view.set('form');
        return;
      }
      const found: Partial<Record<FieldName, string>> = {};
      for (const [field, code] of Object.entries(errors)) {
        const name = (field === 'areas' ? 'rating' : field) as FieldName;
        found[name] = MESSAGES[`${name}:${code}`] ?? 'Check this field.';
      }
      this.problems.set(found);
      this.view.set('form');
      this.focusFirstInvalid(found);
      return;
    }
    this.failure.set(feedbackFailure(error));
    this.view.set('failed');
  }

  private focusFirstInvalid(found: Partial<Record<FieldName, string>>): void {
    setTimeout(() => {
      if (found.rating) {
        this.stars()?.focus();
        return;
      }
      const first = FOCUS.find(([field]) => found[field]);
      if (first) this.host.nativeElement.querySelector<HTMLElement>(first[1])?.focus();
    });
  }

  /** What the confirmation says (L2-212 AC11). */
  private confirmationFor(item: FeedbackItem): { heading: string; text: string } {
    const name = this.session.member()?.firstName;
    const lead = (text: string): string =>
      name ? `${name}, ${text}` : text.charAt(0).toUpperCase() + text.slice(1);
    switch (item.kind) {
      case 'rating':
        return {
          heading: 'Thanks for rating Jubilee.',
          text: lead('we read every rating, and the lowest-scored parts are what we work on next.'),
        };
      case 'bug-report':
        return {
          heading: 'Got it. We’re on it.',
          text: lead(
            `your report is logged as ${item.reference ?? 'a bug report'}. Follow it under Your feedback.`,
          ),
        };
      default:
        return item.business
          ? {
              heading: 'Thank you for saying it.',
              text: lead(`we’ve kept your note for ${item.business}.`),
            }
          : {
              heading: 'That made our day.',
              text: lead('we share every kudos with the whole team. Thank you for saying it.'),
            };
    }
  }
}

import {
  CdkDrag,
  CdkDragDrop,
  CdkDragHandle,
  CdkDropList,
  moveItemInArray,
} from '@angular/cdk/drag-drop';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  ListingChanges,
  ListingEditor,
  ListingPhoto,
  MY_BUSINESS_API,
  SpaceDraft,
  SpaceTerm,
} from 'api';
import {
  BusinessCard,
  EmptyState,
  Icon,
  Button,
  CloseButton,
  Alert,
  FormSummary,
  FieldError,
  FieldHelp,
  Field,
  Input,
  Select,
  Textarea,
  Skeleton,
  InlineStatus,
  Card,
  WorkspaceHeader,
  MediaTile,
  Chip,
  ChoiceCard,
  ChoiceCards,
  InputGroup,
  InputAddon,
  SpaceCardPreview,
} from 'components';
import { LoadState, errorReference } from 'api';
import {
  INCLUSIONS,
  PLACES,
  SPACE_FIELDS,
  SpaceField,
  SpaceForm,
  TERM_CHOICES,
  spaceMessage,
} from '../../services/space-form';
import { FormDraftDirective } from '../../drafts/form-draft.directive';

export const MAX_NAME = 80;
export const MAX_TAGLINE = 90;
export const MAX_ABOUT = 1500;
export const MAX_HIGHLIGHT = 30;
export const MAX_ALT = 125;

type DraftField =
  'name' | 'tagline' | 'about' | 'category' | 'where' | 'hours' | 'website' | 'highlight';

type FieldName = DraftField | SpaceField;

type Draft = Record<DraftField, string>;

type Saving = 'idle' | 'saving';

/**
 * The listing editor at /my-business/listing (L2-087, L2-088): the words, the photos and the live
 * preview. A space edits its own fields instead of the category, hours and website (L2-209).
 */
@Component({
  selector: 'jb-edit-listing-page',
  imports: [
    CdkDrag,
    CdkDragHandle,
    CdkDropList,
    FormDraftDirective,
    BusinessCard,
    EmptyState,
    FormsModule,
    Icon,
    RouterLink,
    WorkspaceHeader,
    Button,
    CloseButton,
    Alert,
    FormSummary,
    Field,
    FieldError,
    FieldHelp,
    Input,
    Select,
    Textarea,
    Skeleton,
    InlineStatus,
    Card,
    MediaTile,
    Chip,
    ChoiceCard,
    ChoiceCards,
    InputGroup,
    InputAddon,
    SpaceCardPreview,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'jb-page container page' },
  templateUrl: './edit-listing.page.html',
})
export class EditListingPage implements OnInit {
  private readonly api = inject(MY_BUSINESS_API);
  private readonly router = inject(Router);

  protected readonly maxName = MAX_NAME;
  protected readonly maxTagline = MAX_TAGLINE;
  protected readonly maxAbout = MAX_ABOUT;
  protected readonly maxHighlight = MAX_HIGHLIGHT;
  protected readonly maxAlt = MAX_ALT;

  protected readonly state = signal<LoadState<ListingEditor>>({ status: 'loading' });
  protected readonly draft = signal<Draft>(this.blank());
  protected readonly photos = signal<ListingPhoto[]>([]);
  protected readonly errors = signal<Partial<Record<FieldName, string>>>({});
  protected readonly summary = signal<{ field: FieldName; text: string }[]>([]);
  protected readonly summaryErrors = computed(() =>
    this.summary().map((item) => ({ id: this.idOf(item.field), text: item.text })),
  );
  protected readonly saving = signal<Saving>('idle');
  protected readonly saved = signal<{ recheck: boolean } | null>(null);
  protected readonly failure = signal<'conflict' | 'failed' | null>(null);
  protected readonly photoError = signal<string | null>(null);
  protected readonly photoBusy = signal(false);

  // A space (L2-209): the fields List a space asks, held by the form they share.
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
  protected readonly nightly = this.space.nightly;
  protected readonly minimumChoices = this.space.minimumChoices;
  protected readonly householdLabel = this.space.householdLabel;

  protected readonly editor = computed(() => {
    const state = this.state();
    return state.status === 'loaded' ? state.value : null;
  });

  protected readonly busy = computed(() => this.saving() === 'saving');
  protected readonly isSpace = computed(() => !!this.editor()?.space);

  protected readonly dirty = computed(() => {
    const editor = this.editor();
    if (!editor) return false;
    const draft = this.draft();
    const saved = this.fromEditor(editor);
    return (
      (Object.keys(saved) as DraftField[]).some((field) => saved[field] !== draft[field]) ||
      (!!editor.space && !sameSpace(editor.space, this.space.body()))
    );
  });

  protected readonly preview = computed(() => ({
    name: this.draft().name || 'Your business',
    tagline: this.draft().tagline,
    highlight: this.draft().highlight || null,
    categorySlug: this.draft().category || 'shops',
    verified: this.editor()?.stage === 'live',
  }));
  /** How renters see the space as the owner edits it (L2-209, L2-198 AC3). */
  protected readonly spacePreview = computed(() => this.space.preview(this.draft().name));

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.state.set({ status: 'loading' });
    this.api.editor().subscribe({
      next: (editor) => this.adopt(editor),
      error: (error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 403) {
          void this.router.navigateByUrl('/forbidden');
          return;
        }
        this.state.set({ status: 'error', reference: errorReference(error, 'JB-LST-503') });
      },
    });
  }

  private adopt(editor: ListingEditor): void {
    this.state.set({ status: 'loaded', value: editor });
    this.draft.set(this.fromEditor(editor));
    if (editor.space) this.space.apply(editor.space);
    this.photos.set(editor.photos);
    this.errors.set({});
    this.summary.set([]);
    this.failure.set(null);
  }

  private blank(): Draft {
    return {
      name: '',
      tagline: '',
      about: '',
      category: '',
      where: '',
      hours: '',
      website: '',
      highlight: '',
    };
  }

  private fromEditor(editor: ListingEditor): Draft {
    return {
      name: editor.name,
      tagline: editor.tagline,
      about: editor.about ?? '',
      category: editor.categorySlug,
      where: editor.where ?? '',
      hours: editor.hours ?? '',
      website: editor.website ?? '',
      highlight: editor.highlight ?? '',
    };
  }

  protected set(field: DraftField, value: string): void {
    this.draft.update((draft) => ({ ...draft, [field]: value }));
    this.saved.set(null);
  }

  /** Called on every change of a space field. */
  protected touched(field?: SpaceField): void {
    this.saved.set(null);
    if (field && this.errors()[field]) {
      this.errors.update((errors) => ({ ...errors, [field]: undefined }));
    }
  }

  protected setTerm(term: SpaceTerm): void {
    if (this.space.setTerm(term)) this.touched('household');
  }

  protected toggleIncluded(item: string): void {
    this.space.toggleIncluded(item);
    this.touched();
  }

  protected discard(): void {
    const editor = this.editor();
    if (!editor || this.busy()) return;
    this.draft.set(this.fromEditor(editor));
    if (editor.space) this.space.apply(editor.space);
    this.errors.set({});
    this.summary.set([]);
    this.failure.set(null);
  }

  /** What is wrong with the draft, by field (L2-087 AC2, AC3). */
  private check(): { field: FieldName; message: string; summary: string }[] {
    const draft = this.draft();
    const problems: { field: FieldName; message: string; summary: string }[] = [];
    const name = draft.name.trim();
    const tagline = draft.tagline.trim();
    const space = this.isSpace();
    if (!name) {
      problems.push({
        field: 'name',
        message: space
          ? 'Enter a title that says what it is and where.'
          : 'Enter your business name.',
        summary: space ? 'Enter a listing title' : 'Enter your business name',
      });
    } else if (name.length > MAX_NAME) {
      problems.push({
        field: 'name',
        message: `Shorten this to ${MAX_NAME} characters. It has ${name.length}.`,
        summary: `Shorten your ${space ? 'listing title' : 'business name'} to ${MAX_NAME} characters`,
      });
    }
    if (!tagline) {
      problems.push({
        field: 'tagline',
        message: space ? 'Enter one line renters should know.' : 'Say in one line what you do.',
        summary: space ? 'Enter one line renters should know' : 'Say in one line what you do',
      });
    } else if (tagline.length > MAX_TAGLINE) {
      problems.push({
        field: 'tagline',
        message: `Shorten this to ${MAX_TAGLINE} characters. It has ${tagline.length}.`,
        summary: `Shorten your one-line description to ${MAX_TAGLINE} characters`,
      });
    }
    if (space) {
      // A space is checked as when it was listed (L2-209 AC2), and has no hours or website.
      const codes = this.space.check();
      for (const field of Object.keys(codes) as SpaceField[]) {
        const message = spaceMessage(field, codes[field] ?? '');
        problems.push({ field, message, summary: message.replace(/\.$/, '') });
      }
      return problems;
    }
    if (!draft.hours.trim()) {
      problems.push({
        field: 'hours',
        message: 'Enter your hours, or “By appointment”.',
        summary: 'Enter your hours',
      });
    }
    const website = draft.website.trim();
    if (website && !/^https?:\/\/\S+$/i.test(website)) {
      problems.push({
        field: 'website',
        message: 'Enter a web address starting with https://',
        summary: 'Enter a web address starting with https://',
      });
    }
    return problems;
  }

  protected save(): void {
    const editor = this.editor();
    if (!editor || this.busy()) return;
    this.saved.set(null);
    this.failure.set(null);
    const problems = this.check();
    this.show(problems);
    if (problems.length > 0) return;

    const draft = this.draft();
    const changes: ListingChanges = {
      listingId: editor.id,
      version: editor.version,
      name: draft.name.trim(),
      tagline: draft.tagline.trim(),
      category: draft.category,
      about: draft.about.trim(),
      where: draft.where.trim(),
      hours: draft.hours.trim(),
      website: draft.website.trim(),
      highlight: draft.highlight.trim(),
      ...(this.isSpace() ? { space: this.space.body() } : {}),
    };
    this.saving.set('saving');
    this.api.save(changes).subscribe({
      next: (next) => {
        this.saving.set('idle');
        this.adopt(next);
        this.saved.set({ recheck: next.recheckRequested && this.renamed(editor, next) });
      },
      error: (error: unknown) => {
        this.saving.set('idle');
        if (error instanceof HttpErrorResponse && error.status === 409) {
          this.failure.set('conflict');
        } else if (error instanceof HttpErrorResponse && error.status === 422) {
          this.showServer(
            (error.error as { errors?: Record<string, string> } | null)?.errors ?? {},
          );
        } else if (error instanceof HttpErrorResponse && error.status === 403) {
          void this.router.navigateByUrl('/forbidden');
        } else {
          this.failure.set('failed');
        }
      },
    });
  }

  private renamed(before: ListingEditor, after: ListingEditor): boolean {
    return before.name !== after.name || before.categorySlug !== after.categorySlug;
  }

  private show(problems: { field: FieldName; message: string; summary: string }[]): void {
    this.errors.set(Object.fromEntries(problems.map((p) => [p.field, p.message])));
    this.summary.set(problems.map((p) => ({ field: p.field, text: p.summary })));
    if (problems.length > 0) {
      queueMicrotask(() => document.getElementById('summary')?.focus());
    }
  }

  /** The server's own refusal of a field the browser let through. */
  private showServer(errors: Record<string, string>): void {
    const map: Record<string, FieldName> = { category: 'category', ...SPACE_FIELDS };
    const problems = Object.keys(errors).map((key) => {
      const field = (map[key] ?? key) as FieldName;
      const space = SPACE_FIELDS[key];
      const message = space
        ? spaceMessage(space, errors[key])
        : errors[key] === 'TOO_LONG'
          ? 'This is too long.'
          : 'Check this field.';
      return { field, message, summary: message };
    });
    this.show(problems);
  }

  protected dismissSaved(): void {
    this.saved.set(null);
  }

  protected idOf(field: FieldName): string {
    return field === 'category'
      ? 'cat'
      : field === 'rent'
        ? 'price'
        : field === 'available'
          ? 'avail'
          : field === 'neighbourhood'
            ? 'area'
            : field === 'where'
              ? 'area'
              : field === 'website'
                ? 'web'
                : field === 'highlight'
                  ? 'perk'
                  : field;
  }

  // --- photos (L2-088) -------------------------------------------------------------------

  protected choose(input: HTMLInputElement): void {
    input.click();
  }

  protected add(input: HTMLInputElement): void {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (this.photos().length >= 6) {
      this.photoError.set('A listing can have 6 photos. Remove one to add another.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.photoError.set('Photos can be 5 MB at most.');
      return;
    }
    this.photoBusy.set(true);
    this.photoError.set(null);
    this.api.addPhoto(file).subscribe({
      next: (editor) => this.photosChanged(editor),
      error: (error: unknown) => this.photoFailed(error),
    });
  }

  protected move(photo: ListingPhoto, by: number): void {
    this.moveTo(photo, photo.position + by);
  }

  /**
   * A photo dragged by its handle and dropped (L2-088 AC3). The list shows the new order at once and
   * the API confirms it; a drop in the same place sends nothing.
   */
  protected drop(event: CdkDragDrop<unknown, unknown, ListingPhoto>): void {
    if (event.previousIndex === event.currentIndex) return;
    const before = this.photos();
    const order = [...before];
    moveItemInArray(order, event.previousIndex, event.currentIndex);
    this.photos.set(order.map((photo, index) => ({ ...photo, position: index + 1 })));
    this.moveTo(event.item.data, event.currentIndex + 1, before);
  }

  private moveTo(photo: ListingPhoto, position: number, before?: ListingPhoto[]): void {
    this.photoBusy.set(true);
    this.photoError.set(null);
    this.api.movePhoto(photo.id, position).subscribe({
      next: (editor) => this.photosChanged(editor),
      error: (error: unknown) => {
        // A dragged photo goes back where it was when the move is refused.
        if (before) this.photos.set(before);
        this.photoFailed(error);
      },
    });
  }

  protected describe(photo: ListingPhoto, alt: string): void {
    if (alt.trim() === (photo.customAlt ?? '')) return;
    this.photoError.set(null);
    this.api.describePhoto(photo.id, alt).subscribe({
      next: (editor) => this.photosChanged(editor),
      error: (error: unknown) => this.photoFailed(error),
    });
  }

  protected remove(photo: ListingPhoto): void {
    this.photoBusy.set(true);
    this.photoError.set(null);
    this.api.removePhoto(photo.id).subscribe({
      next: (editor) => this.photosChanged(editor),
      error: (error: unknown) => this.photoFailed(error),
    });
  }

  private photosChanged(editor: ListingEditor): void {
    this.photoBusy.set(false);
    this.photos.set(editor.photos);
  }

  private photoFailed(error: unknown): void {
    this.photoBusy.set(false);
    const code =
      error instanceof HttpErrorResponse
        ? (error.error as { code?: string } | null)?.code
        : undefined;
    this.photoError.set(
      {
        TOO_LARGE: 'Photos can be 5 MB at most.',
        NOT_AN_IMAGE: 'Add a JPG or PNG photo.',
        TOO_BIG_IN_PIXELS: 'Photos can be 8,000 by 8,000 pixels at most.',
        TOO_MANY_PHOTOS: 'A listing can have 6 photos. Remove one to add another.',
        TOO_LONG: `Describe the photo in ${MAX_ALT} characters or fewer.`,
      }[code ?? ''] ?? 'We couldn’t change your photos. Try again.',
    );
  }
}

/** Whether two spaces say the same, field by field. */
function sameSpace(a: SpaceDraft, b: SpaceDraft): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

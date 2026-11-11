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
import { ListingChanges, ListingEditor, ListingPhoto, MY_BUSINESS_API } from 'api';
import { BusinessCard, EmptyState, Icon, Button, CloseButton } from 'components';
import { LoadState, errorReference } from '../../services/load-state';
import { WorkspaceHeader } from '../my-business/workspace-header';

export const MAX_NAME = 80;
export const MAX_TAGLINE = 90;
export const MAX_ABOUT = 1500;
export const MAX_HIGHLIGHT = 30;
export const MAX_ALT = 125;

type Field =
  'name' | 'tagline' | 'about' | 'category' | 'where' | 'hours' | 'website' | 'highlight';

type Draft = Record<Field, string>;

type Saving = 'idle' | 'saving';

/** The listing editor at /my-business/listing (L2-087, L2-088): the words, the photos and the live preview. */
@Component({
  selector: 'jb-edit-listing-page',
  imports: [
    BusinessCard,
    EmptyState,
    FormsModule,
    Icon,
    RouterLink,
    WorkspaceHeader,
    Button,
    CloseButton,
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
  protected readonly errors = signal<Partial<Record<Field, string>>>({});
  protected readonly summary = signal<{ field: Field; text: string }[]>([]);
  protected readonly saving = signal<Saving>('idle');
  protected readonly saved = signal<{ recheck: boolean } | null>(null);
  protected readonly failure = signal<'conflict' | 'failed' | null>(null);
  protected readonly photoError = signal<string | null>(null);
  protected readonly photoBusy = signal(false);

  protected readonly editor = computed(() => {
    const state = this.state();
    return state.status === 'loaded' ? state.value : null;
  });

  protected readonly busy = computed(() => this.saving() === 'saving');

  protected readonly dirty = computed(() => {
    const editor = this.editor();
    if (!editor) return false;
    const draft = this.draft();
    const saved = this.fromEditor(editor);
    return (Object.keys(saved) as Field[]).some((field) => saved[field] !== draft[field]);
  });

  protected readonly preview = computed(() => ({
    name: this.draft().name || 'Your business',
    tagline: this.draft().tagline,
    highlight: this.draft().highlight || null,
    categorySlug: this.draft().category || 'shops',
    verified: this.editor()?.stage === 'live',
  }));

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

  protected set(field: Field, value: string): void {
    this.draft.update((draft) => ({ ...draft, [field]: value }));
    this.saved.set(null);
  }

  protected discard(): void {
    const editor = this.editor();
    if (!editor || this.busy()) return;
    this.draft.set(this.fromEditor(editor));
    this.errors.set({});
    this.summary.set([]);
    this.failure.set(null);
  }

  /** What is wrong with the draft, by field (L2-087 AC2, AC3). */
  private check(): { field: Field; message: string; summary: string }[] {
    const draft = this.draft();
    const problems: { field: Field; message: string; summary: string }[] = [];
    const name = draft.name.trim();
    const tagline = draft.tagline.trim();
    if (!name) {
      problems.push({
        field: 'name',
        message: 'Enter your business name.',
        summary: 'Enter your business name',
      });
    } else if (name.length > MAX_NAME) {
      problems.push({
        field: 'name',
        message: `Shorten this to ${MAX_NAME} characters. It has ${name.length}.`,
        summary: `Shorten your business name to ${MAX_NAME} characters`,
      });
    }
    if (!tagline) {
      problems.push({
        field: 'tagline',
        message: 'Say in one line what you do.',
        summary: 'Say in one line what you do',
      });
    } else if (tagline.length > MAX_TAGLINE) {
      problems.push({
        field: 'tagline',
        message: `Shorten this to ${MAX_TAGLINE} characters. It has ${tagline.length}.`,
        summary: `Shorten your one-line description to ${MAX_TAGLINE} characters`,
      });
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
      version: editor.version,
      name: draft.name.trim(),
      tagline: draft.tagline.trim(),
      category: draft.category,
      about: draft.about.trim(),
      where: draft.where.trim(),
      hours: draft.hours.trim(),
      website: draft.website.trim(),
      highlight: draft.highlight.trim(),
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

  private show(problems: { field: Field; message: string; summary: string }[]): void {
    this.errors.set(Object.fromEntries(problems.map((p) => [p.field, p.message])));
    this.summary.set(problems.map((p) => ({ field: p.field, text: p.summary })));
    if (problems.length > 0) {
      queueMicrotask(() => document.getElementById('summary')?.focus());
    }
  }

  /** The server's own refusal of a field the browser let through. */
  private showServer(errors: Record<string, string>): void {
    const map: Record<string, Field> = { category: 'category' };
    const problems = Object.keys(errors).map((key) => {
      const field = (map[key] ?? key) as Field;
      const message = errors[key] === 'TOO_LONG' ? 'This is too long.' : 'Check this field.';
      return { field, message, summary: message };
    });
    this.show(problems);
  }

  protected dismissSaved(): void {
    this.saved.set(null);
  }

  protected pluralThings(count: number): string {
    return count === 1 ? 'thing' : 'things';
  }

  protected focusField(field: Field, event: Event): void {
    event.preventDefault();
    document.getElementById(this.idOf(field))?.focus();
  }

  protected idOf(field: Field): string {
    return field === 'category'
      ? 'cat'
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
    this.photoBusy.set(true);
    this.photoError.set(null);
    this.api.movePhoto(photo.id, photo.position + by).subscribe({
      next: (editor) => this.photosChanged(editor),
      error: (error: unknown) => this.photoFailed(error),
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

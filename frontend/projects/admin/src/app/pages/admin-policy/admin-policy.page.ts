import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  Injector,
  OnInit,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  ADMIN_CONTENT_API,
  AdminContent,
  ClockService,
  ContentSlug,
  ContentVersionRow,
  LoadState,
  errorReference,
  fullDate,
  parseBody,
} from 'api';
import {
  Alert,
  Breadcrumb,
  Button,
  Card,
  EmptyState,
  Field,
  Icon,
  Input,
  PageHeader,
  PolicyDocument,
  PolicySection,
  Row,
  RowMeta,
  RowTitle,
  Rows,
  Skeleton,
  Textarea,
} from 'components';

/** One section of the draft; `key` tells the sections apart while they are added and removed. */
export interface DraftSection {
  key: number;
  heading: string;
  /** Kept from the published section so links to it keep working; empty for a new one (ADR 0066). */
  anchor: string;
  body: string;
}

/** The text being edited. It lives here until it is published; it is never stored (ADR 0066). */
export interface Draft {
  title: string;
  lead: string;
  sections: DraftSection[];
}

/**
 * `/policies/:slug`: the editor of one policy page, for an administrator (L2-226). The fields hold
 * the draft, the preview beside them shows it as members will read it, and the kept versions list
 * every version, newest first.
 */
@Component({
  selector: 'jb-admin-policy-page',
  imports: [
    FormsModule,
    Alert,
    Breadcrumb,
    Button,
    Card,
    EmptyState,
    Field,
    Icon,
    Input,
    PageHeader,
    PolicyDocument,
    Row,
    RowMeta,
    RowTitle,
    Rows,
    Skeleton,
    Textarea,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'jb-page container page' },
  templateUrl: './admin-policy.page.html',
})
export class AdminPolicyPage implements OnInit {
  private readonly api = inject(ADMIN_CONTENT_API);
  private readonly clock = inject(ClockService);
  private readonly injector = inject(Injector);
  private readonly document = inject(DOCUMENT);
  protected readonly slug = inject(ActivatedRoute).snapshot.paramMap.get('slug') as ContentSlug;

  protected readonly state = signal<LoadState<AdminContent>>({ status: 'loading' });
  protected readonly draft = signal<Draft>({ title: '', lead: '', sections: [] });
  /** Publish was pressed: the fields say what is missing. */
  protected readonly checked = signal(false);
  private nextKey = 0;

  protected readonly today = this.clock.now().toISOString();

  protected readonly published = computed(() => {
    const state = this.state();
    return state.status === 'loaded' ? state.value : null;
  });
  protected readonly nextVersion = computed(() => (this.published()?.published.version ?? 0) + 1);

  protected readonly titleError = computed(() =>
    this.checked() && !this.draft().title.trim() ? 'Give the page a title.' : null,
  );
  protected readonly invalid = computed(
    () =>
      !this.draft().title.trim() ||
      this.draft().sections.length === 0 ||
      this.draft().sections.some((s) => !s.heading.trim() || !s.body.trim()),
  );

  protected readonly preview = computed<PolicySection[]>(() =>
    this.draft().sections.map((s) => ({
      heading: s.heading,
      anchor: s.anchor || `new-${s.key}`,
      blocks: parseBody(s.body),
    })),
  );

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.state.set({ status: 'loading' });
    this.api.get(this.slug).subscribe({
      next: (value) => {
        this.state.set({ status: 'loaded', value });
        this.startFrom(value);
      },
      error: (error: unknown) =>
        this.state.set({ status: 'error', reference: errorReference(error, 'JB-ADM-522') }),
    });
  }

  /** The draft starts as the published text. */
  protected startFrom(value: AdminContent): void {
    this.checked.set(false);
    this.draft.set({
      title: value.published.title,
      lead: value.published.lead,
      sections: value.published.sections.map((s) => ({ ...s, key: this.nextKey++ })),
    });
  }

  protected subtitle(value: AdminContent): string {
    const n = value.published.version;
    const since =
      value.publishedBy === 'built-in'
        ? `built in since ${fullDate(value.published.publishedAt)}`
        : `since ${fullDate(value.published.publishedAt)}`;
    return `Version ${n} is published, ${since}. Publishing makes version ${n + 1}; version ${n} is kept.`;
  }

  protected versionTitle(v: ContentVersionRow): string {
    return v.published ? `Version ${v.number} · published` : `Version ${v.number}`;
  }

  protected versionMeta(v: ContentVersionRow): string {
    return v.publishedBy === 'built-in'
      ? `Built in · ${fullDate(v.publishedAt)}`
      : `${fullDate(v.publishedAt)} by ${v.publishedBy}`;
  }

  protected setTitle(title: string): void {
    this.draft.update((d) => ({ ...d, title }));
  }

  protected setLead(lead: string): void {
    this.draft.update((d) => ({ ...d, lead }));
  }

  protected setSection(key: number, change: Partial<Pick<DraftSection, 'heading' | 'body'>>): void {
    this.draft.update((d) => ({
      ...d,
      sections: d.sections.map((s) => (s.key === key ? { ...s, ...change } : s)),
    }));
  }

  protected headingError(s: DraftSection): string | null {
    return this.checked() && !s.heading.trim() ? 'Give this section a heading.' : null;
  }

  protected textError(s: DraftSection): string | null {
    return this.checked() && !s.body.trim() ? 'Write this section’s text.' : null;
  }

  protected addSection(): void {
    const key = this.nextKey++;
    this.draft.update((d) => ({
      ...d,
      sections: [...d.sections, { key, heading: '', anchor: '', body: '' }],
    }));
    afterNextRender(() => this.document.getElementById(`s${key}-heading`)?.focus(), {
      injector: this.injector,
    });
  }

  protected removeSection(key: number): void {
    this.draft.update((d) => ({ ...d, sections: d.sections.filter((s) => s.key !== key) }));
  }

  /** Publish is pressed: the fields say what is missing, or the publish is confirmed. */
  protected publish(): void {
    this.checked.set(true);
    if (this.invalid()) return;
  }
}

import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { REPORTS_API, ReportReason } from 'api';
import {
  Button,
  Alert,
  Field,
  Textarea,
  RadioGroup,
  DialogFrame,
  DialogBody,
  DialogFooter,
} from 'components';
import { TimeoutError, timeout } from 'rxjs';
import { newKey } from 'api';
import { FormDraftDirective } from '../../drafts/form-draft.directive';

export interface ReportListingData {
  slug: string;
  businessName: string;
}

type View = 'form' | 'busy' | 'failed' | 'success';
type FieldName = 'reason' | 'description';

const MAX = 2000;

/** A submission that takes longer than this fails instead of spinning (L2-127 AC2). */
const SUBMIT_TIMEOUT_MS = 10_000;

const REASONS: { value: ReportReason; label: string }[] = [
  { value: 'not-real', label: 'It isn’t a real business' },
  { value: 'misleading', label: 'The listing is misleading or out of date' },
  { value: 'bad-experience', label: 'I had a bad experience' },
  { value: 'other', label: 'Something else' },
];

const MESSAGES: Record<string, string> = {
  'reason:REASON_REQUIRED': 'Choose a reason so the right person looks at it.',
  'description:DESCRIPTION_REQUIRED': 'Add a sentence or two so we know what to check.',
  'description:DESCRIPTION_TOO_LONG': 'Use 2,000 characters or fewer.',
};

/**
 * ReportListingDialog (L2-039): a reason and a description go privately to the verification
 * team. A retry reuses the idempotency key (L2-132), each message sits under its field and focus
 * goes to the first invalid one (L2-126), and a failure keeps everything typed (L2-128).
 */
@Component({
  selector: 'jb-report-listing-dialog',
  imports: [
    FormDraftDirective,
    FormsModule,
    Button,
    Alert,
    Field,
    Textarea,
    RadioGroup,
    DialogFrame,
    DialogBody,
    DialogFooter,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './report-listing.dialog.html',
})
export class ReportListingDialog {
  private readonly ref = inject<DialogRef<void>>(DialogRef);
  private readonly api = inject(REPORTS_API);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly data = inject<ReportListingData>(DIALOG_DATA);

  protected readonly reasons = REASONS;
  protected readonly max = MAX;
  protected readonly view = signal<View>('form');
  protected readonly reason = signal<ReportReason | null>(null);
  protected readonly description = signal('');
  protected readonly problems = signal<Partial<Record<FieldName, string>>>({});
  protected readonly busy = computed(() => this.view() === 'busy');
  protected readonly remaining = computed(() => MAX - this.description().length);
  protected readonly failure = signal({ title: '', text: '' });
  private readonly key = newKey();

  constructor() {
    // A busy dialog does not close on Escape or a click outside (L2-130 AC1, L2-127 AC1).
    effect(() => (this.ref.disableClose = this.busy()));
  }

  protected send(): void {
    if (this.busy()) return;
    const found: Partial<Record<FieldName, string>> = {};
    if (!this.reason()) found.reason = MESSAGES['reason:REASON_REQUIRED'];
    if (!this.description().trim())
      found.description = MESSAGES['description:DESCRIPTION_REQUIRED'];
    this.problems.set(found);
    if (Object.keys(found).length > 0) {
      this.view.set('form');
      this.focusFirstInvalid();
      return;
    }
    this.view.set('busy');
    this.api
      .report(
        this.data.slug,
        { reason: this.reason(), description: this.description().trim() },
        this.key,
      )
      .pipe(timeout(SUBMIT_TIMEOUT_MS))
      .subscribe({
        next: () => this.view.set('success'),
        error: (error: unknown) => this.fail(error),
      });
  }

  private fail(error: unknown): void {
    if (error instanceof HttpErrorResponse && error.status === 422) {
      const errors = (error.error as { errors?: Record<string, string> } | null)?.errors ?? {};
      const found: Partial<Record<FieldName, string>> = {};
      for (const field of ['reason', 'description'] as FieldName[]) {
        if (errors[field])
          found[field] = MESSAGES[`${field}:${errors[field]}`] ?? 'Check this field.';
      }
      this.problems.set(found);
      this.view.set('form');
      this.focusFirstInvalid();
      return;
    }
    if (error instanceof HttpErrorResponse && error.status === 429) {
      this.failure.set({
        title: 'Slow down a little',
        text: 'You have sent several reports in the last hour. Wait a bit, then try again. What you typed is still here.',
      });
    } else if (error instanceof TimeoutError) {
      this.failure.set({
        title: 'We couldn’t send that',
        text: 'It took too long, so we stopped. Nothing was sent and what you typed is still here. Try again.',
      });
    } else {
      this.failure.set({
        title: 'We couldn’t send that',
        text: 'Your connection dropped before it reached us. Nothing was sent and what you typed is still here. Try again.',
      });
    }
    this.view.set('failed');
  }

  private focusFirstInvalid(): void {
    setTimeout(() => {
      const first = this.host.nativeElement.querySelector<HTMLElement>(
        'input[aria-invalid="true"], textarea[aria-invalid="true"]',
      );
      first?.focus();
    });
  }

  protected close(): void {
    if (!this.busy()) this.ref.close();
  }
}

import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MESSAGES_API, isRateLimited, tryAgainIn } from 'api';
import {
  Alert,
  Button,
  DialogBody,
  DialogFooter,
  DialogFrame,
  Checkbox,
  Field,
  Textarea,
} from 'components';
import { TimeoutError, timeout } from 'rxjs';
import { FormDraftDirective } from '../../drafts/form-draft.directive';

export interface ReportConversationData {
  conversationId: string;
  businessName: string;
  /** A member may block the business; an owner may not (L2-063 AC5). */
  canBlock: boolean;
}

type View = 'form' | 'busy' | 'failed' | 'success';

const MAX = 1000;

/** A submission that takes longer than this fails instead of spinning (L2-127 AC2). */
const SUBMIT_TIMEOUT_MS = 10_000;

/**
 * ReportConversationDialog (L2-063): what happened goes privately to the verification team, and a
 * member may block the business with it. A failure keeps everything typed (L2-128); sending again
 * is safe, because a participant has one open report at a time.
 */
@Component({
  selector: 'jb-report-conversation-dialog',
  imports: [
    FormDraftDirective,
    FormsModule,
    Button,
    Alert,
    Field,
    Textarea,
    Checkbox,
    DialogFrame,
    DialogBody,
    DialogFooter,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './report-conversation.dialog.html',
})
export class ReportConversationDialog {
  private readonly ref = inject<DialogRef<void>>(DialogRef);
  private readonly api = inject(MESSAGES_API);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly data = inject<ReportConversationData>(DIALOG_DATA);

  protected readonly max = MAX;
  protected readonly view = signal<View>('form');
  protected readonly what = signal('');
  protected readonly block = signal(false);
  protected readonly problem = signal('');
  protected readonly busy = computed(() => this.view() === 'busy');
  protected readonly remaining = computed(() => (MAX - this.what().length).toLocaleString('en-CA'));
  protected readonly failure = signal('');
  protected readonly failureHeading = signal('');

  protected send(): void {
    if (this.busy()) return;
    const reason = this.what().trim();
    if (!reason) {
      this.problem.set('Add a sentence or two so we know what to check.');
      this.view.set('form');
      setTimeout(() => this.host.nativeElement.querySelector<HTMLElement>('textarea')?.focus());
      return;
    }
    this.problem.set('');
    this.view.set('busy');
    this.api
      .report(this.data.conversationId, reason, this.data.canBlock && this.block())
      .pipe(timeout(SUBMIT_TIMEOUT_MS))
      .subscribe({
        next: () => this.view.set('success'),
        error: (error: unknown) => {
          if (isRateLimited(error)) {
            // Ten reports in a day (L2-137 AC1): the words every limit uses, with the wait the API named.
            this.failureHeading.set('You’re doing that a lot');
            this.failure.set(`${tryAgainIn(error)} What you typed is still here.`);
            this.view.set('failed');
            return;
          }
          this.failureHeading.set('We couldn’t send that');
          this.failure.set(
            error instanceof TimeoutError
              ? 'It took too long, so we stopped. Nothing was sent and what you typed is still here. Try again.'
              : 'Your connection dropped before it reached us. Nothing was sent and what you typed is still here. Try again.',
          );
          this.view.set('failed');
        },
      });
  }

  protected close(): void {
    if (!this.busy()) this.ref.close();
  }
}

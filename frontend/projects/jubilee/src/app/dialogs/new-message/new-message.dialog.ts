import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MESSAGES_API, tryAgainIn } from 'api';
import { Button, Alert, Field, Textarea, DialogFrame, DialogBody, DialogFooter } from 'components';
import { newKey } from 'api';
import { FormDraftDirective } from '../../drafts/form-draft.directive';

export interface NewMessageData {
  slug: string;
  businessName: string;
  /** Who answers, as the hint names them: the owner's first name, or the business when no owner is named. */
  answeredBy: string;
  /** For example "Trevor Chew usually replies within a day." */
  intro: string;
}

/** The id of the conversation the message started or continued; absent when cancelled. */
export type NewMessageResult = string | undefined;

type View = 'form' | 'invalid' | 'busy' | 'failed';

const MAX = 4000;
/** The counter shows for the last 200 characters (L2-055 AC5). */
const COUNTED = 200;

/**
 * NewMessageDialog (L2-055): the first message to a business. The conversation then continues
 * in Messages. A retry of a failed send reuses its idempotency key, so nothing is sent twice.
 */
@Component({
  selector: 'jb-new-message-dialog',
  imports: [
    FormsModule,
    Button,
    Alert,
    Field,
    Textarea,
    DialogFrame,
    DialogBody,
    DialogFooter,
    FormDraftDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './new-message.dialog.html',
})
export class NewMessageDialog {
  private readonly ref = inject<DialogRef<NewMessageResult>>(DialogRef);
  private readonly api = inject(MESSAGES_API);
  protected readonly data = inject<NewMessageData>(DIALOG_DATA);

  protected readonly text = signal('');
  protected readonly view = signal<View>('form');
  protected readonly failure = signal({ title: '', text: '' });
  protected readonly error = signal('');
  protected readonly busy = computed(() => this.view() === 'busy');
  protected readonly max = MAX;
  /** "150 characters left", once 200 or fewer are left; null before that. */
  protected readonly counter = computed(() => {
    const left = MAX - this.text().length;
    if (left > COUNTED) return null;
    const shown = Math.max(0, left);
    return `${shown} ${shown === 1 ? 'character' : 'characters'} left`;
  });
  private readonly key = newKey();

  protected send(): void {
    if (this.busy()) return;
    const body = this.text().trim();
    if (!body) {
      this.error.set('Write a message before sending.');
      this.view.set('invalid');
      return;
    }
    if (body.length > MAX) {
      this.error.set('Messages can be up to 4,000 characters. Shorten this one.');
      this.view.set('invalid');
      return;
    }
    this.error.set('');
    this.view.set('busy');
    this.api.start(this.data.slug, body, this.key).subscribe({
      next: (started) => this.ref.close(started.conversationId),
      error: (error: unknown) => {
        this.failure.set(describe(error));
        this.view.set('failed');
      },
    });
  }

  protected close(): void {
    if (!this.busy()) this.ref.close();
  }
}

function describe(error: unknown): { title: string; text: string } {
  if (error instanceof HttpErrorResponse) {
    const code = (error.error as { code?: string } | null)?.code;
    if (error.status === 403 && code === 'EMAIL_UNCONFIRMED') {
      return {
        title: 'Confirm your e-mail first',
        text: 'We sent you a link when you joined. Open it, then send your message. What you typed is still here.',
      };
    }
    if (error.status === 429) {
      // The words of L2-137 AC1, with the wait the API named.
      return {
        title: 'You’re doing that a lot',
        text: `${tryAgainIn(error)} What you typed is still here.`,
      };
    }
    if (error.status === 409 && code === 'OWN_LISTING') {
      return { title: 'This is your own business', text: 'You can’t message a business you own.' };
    }
  }
  return {
    title: 'We couldn’t send that',
    text: 'Your connection dropped before it reached us. Nothing was sent and what you typed is still here. Try again.',
  };
}

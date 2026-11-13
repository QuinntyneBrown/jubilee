import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ADMIN_CONTENT_API, ContentSlug, PublishContent } from 'api';
import { Alert, Button, DialogBody, DialogFooter, DialogFrame, Icon } from 'components';

export interface PublishPolicyData {
  slug: ContentSlug;
  /** The version the publish makes. */
  version: number;
  text: PublishContent;
}

/** `published`: version {n} is live; `reload`: another version was published, start from it. */
export type PublishPolicyResult = 'published' | 'reload';

type View = 'confirm' | 'busy' | 'failed' | 'conflict';

/**
 * PublishPolicyDialog (L2-247 AC5 to AC8): confirms the publish of a policy page's draft as its
 * next version. It sends the version the draft started from, so a version published meanwhile is
 * refused (409 `VERSION_CHANGED`, ADR 0067) rather than overwritten.
 */
@Component({
  selector: 'jb-publish-policy-dialog',
  imports: [Alert, Button, DialogBody, DialogFooter, DialogFrame, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './publish-policy.dialog.html',
})
export class PublishPolicyDialog {
  private readonly ref = inject<DialogRef<PublishPolicyResult>>(DialogRef);
  private readonly api = inject(ADMIN_CONTENT_API);
  protected readonly data = inject<PublishPolicyData>(DIALOG_DATA);

  protected readonly view = signal<View>('confirm');
  protected readonly busy = computed(() => this.view() === 'busy');

  constructor() {
    // While the publish is sent, Escape and the backdrop leave the dialog open.
    effect(() => (this.ref.disableClose = this.busy()));
  }

  protected publish(): void {
    if (this.busy()) return;
    this.view.set('busy');
    this.api.publish(this.data.slug, this.data.text).subscribe({
      next: () => this.ref.close('published'),
      error: (error: unknown) =>
        this.view.set(
          error instanceof HttpErrorResponse && error.status === 409 ? 'conflict' : 'failed',
        ),
    });
  }

  protected reload(): void {
    this.ref.close('reload');
  }

  protected close(): void {
    if (!this.busy()) this.ref.close();
  }
}

import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button, DialogBody, DialogFooter, DialogFrame, Field, Icon, Textarea } from 'components';

export interface ExportReasonData {
  /** The table's label: "Messages". */
  label: string;
}

/**
 * ExportReasonDialog (L2-279 AC4): asks why private data is exported before it is. Closes with the
 * reason, kept in Audit records with the export, or with nothing when cancelled.
 */
@Component({
  selector: 'jb-export-reason-dialog',
  imports: [FormsModule, Button, DialogBody, DialogFooter, DialogFrame, Field, Icon, Textarea],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './export-reason.dialog.html',
})
export class ExportReasonDialog {
  private readonly ref = inject<DialogRef<string>>(DialogRef);
  protected readonly data = inject<ExportReasonData>(DIALOG_DATA);

  protected readonly reason = signal('');
  protected readonly ready = computed(() => this.reason().trim().length > 0);
  protected readonly heading = `Why export ${this.data.label.toLowerCase()}?`;
  protected readonly description = `${this.data.label} are private. Your reason is kept in Audit records with the export, under your name.`;

  protected send(): void {
    if (this.ready()) this.ref.close(this.reason().trim());
  }

  protected close(): void {
    this.ref.close();
  }
}

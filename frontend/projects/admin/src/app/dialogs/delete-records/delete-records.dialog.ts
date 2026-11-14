import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ADMIN_TABLES_API } from 'api';
import {
  Alert,
  Button,
  DialogBody,
  DialogFooter,
  DialogFrame,
  DoomedList,
  DoomedRecord,
  Field,
  Input,
} from 'components';

export interface DeleteRecordsData {
  /** The table's key, label and singular. */
  table: string;
  label: string;
  singular: string;
  records: readonly DoomedRecord[];
  /** How many other records point at them, and in which tables (L2-281 AC1). */
  pointing: number;
  tables: readonly string[];
}

type View = 'ask' | 'busy' | 'failed';

/**
 * DeleteRecordsDialog (L2-281 AC1, AC2): the alert dialog that asks before records are deleted. It
 * names them (up to four), warns of the records that point at them, and, for more than one, asks
 * for "delete" to be typed. Closes with how many were deleted, or with nothing when kept.
 */
@Component({
  selector: 'jb-delete-records-dialog',
  imports: [
    FormsModule,
    Alert,
    Button,
    DialogBody,
    DialogFooter,
    DialogFrame,
    DoomedList,
    Field,
    Input,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './delete-records.dialog.html',
})
export class DeleteRecordsDialog {
  private readonly ref = inject<DialogRef<number>>(DialogRef);
  private readonly api = inject(ADMIN_TABLES_API);
  protected readonly data = inject<DeleteRecordsData>(DIALOG_DATA);

  protected readonly view = signal<View>('ask');
  protected readonly typed = signal('');
  protected readonly busy = computed(() => this.view() === 'busy');
  protected readonly one = this.data.records.length === 1;
  protected readonly shown = this.data.records.slice(0, 4);
  private readonly unit = this.data.label.toLowerCase();

  protected readonly heading = this.one
    ? `Delete ${this.data.records[0].name}?`
    : `Delete ${this.data.records.length} ${this.unit}?`;
  protected readonly description = `This removes ${this.one ? 'it' : 'them'} for everyone on Jubilee. The deletion is kept in Audit records, but the data can’t be brought back after 30 days.`;
  protected readonly pointing =
    this.data.pointing > 0
      ? `${this.data.pointing} other ${this.data.pointing === 1 ? 'record points' : 'records point'} here, in ${this.data.tables.join(', ')}. They’ll show “deleted” where this used to be.`
      : null;
  protected readonly keep = this.one ? 'Keep it' : 'Keep them';
  protected readonly confirm = this.one
    ? `Delete ${this.data.singular.toLowerCase()}`
    : `Delete ${this.data.records.length} ${this.unit}`;

  /** One record is deleted at once; more wait for "delete" to be typed (L2-281 AC2). */
  protected readonly ready = computed(
    () => this.one || this.typed().trim().toLowerCase() === 'delete',
  );

  protected remove(): void {
    if (this.busy() || !this.ready()) return;
    this.view.set('busy');
    const ids = this.data.records.map((r) => r.id);
    this.api.remove(this.data.table, ids).subscribe({
      next: ({ count }) => this.ref.close(count),
      error: () => this.view.set('failed'),
    });
  }

  protected close(): void {
    if (!this.busy()) this.ref.close();
  }
}

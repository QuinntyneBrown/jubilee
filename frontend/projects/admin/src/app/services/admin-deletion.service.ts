import { Dialog } from '@angular/cdk/dialog';
import { inject, Injectable } from '@angular/core';
import { ADMIN_TABLES_API, AdminPointer, AdminTable, errorReference } from 'api';
import { DoomedRecord, ToastService } from 'components';
import { catchError, EMPTY, forkJoin, map, Observable, of, Subject, switchMap } from 'rxjs';
import {
  DeleteRecordsData,
  DeleteRecordsDialog,
} from '../dialogs/delete-records/delete-records.dialog';

/**
 * Deleting records (L2-281): asks with the delete dialog, then says how many were deleted with
 * "Undo" while the toast shows. `restored` tells the table screen to read its rows again.
 */
@Injectable({ providedIn: 'root' })
export class AdminDeletionService {
  private readonly api = inject(ADMIN_TABLES_API);
  private readonly dialog = inject(Dialog);
  private readonly toasts = inject(ToastService);
  private readonly undone = new Subject<string>();
  /** The key of a table whose records "Undo" brought back. */
  readonly restored = this.undone.asObservable();

  /**
   * Asks to delete the records and, when they are deleted, shows the toast with "Undo". Emits how
   * many were deleted, or nothing when they were kept. Without `pointers`, it reads each record to
   * say how many other records point at them (L2-281 AC1).
   */
  ask(
    table: AdminTable,
    records: readonly DoomedRecord[],
    pointers?: readonly AdminPointer[],
  ): Observable<number> {
    const read: Observable<readonly AdminPointer[]> = pointers
      ? of(pointers)
      : forkJoin(
          records.map((r) =>
            this.api.record(table.key, r.id).pipe(
              map((record) => record.pointsHere),
              catchError(() => of([] as AdminPointer[])),
            ),
          ),
        ).pipe(map((all) => all.flat()));
    return read.pipe(
      switchMap((found) => {
        const counted = found.filter((p) => p.count > 0);
        return this.dialog.open<number, DeleteRecordsData>(DeleteRecordsDialog, {
          role: 'alertdialog',
          ariaLabelledBy: 'dlg-title',
          ariaDescribedBy: 'dlg-desc',
          data: {
            table: table.key,
            label: table.label,
            singular: table.singular,
            records,
            pointing: counted.reduce((n, p) => n + p.count, 0),
            tables: [...new Set(counted.map((p) => p.label))],
          },
        }).closed;
      }),
      switchMap((count) => {
        if (!count) return EMPTY;
        this.deleted(table, records, count);
        return of(count);
      }),
    );
  }

  private deleted(table: AdminTable, records: readonly DoomedRecord[], count: number): void {
    const unit = count === 1 ? table.singular : table.label;
    this.toasts.show({
      tone: 'success',
      title: `${count} ${unit.toLowerCase()} deleted`,
      action: { label: 'Undo', run: () => this.undo(table, records) },
    });
  }

  /** "Undo": brings the records back as they were (L2-281 AC3). */
  private undo(table: AdminTable, records: readonly DoomedRecord[]): void {
    this.api
      .restore(
        table.key,
        records.map((r) => r.id),
      )
      .subscribe({
        next: () => this.undone.next(table.key),
        error: (error: unknown) =>
          this.toasts.show({
            tone: 'danger',
            title: 'We couldn’t bring them back',
            text: `They stay deleted for 30 days. If it keeps happening, tell us and quote ${errorReference(error, 'JB-ADM-504')}.`,
          }),
      });
  }
}

import { Dialog } from '@angular/cdk/dialog';
import { DOCUMENT } from '@angular/common';
import { HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ADMIN_TABLES_API, AdminExportQuery, AdminTable, errorReference } from 'api';
import { ToastService } from 'components';
import { EMPTY, Observable, of, switchMap } from 'rxjs';
import {
  ExportReasonData,
  ExportReasonDialog,
} from '../dialogs/export-reason/export-reason.dialog';
import { AdminCatalogService } from './admin-catalog.service';

/**
 * Exporting a table (L2-279): the server builds the file, which is saved under the name it gives;
 * a private table asks why first (AC4). "Email me this weekly" turns on and off here (AC3).
 */
@Injectable({ providedIn: 'root' })
export class AdminExportService {
  private readonly api = inject(ADMIN_TABLES_API);
  private readonly dialog = inject(Dialog);
  private readonly toasts = inject(ToastService);
  private readonly catalog = inject(AdminCatalogService);
  private readonly document = inject(DOCUMENT);

  /** Downloads the table as the query asks, after the reason when the table is private. */
  download(table: AdminTable, query: AdminExportQuery): void {
    const reason: Observable<string | undefined> = table.private
      ? this.dialog
          .open<string, ExportReasonData>(ExportReasonDialog, {
            ariaLabelledBy: 'dlg-title',
            ariaDescribedBy: 'dlg-desc',
            data: { label: table.label },
          })
          .closed.pipe(switchMap((given) => (given ? of(given) : EMPTY)))
      : of(undefined);
    reason
      .pipe(switchMap((given) => this.api.export(table.key, { ...query, reason: given })))
      .subscribe({
        next: (response) => this.save(response, `${table.key}.${query.format}`),
        error: (error: unknown) =>
          this.toasts.show({
            tone: 'danger',
            title: `We couldn’t export ${table.label.toLowerCase()}`,
            text: `Nothing was downloaded. If it keeps happening, tell us and quote ${errorReference(error, 'JB-ADM-503')}.`,
          }),
      });
  }

  /** Turns "Email me this weekly" on or off, and says so (L2-279 AC3). */
  weekly(table: AdminTable, on: boolean): void {
    this.api.setWeeklyExport(table.key, on).subscribe({
      next: () => {
        this.toasts.show({
          tone: 'success',
          title: on
            ? 'Every Monday at 08:00 you’ll get a link to this table’s CSV'
            : 'The weekly email is stopped',
        });
        this.catalog.refresh();
      },
      error: (error: unknown) =>
        this.toasts.show({
          tone: 'danger',
          title: on ? 'We couldn’t start the weekly email' : 'We couldn’t stop the weekly email',
          text: `Nothing was changed. If it keeps happening, tell us and quote ${errorReference(error, 'JB-ADM-505')}.`,
        }),
    });
  }

  /** Saves the file under the name of the answer's Content-Disposition. */
  private save(response: HttpResponse<Blob>, fallback: string): void {
    const body = response.body;
    if (!body) return;
    const url = URL.createObjectURL(body);
    const link = this.document.createElement('a');
    link.href = url;
    link.download = fileName(response.headers.get('content-disposition')) ?? fallback;
    link.click();
    URL.revokeObjectURL(url);
  }
}

/** The file name of a Content-Disposition header: `filename*` (RFC 6266) first, else `filename`. */
function fileName(disposition: string | null): string | null {
  if (!disposition) return null;
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
  if (encoded) return decodeURIComponent(encoded[1].trim());
  const plain = /filename="?([^";]+)"?/i.exec(disposition);
  return plain ? plain[1].trim() : null;
}

import { HttpClient } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { DataExportStatus, DeletionSummary } from '../models/account-data';

/** Contract of the data export and account deletion endpoints (L2-017, L2-018). */
export interface AccountDataApi {
  requestDataExport(): Observable<DataExportStatus>;
  currentDataExport(): Observable<DataExportStatus>;
  /** The archive behind the e-mailed link, as a file. */
  downloadDataExport(token: string): Observable<Blob>;
  deletionSummary(): Observable<DeletionSummary>;
  deleteAccount(confirmation: string): Observable<void>;
}

export const ACCOUNT_DATA_API = new InjectionToken<AccountDataApi>('ACCOUNT_DATA_API');

@Injectable()
export class HttpAccountDataApi implements AccountDataApi {
  private readonly http = inject(HttpClient);

  requestDataExport(): Observable<DataExportStatus> {
    return this.http.post<DataExportStatus>('/api/account/data-exports', {});
  }

  currentDataExport(): Observable<DataExportStatus> {
    return this.http.get<DataExportStatus>('/api/account/data-exports/current');
  }

  downloadDataExport(token: string): Observable<Blob> {
    return this.http.get(`/api/account/data-exports/${encodeURIComponent(token)}`, {
      responseType: 'blob',
    });
  }

  deletionSummary(): Observable<DeletionSummary> {
    return this.http.get<DeletionSummary>('/api/account/deletion-summary');
  }

  deleteAccount(confirmation: string): Observable<void> {
    return this.http.delete<void>('/api/account', { body: { confirmation } });
  }
}

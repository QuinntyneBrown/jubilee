import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  AdminCatalog,
  AdminRecord,
  AdminRows,
  AdminRowsQuery,
  AdminCount,
  AdminExportQuery,
  AdminValues,
  AdminOverview,
} from '../models/admin-tables';

/** Contract of the schema-driven tables of the admin application (L2-276 to L2-284, ADR 0074). */
export interface AdminTablesApi {
  /** What is waiting on staff, System and Recent changes, read at that moment (L2-274, L2-275). */
  overview(): Observable<AdminOverview>;
  /** The groups and tables the staff member may read, with their counts and rights. */
  catalog(): Observable<AdminCatalog>;
  /** A page of a table, searched, filtered and sorted by the database. */
  rows(table: string, query?: AdminRowsQuery): Observable<AdminRows>;
  /** One record, its pointers and its history (L2-282). */
  record(table: string, id: string): Observable<AdminRecord>;
  /** Changes the fields of a record through their bindings; a refusal is 422 with a code per field (L2-283 AC2). */
  update(table: string, id: string, values: AdminValues): Observable<AdminRecord>;
  /** Creates a record through the table's creation (L2-283 AC4). */
  create(table: string, values: AdminValues): Observable<AdminRecord>;
  /** Sets one status on the selected records; answers how many it reached (L2-280 AC4). */
  setStatus(table: string, ids: readonly string[], status: string): Observable<AdminCount>;
  /** Deletes the selected records of a table that declares deletion (L2-281 AC3). */
  remove(table: string, ids: readonly string[]): Observable<AdminCount>;
  /** Brings back records just deleted: "Undo" (L2-281 AC3). */
  restore(table: string, ids: readonly string[]): Observable<AdminCount>;
  /** The table as a file built on the server, named by the answer (L2-279 AC2). */
  export(table: string, query: AdminExportQuery): Observable<HttpResponse<Blob>>;
  /** Turns "Email me this weekly" on or off (L2-279 AC3). */
  setWeeklyExport(table: string, on: boolean): Observable<void>;
}

export const ADMIN_TABLES_API = new InjectionToken<AdminTablesApi>('ADMIN_TABLES_API');

@Injectable()
export class HttpAdminTablesApi implements AdminTablesApi {
  private readonly http = inject(HttpClient);

  overview(): Observable<AdminOverview> {
    return this.http.get<AdminOverview>('/api/admin/overview');
  }

  catalog(): Observable<AdminCatalog> {
    return this.http.get<AdminCatalog>('/api/admin/tables');
  }

  rows(table: string, query: AdminRowsQuery = {}): Observable<AdminRows> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '')
        params = params.set(key, String(value));
    }
    return this.http.get<AdminRows>(`/api/admin/tables/${encodeURIComponent(table)}`, { params });
  }

  record(table: string, id: string): Observable<AdminRecord> {
    return this.http.get<AdminRecord>(
      `/api/admin/tables/${encodeURIComponent(table)}/${encodeURIComponent(id)}`,
    );
  }

  update(table: string, id: string, values: AdminValues): Observable<AdminRecord> {
    return this.http.patch<AdminRecord>(
      `/api/admin/tables/${encodeURIComponent(table)}/${encodeURIComponent(id)}`,
      { values },
    );
  }

  create(table: string, values: AdminValues): Observable<AdminRecord> {
    return this.http.post<AdminRecord>(`/api/admin/tables/${encodeURIComponent(table)}`, {
      values,
    });
  }

  setStatus(table: string, ids: readonly string[], status: string): Observable<AdminCount> {
    return this.http.post<AdminCount>(`/api/admin/tables/${encodeURIComponent(table)}/status`, {
      ids,
      status,
    });
  }

  remove(table: string, ids: readonly string[]): Observable<AdminCount> {
    return this.http.post<AdminCount>(`/api/admin/tables/${encodeURIComponent(table)}/delete`, {
      ids,
    });
  }

  restore(table: string, ids: readonly string[]): Observable<AdminCount> {
    return this.http.post<AdminCount>(`/api/admin/tables/${encodeURIComponent(table)}/restore`, {
      ids,
    });
  }

  export(table: string, query: AdminExportQuery): Observable<HttpResponse<Blob>> {
    let params = new HttpParams().set('format', query.format);
    if (query.q) params = params.set('q', query.q);
    if (query.status) params = params.set('status', query.status);
    for (const id of query.ids ?? []) params = params.append('ids', id);
    if (query.reason) params = params.set('reason', query.reason);
    return this.http.get(`/api/admin/tables/${encodeURIComponent(table)}/export`, {
      params,
      observe: 'response',
      responseType: 'blob',
    });
  }

  setWeeklyExport(table: string, on: boolean): Observable<void> {
    const url = `/api/admin/tables/${encodeURIComponent(table)}/weekly-export`;
    return on ? this.http.put<void>(url, null) : this.http.delete<void>(url);
  }
}

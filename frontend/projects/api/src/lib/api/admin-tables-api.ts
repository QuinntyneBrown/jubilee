import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  AdminCatalog,
  AdminRecord,
  AdminRows,
  AdminRowsQuery,
  AdminCount,
  AdminValues,
} from '../models/admin-tables';

/** Contract of the schema-driven tables of the admin application (L2-276 to L2-284, ADR 0074). */
export interface AdminTablesApi {
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
}

export const ADMIN_TABLES_API = new InjectionToken<AdminTablesApi>('ADMIN_TABLES_API');

@Injectable()
export class HttpAdminTablesApi implements AdminTablesApi {
  private readonly http = inject(HttpClient);

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
}

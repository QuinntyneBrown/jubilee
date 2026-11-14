import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AdminCatalog, AdminRows, AdminRowsQuery } from '../models/admin-tables';

/** Contract of the schema-driven tables of the admin application (L2-276 to L2-284, ADR 0074). */
export interface AdminTablesApi {
  /** The groups and tables the staff member may read, with their counts and rights. */
  catalog(): Observable<AdminCatalog>;
  /** A page of a table, searched, filtered and sorted by the database. */
  rows(table: string, query?: AdminRowsQuery): Observable<AdminRows>;
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
}

import { computed, Injectable, inject, signal } from '@angular/core';
import { ADMIN_TABLES_API, AdminCatalog, AdminTable } from 'api';
import { catchError, of } from 'rxjs';

/**
 * The catalog of the tables the staff member may read, with their counts (L2-272 AC2, L2-284). It
 * is read when the admin application opens and again as the staff member moves between screens, so
 * the sidebar's counts are those of that moment; nothing polls (ADR 0058). A read that fails keeps
 * what is shown.
 */
@Injectable({ providedIn: 'root' })
export class AdminCatalogService {
  private readonly api = inject(ADMIN_TABLES_API);
  readonly catalog = signal<AdminCatalog | null>(null);

  readonly tables = computed(() => this.catalog()?.groups.flatMap((g) => g.tables) ?? []);

  refresh(): void {
    this.api
      .catalog()
      .pipe(catchError(() => of(null)))
      .subscribe((catalog) => {
        if (catalog) this.catalog.set(catalog);
      });
  }

  /** A table the staff member may read, by its key; null when it is not (yet) known. */
  table(key: string): AdminTable | null {
    return this.tables().find((t) => t.key === key) ?? null;
  }

  forget(): void {
    this.catalog.set(null);
  }
}

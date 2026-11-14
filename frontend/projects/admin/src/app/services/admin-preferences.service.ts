import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';

/** How a staff member left a table: the columns shown and the rows per page (L2-278 AC5). */
export interface TablePreferences {
  columns?: string[];
  size?: number;
}

/**
 * The staff member's choices for each table, kept in this browser only: a per-viewer convenience
 * the server never sees (L2-278 AC5). Storage can be missing or refused (a private window, blocked
 * site data); the tables then fall back to their defaults.
 */
@Injectable({ providedIn: 'root' })
export class AdminPreferencesService {
  private readonly storage = inject(DOCUMENT).defaultView;

  read(table: string): TablePreferences {
    try {
      const saved = this.storage?.localStorage.getItem(this.keyOf(table));
      const value: unknown = saved ? JSON.parse(saved) : {};
      return typeof value === 'object' && value !== null ? (value as TablePreferences) : {};
    } catch {
      return {};
    }
  }

  write(table: string, change: TablePreferences): void {
    try {
      const next = { ...this.read(table), ...change };
      this.storage?.localStorage.setItem(this.keyOf(table), JSON.stringify(next));
    } catch {
      // Not kept: the table works the same and starts from its defaults next time.
    }
  }

  private keyOf(table: string): string {
    return `jubilee.admin.table.${table}`;
  }
}

import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Button } from '../button/button';
import { Icon } from '../icon/icon';
import { Skeleton } from '../skeleton/skeleton';
import { StatusPill } from '../status-pill/status-pill';

/** How a column's values are drawn (ADR 0074). */
export type RecordsColumnType =
  | 'id'
  | 'text'
  | 'email'
  | 'mono'
  | 'json'
  | 'long'
  | 'status'
  | 'bool'
  | 'number'
  | 'money'
  | 'date'
  | 'datetime'
  | 'ref'
  | 'url';

export interface RecordsColumn {
  key: string;
  label: string;
  type: RecordsColumnType;
  /** False for a column the server cannot sort by; its heading is not a button. */
  sortable?: boolean;
}

/** How the table is sorted: by a column, ascending or descending (L2-277 AC5). */
export interface RecordsSort {
  key: string;
  dir: 'asc' | 'desc';
}

/** What a table without rows says, and the action that clears what hid them (L2-277 AC3). */
export interface RecordsEmpty {
  title: string;
  text: string;
  action?: string;
}

/** A reference: the record's name, or deleted; a name is null when the role may not read its table. */
export interface RecordsRef {
  table: string;
  id: string;
  name: string | null;
  deleted: boolean;
}

export interface RecordsRow {
  id: string;
  name: string;
  values: Record<string, unknown>;
}

/** A cell as the template draws it. */
type Cell =
  | { kind: 'empty' }
  | { kind: 'mono' | 'muted' | 'num' | 'long' | 'text' | 'status'; text: string }
  | { kind: 'bool'; yes: boolean }
  | { kind: 'ref'; text: string; link: string[] }
  | { kind: 'deleted' };

const ZONE = 'America/Toronto';
const DAY = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: ZONE,
});
const MOMENT = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: ZONE,
});
const MONEY = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' });

/** A date as the tables show it: "14 Nov 2026", or "14 Nov 2026, 09:44" with its time, in Toronto. */
export function formatAdminDate(value: string, withTime: boolean): string {
  const date = new Date(value.length === 10 ? `${value}T12:00:00Z` : value);
  if (Number.isNaN(date.getTime())) return value;
  return (withTime ? MOMENT : DAY).format(date);
}

function isRef(value: unknown): value is RecordsRef {
  return typeof value === 'object' && value !== null && 'table' in value && 'deleted' in value;
}

/** Draws one value by its type (L2-276 AC3). */
export function cellOf(type: RecordsColumnType, value: unknown): Cell {
  if (value === null || value === undefined || value === '') return { kind: 'empty' };
  switch (type) {
    case 'id':
    case 'mono':
    case 'json':
      return { kind: 'mono', text: typeof value === 'string' ? value : JSON.stringify(value) };
    case 'status':
      return { kind: 'status', text: String(value) };
    case 'bool':
      return { kind: 'bool', yes: value === true };
    case 'number':
      return {
        kind: 'num',
        text: typeof value === 'number' ? value.toLocaleString('en-CA') : String(value),
      };
    case 'money':
      return { kind: 'num', text: typeof value === 'number' ? MONEY.format(value) : String(value) };
    case 'date':
    case 'datetime':
      return { kind: 'muted', text: formatAdminDate(String(value), type === 'datetime') };
    case 'long':
      return { kind: 'long', text: String(value) };
    case 'ref':
      if (!isRef(value)) return { kind: 'mono', text: String(value) };
      if (value.deleted) return { kind: 'deleted' };
      return value.name === null
        ? { kind: 'mono', text: value.id }
        : { kind: 'ref', text: value.name, link: ['/', value.table, value.id] };
    default:
      return { kind: 'text', text: String(value) };
  }
}

/**
 * The rows of a table of the admin application (L2-276), in their card:
 *
 *     <div jb-records-table table="members" caption="Members" [columns]="columns()" [rows]="rows()"
 *       statusKey="status" selectable [loading]="loading()">
 *       <div slot="empty">…</div>
 *       <div slot="foot">…</div>
 *     </div>
 *
 * From 768 px it is a table whose columns are the fields given, each value drawn by its type, with
 * a column of checkboxes when `selectable` and a last column of row actions; a row's name links to
 * its record and choosing the row opens it. Below 768 px it is a list of names, IDs and statuses.
 * A table wider than the card scrolls inside it. While `loading`, six rows of skeletons fill the
 * columns. `error` replaces everything with the `error` slot; with no rows the card says `empty`
 * and its action emits `emptyAction`; the `foot` slot (the pagination) closes the card. A sortable
 * column's heading is a button that sorts ascending, then descending, then not at all, emitting
 * `sorted` and saying the order with `aria-sort`.
 */
@Component({
  selector: 'div[jb-records-table]',
  imports: [NgTemplateOutlet, RouterLink, Button, Icon, Skeleton, StatusPill],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'records' },
  templateUrl: './records-table.html',
  styleUrl: './records-table.scss',
})
export class RecordsTable {
  private readonly router = inject(Router);

  /** The table's key, the first segment of each record's path. */
  readonly table = input.required<string>();
  /** The table's name, the caption assistive technology reads. */
  readonly caption = input.required<string>();
  readonly columns = input.required<readonly RecordsColumn[]>();
  readonly rows = input<readonly RecordsRow[]>([]);
  readonly statusKey = input<string | null>(null);
  readonly selectable = input(false, { transform: booleanAttribute });
  readonly loading = input(false, { transform: booleanAttribute });
  readonly error = input(false, { transform: booleanAttribute });
  readonly sort = input<RecordsSort | null>(null);
  readonly empty = input<RecordsEmpty | null>(null);

  readonly sorted = output<RecordsSort | null>();
  readonly emptyAction = output<void>();

  protected readonly skeletons = [0, 1, 2, 3, 4, 5];
  protected readonly widths = [50, 70, 30] as const;

  /** The column that names the row: Name, else the first text column, else the ID. */
  protected readonly nameKey = computed(() => {
    const columns = this.columns();
    return (
      columns.find((c) => c.key === 'name')?.key ??
      columns.find((c) => c.type === 'text')?.key ??
      columns.find((c) => c.type === 'id')?.key ??
      null
    );
  });

  protected readonly drawn = computed(() =>
    this.rows().map((row) => ({
      row,
      link: ['/', this.table(), row.id],
      status: this.statusKey() ? row.values[this.statusKey()!] : null,
      cells: this.columns().map((column) => ({
        column,
        cell: cellOf(column.type, row.values[column.key]),
        isName: column.key === this.nameKey() && row.values[column.key] != null,
        numeric: column.type === 'number' || column.type === 'money',
      })),
    })),
  );

  protected ariaSort(column: RecordsColumn): 'ascending' | 'descending' | 'none' | null {
    if (column.sortable === false) return null;
    const sort = this.sort();
    if (sort?.key !== column.key) return 'none';
    return sort.dir === 'asc' ? 'ascending' : 'descending';
  }

  /** Ascending, then descending, then not at all (L2-277 AC5). */
  protected sortBy(column: RecordsColumn): void {
    const sort = this.sort();
    if (sort?.key !== column.key) this.sorted.emit({ key: column.key, dir: 'asc' });
    else if (sort.dir === 'asc') this.sorted.emit({ key: column.key, dir: 'desc' });
    else this.sorted.emit(null);
  }

  protected width(row: number, column: number): 30 | 50 | 70 {
    return this.widths[(row + column) % 3];
  }

  protected asText(value: unknown): string {
    return typeof value === 'string' ? value : '';
  }

  /** Choosing a row away from its links and checkboxes opens its record (L2-276 AC4). */
  protected choose(event: MouseEvent, link: string[]): void {
    const target = event.target as HTMLElement;
    if (target.closest('a, button, input, label')) return;
    void this.router.navigate(link);
  }
}

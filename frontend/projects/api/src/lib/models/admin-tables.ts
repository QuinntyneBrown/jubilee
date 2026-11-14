/** How a field's value is drawn and edited (ADR 0075). */
export type AdminFieldType =
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

/** One field of a table, as the catalog describes it (L2-276). */
export interface AdminField {
  key: string;
  label: string;
  type: AdminFieldType;
  /** Set by Jubilee: shown under the fields of a record, never edited (L2-283). */
  system: boolean;
  searchable: boolean;
  sortable: boolean;
  /** The staff member may change it (L2-283, L2-284). */
  editable: boolean;
  /** Given a value when a record is created (L2-283 AC4). */
  creatable: boolean;
  /** The words of a status. */
  options: string[] | null;
  /** The table a reference points at. */
  refTable: string | null;
}

/** One table of Jubilee's records with what the staff member may do in it (L2-276, L2-284). */
export interface AdminTable {
  /** The table's key in kebab case, its path: `members`, `listing-reports`. */
  key: string;
  label: string;
  singular: string;
  group: string;
  sentence: string;
  /** What an empty table says after "No {table} yet." (L2-099 AC4), or null. */
  empty: string | null;
  count: number;
  fields: AdminField[];
  defaultColumns: string[];
  statusField: string | null;
  readOnly: boolean;
  private: boolean;
  canChange: boolean;
  canEdit: boolean;
  canCreate: boolean;
  canDelete: boolean;
  /** The staff member gets a link to its CSV every Monday (L2-279 AC3). */
  weeklyExport: boolean;
}

export interface AdminGroup {
  name: string;
  readOnly: boolean;
  tables: AdminTable[];
}

/** The answer of `GET /api/admin/tables`: the groups of the sidebar and the tables the role may read. */
export interface AdminCatalog {
  groups: AdminGroup[];
}

/** A reference as the API draws it: the record's name, or `deleted` when it is gone (L2-281 AC1). */
export interface AdminRefValue {
  table: string;
  id: string;
  name: string | null;
  deleted: boolean;
}

/** One row: its ID, its name and the value of each field by key. */
export interface AdminRow {
  id: string;
  name: string;
  values: Record<string, unknown>;
}

/** The answer of `GET /api/admin/tables/{table}`: a page of rows and how many match. */
export interface AdminRows {
  rows: AdminRow[];
  total: number;
  page: number;
  size: number;
}

/** What a page of rows is asked for with (L2-277, L2-278). */
/** A table whose records reference a record, through a field, with how many (L2-282 AC4). */
export interface AdminPointer {
  table: string;
  label: string;
  field: string;
  count: number;
}

/** One line of a record's history (L2-282 AC5). */
export interface AdminHistoryLine {
  at: string;
  actor: string;
  what: string;
  text: string;
}

/** One record of a table, as `GET /api/admin/tables/{table}/{id}` answers (L2-282). */
export interface AdminRecord {
  table: string;
  id: string;
  name: string;
  status: string | null;
  values: Record<string, unknown>;
  pointsHere: AdminPointer[];
  history: AdminHistoryLine[];
  /** Opening it was written to Audit records under the staff member's name (L2-284 AC3). */
  readAudited: boolean;
  /** The staff member's own listing, or a report of it: they may not act on it (L2-284 AC4). */
  ownListing: boolean;
}

export interface AdminRowsQuery {
  q?: string;
  status?: string;
  sort?: string;
  dir?: 'asc' | 'desc';
  page?: number;
  size?: number;
}

/** The rows a staff member may show per page (L2-278 AC3). */
export const ADMIN_PAGE_SIZES = [25, 50, 100, 250] as const;

/** A count as the sidebar shows it, shortened at a thousand: "2.4k", "184k" (L2-272 AC2). */
export function compactCount(n: number): string {
  if (n >= 10_000) return `${Math.round(n / 1000)}k`;
  if (n >= 1000) return `${(Math.floor(n / 100) / 10).toFixed(1)}k`;
  return String(n);
}

/** A count in full, as assistive technology hears it: "2,431 records". */
export function countInFull(n: number): string {
  return `${n.toLocaleString('en-CA')} ${n === 1 ? 'record' : 'records'}`;
}

/** Whether a value is a reference drawn by the API. */
export function isAdminRef(value: unknown): value is AdminRefValue {
  return (
    typeof value === 'object' &&
    value !== null &&
    'table' in value &&
    'id' in value &&
    'deleted' in value
  );
}

/** The values of a change or a creation, by field key, in their wire form (L2-283). */
export type AdminValues = Record<string, string | null>;

/** One line of the overview's work queue: a table and what waits in it (L2-274 AC3). */
export interface AdminQueueLine {
  table: string;
  label: string;
  count: number;
  urgent: boolean;
  /** The ID of the oldest record waiting, which the line's name opens (L2-274 AC4). */
  nextId: string;
  next: string;
  oldestAt: string | null;
}

/** A section of the work queue, "Safety" or "Waiting on us", with the lines that wait. */
export interface AdminQueueSection {
  title: string;
  note: string;
  lines: AdminQueueLine[];
}

/** An item of System: a failed job run, a troubled outbox message or maintenance (L2-275). */
export interface AdminSystemItem {
  kind: 'failed' | 'retrying' | 'gave-up' | 'maintenance';
  table: string;
  subject: string | null;
  at: string;
  attempts?: number | null;
  until?: string | null;
}

/** One line of Recent changes (L2-275 AC4). */
export interface AdminChange {
  actor: string;
  what: string;
  table: string | null;
  recordId: string;
  at: string;
}

/** The overview (L2-274, L2-275): what is waiting on staff, System and Recent changes. */
export interface AdminOverview {
  waiting: number;
  since: { members: number; listings: number; orders: number; requests: number };
  sections: AdminQueueSection[];
  system: AdminSystemItem[];
  changes: AdminChange[];
}

/** A record the jump palette lists (L2-273 AC3). */
export interface AdminJump {
  table: string;
  tableLabel: string;
  singular: string;
  id: string;
  name: string;
}

/** How many records a change of the selection reached (L2-280 AC4). */
export interface AdminCount {
  count: number;
}

/** What an export holds: every record, the matching ones (`q`, `status`) or the selected `ids` (L2-279 AC2). */
export interface AdminExportQuery {
  format: 'csv' | 'json';
  q?: string;
  status?: string | null;
  ids?: readonly string[];
  /** Why private data is exported; kept in Audit records (L2-279 AC4). */
  reason?: string;
}

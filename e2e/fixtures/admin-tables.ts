import type { Page, Route } from '@playwright/test';
import mockTables from './api/admin-mock-tables.json';
import { type FakeStaff, type StaffMember, stubStaff } from './staff';

// A stand-in for the schema-driven tables of the admin application (L2-272, L2-276 to L2-284,
// ADR 0074): the catalog of `GET /api/admin/tables` and the rows of `GET /api/admin/tables/{table}`,
// answered at the network edge (ADR 0009). The answers have the shape the API gives
// (AdminTablesController); every request for rows is kept so a test can prove what it asked for.

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

export interface AdminField {
  key: string;
  label: string;
  type: AdminFieldType;
  system: boolean;
  searchable: boolean;
  sortable: boolean;
  editable: boolean;
  /** Given a value when a record is created (L2-283 AC4). */
  creatable: boolean;
  options: string[] | null;
  refTable: string | null;
}

export interface AdminTable {
  key: string;
  label: string;
  singular: string;
  group: string;
  sentence: string;
  /** What an empty table says after "No {table} yet." (L2-099 AC4). */
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
}

export interface AdminGroup {
  name: string;
  readOnly: boolean;
  tables: AdminTable[];
}

export interface AdminRow {
  id: string;
  name: string;
  values: Record<string, unknown>;
}

const field = (
  key: string,
  label: string,
  type: AdminFieldType = 'text',
  extra: Partial<AdminField> = {},
): AdminField => ({
  key,
  label,
  type,
  system: false,
  searchable: true,
  sortable: true,
  editable: false,
  creatable: false,
  options: null,
  refTable: null,
  ...extra,
});

const id = field('id', 'ID', 'id', { system: true });
const created = field('createdAt', 'Created', 'datetime', { system: true, searchable: false });

const table = (
  key: string,
  label: string,
  singular: string,
  group: string,
  count: number,
  extra: Partial<AdminTable> = {},
): AdminTable => {
  const fields = extra.fields ?? [id, field('name', 'Name'), created];
  const readOnly = extra.readOnly ?? group === 'System';
  return {
    key,
    label,
    singular,
    group,
    sentence: `The ${label.toLowerCase()} of Jubilee.`,
    empty: null,
    count,
    fields,
    defaultColumns: fields.slice(0, 6).map((f) => f.key),
    statusField: fields.find((f) => f.key === 'status')?.key ?? null,
    readOnly,
    private: false,
    canChange: !readOnly,
    canEdit: !readOnly && fields.some((f) => f.editable),
    canCreate: false,
    canDelete: false,
    ...extra,
  };
};

const MEMBER_FIELDS = [
  id,
  field('name', 'Name'),
  field('email', 'Email', 'email'),
  field('status', 'Status', 'status', {
    options: ['active', 'unconfirmed', 'deleted'],
    searchable: false,
  }),
  field('phone', 'Phone', 'mono'),
  field('postalCode', 'Postal code', 'mono'),
  created,
  field('emailConfirmed', 'Email confirmed', 'bool', { searchable: false }),
];

/** Members, as the first table of Accounts (L2-276 AC2). */
export const MEMBERS = table('members', 'Members', 'Member', 'Accounts', 2431, {
  sentence:
    'Everyone with a Jubilee account: shoppers, renters and the people behind each listing.',
  fields: MEMBER_FIELDS,
  defaultColumns: ['id', 'name', 'email', 'status', 'phone', 'postalCode', 'createdAt'],
  statusField: 'status',
  canDelete: true,
});

const LISTING_FIELDS = [
  id,
  field('name', 'Name'),
  field('kind', 'Kind', 'status', {
    options: ['shop', 'services', 'space', 'platform'],
    searchable: false,
  }),
  field('status', 'Status', 'status', {
    options: ['deleted', 'taken down', 'on hold', 'paused', 'live', 'draft'],
    searchable: false,
  }),
  field('ownerId', 'Owner', 'ref', { refTable: 'members', searchable: false }),
  field('category', 'Category', 'mono'),
  field('neighbourhood', 'Neighbourhood'),
  field('publishedAt', 'Published', 'datetime', { searchable: false }),
  created,
];

/** Listings, as L2-099 AC1 describes the table. */
export const LISTINGS = table('listings', 'Listings', 'Listing', 'Listings', 184_212, {
  sentence:
    'Every shop, service and space on Jubilee. Unpublishing hides it from Browse immediately.',
  empty: 'A listing appears here as soon as its owner publishes it.',
  fields: LISTING_FIELDS,
  defaultColumns: ['id', 'name', 'kind', 'status', 'ownerId', 'category', 'neighbourhood'],
  statusField: 'status',
});

const ORDER_FIELDS = [
  id,
  field('name', 'Buyer'),
  field('total', 'Total', 'money', { searchable: false }),
  field('lines', 'Lines', 'number', { searchable: false }),
  created,
  field('memberId', 'Member', 'ref', { refTable: 'members', searchable: false }),
];

/** Merch orders, whose totals are money and whose lines are a number. */
export const MERCH_ORDERS = table('merch-orders', 'Merch orders', 'Merch order', 'Merch', 41, {
  fields: ORDER_FIELDS,
  defaultColumns: ORDER_FIELDS.slice(0, 5).map((f) => f.key),
});

/** Staff: read-only for every role (L2-284 AC1), and never read by a moderator. */
export const STAFF_TABLE = table('staff', 'Staff', 'Staff member', 'Accounts', 6, {
  readOnly: true,
  canChange: false,
  canEdit: false,
});

const FEEDBACK_FIELDS = [
  id,
  field('kind', 'Kind', 'status', {
    options: ['rating', 'bug', 'kudos', 'check-in'],
    searchable: false,
  }),
  field('memberId', 'Member', 'ref', { refTable: 'members', searchable: false }),
  field('status', 'Status', 'status', {
    options: ['new', 'read', 'in progress', 'fixed'],
    searchable: false,
    editable: true,
  }),
  field('body', 'Note', 'long'),
  created,
  field('reply', 'Reply', 'long', { searchable: false, editable: true }),
];

/** Feedback, whose status and reply a moderator changes through the feedback feature (L2-283). */
export const FEEDBACK = table('feedback', 'Feedback', 'Feedback', 'Feedback', 1, {
  fields: FEEDBACK_FIELDS,
  statusField: 'status',
});

const SLOT_FIELDS = [
  id,
  field('listingId', 'Listing', 'ref', {
    refTable: 'listings',
    searchable: false,
    creatable: true,
  }),
  field('position', 'Position', 'number', { searchable: false, creatable: true }),
  field('startsOn', 'Week of', 'date', { searchable: false, creatable: true }),
];

/** Featured slots, made through the rules of the featured week (L2-106, L2-283 AC4). */
export const FEATURED_SLOTS = table(
  'featured-slots',
  'Featured slots',
  'Featured slot',
  'Listings',
  0,
  { fields: SLOT_FIELDS, canCreate: true },
);

export const JOB_RUNS = table('job-runs', 'Job runs', 'Job run', 'System', 1204);

/** Every group of the sidebar, in order (L2-272 AC2), each with some of its tables. */
export function catalogFor(staff: StaffMember): AdminGroup[] {
  const admin = staff.roles.includes('admin');
  const groups: [string, AdminTable[]][] = [
    [
      'Accounts',
      [
        MEMBERS,
        ...(admin ? [STAFF_TABLE] : []),
        table('sessions', 'Sessions', 'Session', 'Accounts', 3120),
      ],
    ],
    ['Listings', [LISTINGS, FEATURED_SLOTS]],
    [
      'Requests & messaging',
      [table('requests', 'Requests', 'Request', 'Requests & messaging', 9800)],
    ],
    ['Reviews', [table('reviews', 'Reviews', 'Review', 'Reviews', 640)]],
    [
      'Moderation',
      [table('listing-reports', 'Listing reports', 'Listing report', 'Moderation', 14)],
    ],
    [
      'Member activity',
      [table('saved-items', 'Saved items', 'Saved item', 'Member activity', 5200)],
    ],
    ['Feedback', [FEEDBACK]],
    ['Merch', [MERCH_ORDERS]],
    [
      'Launch',
      [table('launch-subscribers', 'Launch subscribers', 'Launch subscriber', 'Launch', 999)],
    ],
    [
      'Site & content',
      [table('content-versions', 'Content versions', 'Content version', 'Site & content', 9)],
    ],
    ['System', [JOB_RUNS]],
  ];
  return groups.map(([name, tables]) => ({
    name,
    readOnly: name === 'System',
    tables: tables.map((t) => (admin || t.readOnly ? t : { ...t, canDelete: false })),
  }));
}

/** The members the Members table shows, newest first. */
export const MEMBER_ROWS: AdminRow[] = [
  {
    id: '6f1c2a90-0d1e-4c55-9a7a-1b2c3d4e5f60',
    name: 'Ruth Chen',
    values: {
      id: '6f1c2a90-0d1e-4c55-9a7a-1b2c3d4e5f60',
      name: 'Ruth Chen',
      email: 'ruth.c@outlook.com',
      status: 'active',
      phone: null,
      postalCode: 'M4M 1H2',
      createdAt: '2026-09-10T14:20:00+00:00',
      emailConfirmed: true,
    },
  },
  {
    id: '0a9b8c7d-6e5f-4a3b-8c2d-1e0f9a8b7c6d',
    name: 'Naomi Laurent',
    values: {
      id: '0a9b8c7d-6e5f-4a3b-8c2d-1e0f9a8b7c6d',
      name: 'Naomi Laurent',
      email: 'naomi@example.com',
      status: 'unconfirmed',
      phone: '416-555-0144',
      postalCode: null,
      createdAt: '2026-06-02T09:05:00+00:00',
      emailConfirmed: false,
    },
  },
];

/** Ruth's rating, new and unanswered. */
export const FEEDBACK_ROW: AdminRow = {
  id: 'f1e2d3c4-b5a6-4978-8a9b-0c1d2e3f4a5b',
  name: 'Ruth Chen',
  values: {
    id: 'f1e2d3c4-b5a6-4978-8a9b-0c1d2e3f4a5b',
    kind: 'rating',
    memberId: {
      table: 'members',
      id: '6f1c2a90-0d1e-4c55-9a7a-1b2c3d4e5f60',
      name: 'Ruth Chen',
      deleted: false,
    },
    status: 'new',
    body: 'Finding a plumber was easy.',
    createdAt: '2026-11-09T15:00:00+00:00',
    reply: null,
  },
};

/** A run of a job, a record of a read-only table. */
export const JOB_RUN_ROW: AdminRow = {
  id: 'job_9874',
  name: 'job_9874',
  values: { id: 'job_9874', name: 'exports.build', createdAt: '2026-11-14T14:30:00+00:00' },
};

/** As many members as a test needs to turn pages: "Member 001", "Member 002"… */
export function manyMembers(count: number): AdminRow[] {
  return Array.from({ length: count }, (_, i) => {
    const n = String(i + 1).padStart(3, '0');
    const id = `00000000-0000-4000-8000-000000000${n}`;
    return {
      id,
      name: `Member ${n}`,
      values: {
        id,
        name: `Member ${n}`,
        email: `member${n}@example.com`,
        status: 'active',
        phone: null,
        postalCode: null,
        createdAt: '2026-10-01T12:00:00+00:00',
        emailConfirmed: i % 2 === 0,
      },
    };
  });
}

export const LISTING_ROWS: AdminRow[] = [
  {
    id: '3b2a1c0d-9e8f-4a7b-b6c5-d4e3f2a1b0c9',
    name: 'Luzandre.com',
    values: {
      id: '3b2a1c0d-9e8f-4a7b-b6c5-d4e3f2a1b0c9',
      name: 'Luzandre.com',
      status: 'live',
      ownerId: { table: 'members', id: MEMBER_ROWS[0].id, name: 'Ruth Chen', deleted: false },
      kind: 'shop',
      category: 'clothing',
      neighbourhood: 'Leslieville',
      publishedAt: '2026-11-08T10:00:00+00:00',
      createdAt: '2026-11-08T10:00:00+00:00',
    },
  },
  {
    id: '7c6b5a4d-3e2f-4a1b-90c8-d7e6f5a4b3c2',
    name: 'Grace Bakery',
    values: {
      id: '7c6b5a4d-3e2f-4a1b-90c8-d7e6f5a4b3c2',
      name: 'Grace Bakery',
      status: 'taken down',
      ownerId: {
        table: 'members',
        id: '11111111-2222-4333-8444-555555555555',
        name: null,
        deleted: true,
      },
      kind: 'services',
      category: 'food-drink',
      neighbourhood: null,
      publishedAt: null,
      createdAt: '2026-10-01T10:00:00+00:00',
    },
  },
];

export const ORDER_ROWS: AdminRow[] = [
  {
    id: '9d8c7b6a-5f4e-4d3c-8b2a-1f0e9d8c7b6a',
    name: 'Joanna Reyes',
    values: {
      id: '9d8c7b6a-5f4e-4d3c-8b2a-1f0e9d8c7b6a',
      name: 'Joanna Reyes',
      total: 1248.5,
      lines: 3,
      createdAt: '2026-11-12T15:30:00+00:00',
      memberId: {
        table: 'members',
        id: '6f1c2a90-0d1e-4c55-9a7a-1b2c3d4e5f60',
        name: 'Ruth Chen',
        deleted: false,
      },
    },
  },
];

export type RowsAnswer = 'ok' | 'fails' | 'forbidden' | 'not-found' | 'slow';

/** How a record is answered: as found, failing, or never. */
export type RecordAnswer = 'ok' | 'fails' | 'slow';

/** How a change or a creation is answered: saved, refused field by field, or never (L2-283 AC2). */
export type SaveAnswer = 'ok' | 'refused' | 'slow';

/** A change or a creation the admin application sent. */
export interface AdminSave {
  method: 'PATCH' | 'POST';
  path: string;
  values: Record<string, unknown>;
}

export interface AdminPointer {
  table: string;
  label: string;
  field: string;
  count: number;
}

export interface AdminHistoryLine {
  at: string;
  actor: string;
  what: string;
  text: string;
}

/** What a record adds to its row: what points at it and its history (L2-282 AC4, AC5). */
export interface RecordExtras {
  pointsHere?: AdminPointer[];
  history?: AdminHistoryLine[];
}

export interface FakeAdminTables {
  staff: FakeStaff;
  /** The rows each table answers with; a table without rows answers none. */
  rows: Record<string, AdminRow[]>;
  /** How the next request for rows is answered. */
  answer: RowsAnswer;
  /** How the next request for a record is answered. */
  recordAnswer: RecordAnswer;
  /** The pointers and history of records, by `{table}/{id}`. */
  records: Record<string, RecordExtras>;
  /** How the next change or creation is answered. */
  saveAnswer: SaveAnswer;
  /** The codes of a refusal, by field, when `saveAnswer` is 'refused'. */
  refusal: Record<string, string>;
  /** Every change and creation sent, in order. */
  saves: AdminSave[];
  /** The path and query of every request for rows, such as `/members?page=1&size=25`. */
  rowRequests: string[];
  catalogReads: number;
}

const problem = (status: number, code: string, title: string) => ({
  status,
  contentType: 'application/problem+json',
  body: JSON.stringify({ title, status, code, correlationId: 'e2e' }),
});

const text = (value: unknown): string =>
  value !== null && typeof value === 'object' && 'name' in value
    ? String((value as { name: unknown }).name ?? '')
    : String(value ?? '');

/** A refusal of a change, field by field, as the API answers it (L2-283 AC2). */
const refused = (errors: Record<string, string>) => ({
  status: 422,
  contentType: 'application/problem+json',
  body: JSON.stringify({
    title: 'Fix the highlighted fields.',
    status: 422,
    code: 'validation_failed',
    errors,
    correlationId: 'e2e',
  }),
});

/** The history of a record no one has changed: Jubilee created it. */
function creation(table: AdminTable, row: AdminRow): AdminHistoryLine[] {
  const created = row.values['createdAt'];
  const what = `created this ${table.singular.toLowerCase()}`;
  return typeof created === 'string'
    ? [{ at: created, actor: 'Jubilee', what, text: `Jubilee ${what}` }]
    : [];
}

/** The rows that match `q` and `status`, sorted by `sort` and `dir`, as the API answers them. */
function answerRows(table: AdminTable, rows: AdminRow[], params: URLSearchParams): AdminRow[] {
  const q = (params.get('q') ?? '').toLowerCase();
  const status = params.get('status');
  const sort = params.get('sort');
  const down = params.get('dir') === 'desc';
  let found = rows.filter(
    (row) =>
      (!q || Object.values(row.values).some((v) => text(v).toLowerCase().includes(q))) &&
      (!status || !table.statusField || row.values[table.statusField] === status),
  );
  if (sort) {
    found = [...found].sort(
      (a, b) => text(a.values[sort]).localeCompare(text(b.values[sort])) * (down ? -1 : 1),
    );
  }
  return found;
}

/** Answers the session, the catalog and the rows for a staff member. */
export async function stubAdminTables(
  page: Page,
  staffMember: StaffMember,
  options: Partial<
    Pick<FakeAdminTables, 'rows' | 'answer' | 'recordAnswer' | 'records' | 'saveAnswer' | 'refusal'>
  > & {
    /** 'mock' answers with the admin mocks' own tables and rows, for parity (ADR 0036). */
    data?: 'tests' | 'mock';
  } = {},
): Promise<FakeAdminTables> {
  const mock = options.data === 'mock';
  const fake: FakeAdminTables = {
    staff: await stubStaff(page, staffMember),
    rows:
      options.rows ??
      (mock
        ? (mockTables.rows as Record<string, AdminRow[]>)
        : {
            members: MEMBER_ROWS,
            listings: LISTING_ROWS,
            'merch-orders': ORDER_ROWS,
            feedback: [structuredClone(FEEDBACK_ROW)],
          }),
    answer: options.answer ?? 'ok',
    recordAnswer: options.recordAnswer ?? 'ok',
    records:
      options.records ??
      (mock
        ? Object.fromEntries(
            Object.entries(mockTables.pointsHere as Record<string, AdminPointer[]>).map(
              ([key, pointsHere]) => [key, { pointsHere }],
            ),
          )
        : {}),
    saveAnswer: options.saveAnswer ?? 'ok',
    refusal: options.refusal ?? {},
    saves: [],
    rowRequests: [],
    catalogReads: 0,
  };
  const groups = mock ? (mockTables.groups as AdminGroup[]) : catalogFor(staffMember);
  const tables = groups.flatMap((g) => g.tables);

  await page.route('**/api/admin/tables', (route: Route) => {
    fake.catalogReads++;
    return route.fulfill({ json: { groups } });
  });

  // One record: its row, with what points at it and its history (L2-282).
  await page.route('**/api/admin/tables/*/*', async (route: Route) => {
    const url = new URL(route.request().url());
    const [key, id] = url.pathname.split('/').slice(-2).map(decodeURIComponent);
    const known = tables.find((t) => t.key === key);
    if (!known) {
      return route.fulfill(
        key === 'staff'
          ? problem(403, 'FORBIDDEN', 'Your staff role may not read this table.')
          : problem(404, 'NOT_FOUND', 'There is no such table.'),
      );
    }
    if (fake.recordAnswer === 'slow') return; // never answered: the record stays loading
    if (fake.recordAnswer === 'fails') {
      return route.fulfill(
        problem(503, 'JB-ADM-504', `We couldn't load ${known.singular.toLowerCase()} ${id}.`),
      );
    }
    if (route.request().method() === 'POST' && id === 'status') {
      // One status set on the selected rows (L2-280 AC4).
      const body = route.request().postDataJSON() as { ids: string[]; status: string };
      fake.saves.push({ method: 'POST', path: `/${key}/status`, values: body });
      if (fake.saveAnswer === 'slow') return;
      if (fake.saveAnswer === 'refused') return route.fulfill(refused(fake.refusal));
      const field = known.statusField ?? 'status';
      const chosen = (fake.rows[key] ?? []).filter((r) => body.ids.includes(r.id));
      for (const r of chosen) r.values[field] = body.status;
      return route.fulfill({ json: { count: chosen.length } });
    }
    const row = (fake.rows[key] ?? []).find((r) => r.id === id);
    if (!row) return route.fulfill(problem(404, 'NOT_FOUND', 'There is no such record.'));
    if (route.request().method() === 'PATCH') {
      const values = (route.request().postDataJSON() as { values: Record<string, string | null> })
        .values;
      fake.saves.push({ method: 'PATCH', path: `/${key}/${id}`, values });
      if (fake.saveAnswer === 'slow') return; // never answered: the record stays saving
      if (fake.saveAnswer === 'refused') return route.fulfill(refused(fake.refusal));
      const at = new Date().toISOString();
      const actor = staffMember.displayName;
      const lines = Object.entries(values).map(([k, value]) => {
        const label = known.fields.find((f) => f.key === k)?.label ?? k;
        const what = `changed ${label.toLowerCase()} from ${text(row.values[k]) || '—'} to ${value || '—'}`;
        return { at, actor, what, text: `${actor} ${what}` };
      });
      const history = fake.records[`${key}/${id}`]?.history ?? creation(known, row);
      Object.assign(row.values, values);
      fake.records[`${key}/${id}`] = {
        ...fake.records[`${key}/${id}`],
        history: [...lines, ...history],
      };
    }
    const extras = fake.records[`${key}/${id}`] ?? {};
    return route.fulfill({
      json: {
        table: key,
        id,
        name: row.name,
        status: known.statusField ? (row.values[known.statusField] ?? null) : null,
        values: row.values,
        pointsHere: extras.pointsHere ?? [],
        history: extras.history ?? creation(known, row),
      },
    });
  });

  await page.route('**/api/admin/tables/*', async (route: Route) => {
    const url = new URL(route.request().url());
    const key = url.pathname.split('/').pop() ?? '';
    if (route.request().method() === 'POST') return create(route, key);
    fake.rowRequests.push(`/${key}${url.search}`);
    const known = tables.find((t) => t.key === key);
    if (fake.answer === 'forbidden' || (!known && key === 'staff')) {
      return route.fulfill(problem(403, 'FORBIDDEN', 'Your staff role may not read this table.'));
    }
    if (fake.answer === 'not-found' || !known) {
      return route.fulfill(problem(404, 'NOT_FOUND', 'There is no such table.'));
    }
    if (fake.answer === 'fails') {
      return route.fulfill(
        problem(503, 'JB-ADM-503', `We couldn't load ${known.label.toLowerCase()}.`),
      );
    }
    if (fake.answer === 'slow') return; // never answered: the table stays loading
    const size = Number(url.searchParams.get('size') ?? 25);
    const pageNumber = Number(url.searchParams.get('page') ?? 1);
    // The server searches, filters and sorts every record of the table (L2-277 AC6).
    const found = answerRows(known, fake.rows[key] ?? [], url.searchParams);
    // The mocks count the whole table, as production does, though they draw only a page of it.
    const whole = mock && !url.searchParams.get('q') && !url.searchParams.get('status');
    const rows = whole ? found : found.slice((pageNumber - 1) * size, pageNumber * size);
    return route.fulfill({
      json: { rows, total: whole ? known.count : found.length, page: pageNumber, size },
    });
  });

  // A new record, made through the table's creation (L2-283 AC4).
  async function create(route: Route, key: string): Promise<void> {
    const values = (route.request().postDataJSON() as { values: Record<string, string | null> })
      .values;
    fake.saves.push({ method: 'POST', path: `/${key}`, values });
    if (fake.saveAnswer === 'slow') return;
    if (fake.saveAnswer === 'refused') return route.fulfill(refused(fake.refusal));
    const known = tables.find((t) => t.key === key);
    const id = `new-${fake.saves.length}`;
    const named = Object.fromEntries(
      Object.entries(values).map(([k, value]) => {
        const ref = known?.fields.find((f) => f.key === k && f.type === 'ref')?.refTable;
        if (!ref || !value) return [k, value];
        const target = (fake.rows[ref] ?? []).find((r) => r.id === value);
        return [k, { table: ref, id: value, name: target?.name ?? null, deleted: false }];
      }),
    );
    const row: AdminRow = { id, name: id, values: { id, ...named } };
    fake.rows[key] = [row, ...(fake.rows[key] ?? [])];
    const record = { table: key, id, name: id, status: null, values: row.values };
    return route.fulfill({ status: 201, json: { ...record, pointsHere: [], history: [] } });
  }

  return fake;
}

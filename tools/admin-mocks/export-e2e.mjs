// Writes the admin mocks' tables and rows in the shape the admin API gives them
// (`GET /api/admin/tables` and `GET /api/admin/tables/{table}`), so the e2e parity stubs draw
// exactly what the mocks draw (ADR 0036). Run with `node tools/admin-mocks/export-e2e.mjs` after
// changing entities.mjs; it writes e2e/fixtures/api/admin-mock-tables.json.
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ENTITIES,
  GROUPS,
  backlinks,
  entitiesIn,
  lookup,
  rowName,
} from "./entities.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const out = join(
  here,
  "..",
  "..",
  "e2e",
  "fixtures",
  "api",
  "admin-mock-tables.json",
);

const kebab = (key) => key.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** "18 Nov 09:41" or "02 Feb 2025 14:10", Toronto time, as an ISO instant; anything else as is. */
function instant(value) {
  const m = /^(\d{1,2}) (\w{3})(?: (\d{4}))?(?: (\d{2}):(\d{2}))?$/.exec(
    String(value),
  );
  if (!m) return value;
  const month = MONTHS.indexOf(m[2]);
  if (month < 0) return value;
  const year = Number(m[3] ?? 2026);
  // Toronto keeps daylight time from the second Sunday of March to the first Sunday of November.
  const offset = month > 2 && month < 10 ? 4 : 5;
  const date = new Date(
    Date.UTC(
      year,
      month,
      Number(m[1]),
      Number(m[4] ?? 12) + offset,
      Number(m[5] ?? 0),
    ),
  );
  return m[4] ? date.toISOString() : date.toISOString().slice(0, 10);
}

function value(field, raw) {
  if (raw === null || raw === undefined || raw === "") return null;
  if (field.type === "datetime" || field.type === "date") return instant(raw);
  if (field.type === "ref") {
    const found = lookup(field.ref, raw);
    return {
      table: kebab(field.ref ?? ""),
      id: raw,
      name: found ? rowName(found.row) : null,
      deleted: false,
    };
  }
  return raw;
}

const tableOf = (e) => ({
  key: kebab(e.key),
  label: e.label,
  singular: e.singular,
  group: e.group,
  sentence: e.description,
  empty: null,
  count: e.count,
  fields: e.fields.map((f) => ({
    key: f.key,
    label: f.label,
    type: f.type,
    system: f.system,
    searchable: true,
    sortable: true,
    editable: !e.readOnly && !f.system,
    creatable: !e.readOnly && !f.system,
    options: f.options ?? null,
    refTable: f.ref ? kebab(f.ref) : null,
  })),
  defaultColumns: e.fields.slice(0, e.cols).map((f) => f.key),
  statusField: e.fields.find((f) => f.type === "status")?.key ?? null,
  readOnly: e.readOnly,
  // As the catalog marks them (L2-279 AC4): exporting these asks why first.
  private: PRIVATE.has(kebab(e.key)),
  canChange: !e.readOnly,
  canEdit: !e.readOnly,
  canCreate: !e.readOnly,
  canDelete: !e.readOnly,
  weeklyExport: false,
});

const PRIVATE = new Set(["consent-records", "messages", "message-attachments"]);

const groups = GROUPS.map((name) => {
  const tables = entitiesIn(name).map(tableOf);
  return { name, readOnly: tables.every((t) => t.readOnly), tables };
});

const rows = Object.fromEntries(
  ENTITIES.map((e) => [
    kebab(e.key),
    e.rows.map((row) => ({
      id: row.id,
      name: rowName(row),
      values: Object.fromEntries(
        e.fields.map((f) => [f.key, value(f, row[f.key])]),
      ),
    })),
  ]),
);

// What points at each record, as the record's "Points here" draws it (L2-282 AC4).
const pointsHere = Object.fromEntries(
  ENTITIES.flatMap((e) =>
    e.rows.map((row) => [
      `${kebab(e.key)}/${row.id}`,
      backlinks(e.key, row.id).map((b) => ({
        table: kebab(b.entity.key),
        label: b.entity.label,
        field: b.field,
        count: b.count,
      })),
    ]),
  ),
);

writeFileSync(
  out,
  `${JSON.stringify({ groups, rows, pointsHere }, null, 2)}\n`,
);
console.log(`Wrote ${groups.flatMap((g) => g.tables).length} tables to ${out}`);

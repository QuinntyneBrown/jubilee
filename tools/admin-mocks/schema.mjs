// The admin application is schema-driven (Magic Patterns, "Jubilee Admin", shared/admin/schema.ts):
// every table is described once, by its fields, sample rows and production count, and the Records
// and Record screens draw any of them. This is the same schema, in plain JavaScript, so the mocks
// carry the design's tables, labels and rows word for word.

const SYSTEM_KEYS = new Set(['id', 'createdAt', 'updatedAt', 'occurredAt']);

/** Field spec strings: "key", "key:type" or "key:ref:entityKey". */
export function entity(def) {
  const fields = def.fields.map((spec) => {
    const [key, type = 'text', ref] = spec.split(':');
    const t = key === 'id' ? 'id' : type;
    return { key, label: humanize(key, t), type: t, ref, options: def.options?.[key], system: SYSTEM_KEYS.has(key) };
  });
  const rows = def.rows.map((r) => Object.fromEntries(fields.map((f, i) => [f.key, r[i] ?? null])));
  for (const f of fields) {
    if (f.type === 'status' && !f.options) {
      f.options = Array.from(new Set(rows.map((r) => String(r[f.key])).filter((v) => v && v !== 'null')));
    }
  }
  return {
    key: def.key,
    label: def.label,
    singular: def.singular,
    group: def.group,
    description: def.description,
    count: def.count,
    fields,
    rows,
    cols: def.cols ?? 6,
    readOnly: def.readOnly ?? false,
  };
}

function humanize(key, type) {
  if (key === 'id') return 'ID';
  const base = type === 'ref' ? key.replace(/Id$/, '') : key;
  const words = base
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .replace(/\burl\b/g, 'URL')
    .replace(/\bip\b/g, 'IP')
    .replace(/\bsku\b/g, 'SKU');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

const GOOD = /^(active|published|approved|delivered|succeeded|paid|resolved|accepted|completed|fulfilled|verified|live|sent|confirmed|granted|signed|ready|in stock|done|read|passed|listed|within an hour)$/i;
const WAIT = /^(pending|draft|queued|in review|open|requested|new|scheduled|processing|retrying|invited|waitlisted|low stock|running|unread|submitted|awaiting|triaged|shipped|investigating|waiting|contacted|medium)$/i;
const BAD = /^(failed|rejected|suspended|banned|blocked|expired|revoked|declined|removed|cancelled|out of stock|dead|withdrawn|refunded|high|critical|locked|flagged|slow)$/i;

/** The tone of a status value: good, wait, bad or plain. */
export function toneOf(v) {
  const s = String(v ?? '');
  if (GOOD.test(s)) return 'good';
  if (WAIT.test(s)) return 'wait';
  if (BAD.test(s)) return 'bad';
  return 'plain';
}

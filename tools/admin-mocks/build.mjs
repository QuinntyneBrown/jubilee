// Builds the mocks of the admin application (docs/mocks/pages/admin-overview, admin-records and
// admin-record) from the Magic Patterns "Jubilee Admin" design: its three frames (Overview, Records,
// Record), the menus and dialogs those frames open, and every table of its schema. The design is
// schema-driven, so are the mocks: change entities.mjs or this script, never the generated files.
//
//   node tools/admin-mocks/build.mjs
//
// It writes the pages, replaces their entries in docs/mocks/manifest.json, and leaves the rest of
// the mocks alone. Run the mocks checker with --write afterwards to refresh index.html and the
// coverage matrix.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { toneOf } from './schema.mjs';
import { ENTITIES, GROUPS, backlinks, entitiesIn, getEntity, lookup, rowName } from './entities.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const MOCKS = join(ROOT, 'docs', 'mocks');
const PAGES = join(MOCKS, 'pages');

// ---------------------------------------------------------------- helpers

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
const kebab = (key) => key.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
const num = (n) => Number(n).toLocaleString('en-CA');
const compact = (n) => (n >= 10000 ? `${Math.round(n / 1000)}k` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const lower = (s) => s.toLowerCase();

const ICONS = {
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  chevronRight: '<path d="m9 18 6-6-6-6"/>',
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
  chevronLeft: '<path d="m15 18-6-6 6-6"/>',
  arrowLeft: '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
  plus: '<path d="M5 12h14M12 5v14"/>',
  columns: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18"/>',
  more: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
  pencil: '<path d="M21.2 6.8a2.8 2.8 0 0 0-4-4L3.8 16.2 2.5 21.5l5.3-1.3z"/><path d="m15 5 4 4"/>',
  copy: '<rect x="8" y="8" width="14" height="14" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  copyPlus: '<rect x="8" y="8" width="14" height="14" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/><path d="M15 12v6M12 15h6"/>',
  trash: '<path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
  external: '<path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  fileJson: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 12a1 1 0 0 0-1 1v1a1 1 0 0 1-1 1 1 1 0 0 1 1 1v1a1 1 0 0 0 1 1M14 18a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1 1 1 0 0 1-1-1v-1a1 1 0 0 0-1-1"/>',
  calendarClock: '<path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5M16 2v4M8 2v4M3 10h5"/><circle cx="16" cy="16" r="6"/><path d="M16 14v2l1 1"/>',
  alert: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>',
  wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94z"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  minus: '<path d="M5 12h14"/>',
  eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  table: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 3v18M3 9h18M3 15h18"/>',
  enter: '<path d="M20 4v7a4 4 0 0 1-4 4H4"/><path d="m9 10-5 5 5 5"/>',
  retry: '<path d="M4 12a8 8 0 0 1 14-5l2 2M20 5v4h-4M20 12a8 8 0 0 1-14 5l-2-2M4 19v-4h4"/>',
  warning: '<path d="M12 4 2.5 20h19zM12 10v4M12 17h.01"/>',
};
const icon = (name, label) =>
  label
    ? `<svg class="icon" role="img" aria-label="${esc(label)}" viewBox="0 0 24 24">${ICONS[name]}</svg>`
    : `<svg class="icon" aria-hidden="true" viewBox="0 0 24 24">${ICONS[name]}</svg>`;
const MARK =
  '<svg class="brand-mark" aria-hidden="true" viewBox="0 0 100 100"><path class="brand-mark__j" d="M60 8V60A20 20 0 0 1 20 60V38"/><path class="brand-mark__bar" d="M36 27H84"/></svg>';

// Where each screen's mocks live, relative to a page two folders down.
const OVERVIEW = '../admin-overview/default.html';
const recordsHref = (key) => `../admin-records/${key === 'members' ? 'default' : kebab(key)}.html`;
const recordHref = (key) => `../admin-record/${key === 'members' ? 'default' : kebab(key)}.html`;

/** The one row each table's record mock shows. Messages show the reported one (L2-063 AC3). */
const SHOWN = { messages: 2 };
const shownIndex = (key) => SHOWN[key] ?? 0;

// ---------------------------------------------------------------- the design's pieces

function status(value) {
  return `<span class="status status--${toneOf(value)}">${esc(value)}</span>`;
}

/** A value as its field type reads best (the design's Cell). */
function cell(field, value) {
  if (value === null || value === '') return '<span class="cell--empty" aria-label="None">—</span>';
  switch (field.type) {
    case 'id':
    case 'mono':
    case 'json':
      return `<span class="cell--mono">${esc(value)}</span>`;
    case 'status':
      return status(value);
    case 'bool':
      return value ? `<span class="cell--yes">${icon('check', 'Yes')}</span>` : `<span class="cell--no">${icon('minus', 'No')}</span>`;
    case 'number':
    case 'money':
      return `<span class="cell--num">${esc(typeof value === 'number' ? num(value) : value)}</span>`;
    case 'ref': {
      const hit = lookup(field.ref, value);
      if (!hit) return `<span class="cell--mono">${esc(value)}</span>`;
      return `<a class="cell--ref" href="${recordHref(hit.entity.key)}">${esc(rowName(hit.row))}</a>`;
    }
    case 'datetime':
    case 'date':
      return `<span class="cell--muted">${esc(value)}</span>`;
    case 'long':
      return `<span class="cell--long">${esc(value)}</span>`;
    default:
      return esc(value);
  }
}

/** The top bar, the sidebar and the main column (the design's Shell). */
function shell({ active, main, overlays = '', drawer = false }) {
  const activeGroup = active === 'overview' ? '' : getEntity(active).group;
  const open = new Set([activeGroup || 'Accounts', 'Moderation']);
  const nav = (id) => `<nav class="admin-nav" aria-label="Tables"><div class="admin-nav__scroll">
<a class="admin-nav__item" href="${OVERVIEW}"${active === 'overview' ? ' aria-current="page"' : ''}><span class="admin-nav__label">Overview</span></a>
<ul class="admin-nav__groups">${GROUPS.map((g, gi) => {
    const isOpen = open.has(g);
    const listId = `${id}-g${gi}`;
    return `<li><button class="admin-nav__group" type="button" aria-expanded="${isOpen}" aria-controls="${listId}"><svg class="icon admin-nav__chevron" aria-hidden="true" viewBox="0 0 24 24">${ICONS.chevronRight}</svg><span class="truncate">${esc(g)}</span>${
      g === 'System' ? `<svg class="icon admin-nav__lock" role="img" aria-label="Read-only" viewBox="0 0 24 24">${ICONS.lock}</svg>` : ''
    }</button><ul class="admin-nav__list" id="${listId}"${isOpen ? '' : ' hidden'}>${entitiesIn(g)
      .map(
        (e) =>
          `<li><a class="admin-nav__item" href="${recordsHref(e.key)}"${e.key === active ? ' aria-current="page"' : ''}><span class="admin-nav__label">${esc(e.label)}</span><span class="admin-nav__count" aria-label="${num(e.count)} records">${compact(e.count)}</span></a></li>`,
      )
      .join('')}</ul></li>`;
  }).join('')}</ul></div></nav>`;

  const top = `<header class="admin-top">
<a class="admin-top__round admin-top__round--menu" href="../admin-overview/drawer.html" aria-label="Open tables">${icon('menu')}</a>
<a class="admin-top__home" href="${OVERVIEW}" aria-label="Jubilee Admin home"><span class="admin-top__word">${MARK}jubilee</span><span class="admin-top__app">Admin</span></a>
<a class="admin-top__jump" href="../admin-overview/palette.html">${icon('search')}<span>Jump to a table or record</span><kbd>⌘K</kbd></a>
<div class="admin-top__end"><span class="admin-top__env" title="Hosted on Azure">admin.jubilee.to <span class="admin-top__badge">Production</span></span><a class="admin-top__round admin-top__round--search" href="../admin-overview/palette.html" aria-label="Search">${icon('search')}</a><span class="admin-top__avatar" role="img" aria-label="Ada Nwosu, Owner" title="Ada Nwosu, Owner">AN</span></div>
</header>`;

  const drawerHtml = drawer
    ? `<div class="admin-drawer" role="dialog" aria-modal="true" aria-label="Tables"><div class="admin-drawer__panel"><div class="admin-drawer__head"><span class="admin-top__word">${MARK}jubilee</span><a class="admin-top__round" href="default.html" aria-label="Close tables">${icon('x')}</a></div>${nav('drawer')}<p class="admin-nav__foot">admin.jubilee.to · Production</p></div><a class="admin-drawer__scrim" href="default.html" aria-label="Close tables"></a></div>`
    : '';

  return `<div class="admin-app">
${top}
<div class="admin-app__body"><div class="admin-app__side">${nav('side')}</div><main id="main" class="admin-app__main">${main}</main></div>
</div>${overlays}${drawerHtml}`;
}

function page({ screen, title, state, states, requirements, description, body, note = '' }) {
  return `<!doctype html>
<html lang="en-CA">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} · ${esc(state)} — Jubilee mocks</title>
<meta name="mock:kind" content="page">
<meta name="mock:screen" content="${screen}">
<meta name="mock:requirements" content="${requirements}">
<meta name="mock:state" content="${state}">
<meta name="description" content="${esc(description)}">
<link rel="stylesheet" href="../../../design-system/tokens/tokens.css">
<link rel="stylesheet" href="../../../design-system/assets/components.css">
<link rel="stylesheet" href="../../assets/mock.css">
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>
${body}
${note ? `<aside class="mock-note mock-note--float" aria-label="Mock note">${note}</aside>` : ''}<div class="toast-region" role="status" aria-live="polite"></div>
<nav class="mock-bar" aria-label="Mock navigation">
  <a class="mock-bar__home" href="../../index.html" aria-label="All mocks">⌂</a>
  <span class="mock-bar__screen">${esc(title)}</span>
  <ul class="mock-bar__states">${states.map((s) => `<li><a href="${s}.html"${s === state ? ' aria-current="page"' : ''}>${s}</a></li>`).join('')}</ul>
  <button type="button" data-theme-toggle aria-pressed="false">☾ Dark</button>
  <button type="button" data-chrome-toggle aria-label="Hide mock chrome">×</button>
</nav>
<script src="../../assets/mock.js"></script>
</body>
</html>
`;
}

function toast(text, undo) {
  return `<div class="toast-region" role="status" aria-live="polite"><div class="toast toast--success">${icon('check')}<div class="toast__body"><span class="toast__title">${esc(text)}</span>${
    undo ? '<button class="toast__action" type="button">Undo</button>' : ''
  }</div><button class="close" type="button" aria-label="Dismiss">${icon('x')}</button></div></div>`;
}

function errorState(what, ref) {
  return `<div class="empty empty--error" role="alert"><div class="empty__icon" aria-hidden="true">${icon('warning')}</div><h2 class="empty__title">We couldn’t load ${esc(what)}</h2><p class="empty__text">Nothing is lost. Check your connection and try again. If it keeps happening, tell us and quote <code>${ref}</code>.</p><div class="empty__actions"><a class="btn btn--primary" href="default.html">${icon('retry')}Try again</a></div></div>`;
}

// ---------------------------------------------------------------- Overview

const OVERVIEW_REQ = 'L2-188 L2-272 L2-273 L2-274 L2-275';
const name = (entity, id) => {
  const hit = lookup(entity, id);
  return hit ? rowName(hit.row) : String(id);
};
const QUEUES = [
  {
    title: 'Safety',
    note: 'Answer within 24 hours',
    items: [
      { entity: 'securityAlerts', when: (r) => r.status === 'open', describe: (r) => `${esc(r.kind)} · ${status(r.severity)}`, age: 'oldest 3h', urgent: true },
      { entity: 'listingReports', when: (r) => r.status === 'open', describe: (r) => esc(`${name('listings', r.listingId)}, ${r.reason}, ${r.entryCount} reports`), age: 'oldest 3d', urgent: true },
      { entity: 'conversationReports', when: (r) => r.status === 'open' || r.status === 'in review', describe: (r) => esc(`${r.reason}: “${r.details}”`), age: 'oldest 3d' },
      { entity: 'reviewReports', when: (r) => r.status === 'open', describe: (r) => esc(`Marked ${r.reason}: “${r.details}”`), age: 'oldest 2d' },
    ],
  },
  {
    title: 'Waiting on us',
    note: 'Members are waiting for a decision',
    items: [
      { entity: 'listingSubmissions', label: 'Listings to review', when: (r) => r.status === 'submitted' || r.status === 'in review', describe: (r) => esc(name('listings', r.listingId)), age: 'oldest 3d' },
      { entity: 'accessRequests', when: (r) => r.status === 'pending', describe: (r) => esc(`${r.name}, ${r.church}`), age: 'oldest 1d' },
      { entity: 'dataExports', label: 'Data exports not delivered', when: (r) => r.status === 'failed' || r.status === 'processing', describe: (r) => esc(`${name('members', r.memberId)}, due ${r.dueBy}`), age: 'oldest 10d' },
      { entity: 'feedback', label: 'New feedback', when: (r) => r.status === 'new', describe: (r) => esc(`“${r.body}”`), age: 'oldest 1d' },
    ],
  },
];

function verb(action) {
  const [table, v] = action.split('.');
  const words = { update: 'updated', create: 'created', read: 'read', delete: 'deleted' };
  return `${words[v] ?? v} ${table.replace(/([A-Z])/g, ' $1').toLowerCase().replace(/s$/, '')}`;
}

function overviewMain(variant) {
  const sections = QUEUES.map((s) => ({
    ...s,
    items: s.items
      .map((q) => {
        const e = getEntity(q.entity);
        const hits = e.rows.map((row, index) => ({ row, index })).filter(({ row }) => q.when(row));
        return { ...q, label: q.label ?? e.label, hits };
      })
      .filter((q) => q.hits.length > 0),
  }));
  const total = variant === 'empty' ? 0 : sections.reduce((n, s) => n + s.items.reduce((m, q) => m + q.hits.length, 0), 0);
  const head = `<p class="admin-heading__eyebrow">Tuesday 18 November</p><h1 class="admin-heading__title">Good morning, Ada. ${
    total ? `${total} things are waiting on staff.` : 'Nothing is waiting on staff.'
  }</h1><p class="admin-heading__lead">Since yesterday: <strong>14 new members</strong>, <strong>3 listings published</strong>, <strong>5 merch orders</strong>, <strong>212 requests sent</strong>.</p>`;

  if (variant === 'error') {
    return `<div class="admin-page"><div class="admin-heading admin-heading--greeting"><p class="admin-heading__eyebrow">Tuesday 18 November</p><h1 class="admin-heading__title">Good morning, Ada.</h1></div>${errorState('what is waiting on staff', 'JB-ADM-503')}</div>`;
  }
  if (variant === 'loading') {
    const bars = (n) =>
      Array.from({ length: n }, (_, i) => `<li class="work-queue__item"><div><span class="skeleton skeleton--text skeleton--w${[50, 70, 30][i % 3]}"></span><span class="skeleton skeleton--text skeleton--w70"></span></div><span class="skeleton skeleton--btn-sm"></span></li>`).join('');
    return `<div class="admin-page" aria-busy="true"><div class="admin-heading admin-heading--greeting"><p class="admin-heading__eyebrow">Tuesday 18 November</p><h1 class="admin-heading__title">Good morning, Ada.</h1><p class="admin-heading__lead"><span class="visually-hidden">Loading what is waiting on staff…</span><span class="skeleton skeleton--text skeleton--w70"></span></p></div><div class="work-grid"><div>${['Safety', 'Waiting on us']
      .map((t) => `<section class="work-queue"><div class="work-queue__head"><h2 class="work-queue__title">${t}</h2></div><ul class="work-queue__list">${bars(4)}</ul></section>`)
      .join('')}</div><aside class="admin-aside"><section><h2 class="admin-aside__head admin-aside__title">System</h2><ul class="work-queue__list">${bars(3)}</ul></section></aside></div></div>`;
  }

  const queues =
    variant === 'empty'
      ? `<section class="work-queue"><div class="work-queue__head"><h2 class="work-queue__title">All clear</h2><span class="work-queue__note">Nothing to answer</span></div><p class="work-queue__clear">No reports, alerts, listings or requests are waiting. New ones show here as they arrive; the tables in the sidebar hold everything else.</p></section>`
      : sections
          .map(
            (s) => `<section class="work-queue" aria-labelledby="q-${kebab(s.title.replace(/ /g, ''))}"><div class="work-queue__head"><h2 class="work-queue__title" id="q-${kebab(s.title.replace(/ /g, ''))}">${esc(s.title)}</h2><span class="work-queue__note">${esc(s.note)}</span></div><ul class="work-queue__list">${s.items
              .map((q) => {
                const first = q.hits[0];
                return `<li class="work-queue__item"><a class="work-queue__open" href="${recordHref(q.entity)}"><span class="work-queue__name">${esc(q.label)}${icon('chevronRight')}</span><span class="work-queue__next">Next: <b>${q.describe(first.row)}</b></span></a><a class="work-queue__all" href="${recordsHref(q.entity)}" aria-label="See all ${esc(q.label)}, ${q.hits.length} waiting${q.urgent ? ', urgent' : ''}"><span class="work-queue__age">${q.age}</span><span class="work-queue__count${q.urgent ? ' work-queue__count--urgent' : ''}">${q.hits.length}</span></a></li>`;
              })
              .join('')}</ul></section>`,
          )
          .join('');

  const jobs = getEntity('jobRuns').rows.filter((r) => r.status === 'failed');
  const outbox = getEntity('outboxMessages').rows.filter((r) => r.status === 'dead' || r.status === 'retrying');
  const maint = getEntity('maintenanceWindows').rows.find((r) => r.status === 'scheduled');
  const staff = getEntity('staff');
  const audit = getEntity('auditRecords').rows.slice(0, 4);
  const system = [
    ...jobs.map(
      (j) => `<li><a class="system-list__item system-list__item--bad" href="${recordsHref('jobRuns')}">${icon('alert', 'Failed')}<span class="system-list__text"><code>${esc(j.job)}</code> failed at ${esc(String(j.startedAt).slice(-5))}<span class="system-list__detail">${esc(j.error)}</span></span></a></li>`,
    ),
    ...outbox.map(
      (o) => `<li><a class="system-list__item system-list__item--${o.status === 'dead' ? 'bad' : 'wait'}" href="${recordsHref('outboxMessages')}">${icon('alert', o.status === 'dead' ? 'Gave up' : 'Retrying')}<span class="system-list__text"><code>${esc(o.topic)}</code> ${
        o.status === 'dead' ? 'gave up' : `retrying, attempt ${o.attempts}`
      }<span class="system-list__detail">${esc(o.lastError)}</span></span></a></li>`,
    ),
    maint
      ? `<li><a class="system-list__item" href="${recordsHref('maintenanceWindows')}">${icon('wrench', 'Maintenance')}<span class="system-list__text">${esc(maint.title)}<span class="system-list__detail">${esc(maint.startsAt)} – ${esc(String(maint.endsAt).slice(-5))}, read-only</span></span></a></li>`
      : '',
  ].join('');
  const changes = audit
    .map((a) => {
      const who = staff.rows.find((s) => s.id === a.actorId);
      return `<li><b>${esc(who ? String(who.name).split(' ')[0] : a.actorId)}</b> <span class="change-list__what">${esc(verb(String(a.action)))}</span> <code>${esc(a.recordId)}</code><div class="change-list__when">${esc(a.occurredAt)}</div></li>`;
    })
    .join('');

  return `<div class="admin-page"><div class="admin-heading admin-heading--greeting">${head}</div><div class="work-grid"><div>${queues}</div><aside class="admin-aside" aria-label="System and recent changes"><section><div class="admin-aside__head"><h2 class="admin-aside__title">System</h2></div><ul class="system-list">${system}</ul></section><section><div class="admin-aside__head"><h2 class="admin-aside__title">Recent changes</h2><a class="admin-aside__link" href="${recordsHref('auditRecords')}">Audit log</a></div><ol class="change-list">${changes}</ol></section></aside></div></div>`;
}

function palette(q) {
  const s = q.trim().toLowerCase();
  const tables = ENTITIES.filter((e) => !s || e.label.toLowerCase().includes(s) || e.group.toLowerCase().includes(s))
    .slice(0, s ? 8 : 10)
    .map((e) => ({ kind: 'table', key: e.key, label: e.label, meta: e.group }));
  const records = [];
  if (s) {
    for (const e of ENTITIES) {
      e.rows.forEach((r) => {
        if (`${r.id} ${rowName(r)}`.toLowerCase().includes(s) && records.length < 6) {
          records.push({ kind: 'record', key: e.key, label: rowName(r), meta: `${e.singular} · ${r.id}` });
        }
      });
    }
  }
  const items = [...tables, ...records];
  const list = items.length
    ? items
        .map(
          (it, i) =>
            `<li role="presentation"><a class="palette__item" role="option" id="jump-${i}" href="${it.kind === 'table' ? recordsHref(it.key) : recordHref(it.key)}" aria-selected="${i === 0}">${
              it.kind === 'table' ? icon('table') : '<span class="palette__kind" aria-hidden="true">R</span>'
            }<span class="palette__label">${esc(it.label)}</span><span class="palette__meta">${esc(it.meta)}</span>${i === 0 ? icon('enter') : ''}</a></li>`,
        )
        .join('')
    : `<li class="palette__none" role="presentation">Nothing matches “${esc(q)}”.</li>`;
  return `<div class="palette"><div class="palette__panel" role="dialog" aria-modal="true" aria-label="Jump to"><div class="palette__search">${icon('search')}<input class="palette__input" type="text" role="combobox" aria-expanded="true" aria-controls="jump-list" aria-activedescendant="${items.length ? 'jump-0' : ''}" aria-label="Jump to a table or record" value="${esc(q)}" placeholder="Members, ruth.c@outlook.com, lst_flower…" autofocus><kbd>esc</kbd></div><ul class="palette__list" id="jump-list" role="listbox" aria-label="Tables and records">${list}</ul></div></div>`;
}

function buildOverview() {
  const dir = join(PAGES, 'admin-overview');
  const states = ['default', 'loading', 'empty', 'error', 'palette', 'palette-results', 'palette-none', 'drawer'];
  const notes = {
    default:
      'The overview (Magic Patterns frame “Overview”). Each line of the work queue opens the first record waiting; its count opens the table. The counts and the “Next” line are read with the staff session when the overview opens; nothing polls (ADR 0058).',
    loading: 'The overview while the work queue and the system list load: the heading stays, the lines are skeletons and the main column is <code>aria-busy</code>.',
    empty: 'Nothing is waiting: the greeting says so and the work queue gives way to “All clear”. The system list and recent changes stay.',
    error: 'The overview could not be read. Nothing is lost; “Try again” reads it again.',
    palette: '⌘K (Ctrl K on Windows), the jump field in the top bar, or the search button on a phone opens the jump palette. With nothing typed it lists the first ten tables. ↑ and ↓ move the choice, Enter opens it, Esc closes.',
    'palette-results': 'Typing matches the tables by name or group and up to six records by name, e-mail or ID, across every table.',
    'palette-none': 'Nothing matches: the palette says so and keeps what was typed.',
    drawer: 'Under 1024 px the sidebar is a drawer, opened by the menu button in the top bar. It holds the same groups and tables, and the environment at its foot.',
  };
  mkdirSync(dir, { recursive: true });
  for (const state of states) {
    const variant = ['loading', 'empty', 'error'].includes(state) ? state : 'default';
    const overlays = state === 'palette' ? palette('') : state === 'palette-results' ? palette('ruth') : state === 'palette-none' ? palette('pastor mike') : '';
    const body = shell({ active: 'overview', main: overviewMain(variant), overlays, drawer: state === 'drawer' });
    writeFileSync(
      join(dir, `${state}.html`),
      page({ screen: 'admin-overview', title: 'Admin overview', state, states, requirements: OVERVIEW_REQ, description: `The admin application’s overview, ${state}.`, body, note: notes[state] }),
    );
  }
  return {
    id: 'admin-overview',
    kind: 'page',
    title: 'Admin overview',
    route: '/ (admin application)',
    states,
    requirements: OVERVIEW_REQ.split(' '),
  };
}

// ---------------------------------------------------------------- Records

const RECORDS_REQ = 'L2-188 L2-276 L2-277 L2-278 L2-279 L2-280 L2-281 L2-099 L2-105 L2-106 L2-237 L2-247 L2-257';

function pageList(page, pages) {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const out = [1];
  const start = Math.max(2, Math.min(page - 1, pages - 4));
  const end = Math.min(pages - 1, Math.max(page + 1, 5));
  if (start > 2) out.push('…');
  for (let p = start; p <= end; p++) out.push(p);
  if (end < pages - 1) out.push('…');
  out.push(pages);
  return out;
}

function recordsMain(e, s) {
  const statusField = e.fields.find((f) => f.key === 'status') ?? e.fields.find((f) => f.type === 'status');
  const nameKey = e.fields.find((f) => f.type === 'text')?.key;
  const editable = !e.readOnly;
  const unit = lower(e.label);
  const columns = e.fields.slice(0, e.cols);
  const q = s.q ?? '';
  const filter = s.status ?? 'all';
  const deleted = new Set(s.deleted ?? []);
  const selected = new Set(s.selected ?? []);
  let rows = e.rows.map((row, index) => ({ row, index })).filter(({ index }) => !deleted.has(index));
  const needle = q.trim().toLowerCase();
  if (needle) rows = rows.filter(({ row }) => Object.values(row).some((v) => String(v ?? '').toLowerCase().includes(needle)));
  if (filter !== 'all' && statusField) rows = rows.filter(({ row }) => row[statusField.key] === filter);
  const filtered = needle !== '' || filter !== 'all';
  const total = filtered ? rows.length : e.count - deleted.size;
  const pageSize = 25;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const to = Math.min(pageSize, total);
  const allOn = rows.length > 0 && rows.every((r) => selected.has(r.index));

  const exportMenu = `<ul class="menu menu--end" role="menu" aria-label="Export"><li class="menu__label" role="presentation">Download</li>${
    filtered ? `<li role="none"><button class="menu__item" role="menuitem" type="button">${icon('download')}CSV, matching rows<span class="menu__hint">${num(rows.length)}</span></button></li>` : ''
  }<li role="none"><button class="menu__item" role="menuitem" type="button">${icon('download')}CSV, every ${esc(lower(e.singular))}<span class="menu__hint">${num(e.count)}</span></button></li><li role="none"><button class="menu__item" role="menuitem" type="button">${icon('fileJson')}JSON, every field<span class="menu__hint">${num(e.count)}</span></button></li><li class="menu__divider" role="separator"></li><li role="none"><button class="menu__item" role="menuitem" type="button">${icon('calendarClock')}Email me this weekly</button></li></ul>`;
  const columnsMenu = `<div class="menu menu--end" role="menu" aria-label="Columns"><div class="menu__label" role="presentation">Show in table</div><div class="menu__scroll">${e.fields
    .map((f, i) => `<button class="menu__item" role="menuitemcheckbox" type="button" aria-checked="${i < e.cols}">${esc(f.label)}</button>`)
    .join('')}</div><div class="menu__divider" role="separator"></div><button class="menu__item" role="menuitem" type="button">Reset to default</button></div>`;

  const head = `<div class="records-head"><div class="admin-heading"><p class="admin-heading__eyebrow">${esc(e.group)}</p><h1 class="admin-heading__title">${esc(e.label)}${
    e.readOnly ? `<span class="lock-tag">${icon('lock')}Read-only</span>` : ''
  }</h1><p class="admin-heading__lead">${esc(e.description)}</p></div><div class="records-head__actions"><div class="menu-anchor"><button class="btn" type="button" aria-haspopup="menu" aria-expanded="${s.menu === 'export'}">${icon('download')}Export${icon('chevronDown')}</button>${
    s.menu === 'export' ? exportMenu : ''
  }</div>${editable ? `<a class="btn btn--primary" href="${e.key === 'members' ? '../admin-record/create.html' : recordHref(e.key)}">${icon('plus')}New ${esc(lower(e.singular))}</a>` : ''}</div></div>`;

  const tools = `<div class="records-tools"><form class="search records-tools__search" role="search" action="#"><label class="visually-hidden" for="rq">Search ${esc(unit)}</label>${icon('search')}<input class="input" id="rq" type="search" value="${esc(q)}" placeholder="Search ${esc(unit)} by any field"></form><div class="menu-anchor records-tools__columns"><button class="btn" type="button" aria-haspopup="menu" aria-expanded="${s.menu === 'columns'}">${icon('columns')}Columns <span class="records-tools__n">${columns.length}</span></button>${
    s.menu === 'columns' ? columnsMenu : ''
  }</div></div>${
    statusField
      ? `<div class="chip-row chip-row--plain records-filter" role="group" aria-label="Filter by ${esc(lower(statusField.label))}">${['all', ...(statusField.options ?? [])]
          .map((o) => `<button class="chip" type="button" aria-pressed="${o === filter}">${o === 'all' ? 'All' : esc(cap(o))}</button>`)
          .join('')}</div>`
      : ''
  }`;

  if (s.error) return `<div class="admin-page admin-page--wide">${head}${tools}<div class="records">${errorState(unit, 'JB-ADM-503')}</div></div>`;

  const empty = `<div class="records__empty"><p class="records__empty-title">No ${esc(unit)} match${q ? ` “${esc(q)}”` : ' these filters'}</p><p class="records__empty-text">Search looks at every field, including IDs and emails.</p><button class="btn btn--sm" type="button">Clear search and filters</button></div>`;

  const th = columns
    .map((f) => {
      const right = f.type === 'number' || f.type === 'money';
      return `<th scope="col" aria-sort="none"${right ? ' class="records__num"' : ''}><button type="button">${esc(f.label)}</button></th>`;
    })
    .join('');
  const rowMenu = (row) =>
    `<ul class="menu menu--end" role="menu" aria-label="Actions for ${esc(rowName(row))}"><li role="none"><a class="menu__item" role="menuitem" href="${recordHref(e.key)}">${icon('external')}Open</a></li>${
      editable ? `<li role="none"><a class="menu__item" role="menuitem" href="${e.key === 'members' ? '../admin-record/edit.html' : recordHref(e.key)}">${icon('pencil')}Edit</a></li>` : ''
    }<li role="none"><button class="menu__item" role="menuitem" type="button">${icon('copy')}Copy ID<span class="menu__hint">${esc(String(row.id).slice(0, 12))}</span></button></li>${
      editable
        ? `<li role="none"><a class="menu__item" role="menuitem" href="${e.key === 'members' ? '../admin-record/create.html' : recordHref(e.key)}">${icon('copyPlus')}Duplicate</a></li><li class="menu__divider" role="separator"></li><li role="none"><a class="menu__item menu__item--danger" role="menuitem" href="confirm-delete-one.html">${icon('trash')}Delete</a></li>`
        : ''
    }</ul>`;

  let tbody;
  if (s.loading) {
    tbody = Array.from({ length: 6 }, (_, i) => `<tr>${editable ? '<td class="records__check"></td>' : ''}${columns.map((f, c) => `<td><span class="skeleton skeleton--text skeleton--w${[50, 70, 30][(i + c) % 3]}"></span></td>`).join('')}<td></td></tr>`).join('');
  } else {
    tbody = rows
      .map(({ row, index }) => {
        const on = selected.has(index);
        const open = s.rowMenu === index;
        return `<tr${on ? ' aria-selected="true"' : ''}>${editable ? `<td class="records__check"><input type="checkbox" aria-label="Select ${esc(rowName(row))}"${on ? ' checked' : ''}></td>` : ''}${columns
          .map((f) => {
            const cls = [f.key === nameKey ? 'records__name' : '', f.type === 'number' || f.type === 'money' ? 'records__num' : ''].filter(Boolean).join(' ');
            const inner = f.key === nameKey && row[f.key] ? `<a class="cell--ref" href="${recordHref(e.key)}">${esc(row[f.key])}</a>` : cell(f, row[f.key]);
            return `<td${cls ? ` class="${cls}"` : ''}>${inner}</td>`;
          })
          .join('')}<td class="records__actions"><div class="menu-anchor"><button class="records__more" type="button" aria-haspopup="menu" aria-expanded="${open}" aria-label="Actions for ${esc(rowName(row))}">${icon('more')}</button>${
          open ? rowMenu(row) : ''
        }</div></td></tr>`;
      })
      .join('');
  }

  const table = `<div class="records__table"><table><caption class="visually-hidden">${esc(e.label)}${s.loading ? ', loading' : ''}</caption><thead><tr>${
    editable ? `<th class="records__check" scope="col"><input type="checkbox" aria-label="Select all on this page"${allOn ? ' checked' : ''}></th>` : ''
  }${th}<th scope="col"><span class="visually-hidden">Actions</span></th></tr></thead><tbody>${tbody}</tbody></table>${!s.loading && rows.length === 0 ? empty : ''}</div>`;

  const list = `<ul class="records__list">${s.loading ? '' : rows
    .map(
      ({ row, index }) =>
        `<li>${editable ? `<input type="checkbox" aria-label="Select ${esc(rowName(row))}"${selected.has(index) ? ' checked' : ''}>` : ''}<a class="records__row" href="${recordHref(e.key)}"><span class="records__row-text"><span class="records__row-name">${esc(rowName(row))}</span><span class="records__row-id">${esc(row.id)}</span></span>${
          statusField && row[statusField.key] ? status(row[statusField.key]) : ''
        }${icon('chevronRight')}</a></li>`,
    )
    .join('')}${!s.loading && rows.length === 0 ? `<li>${empty}</li>` : ''}</ul>`;

  const sizeMenu = `<ul class="menu menu--up" role="menu" aria-label="Rows per page"><li class="menu__label" role="presentation">Rows per page</li>${[25, 50, 100, 250]
    .map((n) => `<li role="none"><button class="menu__item" role="menuitemradio" type="button" aria-checked="${n === pageSize}">${n}</button></li>`)
    .join('')}</ul>`;
  const foot =
    total > 0 && !s.loading
      ? `<div class="records__foot"><div class="records__range"><span><b>1–${num(to)}</b> of ${num(total)}</span><div class="records__size menu-anchor"><span>Rows</span><button class="btn btn--sm" type="button" aria-haspopup="menu" aria-expanded="${s.menu === 'pageSize'}" aria-label="Rows per page, ${pageSize}">${pageSize}${icon('chevronDown')}</button>${
          s.menu === 'pageSize' ? sizeMenu : ''
        }</div></div><nav class="records__pages" aria-label="Pages"><ul class="pagination"><li><button type="button" aria-label="Previous page" aria-disabled="true">${icon('chevronLeft')}</button></li><li class="records__numbers"><ul class="pagination">${pageList(1, pages)
          .map((p) => (p === '…' ? '<li aria-hidden="true">…</li>' : `<li><button type="button"${p === 1 ? ' aria-current="page"' : ''}>${num(p)}</button></li>`))
          .join('')}</ul></li><li class="records__page-of">Page <b>1</b> of ${num(pages)}</li><li><button type="button" aria-label="Next page"${pages === 1 ? ' aria-disabled="true"' : ''}>${icon('chevronRight')}</button></li></ul>${
          pages > 7 ? '<form class="records__goto" action="#"><label for="goto">Go to</label><input class="input input--sm" id="goto" inputmode="numeric" placeholder="1"></form>' : ''
        }</nav></div>`
      : '';

  return `<div class="admin-page admin-page--wide"${s.loading ? ' aria-busy="true"' : ''}>${head}${tools}<div class="records">${table}${list}${foot}</div></div>`;
}

function bulkBar(e, n, menu) {
  const statusField = e.fields.find((f) => f.key === 'status') ?? e.fields.find((f) => f.type === 'status');
  return `<div class="bulk-bar" role="region" aria-label="Selected ${esc(lower(e.label))}"><div class="bulk-bar__panel"><span class="bulk-bar__count">${n} selected</span>${
    statusField
      ? `<div class="menu-anchor"><button class="bulk-bar__btn" type="button" aria-haspopup="menu" aria-expanded="${menu}">Set ${esc(lower(statusField.label))}${icon('chevronDown')}</button>${
          menu
            ? `<ul class="menu menu--up" role="menu" aria-label="Set ${esc(lower(statusField.label))}">${statusField.options
                .map((o) => `<li role="none"><button class="menu__item" role="menuitem" type="button">${status(o)}</button></li>`)
                .join('')}</ul>`
            : ''
        }</div>`
      : ''
  }<button class="bulk-bar__btn bulk-bar__btn--export" type="button">${icon('download')}Export</button><a class="bulk-bar__btn bulk-bar__btn--danger" href="confirm-delete.html">${icon('trash')}Delete</a><a class="bulk-bar__btn bulk-bar__btn--clear" href="default.html" aria-label="Clear selection">${icon('x')}</a></div></div>`;
}

function deleteDialog(e, indexes) {
  const rows = indexes.map((i) => e.rows[i]);
  const one = rows.length === 1;
  const unit = lower(e.label);
  const linked = rows.reduce((n, r) => n + backlinks(e.key, r.id).reduce((m, l) => m + l.count, 0), 0);
  const title = one ? `Delete ${rowName(rows[0])}?` : `Delete ${rows.length} ${unit}?`;
  return `<div class="backdrop"></div><div class="dialog" role="alertdialog" aria-modal="true" aria-labelledby="dlg-title" aria-describedby="dlg-desc"><div class="dialog__panel dialog__panel--sm"><div class="dialog__header"><div class="dialog__heading"><h2 class="dialog__title" id="dlg-title">${esc(title)}</h2><p class="dialog__desc" id="dlg-desc">This removes ${one ? 'it' : 'them'} for everyone on Jubilee. The deletion is kept in Audit records, but the data can’t be brought back after 30 days.</p></div><a class="btn btn--ghost btn--icon" href="default.html" aria-label="Close">${icon('x')}</a></div><div class="dialog__body stack"><ul class="doomed">${rows
    .slice(0, 4)
    .map((r) => `<li><b>${esc(rowName(r))}</b><code>${esc(r.id)}</code></li>`)
    .join('')}</ul>${
    linked > 0
      ? `<div class="alert alert--danger">${icon('warning')}<div class="alert__body">${linked} other ${linked === 1 ? 'record points' : 'records point'} here. They’ll show “deleted” where this used to be.</div></div>`
      : ''
  }${
    one
      ? ''
      : '<div class="field"><label class="field__label" for="type-delete">Type <code>delete</code> to confirm</label><input class="input" id="type-delete" type="text" autocomplete="off" autofocus></div>'
  }</div><div class="dialog__footer"><a class="btn" href="default.html">Keep ${one ? 'it' : 'them'}</a><a class="btn btn--danger" href="deleted.html"${one ? '' : ' aria-disabled="true"'}>Delete ${one ? esc(lower(e.singular)) : `${rows.length} ${esc(unit)}`}</a></div></div></div>`;
}

function buildRecords() {
  const dir = join(PAGES, 'admin-records');
  const members = getEntity('members');
  const special = {
    loading: { s: { loading: true }, note: 'The table while its rows load: six rows of skeletons in the columns it will show, no pagination, and <code>aria-busy</code>.' },
    empty: { s: { q: 'pastor mike' }, note: 'Nothing matches the search (Magic Patterns state “empty”). Search looks at every field. “Clear search and filters” clears both.' },
    error: { s: { error: true }, note: 'The table could not be read. The heading, search and filters stay; “Try again” reads the table again.' },
    filtered: { s: { status: 'suspended' }, note: 'A status chip filters the table; the count and pagination count the matching rows, and Export offers “CSV, matching rows” first.' },
    selected: { s: { selected: [0, 1] }, bulk: 'closed', note: 'Two rows selected: they are tinted and the bulk bar floats at the foot of the screen with the count, “Set status”, Export, Delete and Clear.' },
    'bulk-status-menu': { s: { selected: [0, 1] }, bulk: 'open', note: '“Set status” in the bulk bar opens upward with every status of the table. Choosing one sets it on the selected rows and says so.' },
    'row-menu': { s: { rowMenu: 0 }, note: 'The row actions menu (Magic Patterns state “row-menu”): Open, Edit, Copy ID (with the start of the ID), Duplicate and, apart, Delete. Read-only tables offer Open and Copy ID only.' },
    'columns-menu': { s: { menu: 'columns' }, note: 'The Columns menu lists every field as a checkbox; the first seven show by default. At least one stays on. “Reset to default” restores them.' },
    'export-menu': { s: { menu: 'export' }, note: 'Export downloads every record of the table as CSV or as JSON with every field, or e-mails the CSV to the staff member weekly.' },
    'page-size-menu': { s: { menu: 'pageSize' }, note: 'Rows per page: 25, 50, 100 or 250. Changing it returns to page 1.' },
    'confirm-delete': { s: { selected: [0, 1] }, bulk: 'closed', dialog: [0, 1], note: 'Deleting more than one record asks for <code>delete</code> to be typed; “Delete 2 members” stays disabled until it is. The dialog names the rows and how many other records point at them.' },
    'confirm-delete-one': { s: { rowMenu: null }, dialog: [0], note: 'Deleting one record from its row menu: the dialog names it and warns of the records that point at it; no typing is asked.' },
    deleted: { s: { deleted: [0, 1] }, toast: ['2 members deleted', true], note: 'After a delete the rows leave the table and a toast offers Undo while it shows.' },
  };
  const states = ['default', ...Object.keys(special), ...ENTITIES.filter((e) => e.key !== 'members').map((e) => kebab(e.key))];
  mkdirSync(dir, { recursive: true });

  for (const [state, def] of Object.entries(special)) {
    let overlays = '';
    if (def.bulk) overlays += bulkBar(members, 2, def.bulk === 'open');
    if (def.dialog) overlays += deleteDialog(members, def.dialog);
    if (def.toast) overlays += toast(...def.toast);
    const body = shell({ active: 'members', main: recordsMain(members, def.s), overlays });
    writeFileSync(join(dir, `${state}.html`), page({ screen: 'admin-records', title: 'Records', state, states, requirements: RECORDS_REQ, description: `Members, ${state}.`, body, note: def.note }));
  }
  for (const e of ENTITIES) {
    const state = e.key === 'members' ? 'default' : kebab(e.key);
    const body = shell({ active: e.key, main: recordsMain(e, {}) });
    const note =
      e.key === 'members'
        ? 'The table of a table (Magic Patterns frame “Records”), here Members. Rows open the record; a name or a reference opens what it names. A column heading sorts by it, ascending then descending then off. Under 768 px the table becomes a list of names, IDs and statuses.'
        : e.readOnly
          ? `${esc(e.label)} is read-only: Jubilee writes these records itself, so there is no “New”, no selection and no delete; they can be read and exported.`
          : `${esc(e.label)}, in the ${esc(e.group)} group, ${num(e.count)} records.`;
    writeFileSync(
      join(dir, `${state}.html`),
      page({ screen: 'admin-records', title: 'Records', state, states, requirements: RECORDS_REQ, description: `The ${e.label} table of the admin application.`, body, note }),
    );
  }
  return { id: 'admin-records', kind: 'page', title: 'Records', route: '/:table (admin application)', states, requirements: RECORDS_REQ.split(' ') };
}

// ---------------------------------------------------------------- Record

const RECORD_REQ = 'L2-188 L2-282 L2-283 L2-281 L2-284 L2-100 L2-101 L2-105 L2-106 L2-237 L2-247 L2-257';

function describeChange(action, diff) {
  const v = action.split('.')[1];
  const change = String(diff).match(/"(\w+)": \["([^"]*)", "([^"]*)"\]/);
  if (v === 'update' && change) return `changed ${change[1]} from ${change[2]} to ${change[3]}`;
  if (v === 'read') return 'opened it';
  return `${v}d it`;
}

function historyFor(e, row) {
  const audit = getEntity('auditRecords');
  const staff = getEntity('staff');
  const entries = audit.rows
    .filter((a) => a.recordId === row.id)
    .map((a) => ({ who: rowName(staff.rows.find((s) => s.id === a.actorId) ?? { id: a.actorId }), what: describeChange(a.action, a.diff), when: a.occurredAt }));
  const created = row.createdAt ?? row.occurredAt ?? row.startedAt;
  if (created) entries.push({ who: 'Jubilee', what: `created this ${lower(e.label).replace(/s$/, '')}`, when: created });
  return entries;
}

function editor(field, value) {
  const id = `f-${field.key}`;
  switch (field.type) {
    case 'long':
    case 'json':
      return `<textarea class="textarea${field.type === 'json' ? ' record-fields__mono' : ''}" id="${id}" rows="${field.type === 'json' ? 4 : 3}">${esc(value ?? '')}</textarea>`;
    case 'status':
      return `<select class="select record-fields__mid" id="${id}"><option value="">—</option>${(field.options ?? []).map((o) => `<option${o === value ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
    case 'bool':
      return `<label class="switch"><input type="checkbox" role="switch" id="${id}"${value ? ' checked' : ''}><span class="visually-hidden">${esc(field.label)}</span></label>`;
    case 'ref': {
      const target = getEntity(field.ref);
      const known = lookup(field.ref, value);
      return `<select class="select record-fields__ref" id="${id}"><option value="">None</option>${!known && value ? `<option selected>${esc(value)}</option>` : ''}${target.rows
        .map((r) => `<option value="${esc(r.id)}"${r.id === value ? ' selected' : ''}>${esc(rowName(r))} · ${esc(r.id)}</option>`)
        .join('')}</select>`;
    }
    case 'number':
      return `<input class="input record-fields__short" id="${id}" type="number" value="${value === null ? '' : esc(value)}">`;
    default: {
      const mono = field.type === 'mono' || field.type === 'url' ? ' record-fields__mono' : '';
      const short = ['money', 'date', 'datetime'].includes(field.type) ? ' record-fields__short' : '';
      return `<input class="input${mono}${short}" id="${id}" type="${field.type === 'email' ? 'email' : 'text'}" value="${esc(value ?? '')}">`;
    }
  }
}

function recordMain(e, mode, phase) {
  const source = e.rows[shownIndex(e.key)];
  const creating = mode === 'create';
  const editing = mode !== 'view';
  const row = creating ? Object.fromEntries(e.fields.map((f) => [f.key, f.type === 'bool' ? false : f.type === 'status' ? f.options?.[0] ?? '' : null])) : source;
  const title = creating ? `New ${lower(e.singular)}` : rowName(source);
  const statusField = e.fields.find((f) => f.key === 'status') ?? e.fields.find((f) => f.type === 'status');
  const userFields = e.fields.filter((f) => !f.system);
  const systemFields = e.fields.filter((f) => f.system);
  const links = creating ? [] : backlinks(e.key, source.id);
  const history = creating ? [] : historyFor(e, source);

  const crumbs = `<nav class="record-crumbs" aria-label="Breadcrumb"><a class="record-crumbs__back" href="${recordsHref(e.key)}">${icon('arrowLeft')}${esc(e.label)}</a>${icon('chevronRight')}<span class="record-crumbs__here" aria-current="page">${creating ? 'New' : esc(source.id)}</span></nav>`;

  if (phase === 'loading') {
    return `<div class="admin-page admin-page--record" aria-busy="true">${crumbs}<div class="record-head"><div class="record-head__main"><h1 class="visually-hidden">Loading ${esc(lower(e.singular))}…</h1><span class="skeleton skeleton--h1"></span></div></div><div class="record-grid"><div class="record-fields">${userFields
      .slice(0, 6)
      .map(() => '<div class="record-fields__row"><span class="skeleton skeleton--text skeleton--w30"></span><span class="skeleton skeleton--text skeleton--w70"></span></div>')
      .join('')}</div></div></div>`;
  }
  if (phase === 'error') {
    return `<div class="admin-page admin-page--record">${crumbs}<h1 class="visually-hidden">${esc(e.singular)} ${esc(source.id)}</h1>${errorState(`${lower(e.singular)} ${source.id}`, 'JB-ADM-504')}</div>`;
  }

  let actions;
  if (e.readOnly) actions = `<span class="lock-tag lock-tag--lg">${icon('lock')}Read-only</span>`;
  else if (editing)
    actions = `<a class="btn" href="${creating ? recordsHref(e.key) : 'default.html'}">Cancel</a><button class="btn btn--primary" type="${phase === 'saving' ? 'button' : 'submit'}" form="record-form"${phase === 'saving' ? ' aria-disabled="true"' : ''}>${
      phase === 'saving' ? '<span class="spinner spinner--sm" aria-hidden="true"></span>Saving…' : creating ? `Create ${esc(lower(e.singular))}` : 'Save changes'
    }</button>`;
  else
    actions = `${phase === 'saved' ? `<span class="record-head__saved" role="status">${icon('check')}Saved</span>` : ''}<a class="btn btn--danger-outline" href="${
      e.key === 'members' ? 'confirm-delete.html' : '#'
    }">${icon('trash')}Delete</a><a class="btn btn--ink" href="${e.key === 'members' ? 'edit.html' : '#'}">${icon('pencil')}Edit</a>`;

  const head = `<div class="record-head"><div class="record-head__main"><div class="record-head__title"><h1>${esc(title)}</h1>${!creating && statusField && source[statusField.key] ? status(source[statusField.key]) : ''}</div>${
    creating ? '' : `<button class="record-head__id" type="button" title="Copy ID" aria-label="Copy ID ${esc(source.id)}">${esc(source.id)}${icon('copy')}</button>`
  }</div><div class="record-head__actions">${actions}</div></div>`;

  const notes = [
    e.key === 'messages' && !creating
      ? `<div class="alert alert--warning record-note">${icon('eye')}<div class="alert__body">Messages are private. Opening this one was written to Audit records under your name.</div></div>`
      : '',
    e.readOnly ? '<p class="record-note">Jubilee writes these records itself. They can be read and exported, never changed.</p>' : '',
  ].join('');

  const values = phase === 'saved' && e.key === 'members' ? { ...row, neighbourhood: 'Riverdale' } : row;
  const fields = `<dl class="record-fields${editing ? ' record-fields--editing' : ''}">${userFields
    .map(
      (f) =>
        `<div class="record-fields__row"><dt>${editing ? `<label for="f-${f.key}">${esc(f.label)}</label>` : esc(f.label)}</dt><dd>${editing ? editor(f, values[f.key]) : cell(f, values[f.key])}</dd></div>`,
    )
    .join('')}</dl>${
    systemFields.length
      ? `<p class="record-system">${systemFields
          .map((f) => `<span>${esc(f.label)} ${creating ? '<b>set on create</b>' : f.type === 'id' ? `<code>${esc(row[f.key] ?? '—')}</code>` : `<b>${esc(row[f.key] ?? '—')}</b>`}</span>`)
          .join('')}</p>`
      : ''
  }`;

  const aside = creating
    ? ''
    : `<aside class="record-aside" aria-label="Related and history"><section><h2 class="record-aside__title">Points here</h2>${
        links.length
          ? `<ul class="backlinks">${links
              .map((l) => `<li><a href="${recordsHref(l.entity.key)}"><span class="backlinks__table">${esc(l.entity.label)}</span><span class="backlinks__as">as ${esc(lower(l.field))}</span><span class="backlinks__n">${l.count}</span></a></li>`)
              .join('')}</ul>`
          : '<p class="record-aside__empty">No other records reference this one.</p>'
      }</section><section><h2 class="record-aside__title">History</h2><ol class="history">${[
        ...(phase === 'saved' && e.key === 'members' ? [{ who: 'Ada Nwosu', what: 'changed neighbourhood from Leslieville to Riverdale', when: '18 Nov 09:44' }] : []),
        ...history,
      ]
        .map((h) => `<li><b>${esc(h.who)}</b> <span class="history__what">${esc(h.what)}</span><div class="history__when">${esc(h.when)}</div></li>`)
        .join('')}</ol></section></aside>`;

  const form = editing ? `<form id="record-form" action="#" class="record-grid">` : '<div class="record-grid">';
  return `<div class="admin-page admin-page--record">${crumbs}${head}${notes}${form}<section aria-label="Fields">${fields}</section>${aside}${editing ? '</form>' : '</div>'}</div>`;
}

function recordDeleteDialog(e) {
  const row = e.rows[shownIndex(e.key)];
  const links = backlinks(e.key, row.id);
  const n = links.reduce((m, l) => m + l.count, 0);
  return `<div class="backdrop"></div><div class="dialog" role="alertdialog" aria-modal="true" aria-labelledby="dlg-title" aria-describedby="dlg-desc"><div class="dialog__panel dialog__panel--sm"><div class="dialog__header"><div class="dialog__heading"><h2 class="dialog__title" id="dlg-title">Delete ${esc(rowName(row))}?</h2><p class="dialog__desc" id="dlg-desc">This removes the ${esc(lower(e.singular))} for everyone on Jubilee. The deletion is kept in Audit records.</p></div><a class="btn btn--ghost btn--icon" href="default.html" aria-label="Close">${icon('x')}</a></div>${
    n
      ? `<div class="dialog__body"><div class="alert alert--danger">${icon('warning')}<div class="alert__body">${n} other records point here, in ${esc(links.map((l) => l.entity.label).join(', '))}. They’ll show “deleted” where this used to be.</div></div></div>`
      : ''
  }<div class="dialog__footer"><a class="btn" href="default.html">Keep it</a><a class="btn btn--danger" href="${recordsHref(e.key)}">Delete ${esc(lower(e.singular))}</a></div></div></div>`;
}

function buildRecord() {
  const dir = join(PAGES, 'admin-record');
  const members = getEntity('members');
  const special = {
    loading: { mode: 'view', phase: 'loading', note: 'The record while it loads: the breadcrumb stays, the title and fields are skeletons.' },
    error: { mode: 'view', phase: 'error', note: 'The record could not be read. “Try again” reads it again; the breadcrumb returns to the table.' },
    edit: { mode: 'edit', phase: 'default', note: 'Editing (Magic Patterns “Members: editing”): every field the staff member may change becomes the editor of its type: text, e-mail, number, a select of the statuses, a select of the records a reference may point at, a switch, or a text area for long text and JSON. ID, created and updated stay as they are.' },
    saving: { mode: 'edit', phase: 'saving', note: 'Saving: “Save changes” says “Saving…” and cannot be pressed again until the answer comes.' },
    saved: { mode: 'view', phase: 'saved', note: 'Saved: the record returns to reading, “Saved” is announced beside the actions, and the change heads its history.' },
    create: { mode: 'create', phase: 'default', note: 'A new record (Magic Patterns “Members: new member”): empty editors, the first status chosen, “set on create” for the system fields, and no related or history column. “Cancel” returns to the table.' },
    'confirm-delete': { mode: 'view', phase: 'confirm-delete', note: 'Deleting the record (Magic Patterns “Record delete dialog”): it names how many records in which tables point at it. “Delete member” returns to the table with the toast of the table’s <code>deleted</code> state.' },
  };
  const states = ['default', ...Object.keys(special), ...ENTITIES.filter((e) => e.key !== 'members').map((e) => kebab(e.key))];
  mkdirSync(dir, { recursive: true });
  for (const [state, def] of Object.entries(special)) {
    const overlays = def.phase === 'confirm-delete' ? recordDeleteDialog(members) : '';
    const body = shell({ active: 'members', main: recordMain(members, def.mode, def.phase), overlays });
    writeFileSync(join(dir, `${state}.html`), page({ screen: 'admin-record', title: 'Record', state, states, requirements: RECORD_REQ, description: `A member record, ${state}.`, body, note: def.note }));
  }
  for (const e of ENTITIES) {
    const state = e.key === 'members' ? 'default' : kebab(e.key);
    const body = shell({ active: e.key, main: recordMain(e, 'view', 'default') });
    const note =
      e.key === 'members'
        ? 'One record (Magic Patterns frame “Record”), here a member. Its fields are a list of label and value; references open what they name. “Points here” counts the records of other tables that reference this one; “History” lists the audited changes and reads, newest first.'
        : e.key === 'messages'
          ? 'A message is private (L2-063 AC3, L2-150): it opens only while its conversation has a report, and opening it is written to Audit records under the staff member’s name, as the notice says. This one belongs to the reported conversation.'
          : e.readOnly
            ? `${esc(e.singular)} is read-only: “Read-only” stands in place of Delete and Edit.`
            : `One ${esc(lower(e.singular))}.`;
    writeFileSync(join(dir, `${state}.html`), page({ screen: 'admin-record', title: 'Record', state, states, requirements: RECORD_REQ, description: `One ${lower(e.singular)} in the admin application.`, body, note }));
  }
  return {
    id: 'admin-record',
    kind: 'page',
    title: 'Record',
    route: '/:table/:id, /:table/new (admin application)',
    states,
    requirements: RECORD_REQ.split(' '),
    not_applicable: { empty: 'A record screen shows one record; a table with no records is the table’s empty state.' },
  };
}

// ---------------------------------------------------------------- manifest

const REPLACED = ['admin-shell', 'admin-listings', 'admin-listing', 'admin-reports', 'admin-report', 'admin-featured', 'admin-policies', 'admin-policy'];

// The dialogs of the earlier admin screens that the design keeps as behaviour: each now opens from a
// record, so the inert screen behind it is that record in the new shell. The dialog itself is the
// mock's own and is left as it is.
const DIALOGS = { 'take-down-listing': 'listings', 'report-action': 'listingReports', 'publish-policy': 'contentVersions' };
const OLD_LINKS = [
  [/\.\.\/\.\.\/pages\/admin-listings\/[a-z-]+\.html/g, '../../pages/admin-records/listings.html'],
  [/\.\.\/\.\.\/pages\/admin-listing\/[a-z-]+\.html/g, '../../pages/admin-record/listings.html'],
  [/\.\.\/\.\.\/pages\/admin-reports\/[a-z-]+\.html/g, '../../pages/admin-records/listing-reports.html'],
  [/\.\.\/\.\.\/pages\/admin-report\/[a-z-]+\.html/g, '../../pages/admin-record/listing-reports.html'],
  [/\.\.\/\.\.\/pages\/admin-featured\/[a-z-]+\.html/g, '../../pages/admin-records/featured-slots.html'],
  [/\.\.\/\.\.\/pages\/admin-policies\/[a-z-]+\.html/g, '../../pages/admin-records/content-versions.html'],
  [/\.\.\/\.\.\/pages\/admin-policy\/[a-z-]+\.html/g, '../../pages/admin-record/content-versions.html'],
];

function rewrapDialogs(screens) {
  for (const [id, key] of Object.entries(DIALOGS)) {
    const dir = join(MOCKS, 'dialogs', id);
    const behind = shell({ active: key, main: recordMain(getEntity(key), 'view', 'default') }).replace(/\.\.\/admin-/g, '../../pages/admin-');
    for (const state of screens.find((s) => s.id === id)?.states ?? []) {
      const path = join(dir, `${state}.html`);
      let html = readFileSync(path, 'utf8');
      html = html.replace(/<div inert aria-hidden="true">[\s\S]*?<\/div><div class="backdrop">/, () => `<div inert aria-hidden="true">${behind}\n</div><div class="backdrop">`);
      for (const [from, to] of OLD_LINKS) html = html.replace(from, to);
      writeFileSync(path, html);
    }
    const entry = screens.find((s) => s.id === id);
    if (entry) entry.opens_from = 'admin-record';
  }
}

function main() {
  for (const dir of ['admin-overview', 'admin-records', 'admin-record']) rmSync(join(PAGES, dir), { recursive: true, force: true });
  const built = [buildOverview(), buildRecords(), buildRecord()];
  const path = join(MOCKS, 'manifest.json');
  const manifest = JSON.parse(readFileSync(path, 'utf8'));
  const list = manifest.screens;
  const ids = new Set([...REPLACED, ...built.map((b) => b.id)]);
  const at = list.findIndex((s) => s.id === 'admin-moved');
  const kept = list.filter((s) => !ids.has(s.id));
  const insertAt = kept.findIndex((s) => s.id === 'admin-moved') + 1 || kept.length;
  kept.splice(insertAt, 0, ...built);
  manifest.screens = kept;
  rewrapDialogs(kept);
  writeFileSync(path, `${JSON.stringify(manifest, null, 2)}\n`);
  const files = built.reduce((n, b) => n + b.states.length, 0);
  console.log(`admin mocks: ${built.length} screens, ${files} states${at < 0 ? ' (admin-moved not found; appended)' : ''}`);
}

main();

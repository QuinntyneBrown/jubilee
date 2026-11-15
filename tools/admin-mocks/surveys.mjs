// The admin application's survey screens, from the Magic Patterns frames "Surveys", "Survey
// Builder" and "Survey Results" (Jubilee Admin). build.mjs calls buildSurveyScreens with its own
// helpers, so the screens share the admin shell, the page skeleton and the mock bar.
import {
  PEOPLE,
  QUESTION_TYPES,
  SEGMENTS,
  STARTER,
  SURVEYS,
  TODAY_DAY,
  TODAY_LABEL,
  answerFor,
  daysLeft,
  getSurvey,
  typeLabel,
} from "./surveys-data.mjs";

// Requirements for surveys are not written yet (see docs/mocks/README.md, open questions).
const SURVEY_REQ = "";

export const SURVEY_ICONS = {
  arrowUp: '<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>',
  arrowDown: '<path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>',
  sliders:
    '<path d="M21 4h-7M10 4H3M21 12h-9M8 12H3M21 20h-5M12 20H3M14 2v4M8 10v4M16 18v4"/>',
  branch:
    '<path d="M6 3v12"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/>',
  cornerDownRight: '<path d="m15 10 5 5-5 5"/><path d="M4 4v7a4 4 0 0 0 4 4h12"/>',
  pause: '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>',
  play: '<path d="M6 3l14 9-14 9z"/>',
  calendarPlus:
    '<path d="M8 2v4M16 2v4M21 13V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8M3 10h18M16 19h6M19 16v6"/>',
  stop: '<circle cx="12" cy="12" r="10"/><rect x="9" y="9" width="6" height="6" rx="1"/>',
  circleAlert: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>',
  star: '<path d="M12 3l2.4 6.4 6.7.2-5.3 4.2 1.8 6.6L12 16.6l-5.6 3.8 1.8-6.6-5.3-4.2 6.7-.2z"/>',
  spinner: '<path d="M21 12a9 9 0 1 1-6.2-8.6"/>',
};

const STAR_PATH = SURVEY_ICONS.star;

/** Position on the design's 1 Nov – 31 Dec window, as a percentage. */
const pct = (day) => ((Math.min(61, Math.max(1, day)) - 1) / 60) * 100;
const short = (when) => when.split(",")[0].replace(/^\w{3} /, "");
const ordinal = (n) => ["1st", "2nd", "3rd", "4th", "5th"][n - 1] ?? `${n}th`;
const STATUS_WORD = {
  live: "Live",
  scheduled: "Scheduled",
  paused: "Paused",
  draft: "Draft",
  closed: "Closed",
};
const TICKS = [
  { day: 1, label: "1 Nov" },
  { day: 15, label: "15 Nov" },
  { day: 31, label: "1 Dec" },
  { day: 45, label: "15 Dec" },
];
const FILTERS = [
  { key: "all", label: "All" },
  { key: "live", label: "Live" },
  { key: "scheduled", label: "Scheduled" },
  { key: "paused", label: "Paused" },
  { key: "draft", label: "Drafts" },
  { key: "closed", label: "Closed" },
];

/** Where a survey opens: those with answers open on their results, the rest in the builder. */
const SURVEY_HREF = {
  srv_gala25: "../admin-survey-results/default.html",
  srv_seller_q4: "../admin-survey-results/anonymous.html",
  srv_heard: "../admin-survey-results/short-answers.html",
  srv_photos: "../admin-survey-results/paused.html",
  srv_worship: "../admin-survey-builder/scheduled.html",
  srv_next: "../admin-survey-builder/draft.html",
  srv_tee: "../admin-survey-results/closed.html",
  srv_launch_nps: "../admin-survey-results/expired.html",
};

export function buildSurveyScreens(h) {
  const { esc, num, icon: baseIcon, shell, page, toast, writePage } = h;
  const icon = (name, label) =>
    SURVEY_ICONS[name]
      ? label
        ? `<svg class="icon" role="img" aria-label="${esc(label)}" viewBox="0 0 24 24">${SURVEY_ICONS[name]}</svg>`
        : `<svg class="icon" aria-hidden="true" viewBox="0 0 24 24">${SURVEY_ICONS[name]}</svg>`
      : baseIcon(name, label);

  const pill = (status) =>
    `<span class="survey-status survey-status--${status}">${STATUS_WORD[status]}</span>`;

  /** Wraps a screen in the admin shell; a modal dialog makes the shell behind it inert. */
  const screen = (main, { overlays = "", modal = false } = {}) => {
    const html = shell({ active: "surveys", main, overlays });
    return modal ? html.replace('<div class="admin-app">', '<div class="admin-app" inert>') : html;
  };

  const dialog = ({ id = "dlg", title, desc, body = "", footer, close = "default.html", role = "dialog", size = "" }) =>
    `<div class="backdrop"></div><div class="dialog" role="${role}" aria-modal="true" aria-labelledby="${id}-title"${desc ? ` aria-describedby="${id}-desc"` : ""}><div class="dialog__panel${size ? ` dialog__panel--${size}` : ""}"><div class="dialog__header"><div class="dialog__heading"><h2 class="dialog__title" id="${id}-title">${esc(title)}</h2>${desc ? `<p class="dialog__desc" id="${id}-desc">${esc(desc)}</p>` : ""}</div><a class="btn btn--ghost btn--icon" href="${close}" aria-label="Close">${icon("x")}</a></div>${body ? `<div class="dialog__body">${body}</div>` : ""}<div class="dialog__footer">${footer}</div></div></div>`;

  const switchCtl = (id, on, label, extra = "") =>
    `<span class="switch"><input type="checkbox" role="switch" id="${id}"${on ? " checked" : ""}${label ? ` aria-label="${esc(label)}"` : ""}${extra}></span>`;

  const loadingPage = (kind) => {
    const lines = (n) =>
      Array.from({ length: n }, () => '<span class="skeleton skeleton--text"></span>').join("");
    const rows = Array.from(
      { length: 4 },
      () => `<div class="survey-loading__row">${lines(2)}</div>`,
    ).join("");
    return `<div class="admin-page admin-page--wide" aria-busy="true"><span class="visually-hidden" role="status">Loading ${esc(kind)}…</span><div aria-hidden="true"><span class="skeleton skeleton--text skeleton--w30"></span><span class="skeleton skeleton--h1"></span><span class="skeleton skeleton--text skeleton--w50"></span><div class="survey-section"><span class="skeleton skeleton--title"></span>${rows}</div></div><h1 class="visually-hidden">${esc(kind)}</h1></div>`;
  };

  const errorPage = (what, ref, title) =>
    `<div class="admin-page admin-page--wide"><h1 class="visually-hidden">${esc(title)}</h1><div class="empty empty--error" role="alert"><div class="empty__icon" aria-hidden="true">${icon("warning")}</div><h2 class="empty__title">We couldn’t load ${esc(what)}</h2><p class="empty__text">Nothing is lost. Check your connection and try again. If it keeps happening, tell us and quote <code>${ref}</code>.</p><div class="empty__actions"><a class="btn btn--primary" href="default.html">${icon("retry")}Try again</a></div></div></div>`;

  const notFoundPage = () =>
    `<div class="admin-page admin-page--wide"><a class="back-link" href="../admin-surveys/default.html">${icon("chevronLeft")}Surveys</a><div class="empty"><div class="empty__icon" aria-hidden="true">${icon("search")}</div><h1 class="empty__title">That survey isn’t here</h1><p class="empty__text">It may have been deleted as a draft, or the link is wrong. Every survey that ever ran is kept in the list.</p><div class="empty__actions"><a class="btn btn--primary" href="../admin-surveys/default.html">See all surveys</a></div></div></div>`;

  const built = [];
  const emit = ({ id, title, route, states, defs, notApplicable }) => {
    for (const s of states) {
      const d = defs[s];
      writePage(
        id,
        s,
        page({
          screen: id,
          title,
          state: s,
          states,
          requirements: SURVEY_REQ,
          description: d.description,
          body: d.body,
          note: d.note ?? "",
        }),
      );
    }
    const entry = { id, kind: "page", title, route, states, requirements: [] };
    if (notApplicable) entry.not_applicable = notApplicable;
    built.push(entry);
  };

  // ------------------------------------------------------------ Surveys (the list)

  const running = (order) =>
    order.map((id) => SURVEYS.find((s) => s.id === id));
  const DEFAULT_ORDER = SURVEYS.filter((s) => ["live", "paused", "scheduled"].includes(s.status))
    .sort((a, b) => lane(a) - lane(b))
    .map((s) => s.id);
  function lane(s) {
    return s.status === "scheduled" ? 100 + s.startDay : (s.priority ?? 50);
  }

  function expiry(s) {
    if (s.status === "scheduled") return `<span class="survey-lane__expiry">Opens ${esc(short(s.opensAt))}</span>`;
    if (s.status === "paused") return `<span class="survey-lane__expiry">Paused · ends ${esc(short(s.expiresAt))}</span>`;
    const d = daysLeft(s);
    return d <= 3
      ? `<span class="survey-lane__expiry survey-lane__expiry--soon">Expires in ${d} days</span>`
      : `<span class="survey-lane__expiry">Ends ${esc(short(s.expiresAt))}</span>`;
  }

  function laneRow(s, i, n) {
    const from = Math.max(1, s.startDay);
    const to = Math.min(61, s.endDay);
    const left = pct(from);
    const width = Math.max(1.5, pct(to) - left);
    const tone = s.status === "scheduled" ? " survey-lane__bar--scheduled" : s.status === "paused" ? " survey-lane__bar--paused" : "";
    return `<li class="survey-lane"><div class="survey-lane__who"><div class="survey-lane__order"><button class="survey-lane__move" type="button" aria-label="Raise ${esc(s.title)}"${i === 0 ? " disabled" : ""}>${icon("arrowUp")}</button><span class="survey-lane__rank" aria-label="Priority ${i + 1}">${i + 1}</span><button class="survey-lane__move" type="button" aria-label="Lower ${esc(s.title)}"${i === n - 1 ? " disabled" : ""}>${icon("arrowDown")}</button></div><a class="survey-lane__name" href="${SURVEY_HREF[s.id]}"><span class="survey-lane__title">${esc(s.title)}</span><span class="survey-lane__meta">${pill(s.status)}<span class="truncate">${esc(s.audience)}</span></span></a></div><div class="survey-lane__track"><span class="survey-lane__now" style="--at: ${pct(TODAY_DAY).toFixed(2)}%" aria-hidden="true"></span><span class="survey-lane__bar${tone}${s.startDay < 1 ? " survey-lane__bar--cut" : ""}" style="--at: ${left.toFixed(2)}%; --span: ${width.toFixed(2)}%" role="img" aria-label="Runs ${esc(s.opensAt)} to ${esc(s.expiresAt)}"></span></div><div class="survey-lane__count"><div><span class="survey-lane__n">${num(s.responses)}</span><span class="survey-lane__unit">${s.cap ? ` / ${s.cap}` : " responses"}</span></div>${expiry(s)}</div></li>`;
  }

  function surveysMain({ order = DEFAULT_ORDER, filter = "all", q = "", empty = false } = {}) {
    const all = empty ? [] : SURVEYS;
    const run = running(order);
    const live = run.filter((s) => s.status === "live");
    const soonest = live.reduce((m, s) => (!m || daysLeft(s) < daysLeft(m) ? s : m), null);
    const rows = all
      .filter((s) => filter === "all" || s.status === filter)
      .filter((s) => !q || `${s.title} ${s.audience} ${s.owner}`.toLowerCase().includes(q.toLowerCase()));
    const head = `<div class="records-head"><div class="admin-heading"><p class="admin-heading__eyebrow">Member research</p><h1 class="admin-heading__title">Surveys</h1><p class="admin-heading__lead">${
      empty
        ? "Ask members a few questions in the app, by email or by push. Each survey has its own audience, window and expiry."
        : `<strong>${live.length} running at once.</strong> A member sees at most one survey every 7 days; where several apply, the higher one in the list below goes first.`
    }</p></div><div class="records-head__actions"><a class="btn" href="../admin-surveys/delivery-rules.html">${icon("sliders")}Delivery rules</a><a class="btn btn--primary" href="../admin-survey-builder/new.html">${icon("plus")}New survey</a></div></div>`;
    if (empty)
      return `<div class="admin-page admin-page--wide">${head}<div class="survey-section"><div class="empty empty--rule"><h2 class="empty__title">No surveys yet</h2><p class="empty__text">Start with one question you genuinely need answered. You can add an expiry date, cap the number of responses, and run several surveys side by side once you have more than one.</p><div class="empty__actions"><a class="btn btn--ink" href="../admin-survey-builder/new.html">${icon("plus")}Write the first survey</a></div></div></div></div>`;
    const ruler = `<div class="survey-lanes__ruler" aria-hidden="true"><div class="survey-lanes__scale">${TICKS.map((t) => `<span class="survey-lanes__tick" style="--at: ${pct(t.day).toFixed(2)}%">${t.label}</span>`).join("")}<span class="survey-lanes__today" style="--at: ${pct(TODAY_DAY).toFixed(2)}%">${TODAY_LABEL}</span></div></div>`;
    const lanes = `<section class="survey-section" aria-labelledby="running"><div class="survey-section__head"><h2 class="survey-section__title" id="running">Running and coming up</h2>${
      soonest
        ? `<span class="survey-section__aside">Next to expire: <span class="${daysLeft(soonest) <= 3 ? "survey-section__soon" : ""}">${esc(soonest.title)}</span>, in ${daysLeft(soonest)} days</span>`
        : ""
    }</div>${ruler}<ol class="survey-lanes__list" aria-label="Running surveys, highest priority first">${run.map((s, i) => laneRow(s, i, run.length)).join("")}</ol></section>`;
    const chips = `<div class="chip-row" role="group" aria-label="Show surveys">${FILTERS.map(
      (f) =>
        `<a class="chip chip--sm" href="${f.key === "all" ? "default" : f.key === "live" ? "filtered" : "default"}.html" aria-pressed="${filter === f.key}" role="button">${f.label}<span class="chip__count">${f.key === "all" ? all.length : all.filter((s) => s.status === f.key).length}</span></a>`,
    ).join("")}</div>`;
    const table = `<div class="survey-table"><table><caption class="visually-hidden">Every survey${filter !== "all" ? `, ${FILTERS.find((f) => f.key === filter).label.toLowerCase()} only` : ""}</caption><thead><tr><th scope="col">Survey</th><th scope="col">Status</th><th scope="col">Window</th><th scope="col" class="num">Responses</th><th scope="col">Owner</th></tr></thead><tbody>${
      rows.length
        ? rows
            .map(
              (s) =>
                `<tr><td><a class="survey-table__name" href="${SURVEY_HREF[s.id]}">${esc(s.title)}</a><span class="survey-table__sub">${esc(s.audience)} · ${esc(s.trigger)}</span></td><td>${pill(s.status)}</td><td class="survey-table__muted">${s.status === "draft" ? "—" : `${esc(short(s.opensAt))} → ${esc(short(s.expiresAt))}`}</td><td class="num">${s.responses ? num(s.responses) : '<span class="survey-table__muted" aria-label="None">—</span>'}${s.cap ? `<span class="survey-table__muted"> / ${s.cap}</span>` : ""}</td><td class="survey-table__muted">${esc(s.owner)}</td></tr>`,
            )
            .join("")
        : `<tr><td class="survey-table__none" colspan="5">No surveys match “${esc(q)}”. <a href="default.html">Clear the search</a></td></tr>`
    }</tbody></table></div>`;
    const every = `<section class="survey-section" aria-labelledby="every"><div class="survey-section__head survey-section__head--tools"><h2 class="survey-section__title" id="every">All surveys</h2><form class="search survey-section__search" role="search" action="no-results.html"><label class="visually-hidden" for="survey-q">Search surveys</label>${icon("search")}<input class="input" id="survey-q" type="search" value="${esc(q)}" placeholder="Search surveys"></form></div>${chips}${table}</section>`;
    return `<div class="admin-page admin-page--wide">${head}${lanes}${every}</div>`;
  }

  function deliveryRules({ days = "7", invalid = false } = {}) {
    return dialog({
      title: "Delivery rules",
      desc: "Apply to every survey, so members running into several at once aren’t asked twice in a week.",
      body: `${invalid ? `<div class="alert alert--danger" role="alert">${icon("warning")}<div class="alert__body"><span class="alert__title">Fix one thing to save</span><a href="#rule-days">Days between surveys must be a whole number from 1 to 60.</a></div></div>` : ""}<ul class="setting-rows setting-rows--flush"><li class="setting-row"><span class="setting-row__text"><label class="setting-row__label" for="rule-days">One survey per member every</label><span class="setting-row__hint" id="rule-days-hint">Counts from the last one they were shown, answered or not.</span>${invalid ? '<span class="field__error" id="rule-days-error">Use a whole number of days from 1 to 60.</span>' : ""}</span><span class="setting-row__control"><input class="input" id="rule-days" inputmode="numeric" value="${esc(days)}" aria-describedby="rule-days-hint${invalid ? " rule-days-error" : ""}"${invalid ? ' aria-invalid="true" autofocus' : ""}>days</span></li><li class="setting-row"><span class="setting-row__text"><span class="setting-row__label">When surveys overlap</span><span class="setting-row__hint">Show the highest priority first. Lower ones wait their turn until they expire.</span></span></li><li class="setting-row"><span class="setting-row__text"><label class="setting-row__label" for="rule-new">Leave new members alone for 3 days</label><span class="setting-row__hint">Except surveys triggered by sign up itself.</span></span>${switchCtl("rule-new", true)}</li><li class="setting-row"><span class="setting-row__text"><label class="setting-row__label" for="rule-quiet">No push between 21:00 and 8:00</label><span class="setting-row__hint">In each member’s own time zone.</span></span>${switchCtl("rule-quiet", true)}</li></ul>`,
      footer: `<a class="btn btn--ghost" href="default.html">Cancel</a><a class="btn btn--ink" href="${invalid ? "delivery-rules-invalid.html" : "rules-saved.html"}">Save rules</a>`,
    });
  }

  {
    const id = "admin-surveys";
    const states = ["default", "filtered", "no-results", "reordered", "delivery-rules", "delivery-rules-invalid", "rules-saved", "empty", "loading", "error"];
    const seller = ["srv_seller_q4", ...DEFAULT_ORDER.filter((x) => x !== "srv_seller_q4")];
    const defs = {
      default: {
        description: "Surveys: the running ones in priority order on a shared timeline, and every survey below.",
        body: screen(surveysMain()),
        note: "Magic Patterns frame “Surveys”. The arrows change which survey a member who qualifies for several sees first; the change saves at once (see <a href=\"reordered.html\">reordered</a>). The bars sit on 1 Nov – 31 Dec; the dark line is today. A row opens the survey’s results, or its builder while it has none.",
      },
      filtered: {
        description: "Surveys with the Live filter on.",
        body: screen(surveysMain({ filter: "live" })),
        note: "The chips filter the table only; “Running and coming up” always shows everything running.",
      },
      "no-results": {
        description: "Surveys searched for a word no survey has.",
        body: screen(surveysMain({ q: "carol service" })),
        note: "The search matches title, audience and owner as you type.",
      },
      reordered: {
        description: "Surveys after Seller experience, Q4 was raised to first.",
        body: screen(surveysMain({ order: seller }), { overlays: toast("Priority saved. Seller experience, Q4 now goes first.", true) }),
        note: "Raising a survey saves at once and says so; Undo puts the order back.",
      },
      "delivery-rules": {
        description: "The Delivery rules dialog over Surveys.",
        body: screen(surveysMain(), { overlays: deliveryRules(), modal: true }),
        note: "Focus starts on the days field and stays in the dialog; Escape or Cancel closes it without saving.",
      },
      "delivery-rules-invalid": {
        description: "Delivery rules with a days value that can’t be saved.",
        body: screen(surveysMain(), { overlays: deliveryRules({ days: "0", invalid: true }), modal: true }),
      },
      "rules-saved": {
        description: "Surveys after the delivery rules were saved.",
        body: screen(surveysMain(), { overlays: toast("Delivery rules saved. They apply from the next survey shown.") }),
      },
      empty: {
        description: "Surveys before the first one is written.",
        body: screen(surveysMain({ empty: true })),
      },
      loading: {
        description: "Surveys while the list loads.",
        body: screen(loadingPage("Surveys")),
      },
      error: {
        description: "Surveys when the list fails to load.",
        body: screen(errorPage("the surveys", "srv-list-503", "Surveys")),
      },
    };
    emit({
      id,
      title: "Admin surveys",
      route: "/surveys (admin application)",
      states,
      defs,
      notApplicable: { forbidden: "Every member of staff can read surveys; the admin sign-in (admin-sign-in/not-staff) keeps everyone else out." },
    });
  }

  // ------------------------------------------------------------ Survey builder

  function previewAnswer(q) {
    if (["single", "multi", "yesno"].includes(q.type))
      return `<ul class="member-preview__answers">${(q.options ?? [])
        .map(
          (o, i) =>
            `<li class="member-preview__option"${i === 0 ? ' data-state="checked"' : ""}><span class="member-preview__dot${q.type === "multi" ? " member-preview__dot--box" : ""}"></span>${esc(o)}</li>`,
        )
        .join("")}</ul>`;
    if (q.type === "dropdown") return '<div class="member-preview__field">Choose one</div>';
    if (q.type === "scale" && q.scale) {
      const pts = Array.from({ length: q.scale.max - q.scale.min + 1 }, (_, i) => q.scale.min + i);
      return `<div class="member-preview__scale">${pts.map((p) => `<span${p === 8 ? ' data-state="checked"' : ""}>${p}</span>`).join("")}</div><div class="member-preview__ends"><span>${esc(q.scale.minLabel)}</span><span>${esc(q.scale.maxLabel)}</span></div>`;
    }
    if (q.type === "rating")
      return `<div class="member-preview__stars">${stars(4, "lg")}</div>`;
    return `<div class="member-preview__field${q.type === "long" ? " member-preview__field--long" : ""}">Type your answer</div>`;
  }

  function memberPreview(q, index, total, title) {
    return `<div class="member-preview"><div class="member-preview__head"><h2 class="member-preview__title">What members see</h2><span class="member-preview__where">Jubilee app</span></div><figure class="member-preview__device" role="img" aria-label="${q ? `Question ${index + 1} of ${total} as a member sees it in the Jubilee app` : "No question open to preview"}"><div class="member-preview__screen" aria-hidden="true"><div class="member-preview__bar"><span class="member-preview__brand">${h.MARK}<span class="member-preview__name">${esc(title)}</span></span>${icon("x")}</div><ol class="member-preview__steps">${Array.from({ length: Math.max(1, total) }, (_, i) => `<li${i <= index ? ' data-step="done"' : ""}></li>`).join("")}</ol><div class="member-preview__body">${
      q
        ? `<p class="member-preview__q">${esc(q.title || "Your question appears here")}</p>${q.help ? `<p class="member-preview__help">${esc(q.help)}</p>` : ""}${previewAnswer(q)}`
        : '<p class="member-preview__empty">Open a question to preview it.</p>'
    }</div><div class="member-preview__foot"><span>${q && !q.required ? "Optional" : `${index + 1} of ${total}`}</span><span class="member-preview__send">${index + 1 >= total ? "Send" : "Next"}</span></div></div></figure></div>`;
  }

  function typeMenu(q) {
    return `<ul class="menu menu--end" role="menu" aria-label="Answer type">${QUESTION_TYPES.map((t) => `<li role="none"><button class="menu__item" role="menuitemradio" type="button" aria-checked="${t.type === q.type}">${t.label}</button></li>`).join("")}</ul>`;
  }

  function questionRow(q, i, all, { open = false, locked = false, menu = false } = {}) {
    const n = i + 1;
    const pre = `q${n}`;
    const hasOptions = !!q.options && q.type !== "yesno";
    const branches = ["single", "yesno", "dropdown"].includes(q.type);
    const later = all.slice(i + 1);
    const meta = `<span class="question__meta"><span>${typeLabel(q.type)}</span>${q.required ? "" : "<span>Optional</span>"}${q.logic?.length ? `<span class="question__logic">${icon("branch")}${q.logic.length} skip rule${q.logic.length > 1 ? "s" : ""}</span>` : ""}</span>`;
    const toggle = `<button class="question__toggle" type="button" aria-expanded="${open}"${open ? ` aria-controls="${pre}-editor"` : ""}><span class="question__n">${n}</span><span class="question__body"><span class="question__title${q.title ? "" : " question__title--empty"}">${esc(q.title || "Write the question")}</span>${meta}</span>${icon("chevronDown").replace('class="icon"', 'class="icon question__chevron"')}</button>`;
    if (!open) return `<li class="question">${toggle}</li>`;
    const choices = hasOptions
      ? `<fieldset class="question__set"><legend class="field__label">Choices</legend><ul class="question__choices">${q.options
          .map(
            (o, j) =>
              `<li class="question__choice"><span class="question__mark${q.type === "multi" ? " question__mark--box" : ""}" aria-hidden="true"></span><input class="input" value="${esc(o)}" aria-label="Choice ${j + 1}"><button class="btn btn--ghost btn--icon btn--sm" type="button" aria-label="Remove ${esc(o)}"${locked || q.options.length <= 2 ? " disabled" : ""}>${icon("x")}</button></li>`,
          )
          .join("")}</ul>${locked ? "" : `<button class="btn btn--ghost btn--sm" type="button">${icon("plus")}Add a choice</button>`}</fieldset>`
      : "";
    const scale =
      q.scale && q.type === "scale"
        ? `<div class="question__ends"><div class="field"><label class="field__label" for="${pre}-min">Label at ${q.scale.min}</label><input class="input" id="${pre}-min" value="${esc(q.scale.minLabel)}"></div><div class="field"><label class="field__label" for="${pre}-max">Label at ${q.scale.max}</label><input class="input" id="${pre}-max" value="${esc(q.scale.maxLabel)}"></div></div>`
        : "";
    const ruleOptions = (sel) =>
      (q.options ?? []).map((o) => `<option${o === sel ? " selected" : ""}>${esc(o)}</option>`).join("");
    const goOptions = (sel) =>
      `${later
        .map((l) => {
          const t = l.title ? `: ${l.title.slice(0, 32)}${l.title.length > 32 ? "…" : ""}` : "";
          return `<option value="${l.id}"${l.id === sel ? " selected" : ""}>Question ${all.indexOf(l) + 1}${esc(t)}</option>`;
        })
        .join("")}<option value="end"${sel === "end" ? " selected" : ""}>The end</option>`;
    const logic = branches
      ? `<div class="question__rules"><span class="field__label" id="${pre}-logic">Skip logic</span>${(q.logic ?? [])
          .map(
            (r, j) =>
              `<div class="question__rule" role="group" aria-labelledby="${pre}-logic">${icon("cornerDownRight")}<label class="question__word" for="${pre}-when-${j}">If they answer</label><select class="select select--sm" id="${pre}-when-${j}">${ruleOptions(r.when)}</select><label class="question__word" for="${pre}-go-${j}">go to</label><select class="select select--sm" id="${pre}-go-${j}">${goOptions(r.goTo)}</select><button class="btn btn--ghost btn--icon btn--sm" type="button" aria-label="Remove rule">${icon("x")}</button></div>`,
          )
          .join("")}<button class="btn btn--ghost btn--sm question__more" type="button">${icon("plus")}Add a skip rule</button></div>`
      : "";
    const editor = `<div class="question__editor" id="${pre}-editor"><div class="question__grid"><div class="field"><label class="field__label" for="${pre}-title">Question</label><input class="input" id="${pre}-title" value="${esc(q.title)}" placeholder="What do you want to ask?"></div><div class="field"><span class="field__label" id="${pre}-type-label">Answer type</span><div class="menu-anchor question__type-anchor"><button class="btn question__type" type="button" aria-haspopup="menu" aria-expanded="${menu}" aria-labelledby="${pre}-type-label ${pre}-type-value"${locked ? ' disabled title="Fixed once answers arrive"' : ""}><span id="${pre}-type-value">${typeLabel(q.type)}</span>${icon("chevronDown")}</button>${menu ? typeMenu(q) : ""}</div></div></div><div class="field"><label class="field__label" for="${pre}-help">Help text <span class="optional">optional</span></label><input class="input" id="${pre}-help" value="${esc(q.help ?? "")}" placeholder="e.g. Pick up to three."></div>${choices}${scale}${logic}<div class="question__foot"><label class="switch">${`<input type="checkbox" role="switch"${q.required ? " checked" : ""}>`}<span>Required</span></label><div class="question__tools"><button class="btn btn--ghost btn--icon btn--sm" type="button" aria-label="Move up"${i === 0 ? " disabled" : ""}>${icon("arrowUp")}</button><button class="btn btn--ghost btn--icon btn--sm" type="button" aria-label="Move down"${i === all.length - 1 ? " disabled" : ""}>${icon("arrowDown")}</button><button class="btn btn--ghost btn--icon btn--sm" type="button" aria-label="Duplicate">${icon("copyPlus")}</button><button class="btn btn--ghost btn--icon btn--sm question__delete" type="button" aria-label="Delete question"${locked ? " disabled" : ""}>${icon("trash")}</button></div></div></div>`;
    return `<li class="question">${toggle}${editor}</li>`;
  }

  const TABS = [
    { key: "questions", label: "Questions", href: "default.html" },
    { key: "audience", label: "Audience", href: "audience.html" },
    { key: "schedule", label: "Schedule &amp; expiry", href: "schedule.html" },
  ];

  function audienceTab(s, { segment = "all", isNew = false } = {}) {
    const anonymous = isNew ? false : s.anonymous;
    const base = segment === "custom" ? 1240 : (SEGMENTS.find((x) => x.key === segment)?.reach ?? 0);
    const rules = [
      { field: "Church", op: "is", value: "Jesus House Toronto" },
      { field: "Last active", op: "within", value: "30 days" },
    ];
    const fields = ["Church", "City", "Last active", "Joined", "Has a listing", "Bought merch", "Attended event"];
    return `<div class="survey-builder__tab"><section aria-labelledby="who"><div class="survey-builder__split"><h2 class="survey-builder__heading" id="who">Who should be asked?</h2><p class="survey-builder__reach" aria-live="polite">About <b>${num(base)}</b> members</p></div><ul class="segment-list">${SEGMENTS.map(
      (g) =>
        `<li><label class="segment-list__item"><input type="radio" name="segment"${g.key === segment ? " checked" : ""}><span class="segment-list__text"><span class="setting-row__label">${esc(g.label)}</span><span class="setting-row__hint">${esc(g.hint)}</span></span><span class="segment-list__reach">${g.reach ? num(g.reach) : ""}</span></label></li>`,
    ).join("")}</ul>${
      segment === "custom"
        ? `<fieldset class="rule-box"><legend class="field__label">Members where all of these are true</legend>${rules
            .map(
              (r, i) =>
                `<div class="rule-box__row"><select class="select" aria-label="Condition ${i + 1} field">${fields.map((f) => `<option${f === r.field ? " selected" : ""}>${f}</option>`).join("")}</select><span class="rule-box__op">${r.op}</span><input class="input" value="${esc(r.value)}" aria-label="Condition ${i + 1} value"><button class="btn btn--ghost btn--icon btn--sm" type="button" aria-label="Remove condition ${i + 1}">${icon("x")}</button></div>`,
            )
            .join("")}<button class="btn btn--ghost btn--sm question__more" type="button">${icon("plus")}Add a condition</button></fieldset>`
        : ""
    }</section><section aria-labelledby="how-many"><h2 class="survey-builder__heading" id="how-many">How many of them</h2><p class="survey-builder__lead" id="how-many-hint">Ask a random share when you don’t need everyone, so the rest are free for the next survey.</p><div class="survey-builder__sample"><input type="range" id="sample" min="5" max="100" step="5" value="100" aria-label="Share of the audience" aria-describedby="how-many-hint"><output for="sample">100%</output></div></section><ul class="setting-rows"><li class="setting-row"><span class="setting-row__text"><label class="setting-row__label" for="anon">Anonymous answers</label><span class="setting-row__hint">Staff see answers without names. Can’t be turned off once answers arrive.</span></span>${switchCtl("anon", anonymous, "", !isNew && s.responses ? " disabled" : "")}</li><li class="setting-row"><span class="setting-row__text"><label class="setting-row__label" for="skip-recent">Skip members who answered a survey in the last 30 days</label><span class="setting-row__hint">On top of the one-a-week delivery rule.</span></span>${switchCtl("skip-recent", true)}</li></ul></div>`;
  }

  function scheduleTab(s, { error = false, isNew = false, title } = {}) {
    const draft = isNew || s.status === "draft";
    const opensDate = !draft;
    const opensAt = s.id === "srv_worship" ? "2025-11-29T09:00" : "2025-11-03T09:00";
    const expiresAt = error || draft ? "" : s.id === "srv_worship" ? "2025-12-02T23:59" : "2025-11-21T23:59";
    const others = SURVEYS.filter((x) => (x.status === "live" || x.status === "scheduled") && x.id !== s.id);
    const at = s.id === "srv_gala25" ? 0 : others.length;
    const order = [...others.slice(0, at), { id: "me", title }, ...others.slice(at)];
    const channel = (id, on, label, hint, more = "") =>
      `<li class="setting-row setting-row--lead setting-row--wrap"><input class="setting-row__check" type="checkbox" id="ch-${id}"${on ? " checked" : ""}><span class="setting-row__text"><label class="setting-row__label" for="ch-${id}">${label}</label><span class="setting-row__hint">${hint}</span></span>${on && more ? `<span class="setting-row__more">${more}</span>` : ""}</li>`;
    return `<div class="survey-builder__tab survey-builder__tab--schedule"><section aria-labelledby="when"><h2 class="survey-builder__heading" id="when">When it runs</h2><p class="survey-builder__lead">Times are Toronto time. Members see it in their own.</p><div class="survey-builder__grid"><fieldset class="question__set"><legend class="field__label">Opens</legend><label class="choice"><input type="radio" name="opens"${opensDate ? "" : " checked"}><span class="choice__text">As soon as it’s published</span></label><label class="choice"><input type="radio" name="opens"${opensDate ? " checked" : ""}><span class="choice__text">On a date</span></label>${opensDate ? `<input class="input" type="datetime-local" value="${opensAt}" aria-label="Opens at">` : ""}</fieldset><div class="field"><label class="field__label" for="expires">Expires <span class="required">required</span></label><input class="input" id="expires" type="datetime-local" value="${expiresAt}"${error ? ' aria-invalid="true" aria-describedby="expires-error" autofocus' : ""}>${error ? '<p class="field__error" id="expires-error">Pick the last moment members can answer.</p>' : ""}<div class="survey-builder__picks" role="group" aria-label="Quick expiry">${["+1 week", "+2 weeks", "+30 days"].map((l) => `<button class="chip chip--sm" type="button">${l}</button>`).join("")}</div></div></div><ul class="setting-rows survey-builder__rows"><li class="setting-row setting-row--lead setting-row--wrap">${switchCtl("cap", s.cap !== null, "", "")}<span class="setting-row__text"><label class="setting-row__label" for="cap">Close early at a number of responses</label><span class="setting-row__hint">Whichever comes first: this or the expiry date.</span></span>${s.cap !== null ? `<span class="setting-row__control"><input class="input input--wide" inputmode="numeric" value="${s.cap}" aria-label="Response cap"></span>` : ""}</li><li class="setting-row setting-row--lead">${switchCtl("grace", true)}<span class="setting-row__text"><label class="setting-row__label" for="grace">Let members who started finish within 1 hour of expiry</label><span class="setting-row__hint">New members stop seeing it at the expiry time either way.</span></span></li><li class="setting-row setting-row--lead">${switchCtl("digest", true)}<span class="setting-row__text"><label class="setting-row__label" for="digest">Email the owner a summary when it closes</label><span class="setting-row__hint">Results stay in the admin after expiry. Nothing is deleted.</span></span></li></ul></section><section aria-labelledby="how"><h2 class="survey-builder__heading" id="how">How members get it</h2><ul class="setting-rows survey-builder__rows">${channel("home", true, "Card on Home", "Shown on their next visit, until they answer or dismiss it.")}${channel("after", false, "After something they do", "A sheet that slides up at the moment it’s relevant.")}${channel("email", s.id === "srv_gala25", "Email", "One email with a link. Respects their email preferences.")}${channel("push", s.id === "srv_worship", "Push notification", "Held back during quiet hours, 21:00 to 8:00.")}</ul><label class="switch survey-builder__remind"><input type="checkbox" role="switch" checked><span>Remind once, 3 days later, if they haven’t answered</span></label></section><section aria-labelledby="priority"><h2 class="survey-builder__heading" id="priority">Priority among running surveys</h2><p class="survey-builder__lead">When a member qualifies for more than one, they get the highest first and the rest wait at least 7 days.</p><ol class="priority-list">${order
      .map((o, i) => {
        const me = o.id === "me";
        return `<li class="priority-list__item${me ? " priority-list__item--self" : ""}"><span class="priority-list__n">${i + 1}</span><span class="priority-list__name">${esc(o.title)}${me ? ' <span class="badge badge--warning">This survey</span>' : ""}</span>${me ? `<span class="priority-list__moves"><button class="btn btn--ghost btn--icon btn--sm" type="button" aria-label="Raise priority"${i === 0 ? " disabled" : ""}>${icon("arrowUp")}</button><button class="btn btn--ghost btn--icon btn--sm" type="button" aria-label="Lower priority"${i === order.length - 1 ? " disabled" : ""}>${icon("arrowDown")}</button></span>` : ""}</li>`;
      })
      .join("")}</ol></section></div>`;
  }

  function builderMain({
    surveyId = "srv_gala25",
    isNew = false,
    tab = "questions",
    selected,
    error = false,
    addMenu = false,
    typeMenuOpen = false,
    segment = "all",
    saved = "Saved 2 minutes ago",
  } = {}) {
    const s = getSurvey(surveyId);
    const title = isNew ? "Untitled survey" : s.title;
    const questions = isNew || s.questions.length === 0 ? STARTER : s.questions;
    const sel = selected === undefined ? questions[0].id : selected;
    const live = !isNew && s.status === "live";
    const status = isNew ? "draft" : s.status;
    const scheduled = !isNew && s.status === "scheduled";
    const publishLabel = live ? "Update live survey" : scheduled ? "Schedule" : "Publish";
    const publishHref = error ? "missing-expiry.html" : live ? "update-confirm.html" : "publish-confirm.html";
    const current = questions.find((q) => q.id === sel) ?? null;
    const ci = current ? questions.indexOf(current) : -1;
    const previewQ = tab === "questions" ? current : questions[0];
    const previewI = tab === "questions" ? ci : 0;
    const tabs = `<div class="tabs survey-tabs" role="tablist" aria-label="Survey parts">${TABS.map(
      (t) =>
        `<a class="tab" role="tab" href="${t.key === "questions" ? (isNew ? "new.html" : surveyId === "srv_next" ? "draft.html" : "default.html") : t.href}" aria-selected="${tab === t.key}"${tab === t.key ? ' aria-controls="tab-panel"' : ""}>${t.label}${t.key === "schedule" && error ? '<span class="tab__alert" aria-hidden="true"></span><span class="visually-hidden">, needs attention</span>' : ""}</a>`,
    ).join("")}</div>`;
    const questionsPanel = `<ol class="question-list" aria-label="Questions">${questions
      .map((q, i) => questionRow(q, i, questions, { open: q.id === sel, locked: live, menu: typeMenuOpen && q.id === sel }))
      .join("")}</ol><div class="menu-anchor survey-builder__add"><button class="btn" type="button" aria-haspopup="menu" aria-expanded="${addMenu}">${icon("plus")}Add question</button>${
      addMenu
        ? `<ul class="menu" role="menu" aria-label="Question type">${QUESTION_TYPES.map((t) => `<li role="none"><button class="menu__item" role="menuitem" type="button">${t.label}</button></li>`).join("")}</ul>`
        : ""
    }</div><div class="survey-builder__thanks field"><label class="field__label" for="thanks">After the last question</label><p class="field__help" id="thanks-help">Shown once a member submits.</p><textarea class="textarea" id="thanks" rows="2" aria-describedby="thanks-help">Thank you. We read every answer, and we’ll share what we heard in the next community update.</textarea></div>`;
    const panel =
      tab === "questions"
        ? questionsPanel
        : tab === "audience"
          ? audienceTab(s, { segment, isNew })
          : scheduleTab(s, { error, isNew, title });
    return `<div class="admin-page admin-page--wide admin-page--record"><a class="back-link" href="../admin-surveys/default.html">${icon("chevronLeft")}Surveys</a><div class="records-head"><div class="survey-head"><h1 class="visually-hidden">${esc(title)}</h1><label class="visually-hidden" for="survey-title">Survey title</label><input class="survey-title" id="survey-title" value="${esc(title)}"><div class="survey-meta">${pill(status)}<span>${questions.length} questions</span><span aria-hidden="true">·</span><span>${isNew ? "Not saved yet" : esc(saved)}</span></div></div><div class="records-head__actions"><a class="btn" href="${live ? "../admin-survey-results/default.html" : "saved.html"}">${live ? "Discard changes" : "Save draft"}</a><a class="btn btn--primary" href="${publishHref}">${publishLabel}</a></div></div>${
      live
        ? `<div class="alert alert--warning survey-banner">${icon("circleAlert")}<div class="alert__body">This survey has 412 answers. You can change wording, schedule and audience; adding or removing options would split the results, so it starts a new version.</div></div>`
        : ""
    }${
      error
        ? `<div class="alert alert--danger survey-banner" role="alert">${icon("circleAlert")}<div class="alert__body">Add an expiry date before publishing. Every survey has one, so nothing keeps asking members after it’s useful. <a href="#expires">Set the expiry</a></div></div>`
        : ""
    }${tabs}<div class="survey-builder"><div class="survey-builder__main" role="tabpanel" id="tab-panel" aria-label="${TABS.find((t) => t.key === tab).label.replace("&amp;", "and")}">${panel}</div><aside class="survey-builder__aside" aria-label="Preview">${memberPreview(previewQ, previewI, questions.length, title)}</aside></div></div>`;
  }

  function publishDialog({ surveyId, isNew = false, busy = false }) {
    const s = getSurvey(surveyId);
    const live = !isNew && s.status === "live";
    const title = isNew ? "Untitled survey" : s.title;
    const dlTitle = live ? "Update the live survey?" : `Publish “${title}”?`;
    const expires = live ? "Fri 21 Nov, 23:59" : "Fri 5 Dec, 23:59";
    const back = live ? "default.html" : "draft.html";
    const confirmHref = live ? "../admin-survey-results/default.html" : "publishing.html";
    return dialog({
      title: dlTitle,
      desc: "You can pause it, extend it or close it early from its results.",
      close: back,
      body: `<dl class="dl"><dt>Who</dt><dd>${esc(isNew ? "All members" : s.audience)}, about ${num(isNew ? 3820 : s.reach)} people</dd><dt>Opens</dt><dd>${live ? "Already open since Mon 3 Nov, 9:00" : "As soon as you publish"}</dd><dt>Expires</dt><dd><strong>${expires}, Toronto time</strong></dd><dt>Ends early</dt><dd>${s.cap ? `At ${num(s.cap)} responses` : "No, runs until it expires"}</dd><dt>Priority</dt><dd>${live ? `${ordinal(s.priority)} of 4 running` : "4th of 4 running, after Seller experience, Q4"}</dd></dl>`,
      footer: busy
        ? `<button class="btn btn--ghost" type="button" disabled>Keep editing</button><button class="btn btn--ink" type="button" aria-disabled="true"><span class="spinner spinner--sm" aria-hidden="true"></span>Publishing…</button>`
        : `<a class="btn btn--ghost" href="${back}">Keep editing</a><a class="btn btn--ink" href="${confirmHref}">${live ? "Update" : "Publish now"}</a>`,
    });
  }

  {
    const id = "admin-survey-builder";
    const states = ["default", "collapsed", "draft", "new", "add-menu", "type-menu", "scheduled", "audience", "audience-custom", "schedule", "missing-expiry", "saved", "publish-confirm", "publishing", "update-confirm", "loading", "error", "not-found"];
    const defs = {
      default: {
        description: "The builder on a live survey (Christmas Gala), question 1 open.",
        body: screen(builderMain()),
        note: "Magic Patterns frame “Survey Builder”. A question opens in place; the preview beside it follows the open question. On a live survey the answer type and its choices are fixed: changing them would split the results, so the warning says a new version starts instead.",
      },
      collapsed: {
        description: "The builder with every question closed.",
        body: screen(builderMain({ selected: null })),
      },
      draft: {
        description: "The builder on a draft (What should we build next?) with the starter questions.",
        body: screen(builderMain({ surveyId: "srv_next", saved: "Saved yesterday" })),
        note: "A draft that has no questions yet starts from three starter questions, so there is always something to edit rather than an empty page.",
      },
      new: {
        description: "A new survey, not saved yet.",
        body: screen(builderMain({ isNew: true })),
      },
      "add-menu": {
        description: "The Add question menu open on a new survey.",
        body: screen(builderMain({ isNew: true, selected: null, addMenu: true })),
        note: "Arrow keys move through the eight types; Enter adds one at the end and opens it.",
      },
      "type-menu": {
        description: "The Answer type menu open on question 1 of a new survey.",
        body: screen(builderMain({ isNew: true, typeMenuOpen: true })),
      },
      scheduled: {
        description: "The builder on a scheduled survey (Worship Night check-in), its star rating open.",
        body: screen(builderMain({ surveyId: "srv_worship", saved: "Saved on 14 Nov" })),
      },
      audience: {
        description: "The Audience tab of the Christmas Gala survey.",
        body: screen(builderMain({ tab: "audience" })),
        note: "Anonymous answers can’t change once answers have arrived, so the switch is disabled here.",
      },
      "audience-custom": {
        description: "The Audience tab with Custom rules chosen.",
        body: screen(builderMain({ tab: "audience", segment: "custom" })),
        note: "The count of members updates as the conditions change, and is announced politely.",
      },
      schedule: {
        description: "The Schedule & expiry tab of the Christmas Gala survey.",
        body: screen(builderMain({ tab: "schedule" })),
      },
      "missing-expiry": {
        description: "Publishing a draft with no expiry: the Schedule tab with the error.",
        body: screen(builderMain({ surveyId: "srv_next", tab: "schedule", error: true, saved: "Saved yesterday" })),
        note: "Publish moved to this tab, put focus on Expires and marked the tab. Picking a date clears the error.",
      },
      saved: {
        description: "The draft after Save draft.",
        body: screen(builderMain({ surveyId: "srv_next", saved: "Saved just now" }), { overlays: toast("Draft saved. Only staff can see it.") }),
      },
      "publish-confirm": {
        description: "The Publish dialog for the draft.",
        body: screen(builderMain({ surveyId: "srv_next", saved: "Saved just now" }), { overlays: publishDialog({ surveyId: "srv_next" }), modal: true }),
        note: "The dialog repeats who, when and the expiry so nothing goes out by surprise. Focus starts on Keep editing.",
      },
      publishing: {
        description: "The Publish dialog while it publishes.",
        body: screen(builderMain({ surveyId: "srv_next", saved: "Saved just now" }), { overlays: publishDialog({ surveyId: "srv_next", busy: true }), modal: true }),
        note: "Once published the survey opens on its results (<a href=\"../admin-survey-results/no-responses.html\">no responses yet</a>).",
      },
      "update-confirm": {
        description: "The Update dialog for the live Christmas Gala survey.",
        body: screen(builderMain(), { overlays: publishDialog({ surveyId: "srv_gala25" }), modal: true }),
      },
      loading: { description: "The builder while the survey loads.", body: screen(loadingPage("Survey")) },
      error: { description: "The builder when the survey fails to load.", body: screen(errorPage("this survey", "srv-edit-503", "Survey")) },
      "not-found": { description: "The builder for a survey that doesn’t exist.", body: screen(notFoundPage()) },
    };
    emit({ id, title: "Admin survey builder", route: "/surveys/new, /surveys/:id/edit (admin application)", states, defs, notApplicable: { empty: "The builder is never empty: a new survey, or a draft without questions, starts from three starter questions (new, draft)." } });
  }

  // ------------------------------------------------------------ Survey results

  function stars(value, size = "") {
    return `<span class="stars${size ? ` stars--${size}` : ""}" aria-hidden="true">${[1, 2, 3, 4, 5]
      .map((n) => {
        const fill = Math.max(0, Math.min(1, value - (n - 1))) * 100;
        return `<span class="stars__star"><svg class="stars__track" aria-hidden="true" viewBox="0 0 24 24">${STAR_PATH}</svg><span class="stars__fill" style="width: ${fill.toFixed(0)}%"><svg class="stars__glyph" aria-hidden="true" viewBox="0 0 24 24">${STAR_PATH}</svg></span></span>`;
      })
      .join("")}</span>`;
  }

  function chart(q) {
    const counts = q.counts ?? [];
    const answered = q.answered ?? 0;
    if (!answered) return '<p class="answer-q__meta">No answers yet.</p>';
    if (q.type === "scale" && q.scale) {
      const max = Math.max(1, ...counts);
      const sum = counts.reduce((a, b) => a + b, 0) || 1;
      const promoters = (counts[9] ?? 0) + (counts[10] ?? 0);
      const detractors = counts.slice(0, 7).reduce((a, b) => a + b, 0);
      const score = Math.round(((promoters - detractors) / sum) * 100);
      return `<div class="score-chart"><div><ul class="score-chart__bars" aria-label="Answers per score">${counts
        .map(
          (c, i) =>
            `<li><span class="score-chart__bar${i >= 9 ? " score-chart__bar--high" : i >= 7 ? "" : " score-chart__bar--low"}" style="--value: ${((c / max) * 100).toFixed(1)}%"></span><span class="visually-hidden">${i + q.scale.min}: ${c}</span></li>`,
        )
        .join("")}</ul><div class="score-chart__axis" aria-hidden="true">${counts.map((_, i) => `<span>${i + q.scale.min}</span>`).join("")}</div><div class="score-chart__ends" aria-hidden="true"><span>${esc(q.scale.minLabel)}</span><span>${esc(q.scale.maxLabel)}</span></div></div><div class="score-chart__score"><div class="score-chart__value">${score > 0 ? `+${score}` : score}</div><p class="score-chart__text">Net score: <span class="score-chart__good">${Math.round((promoters / sum) * 100)}% gave 9–10</span>, <span class="score-chart__bad">${Math.round((detractors / sum) * 100)}% gave 0–6</span></p></div></div>`;
    }
    if (q.type === "rating") {
      const sum = counts.reduce((a, b) => a + b, 0) || 1;
      const avg = counts.reduce((a, c, i) => a + c * (i + 1), 0) / sum;
      return `<div class="rating-chart"><div><div class="rating-chart__value">${avg.toFixed(1)}<span class="visually-hidden"> out of 5</span></div>${stars(Math.round(avg))}</div><ul class="rating-chart__rows">${[...counts]
        .reverse()
        .map(
          (c, i) =>
            `<li class="rating-chart__row"><span><span aria-hidden="true">${5 - i}★</span><span class="visually-hidden">${5 - i} stars</span></span><span class="rating-chart__track" aria-hidden="true"><span class="rating-chart__fill" style="--value: ${((c / sum) * 100).toFixed(1)}%"></span></span><span>${c}</span></li>`,
        )
        .join("")}</ul></div>`;
    }
    if (q.type === "short" || q.type === "long") {
      return `<ul class="answer-samples">${(q.samples ?? [])
        .map((a) => `<li><p>${esc(a.body)}</p><p class="answer-samples__who">${esc(a.who)} · ${esc(a.when)}</p></li>`)
        .join("")}</ul><a class="btn btn--link btn--sm answer-samples__more" href="responses.html">Read all ${num(answered)} answers</a>`;
    }
    const top = Math.max(...counts);
    return `<ul class="answer-bars">${(q.options ?? [])
      .map((o, i) => {
        const c = counts[i] ?? 0;
        const share = (c / answered) * 100;
        return `<li class="answer-bars__row${c === top ? " answer-bars__row--top" : ""}"><span class="answer-bars__label">${esc(o)}</span><span class="answer-bars__share">${Math.round(share)}%<span class="answer-bars__count">${c}</span><span class="visually-hidden">, ${c} members</span></span><span class="answer-bars__track" aria-hidden="true"><span class="answer-bars__fill" style="--value: ${share.toFixed(1)}%"></span></span></li>`;
      })
      .join("")}${q.type === "multi" ? '<li class="answer-bars__note">Members could pick more than one, so shares add up to more than 100%.</li>' : ""}</ul>`;
  }

  function summary(s, total) {
    return `<div class="answer-summary">${s.questions
      .map((q, i) => {
        const answered = q.answered ?? 0;
        const skip = (q.logic ?? [])
          .map((rule) => {
            const k = q.options?.indexOf(rule.when) ?? -1;
            const n = k >= 0 ? (q.counts?.[k] ?? 0) : 0;
            const target = s.questions.findIndex((x) => x.id === rule.goTo);
            return answered ? `<p class="answer-q__skip">${icon("cornerDownRight")}${num(n)} answered “${esc(rule.when)}” and skipped to ${target >= 0 ? `question ${target + 1}` : "the end"}.</p>` : "";
          })
          .join("");
        return `<section class="answer-q" aria-labelledby="aq-${i + 1}"><span class="answer-q__n" aria-hidden="true">${i + 1}</span><div class="answer-q__body"><h3 class="answer-q__title" id="aq-${i + 1}"><span class="visually-hidden">Question ${i + 1}: </span>${esc(q.title)}</h3><p class="answer-q__meta">${typeLabel(q.type)} · ${num(answered)} answered${answered && answered < total ? ` · ${num(total - answered)} skipped or not shown` : ""}</p><div class="answer-q__chart">${chart(q)}</div>${skip}</div></section>`;
      })
      .join("")}</div>`;
  }

  function responses(s, { only = "all" } = {}) {
    const rows = PEOPLE.map((p, i) => ({
      who: s.anonymous ? `Respondent ${s.responses - i}` : p.name,
      church: p.church,
      when: p.when,
      via: s.channels[i % s.channels.length],
      complete: i !== 3,
      answers: s.questions.map((q) => answerFor(q, i)),
    })).filter((r) => only === "all" || (only === "complete" ? r.complete : !r.complete));
    const chip = (key, label, href) =>
      `<a class="chip chip--sm" role="button" href="${href}" aria-pressed="${only === key}">${label}</a>`;
    return `<div class="chip-row" role="group" aria-label="Show responses">${chip("all", "All", "responses.html")}${chip("complete", "Finished", "responses.html")}${chip("partial", "Started, not finished", "responses-unfinished.html")}</div><ul class="response-list" aria-label="Responses, newest first">${rows
      .map(
        (r, i) =>
          `<li><button class="response__toggle" type="button" aria-expanded="${i === 0}"${i === 0 ? ` aria-controls="resp-${i}"` : ""}>${icon("chevronRight")}<span class="response__who"><span class="response__name">${esc(r.who)}</span>${s.anonymous ? "" : `<span class="response__church">${esc(r.church)}</span>`}</span><span class="response__first">${esc(r.answers[0] ?? "")}</span><span class="response__via">${esc(r.via)}</span><span class="response__when${r.complete ? "" : " response__when--open"}">${r.complete ? esc(r.when) : "Not finished"}</span></button>${
            i === 0
              ? `<dl class="response__answers" id="resp-${i}">${s.questions
                  .map(
                    (q, j) =>
                      `<div class="response__pair"><dt>${j + 1}. ${esc(q.title)}</dt><dd>${!r.complete && j >= 2 ? '<span class="response__none">No answer</span>' : esc(r.answers[j])}</dd></div>`,
                  )
                  .join("")}</dl>`
              : ""
          }</li>`,
      )
      .join("")}</ul><p class="response-list__foot">Showing the latest ${rows.length} of ${num(s.responses)}. Export for the rest.</p>`;
  }

  function actionsMenu(open) {
    return `<ul class="menu menu--end" role="menu" aria-label="Survey actions">${
      open ? `<li role="none"><a class="menu__item" role="menuitem" href="extend-expiry.html">${icon("calendarPlus")}Extend expiry</a></li>` : ""
    }<li role="none"><button class="menu__item" role="menuitem" type="button">${icon("download")}Export responses<span class="menu__hint">CSV</span></button></li><li role="none"><a class="menu__item" role="menuitem" href="../admin-survey-builder/draft.html">${icon("copy")}Duplicate as a draft</a></li>${
      open ? `<li role="separator" class="menu__divider"></li><li role="none"><a class="menu__item menu__item--danger" role="menuitem" href="close-early.html">${icon("stop")}Close now</a></li>` : ""
    }</ul>`;
  }

  function resultsMain({
    surveyId = "srv_gala25",
    tab = "summary",
    status: statusOverride,
    menu = false,
    only = "all",
    expires: expiresOverride,
    fresh = false,
  } = {}) {
    const base = getSurvey(surveyId);
    const s = fresh
      ? { ...base, status: "live", responses: 0, opensAt: "Tue 18 Nov, 10:42", expiresAt: "Fri 5 Dec, 23:59", startDay: 18, endDay: 35, questions: STARTER.map((q) => ({ ...q, answered: 0 })) }
      : base;
    const status = statusOverride ?? s.status;
    const open = status === "live" || status === "paused";
    const left = daysLeft(s);
    const rate = s.reach ? (s.responses / s.reach) * 100 : 0;
    const started = Math.round(s.responses * 1.22);
    const elapsed = Math.min(100, Math.max(0, ((TODAY_DAY - s.startDay) / Math.max(1, s.endDay - s.startDay)) * 100));
    const expires = expiresOverride ?? s.expiresAt;
    const tabHref = (t) =>
      t === "summary" ? (surveyId === "srv_gala25" ? "default.html" : "#") : "responses.html";
    const head = `<a class="back-link" href="../admin-surveys/default.html">${icon("chevronLeft")}Surveys</a><div class="records-head"><div class="admin-heading survey-head"><h1 class="admin-heading__title">${esc(s.title)}</h1><div class="survey-meta">${pill(status)}<span>${esc(s.audience)}</span><span aria-hidden="true">·</span><span>${esc(s.channels.join(", "))}</span><span aria-hidden="true">·</span><span>${s.anonymous ? "Anonymous" : "Named answers"}</span></div></div><div class="records-head__actions"><a class="btn" href="${surveyId === "srv_gala25" ? "../admin-survey-builder/default.html" : "../admin-survey-builder/draft.html"}">${icon("pencil")}Edit</a>${
      open ? `<a class="btn" href="${status === "live" ? "paused-now.html" : "default.html"}">${status === "live" ? icon("pause") : icon("play")}${status === "live" ? "Pause" : "Resume"}</a>` : ""
    }<div class="menu-anchor"><a class="btn btn--ink" href="${menu ? "default.html" : "actions-menu.html"}" role="button" aria-haspopup="menu" aria-expanded="${menu}">More${icon("chevronDown")}</a>${menu ? actionsMenu(open) : ""}</div></div></div>`;
    const note = s.note && !fresh ? `<p class="survey-note">${esc(s.note)}</p>` : "";
    const headline = `<section class="survey-headline" aria-label="Responses and expiry"><div><div class="survey-headline__count"><span class="survey-headline__n">${num(s.responses)}</span><span class="survey-headline__of">${s.cap ? `of ${num(s.cap)} responses wanted` : "responses"}</span></div>${
      s.cap
        ? `<div class="progress progress--success" role="progressbar" aria-label="Responses towards the cap" aria-valuemin="0" aria-valuemax="${s.cap}" aria-valuenow="${Math.min(s.responses, s.cap)}"><div class="progress__bar" style="--value: ${Math.min(100, (s.responses / s.cap) * 100).toFixed(1)}%"></div></div>`
        : ""
    }<p class="survey-headline__rates">${
      s.responses
        ? `<strong>${rate.toFixed(1)}%</strong> of ${num(s.reach)} members asked · <strong>${Math.round((s.responses / started) * 100)}%</strong> of those who started finished · median 1m 40s`
        : `No answers yet. ${num(s.reach)} members will be asked; most answer within a day of seeing it.`
    }</p></div><div class="survey-headline__window">${
      open
        ? `<p class="survey-headline__state${left <= 3 && status === "live" ? " survey-headline__state--soon" : ""}">${status === "paused" ? "Paused" : left <= 0 ? "Expires today" : `Expires in ${left} day${left === 1 ? "" : "s"}`}</p><p class="survey-headline__dates">${esc(s.opensAt)} → <strong>${esc(expires)}</strong></p><div class="progress progress--ink" role="progressbar" aria-label="Time elapsed" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(elapsed)}"><div class="progress__bar" style="--value: ${elapsed.toFixed(1)}%"></div></div><div class="survey-headline__actions"><a class="btn btn--sm" href="extend-expiry.html">${icon("calendarPlus")}Extend</a><a class="btn btn--ghost btn--sm" href="close-early.html">Close now</a></div>`
        : `<p class="survey-headline__state">Closed</p><p class="survey-headline__dates">Ran ${esc(s.opensAt)} → ${esc(statusOverride === "closed" ? "Tue 18 Nov, 11:05" : s.expiresAt)}. Results are kept.</p>`
    }</div></section>`;
    const tabs = `<div class="tabs survey-tabs" role="tablist" aria-label="Results">${[
      { key: "summary", label: "Summary" },
      { key: "responses", label: `Responses <span class="chip__count">${num(s.responses)}</span>` },
    ]
      .map(
        (t) =>
          `<a class="tab" role="tab" href="${tabHref(t.key)}" aria-selected="${tab === t.key}"${tab === t.key ? ' aria-controls="results-panel"' : ""}>${t.label}</a>`,
      )
      .join("")}</div>`;
    const panel =
      tab === "summary"
        ? summary(s, s.responses)
        : s.responses
          ? responses(s, { only })
          : `<div class="empty empty--rule survey-section"><h2 class="empty__title">No responses yet</h2><p class="empty__text">Responses appear here as they arrive, newest first.</p></div>`;
    return `<div class="admin-page admin-page--wide admin-page--record">${head}${note}${headline}${tabs}<div role="tabpanel" id="results-panel" aria-label="${tab === "summary" ? "Summary" : "Responses"}">${panel}</div></div>`;
  }

  function extendDialog({ invalid = false } = {}) {
    return dialog({
      title: "Extend the expiry",
      desc: "Currently ends Fri 21 Nov, 23:59. Members who dismissed it won’t be asked again.",
      body: `<div class="field"><label class="field__label" for="new-expiry">New expiry, Toronto time</label><input class="input" id="new-expiry" type="datetime-local" value="${invalid ? "2025-11-20T23:59" : "2025-11-28T23:59"}" autofocus${invalid ? ' aria-invalid="true" aria-describedby="new-expiry-error new-expiry-help"' : ' aria-describedby="new-expiry-help"'}>${invalid ? '<p class="field__error" id="new-expiry-error">Pick a moment after Fri 21 Nov, 23:59. To end it sooner, use Close now.</p>' : ""}<p class="field__help" id="new-expiry-help">It still closes early at 600 responses. At today’s pace that’s around Fri 21 Nov.</p></div>`,
      footer: `<a class="btn btn--ghost" href="default.html">Cancel</a><a class="btn btn--ink" href="${invalid ? "extend-invalid.html" : "extended.html"}">Extend</a>`,
    });
  }

  function closeDialog() {
    return dialog({
      role: "alertdialog",
      size: "sm",
      title: "Stop collecting answers now?",
      desc: "Members stop seeing it straight away. The 412 responses so far are kept, and the next survey in line takes its place.",
      footer: `<a class="btn btn--ghost" href="default.html">Keep it running</a><a class="btn btn--danger" href="closed-now.html">Close survey</a>`,
    });
  }

  {
    const id = "admin-survey-results";
    const states = ["default", "responses", "responses-unfinished", "anonymous", "short-answers", "paused", "closed", "expired", "no-responses", "actions-menu", "extend-expiry", "extend-invalid", "extended", "close-early", "closed-now", "paused-now", "loading", "error", "not-found"];
    const defs = {
      default: {
        description: "Results of the live Christmas Gala survey: the headline and the summary of each question.",
        body: screen(resultsMain()),
        note: "Magic Patterns frame “Survey Results”. Each question is drawn the way its type reads best: shares for choices, a histogram and net score for 0–10, an average and bars for stars, the latest answers for text. Every bar has its number in text too.",
      },
      responses: {
        description: "The Responses tab, the newest response open.",
        body: screen(resultsMain({ tab: "responses" })),
        note: "A response opens in place to show every answer. Named surveys show the member’s church (see the open questions in README.md).",
      },
      "responses-unfinished": {
        description: "Responses filtered to those started and not finished.",
        body: screen(resultsMain({ tab: "responses", only: "partial" })),
      },
      anonymous: {
        description: "Results of an anonymous survey (Seller experience, Q4).",
        body: screen(resultsMain({ surveyId: "srv_seller_q4" })),
      },
      "short-answers": {
        description: "Results of How did you hear about Jubilee?, with a short answer question.",
        body: screen(resultsMain({ surveyId: "srv_heard" })),
      },
      paused: {
        description: "Results of a paused survey with its note and star rating.",
        body: screen(resultsMain({ surveyId: "srv_photos" })),
      },
      closed: {
        description: "Results of a survey that closed early at its cap (Purpose Tee).",
        body: screen(resultsMain({ surveyId: "srv_tee" })),
      },
      expired: {
        description: "Results of an anonymous survey that expired on schedule (Launch week).",
        body: screen(resultsMain({ surveyId: "srv_launch_nps" })),
      },
      "no-responses": {
        description: "Results just after publishing, before anyone has answered.",
        body: screen(resultsMain({ surveyId: "srv_next", fresh: true }), { overlays: toast("Published. Members start seeing it on their next visit.") }),
      },
      "actions-menu": {
        description: "The More menu open.",
        body: screen(resultsMain({ menu: true })),
      },
      "extend-expiry": {
        description: "The Extend the expiry dialog.",
        body: screen(resultsMain(), { overlays: extendDialog(), modal: true }),
      },
      "extend-invalid": {
        description: "Extend the expiry with a date before the current one.",
        body: screen(resultsMain(), { overlays: extendDialog({ invalid: true }), modal: true }),
      },
      extended: {
        description: "Results after the expiry was extended.",
        body: screen(resultsMain({ expires: "Fri 28 Nov, 23:59" }), { overlays: toast("Extended. It now runs until Fri 28 Nov, 23:59.") }),
      },
      "close-early": {
        description: "The confirmation before closing the survey early.",
        body: screen(resultsMain(), { overlays: closeDialog(), modal: true }),
        note: "An alert dialog: focus starts on Keep it running, so Enter never closes a survey by accident.",
      },
      "closed-now": {
        description: "Results after the survey was closed early.",
        body: screen(resultsMain({ status: "closed" }), { overlays: toast("Survey closed. The 412 responses are kept.") }),
      },
      "paused-now": {
        description: "Results after Pause.",
        body: screen(resultsMain({ status: "paused" }), { overlays: toast("Paused. Members stop seeing it until you resume.", true) }),
      },
      loading: { description: "Results while they load.", body: screen(loadingPage("Survey results")) },
      error: { description: "Results when they fail to load.", body: screen(errorPage("these results", "srv-results-503", "Survey results")) },
      "not-found": { description: "Results of a survey that doesn’t exist.", body: screen(notFoundPage()) },
    };
    emit({ id, title: "Admin survey results", route: "/surveys/:id (admin application)", states, defs, notApplicable: { empty: "A survey with no answers is the no-responses state." } });
  }

  return built;
}

// Builds the mocks of the survey a member answers (docs/mocks/pages/survey) from the Magic Patterns
// frame "Survey" (Jubilee App), and the survey card it opens from on Home (the "survey-card" state
// of docs/mocks/pages/browse, frame "Browse"). Every state shares one layout, so they are generated:
// change this script or tools/admin-mocks/surveys-data.mjs, never the generated files.
//
//   node tools/survey-mocks/build.mjs
//
// It writes the pages, replaces the "survey" entry in docs/mocks/manifest.json, adds "survey-card"
// to "browse", and leaves the rest of the mocks alone. Run the mocks checker with --write
// afterwards to refresh index.html and the coverage matrix.
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SAMPLE, getSurvey } from "../admin-mocks/surveys-data.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const MOCKS = join(ROOT, "docs", "mocks");
const PAGES = join(MOCKS, "pages");
const ID = "survey";
const TITLE = "Survey";
const HOME = "../browse/survey-card.html";
const REQ = "L2-333 L2-334 L2-335 L2-336";

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const ICONS = {
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  arrowLeft: '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  warning: '<path d="M12 4 2.5 20h19zM12 10v4M12 17h.01"/>',
  star: '<path d="M12 3l2.4 6.4 6.7.2-5.3 4.2 1.8 6.6L12 16.6l-5.6 3.8 1.8-6.6-5.3-4.2 6.7-.2z"/>',
};
const icon = (name) =>
  `<svg class="icon" aria-hidden="true" viewBox="0 0 24 24">${ICONS[name]}</svg>`;
const MARK =
  '<svg class="brand-mark" aria-hidden="true" viewBox="0 0 100 100"><path class="brand-mark__j" d="M60 8V60A20 20 0 0 1 20 60V38"/><path class="brand-mark__bar" d="M36 27H84"/></svg>';

const gala = getSurvey("srv_gala25");
const worship = getSurvey("srv_worship");

// ---------------------------------------------------------------- the frame's pieces

/** The focused header: the mark, how far along (or what this is), and a way out. */
function header({ survey = gala, index = null } = {}) {
  const qs = survey.questions;
  const middle =
    index === null
      ? '<span class="survey-flow__label">A few questions from Jubilee</span>'
      : `<div class="survey-flow__progress"><ol class="survey-flow__steps" aria-hidden="true">${qs
          .map((_, i) => `<li data-step="${i < index ? "done" : i === index ? "current" : "todo"}"></li>`)
          .join("")}</ol><span class="survey-flow__count"><span class="visually-hidden">Question </span>${index + 1} of ${qs.length}</span></div>`;
  const out =
    index === null
      ? `<a class="btn btn--ghost btn--icon" href="${HOME}" aria-label="Close">${icon("x")}</a>`
      : `<a class="btn btn--ghost btn--icon" href="${HOME}" aria-label="Save and finish later" title="Save and finish later">${icon("x")}</a>`;
  return `<header class="survey-flow__head"><div class="survey-flow__bar"><span class="survey-flow__home">${MARK}</span>${middle}${out}</div></header>`;
}

/** The answer control for one question, as the frame's AnswerInput draws it. */
function answer(q, value, { invalid = false, describedBy = "" } = {}) {
  const name = `answer-${q.id}`;
  if (q.type === "single" || q.type === "yesno" || q.type === "dropdown") {
    return `<div class="answer-choices${q.type === "yesno" ? " answer-choices--pair" : ""}"${invalid ? ' data-state="invalid"' : ""}>${(q.options ?? [])
      .map(
        (o) =>
          `<label class="answer-choice"><input type="radio" name="${name}" value="${esc(o)}"${value === o ? " checked" : ""}${invalid ? ' aria-invalid="true"' : ""}${describedBy ? ` aria-describedby="${describedBy}"` : ""}>${esc(o)}</label>`,
      )
      .join("")}</div>`;
  }
  if (q.type === "multi") {
    const picked = Array.isArray(value) ? value : [];
    const full = picked.length >= 3;
    return `<div class="answer-choices">${(q.options ?? [])
      .map((o) => {
        const on = picked.includes(o);
        return `<label class="answer-choice"><input type="checkbox" name="${name}" value="${esc(o)}"${on ? " checked" : ""}${!on && full ? " disabled" : ""} aria-describedby="tally">${esc(o)}</label>`;
      })
      .join("")}</div><p class="answer-choices__tally" id="tally" aria-live="polite">${picked.length} of 3 picked${full ? ". Unpick one to choose another." : ""}</p>`;
  }
  if (q.type === "scale" && q.scale) {
    const pts = Array.from({ length: q.scale.max - q.scale.min + 1 }, (_, i) => q.scale.min + i);
    return `<div class="score-scale score-scale--eleven">${pts
      .map(
        (p) =>
          `<label class="score-scale__option"><input type="radio" name="${name}" value="${p}"${value === p ? " checked" : ""}>${p}${p === q.scale.min ? `<span class="visually-hidden">, ${esc(q.scale.minLabel)}</span>` : p === q.scale.max ? `<span class="visually-hidden">, ${esc(q.scale.maxLabel)}</span>` : ""}</label>`,
      )
      .join("")}</div><div class="score-scale__ends" aria-hidden="true"><span>${q.scale.min} · ${esc(q.scale.minLabel)}</span><span>${esc(q.scale.maxLabel)} · ${q.scale.max}</span></div>`;
  }
  if (q.type === "rating") {
    const v = typeof value === "number" ? value : 0;
    return `<div class="star-scale star-scale--lg"><div class="star-scale__stars">${[1, 2, 3, 4, 5]
      .map(
        (n) =>
          `<label class="star-scale__star"><input type="radio" name="${name}" value="${n}"${v === n ? " checked" : ""}><svg class="icon" aria-hidden="true" viewBox="0 0 24 24">${ICONS.star}</svg><span class="visually-hidden">${n} star${n === 1 ? "" : "s"}</span></label>`,
      )
      .join("")}</div></div>`;
  }
  const text = typeof value === "string" ? value : "";
  return `<div class="field"><textarea class="textarea" id="answer-text" name="${name}" rows="${q.type === "long" ? 5 : 1}" maxlength="1000" placeholder="Type your answer" aria-labelledby="q-title" aria-describedby="q-help answer-count">${esc(text)}</textarea><p class="field__counter" id="answer-count">${text.length} / 1000</p></div>`;
}

/**
 * One question of the flow: the question as the page's heading, its answer, Back, Skip when it is
 * optional and unanswered, and Next (or "Send answers" on the last one).
 */
function question({ survey = gala, id, value, invalid = false, sending = false, failed = false, back, next, skip }) {
  const qs = survey.questions;
  const q = qs.find((x) => x.id === id);
  const index = qs.indexOf(q);
  const last = index === qs.length - 1;
  const answered =
    value !== undefined && !(Array.isArray(value) && !value.length) && !(typeof value === "string" && !value.trim());
  const help = q.help ?? (q.required ? "" : "Optional. Skip it if nothing comes to mind.");
  const describedBy = [help ? "q-help" : "", invalid ? "q-error" : ""].filter(Boolean).join(" ");
  const ready = !q.required || answered;
  const nextLabel = sending
    ? '<span class="spinner spinner--sm" aria-hidden="true"></span>Sending…'
    : last
      ? "Send answers"
      : "Next";
  const nextAttrs = sending || !ready ? ' aria-disabled="true"' : "";
  const nextBtn = `<a class="btn btn--primary btn--lg survey-flow__next" href="${next}" role="button"${nextAttrs}>${nextLabel}</a>`;
  const skipBtn =
    !q.required && !answered && !last && skip ? `<a class="btn btn--ghost" href="${skip}">Skip</a>` : "";
  const alert = failed
    ? `<div class="alert alert--danger survey-flow__alert" role="alert">${icon("warning")}<div class="alert__body"><span class="alert__title">Your answers didn’t send</span>Nothing is lost: they’re kept on this device. Check your connection and send them again.</div></div>`
    : "";
  return `${header({ survey, index })}<main id="main" class="survey-flow__main"><form class="survey-flow__form" action="${next}"${sending ? ' aria-busy="true"' : ""}>${alert}<fieldset class="survey-flow__question"${describedBy ? ` aria-describedby="${describedBy}"` : ""}><legend class="survey-flow__q"><h1 class="survey-flow__legend" id="q-title">${esc(q.title)}</h1></legend>${help ? `<p class="survey-flow__help" id="q-help">${esc(help)}</p>` : ""}<div class="survey-flow__answer">${answer(q, value, { invalid, describedBy: invalid ? "q-error" : "" })}</div>${invalid ? `<p class="field__error survey-flow__error" id="q-error" role="alert">Choose an answer to go on.</p>` : ""}</fieldset><div class="survey-flow__actions"><a class="btn btn--ghost" href="${back}"${sending ? ' aria-disabled="true"' : ""}>${icon("arrowLeft")}Back</a><div class="survey-flow__ahead">${skipBtn}${nextBtn}</div></div></form></main>`;
}

/** A screen that is only words and one way forward: the intro, thanks, closed, and the rest. */
function end({ badge, badgeTone = "", title, lead, facts = "", cta }) {
  return `${header()}<main id="main" class="survey-flow__main"><div class="survey-flow__end">${badge ? `<span class="survey-flow__badge${badgeTone ? ` survey-flow__badge--${badgeTone}` : ""}">${icon(badge)}</span>` : ""}<h1 class="survey-flow__title">${esc(title)}</h1><p class="survey-flow__lead">${lead}</p>${facts}<div class="survey-flow__cta">${cta}</div></div></main>`;
}

const BACK_HOME = `<a class="btn btn--ink btn--lg" href="${HOME}">Back to Jubilee</a>`;

const FACTS = `<dl class="survey-flow__facts"><div><dt>Length</dt><dd>${gala.questions.length} questions, about 2 minutes</dd></div><div><dt>Open until</dt><dd>${esc(gala.expiresAt.replace(", 23:59", ""))}</dd></div><div><dt>Who sees it</dt><dd>${gala.anonymous ? "Anonymous to our team" : "Our team, with your name"}</dd></div></dl>`;
const GUEST_FACTS = `<dl class="survey-flow__facts"><div><dt>Length</dt><dd>${gala.questions.length} questions, about 2 minutes</dd></div><div><dt>Open until</dt><dd>${esc(gala.expiresAt.replace(", 23:59", ""))}</dd></div><div><dt>Account</dt><dd>None needed</dd></div></dl>`;
const INTRO_LEAD =
  "We’re planning the Christmas Gala on Saturday 13 December, and we’d rather plan it with you. Your answers decide what’s on the night.";

function loading() {
  return `${header()}<main id="main" class="survey-flow__main" aria-busy="true"><div class="survey-flow__end"><span class="visually-hidden" role="status">Loading the survey…</span><h1 class="visually-hidden">${esc(TITLE)}</h1><div aria-hidden="true"><span class="skeleton skeleton--h1"></span><span class="skeleton skeleton--h1 skeleton--w50"></span><span class="skeleton skeleton--text skeleton--w70"></span><span class="skeleton skeleton--text skeleton--w50"></span><div class="survey-flow__cta"><span class="skeleton skeleton--btn"></span></div></div></div></main>`;
}

// ---------------------------------------------------------------- states

const STATES = {
  intro: {
    description: "The survey’s first screen: what it is, how long it takes and who sees the answers.",
    body: end({
      title: gala.title,
      lead: esc(INTRO_LEAD),
      facts: FACTS,
      cta: `<a class="btn btn--primary btn--lg" href="question.html">Start</a><a class="btn btn--ghost btn--lg" href="${HOME}">Not now</a>`,
    }),
    note: "Magic Patterns frame “Survey” (Jubilee App). It opens from the card on Home (<a href=\"../browse/survey-card.html\">browse/survey-card</a>), the email or the push. The header has no navigation: only the mark and a way out.",
  },
  question: {
    description: "Question 1, a required single choice, with nothing chosen yet.",
    body: question({ id: "q1", back: "intro.html", next: "invalid.html" }),
    note: "Next looks unavailable until a required question has an answer, as in the design, but stays focusable: pressing it explains why (<a href=\"invalid.html\">invalid</a>). Each step slides 16 px in its direction over 200 ms; with reduced motion it only fades.",
  },
  invalid: {
    description: "Question 1 after Next was pressed with nothing chosen.",
    body: question({ id: "q1", invalid: true, back: "intro.html", next: "invalid.html" }),
    note: "The message is announced and tied to the choices; focus moves to the first choice. Choosing one clears it.",
  },
  multi: {
    description: "Question 2, several choices, with two picked.",
    body: question({ id: "q2", value: SAMPLE.q2, back: "question.html", next: "scale.html" }),
  },
  "multi-full": {
    description: "Question 2 with three picked: the rest are unavailable until one is unpicked.",
    body: question({ id: "q2", value: ["Live worship", "Seller market", "Food trucks"], back: "question.html", next: "scale.html" }),
    note: "The count is a polite live region, so it is read as each choice is picked.",
  },
  scale: {
    description: "Question 3, a 0–10 scale, with 8 chosen.",
    body: question({ id: "q3", value: SAMPLE.q3, back: "multi.html", next: "optional.html" }),
    note: "Six to a row on a phone, all eleven in a row from 640 px. The arrow keys move along the scale.",
  },
  optional: {
    description: "Question 4, an optional long answer, empty, with Skip.",
    body: question({ id: "q4", value: "", back: "scale.html", next: "last.html", skip: "last.html" }),
    note: "A member who answered “Not this year” to question 1 comes straight here (the skip rule); the progress shows 4 of 5 either way.",
  },
  last: {
    description: "Question 5, the last, answered: the button sends the answers.",
    body: question({ id: "q5", value: SAMPLE.q5, back: "optional.html", next: "sending.html" }),
  },
  sending: {
    description: "The answers sending.",
    body: question({ id: "q5", value: SAMPLE.q5, sending: true, back: "optional.html", next: "done.html" }),
  },
  failed: {
    description: "The answers failed to send; they are kept and can be sent again.",
    body: question({ id: "q5", value: SAMPLE.q5, failed: true, back: "optional.html", next: "sending.html" }),
    note: "The alert takes focus. Send answers tries again with the same answers.",
  },
  done: {
    description: "Thanks, after the answers are sent.",
    body: end({
      badge: "check",
      title: "Thank you, Joanna.",
      lead: "We read every answer, and we’ll share what we heard in the next community update. We’ll email you the moment Gala tickets go on sale.",
      cta: BACK_HOME,
    }),
    note: "The second sentence shows only when the member said yes to the ticket email (question 5). The thanks comes from the builder’s “After the last question”.",
  },
  rating: {
    description: "A star rating question from another survey (Worship Night check-in), four stars chosen.",
    body: question({ survey: worship, id: "q1", value: 4, back: "intro.html", next: "question.html" }),
  },
  expired: {
    description: "The survey has closed.",
    body: end({
      badge: "clock",
      badgeTone: "quiet",
      title: "This survey has closed",
      lead: "It stopped taking answers on Friday 21 November. Thanks for wanting to help: you’ll see what members told us in the next community update.",
      cta: BACK_HOME,
    }),
  },
  "already-answered": {
    description: "The member already answered this survey.",
    body: end({
      badge: "check",
      title: "You’ve already answered, Joanna",
      lead: "You sent your answers on Tuesday 18 November. Each member answers once, so every voice counts the same.",
      cta: BACK_HOME,
    }),
  },
  "guest-intro": {
    description: "The intro of a survey shared by link, opened by someone who isn’t logged in.",
    body: end({
      title: gala.title,
      lead: esc(INTRO_LEAD),
      facts: GUEST_FACTS,
      cta: `<a class="btn btn--primary btn--lg" href="question.html">Start</a><a class="btn btn--ghost btn--lg" href="../sign-in/default.html">Log in to answer as a member</a>`,
    }),
    note: "Drawn from the intro, for a survey whose audience is “Anyone with the link” (admin-survey-builder/audience-link). A guest answers the same questions; nothing asks for their name or e-mail. The questions are the member’s states.",
  },
  "guest-done": {
    description: "Thanks to a guest, after the answers are sent.",
    body: end({
      badge: "check",
      title: "Thank you.",
      lead: "We read every answer, and we’ll share what we heard in the next community update. Jubilee is Toronto’s Christian marketplace: join free to find Christian-owned businesses and hear about gatherings like this one.",
      cta: `<a class="btn btn--ink btn--lg" href="../sign-up/default.html">Join Jubilee</a><a class="btn btn--ghost btn--lg" href="../browse/signed-out.html">Look around first</a>`,
    }),
    note: "A guest’s thanks has no name and no ticket line: Jubilee has no address to e-mail them.",
  },
  "guest-already-answered": {
    description: "A guest opens a link survey they already answered on this device.",
    body: end({
      badge: "check",
      title: "You’ve already answered",
      lead: "Answers were sent from this device on Tuesday 18 November. Each person answers once, so every voice counts the same.",
      cta: `<a class="btn btn--ink btn--lg" href="../browse/signed-out.html">Look around Jubilee</a>`,
    }),
  },
  "signed-out": {
    description: "A survey for members, opened from a link by someone who isn’t logged in.",
    body: end({
      title: gala.title,
      lead: `${esc(INTRO_LEAD)} Surveys are for Jubilee members, so log in first: each member answers once.`,
      facts: FACTS,
      cta: `<a class="btn btn--primary btn--lg" href="../sign-in/default.html">Log in to answer</a><a class="btn btn--ghost btn--lg" href="../sign-up/default.html">Join Jubilee</a>`,
    }),
    note: "Drawn from the intro; the design has no signed-out frame. A survey whose audience is members asks a guest to log in; after logging in they come back here to Start. A link survey opens on guest-intro instead.",
  },
  "not-found": {
    description: "A survey link that leads nowhere.",
    body: end({
      badge: "search",
      badgeTone: "quiet",
      title: "We can’t find that survey",
      lead: "The link may be mistyped, or the survey was removed. Surveys from Jubilee always reach you in the app or by email.",
      cta: BACK_HOME,
    }),
  },
  loading: {
    description: "The survey while it loads.",
    body: loading(),
  },
};
const ORDER = Object.keys(STATES);

function page(state, { description, body, note }) {
  return `<!doctype html>
<html lang="en-CA">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${TITLE} · ${state} — Jubilee mocks</title>
<meta name="mock:kind" content="page">
<meta name="mock:screen" content="${ID}">
<meta name="mock:state" content="${state}">
<meta name="mock:requirements" content="${REQ}">
<meta name="description" content="${esc(description)}">
<link rel="stylesheet" href="../../../design-system/tokens/tokens.css">
<link rel="stylesheet" href="../../../design-system/assets/components.css">
<link rel="stylesheet" href="../../assets/mock.css">
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>
<div class="survey-flow">${body}</div>
${note ? `<aside class="mock-note mock-note--float" aria-label="Mock note">${note}</aside>` : ""}<div class="toast-region" role="status" aria-live="polite"></div>
<nav class="mock-bar" aria-label="Mock navigation">
  <a class="mock-bar__home" href="../../index.html" aria-label="All mocks">⌂</a>
  <span class="mock-bar__screen">${TITLE}</span>
  <ul class="mock-bar__states">${ORDER.map((s) => `<li><a href="${s}.html"${s === state ? ' aria-current="page"' : ""}>${s}</a></li>`).join("")}</ul>
  <button type="button" data-theme-toggle aria-pressed="false">☾ Dark</button>
  <button type="button" data-chrome-toggle aria-label="Hide mock chrome">×</button>
</nav>
<script src="../../assets/mock.js"></script>
</body>
</html>
`;
}

// ---------------------------------------------------------------- Home: the survey card

const CARD_STATE = "survey-card";
const CARD = `<section class="survey-card" aria-labelledby="survey-card-title"><div class="survey-card__body"><p class="survey-card__meta">${gala.questions.length} questions, about 2 minutes · open until ${esc(gala.expiresAt.replace(", 23:59", ""))}</p><h2 class="survey-card__title" id="survey-card-title">${esc(gala.title)}</h2></div><div class="survey-card__actions"><a class="btn btn--primary" href="../survey/intro.html">Answer<span class="visually-hidden"> the survey</span></a><a class="btn btn--ghost btn--icon" href="default.html" aria-label="Not now">${icon("x")}</a></div></section>`;

function buildBrowseCard() {
  const dir = join(PAGES, "browse");
  let html = readFileSync(join(dir, "default.html"), "utf8");
  const anchor = /<div class="container page">\r?\n/;
  if (!anchor.test(html)) throw new Error("browse/default.html: the page container was not found");
  html = html
    .replace(anchor, (m) => `${m}${CARD}\n`)
    .replace("<title>Browse · default — Jubilee mocks</title>", `<title>Browse · ${CARD_STATE} — Jubilee mocks</title>`)
    .replace('<meta name="mock:state" content="default">', `<meta name="mock:state" content="${CARD_STATE}">`)
    .replace(/<meta name="description" content="[^"]*">/, '<meta name="description" content="Browse home with the survey card the Jubilee team sends to Home.">')
    .replace('<li><a href="default.html" aria-current="page">default</a></li>', '<li><a href="default.html">default</a></li>');
  // The card's own mock note replaces whatever note default carries.
  html = html.replace(/<aside class="mock-note[^>]*>[\s\S]*?<\/aside>/, "");
  html = html.replace(
    '<div class="toast-region"',
    '<aside class="mock-note mock-note--float" aria-label="Mock note">The survey card (Magic Patterns frame “Browse”, its <code>survey</code> arg): shown on Home, above Featured, while a survey the member qualifies for is running. Answer opens the <a href="../survey/intro.html">survey</a>; × dismisses it for good, and it counts as shown for the delivery rules.</aside><div class="toast-region"',
  );
  // Every browse state lists its siblings in the mock bar: add this one where it is missing.
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".html"))) {
    const path = join(dir, f);
    const src = f === `${CARD_STATE}.html` ? null : readFileSync(path, "utf8");
    if (src && !src.includes(`href="${CARD_STATE}.html"`))
      writeFileSync(path, src.replace(/(<ul class="mock-bar__states">[\s\S]*?)(<\/ul>)/, `$1<li><a href="${CARD_STATE}.html">${CARD_STATE}</a></li>$2`));
  }
  html = html.replace(/(<ul class="mock-bar__states">[\s\S]*?)(<\/ul>)/, (m, a, b) =>
    a.includes(`href="${CARD_STATE}.html"`) ? m : `${a}<li><a href="${CARD_STATE}.html">${CARD_STATE}</a></li>${b}`,
  );
  html = html.replace(`<li><a href="${CARD_STATE}.html">`, `<li><a href="${CARD_STATE}.html" aria-current="page">`);
  writeFileSync(join(dir, `${CARD_STATE}.html`), html);
}

// ---------------------------------------------------------------- main

function main() {
  const dir = join(PAGES, ID);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  for (const state of ORDER) writeFileSync(join(dir, `${state}.html`), page(state, STATES[state]));
  buildBrowseCard();

  const path = join(MOCKS, "manifest.json");
  const manifest = JSON.parse(readFileSync(path, "utf8"));
  const entry = {
    id: ID,
    kind: "page",
    title: TITLE,
    route: "/surveys/:slug",
    states: ORDER,
    requirements: REQ.split(" "),
    not_applicable: {
      default: "A survey always starts on its intro; intro is the default state.",
      empty: "A survey cannot be published without questions (the builder starts every draft with three).",
      error: "A survey that fails to load shows the app’s error page (pages/server-error); failing to send is the failed state.",
    },
  };
  const list = manifest.screens.filter((s) => s.id !== ID);
  const at = list.findIndex((s) => s.id === "write-review");
  list.splice(at < 0 ? list.length : at + 1, 0, entry);
  const browse = list.find((s) => s.id === "browse");
  if (browse && !browse.states.includes(CARD_STATE)) browse.states.push(CARD_STATE);
  manifest.screens = list;
  writeFileSync(path, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`survey mocks: ${ORDER.length} states, plus browse/${CARD_STATE}`);
}

main();

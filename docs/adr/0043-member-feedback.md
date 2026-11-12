# 0043. Member feedback: one feedback record, a corner dialog, check-ins by id, and what is deferred

## Status

Accepted, 11 November 2026. Applies ADR 0009 (tests without a database), ADR 0035 (presentation
in the components library), ADR 0036 (component parity) and ADR 0039 (photos checked on the
device, cleaned on the server).

## Context

The Magic Patterns design gained a "Feedback" frame and a "Feedback Review" canvas
(`docs/design-reference/magic-patterns/README.md`): a launcher on every screen that opens a short
panel (rate, report a bug, kudos), one question after a key moment, and a feedback page with the
member's past feedback, its status and the team's reply. L1-029 and L2-210 to L2-214 require it.

The frame is a prototype. It shows statuses and replies that somebody must write, kudos that
appear on a business page, a screenshot the panel takes of the screen, and sample values
("JB-1042", "Safari on iPhone 14", "1.4.2"). Each needs a decision before it is built.

## Decision

- **One record, four kinds.** `Feedback` (Domain) holds a rating, a bug report, kudos or a moment
  check-in, told apart by `Kind`. The fields of the other kinds stay null. One table keeps "Your
  feedback" one query and the later admin screens one list. The four area scores are four nullable
  columns: the areas are fixed, and a table of scores would buy nothing.
- **The endpoints follow the kinds.** `POST /api/feedback/ratings`, `POST /api/feedback/bug-reports`
  and `POST /api/feedback/kudos` create; `GET /api/feedback` lists the caller's own;
  `GET /api/feedback/businesses` lists the businesses the caller may send kudos to;
  `POST /api/feedback/screenshots` stores a picture; `PUT /api/feedback/check-ins/{id}` creates or
  replaces a check-in. Every one takes the member from the session and nothing from the body
  (L2-133). Creation honours `Idempotency-Key` as reports do (L2-132).
- **A check-in is addressed by an id the app makes.** The confirmation makes one id; choosing a
  score, choosing another and sending the note are all the same `PUT`. It needs no idempotency
  key, cannot be stored twice, and a failure is silent (L2-211 criterion 6).
- **Status and replies are stored and shown; writing them is deferred.** `Feedback.Status`
  (`Received`, `Read`, `InProgress`, `Fixed`) and `Feedback.Reply` exist, `GET /api/feedback`
  returns them, and a new record starts at `Received`. The admin screens that change them come with
  the admin work. Until then every record says "Received". The domain methods (`MarkRead`,
  `StartWork`, `MarkFixed`, `ReplyWith`) exist so the tests can show the read side.
- **Kudos for a business are stored with the consent; showing them is deferred.** The business
  must be public and one the member sent a request or a message to: kudos are for "someone you
  hired or bought from", and the rule keeps the picker short and keeps strangers from writing on a
  business. The consent reads "Jubilee may show this on their page with my first name" and the
  confirmation says the note was kept, because nothing shows it on the page yet.
- **A bug report's reference is `FB-` and six characters** drawn at random from the 31 letters and
  digits that cannot be misread (no `0`, `1`, `I`, `O`, `L`), with a unique index and a retry on a
  clash. It is not a running number: the tests run on the InMemory provider (ADR 0009), which has
  no sequence, and a running number tells a member how many reports there are. It does not start
  with `JB-`, which the error references use.
- **What a bug report carries.** The screen is the `page` of the route the member was on, sent by
  the app. The browser and device are the request's `User-Agent` header, read by the API: it is
  what the server would log anyway and the app cannot name a device more truthfully. The version is
  `environment.version` of the app, set at release. The member is told all three before sending.
- **Screenshots are uploaded on the page, cleaned on the server and never served to the app.** The
  page reuses `PhotoAttachmentService` (JPEG or PNG by its bytes, shrunk to 5 MB) and uploads each
  picture when the report is sent; the API cleans it with `ImageSanitizer` (L2-138) and stores it in
  `FeedbackScreenshot`. A report names up to three by id. No endpoint returns one: staff will read
  them in the admin application.
- **The panel does not capture the screen.** "Include a screenshot of this screen" needs either
  the screen-capture permission prompt, which phone browsers do not offer, or a library that redraws
  the page and gets it wrong. The control is left out; the page's "Add screenshots" stays. It is a
  known difference from the reference.
- **The panel is a CDK dialog in a new `corner` placement of `jb-dialog`.** A bottom sheet under
  640 px and a card in the bottom right corner from there. It is modal at every width, with the
  scrim, so focus is held and Escape and the scrim close it as in every other dialog (L2-130). The
  reference has no scrim on a desktop; that is a known difference.
- **The launcher lives in the app shell.** `App` shows `jb-feedback-launcher` when the route's
  `shell` is `app`, a member is signed in and the `page` is not `feedback`. It is fixed at the
  bottom right, above the tab bar on a phone, below dialogs and toasts.
- **The page is `/feedback/:tab`** (`rate`, `bug`, `kudos`), behind `memberGuard`, with
  `shell: 'app'`, `page: 'feedback'` and `section: null`. `/feedback` redirects to
  `/feedback/rate`. The sent state is a state of the page, not an address.
- **New presentation is in the components library.** `feedback-launcher`, `star-scale`,
  `score-scale`, `moment-check`, `feedback-history` and `file-list` are new; the tab list gains a
  `segmented` look with icons, the dialog its `corner` placement, the icon set `star`, `bug`,
  `users` and `feedback`. Chips, choice cards, fields, alerts and buttons are reused. Stars and
  scores are native radios in a group, so the arrow keys and assistive technology work without
  script (ADR 0035, L2-158).
- **Consent is never ticked for the member.** "You can message me about this" and the consent to
  show kudos start unticked (L2-149), unlike the frame.
- **Limits.** Ten ratings, bug reports and kudos per member per hour, thirty screenshots and
  thirty check-ins, counted in the handler as reports are (L2-137).
- **Account data.** Feedback is in the data download and is deleted with the account
  (L2-017, L2-018).

## Consequences

- A member can send feedback today and sees "Received" until the admin screens exist. The copy
  promises nothing more: no "we'll message you when it's fixed", no "it will appear on their page".
- Deferred, each its own later change: the admin screens to read, triage and reply; showing kudos
  on a business page and telling the business; notifying the member of a status change or a reply;
  feedback in the marketing site and the admin application; reporting over ratings.
- `docs/design-reference/magic-patterns/README.md` lists every difference from the frame. The
  parity specs of the new components compare with the mocks only until the owner exports the
  canvas.
- One migration adds `Feedback` and `FeedbackScreenshots`; `jubilee migrate` applies it.

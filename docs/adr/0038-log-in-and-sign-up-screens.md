# 0038. Log in and Sign up screens: the Magic Patterns frame, its words, and what stays as it was

## Status

Accepted, 11 November 2026. Applies ADR 0035 (presentation in `components`) and ADR 0036
(component parity) to the two screens. Changes none of ADR 0012, ADR 0013 or ADR 0037: joining,
sessions and the Google flow behave as before. Amended by ADR 0041, 12 November 2026: the church
reference page is removed, so the bare frame serves eleven pages, and Sign up marks two optional
fields, "Home church" and "Home church address".

## Context

The Magic Patterns design, which trumps the mocks and the design system, now has a Sign up screen
and a Log in screen (`docs/design-reference/magic-patterns/sign-up-*.png`, `log-in-*.png`). They
differ from `/join` and `/sign-in` in layout, in order and in words: a dark brand panel beside the
form from 1024 px, the Google button first, a show-password button, "Log in" where the product
says "Sign in", "Email" where it says "E-mail".

The design shows each screen once: light theme, ready to fill in, at the widths it was captured.
The product has nine states of each, two themes, and ten more pages on the same bare frame
(join agreement, forgot and reset password, verify e-mail, confirm e-mail change, church
reference, maintenance, offline, server error, session expired). The frame is still hand-written
in each of the twelve pages with global classes (issue #60), and the mark and wordmark are drawn
in three places (issue #59).

## Decision

- **The two screens take the design's words exactly.** "Welcome back", "Log in to message
  businesses and manage your listing.", "Continue with Google", "or use email", "Email",
  "Forgot password?", "Keep me logged in", "Log in", "New to Jubilee? Create a free account";
  "Join Jubilee", "Sign up with Google", "I am 18 or older and agree to Jubilee’s statement of
  faith and terms.", "Create account", "Already on Jubilee? Log in". L2-001, L2-002, L2-003,
  L2-006, L2-010 and L2-126 quote them, and L2-187 describes the shared frame.
- **Nothing else is renamed.** The routes stay `/sign-in` and `/join` (they are in e-mails, in the
  Google redirect of ADR 0037 and in bookmarks), the `data-page` values stay `sign-in` and
  `sign-up`, and the requirement titles keep "Sign in" and "Join". These still say "Sign in",
  "Join free" or "E-mail" and are left for one later change of vocabulary across the product: the
  top bar, the sign-in-required dialog, the session-expired page, the welcome page and the "New
  here?" panel, "Back to sign in" on the forgot-password page, the marketing site, every e-mail,
  and every message of these two screens that the design does not show ("Check your e-mail",
  "Enter the e-mail address you joined with…", the Google notices). Of those messages only the
  word that names the action changes: "Log in instead, or use another address."
- **"Keep me logged in" stays unticked until the visitor ticks it.** The design draws it ticked,
  as the mock always has, to show the state. A ticked default would give every visitor a 30-day
  session (L2-010), on a shared computer too; the safe default stays.
- **Only the optional field is marked on Sign up.** "Home church (optional)" as designed; the
  four required controls carry `required`, so assistive technology announces them, and no
  "(required)" text. L2-126 says so. Log in never showed markers.
- **One frame component, two looks.** `jb-auth-layout` is the frame of all twelve bare pages
  (issue #60). By default it is the single centred card those pages have today, unchanged to the
  pixel. With `split` it is the designed frame, used by Log in and Sign up only: under 1024 px the
  lockup above a card, from 1024 px the brand panel beside the form. The other ten pages are not
  redesigned here; the design does not show them.
- **The frame owns its heading.** `heading` and `lead` are inputs, so the frame styles the title
  itself instead of reaching into the page with a global `.auth-card h1` rule. A state page whose
  title belongs to `jb-empty-state` raises that title through the knob `--jb-empty-title-size`.
- **Companions of the frame.** `jb-lockup` (issue #59) draws the mark and the wordmark, as a link
  or as text, at three sizes and on ink; the top bar and the marketing site move to it with that
  issue. `jb-divider-text` is the "or use email" rule. `a[jb-auth-link]` is the link under the
  form. `jb-password-input` wraps a password control and adds the show-password button.
  `svg[jb-google-mark]` is Google's "G".
- **Show password.** The button is named for what it will do, "Show password" then "Hide
  password", rather than carrying `aria-pressed` under one name: a screen reader then says the
  same as the sighted label would. It is `type="button"`, keeps focus, changes only the `type`
  of the control and never clears the value. Showing the password does not survive a submit that
  fails: the value itself is cleared then (L2-126).
- **The Google mark is Google's.** The four-colour "G" is used unaltered, at 20 px, to the left of
  the label, on the neutral button, as Google's sign-in branding guidelines ask. Its four colours
  are Google's and are the only colour values in the library that are not tokens; they are
  attributes of the SVG, not rules of a stylesheet.
- **States the design does not show are derived, not invented.** Loading, error, invalid,
  submitting, success and the three Google notices keep the content of their existing mocks,
  inside the new frame. The dark theme reads the same roles as everywhere: the brand panel is
  `--color-bg-brand`, ink in both themes; the form side is `--color-bg-surface`. The 768 px
  layout is the phone layout with the card's wider padding, as the design's own 640 px step.
- **Tokens: none added.** Sizes come from the existing scale. Two values the scale lacks are
  composed from it: the 52 px wordmark of the panel (`--font-size-5xl` plus `--space-1`) and the
  fluid headline and panel padding, clamped between two tokens so that they meet the design at
  1280 px and at 1024 px.
- **Known differences stay known.** The controls keep the product's 44 px height, 10 px radius,
  14 px labels, drawn checkbox and system text face; the card keeps `--radius-xl` (20 px, the
  design has 24 px); the link under the form keeps the product's underline. Correcting them
  changes every form of the product and is the owner's decision (ADR 0036). They are rows of the
  "Known differences" table of `docs/design-reference/magic-patterns/README.md`.

## Consequences

- A visitor meets "Log in" on the screen and "Sign in" on the way to it until the vocabulary
  change is made. The requirement documents carry both, each where it is shown.
- Issue #60 is closed by this change: the global `auth-*` and `divider-text` rules leave
  `ui.css`, and the twelve pages project only their content. Issue #59 is advanced (the component
  exists and the bare pages use it), not closed. Issue #84 is advanced by the `eye` and `eye-off`
  icons.
- Parity against the reference is strict where the product already matches the design (the
  lockup, the panel headline, the divider) and declared known where the table above says so.
- A password manager fills the control as before: the control stays one `input`, with its
  `autocomplete` value, whether shown or hidden.

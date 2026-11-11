# 0013. The marketing site is a second, static Angular application

## Status

Accepted, 11 November 2026.

## Context

L1-026 asks for a public marketing site separate from the app. The design reference (Magic
Patterns, "Marketing Site") is one page with fixed copy, five business cards, a glimpse of a
search and the pitch film. The app (`frontend/projects/jubilee`) resolves a session before it
renders, has an ink top bar, a tab bar and both themes; none of that belongs on the marketing
page. ADR 0009 forbids the e2e suite from reaching an API.

## Decision

- The site is `frontend/projects/marketing`, an Angular application named `marketing` in the
  existing workspace. It follows the workspace rules (file per type, `jb-*` selectors, BEM
  classes shared with its mock, tokens by role) and imports only tokens, the font and atoms from
  `components`. `npm run start:marketing` serves it on port 4201; `npm start` keeps serving the app.
- It is static: no router, no session, no HTTP client. Its listings are editorial content in
  `content.ts`, copied from the design reference, so the page renders without the API and its
  e2e specs need no recorded answers.
- Links to the app are built from one `APP_URL` token, set per environment in `environment.ts`
  (`https://app.jubilee.to` in production, `http://localhost:4200` in development).
- The page is light only (`data-theme="light"` on `<html>`), as the reference is.
- Nothing is loaded from another host. The photos are in `docs/assets/photos/` and the pitch
  film in `docs/videos/`; `npm run media:sync` copies both into the site before it is served or
  built. Inter is bundled beside Archivo and declared by `marketing.css`.
- The e2e suite starts the site as a second web server and opens it by absolute address; it
  blocks every request that leaves `localhost`, which keeps the rule above true.

## Consequences

- The marketing page can change without touching the app, and the app's bundle is unaffected.
- The listings on the page do not follow the directory; when a featured business changes, the
  page is edited. The count "47" is editorial too.
- The address of the app in production is an assumption until the deployment is decided.

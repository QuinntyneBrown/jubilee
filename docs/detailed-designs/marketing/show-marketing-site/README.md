# Show the marketing site

## Overview

People who do not use Jubilee yet meet it on a public marketing site: one page that says what
Jubilee is, plays the pitch film and sends members to the app and owners to list a business.
The page follows the Magic Patterns design reference ("Marketing Site", frame "Home") section
for section, and its mock is `docs/mocks/pages/marketing-home/`.

*Lockup* — the J mark followed by the lowercase wordmark "jubilee". *Pitch film* — the 1:04
video built in `docs/videos/01-jubilee-pitch/`. *Chapter* — a named time in the film that the
visitor can jump to.

`Jubilee Marketing` is a second Angular application in the frontend workspace
(`frontend/projects/marketing`). It shares the design tokens and the bundled Archivo font with
`Jubilee Web` through the `components` library, and nothing else: it has no router and no session (ADR 0013).

While Jubilee is launching soon (`L1-030`), the page is in its launching-soon state, described in
[`../launching-soon/README.md`](../launching-soon/README.md): it holds two forms, has an API
client for `/api/launch` on its own origin and links nowhere outside itself (ADR 0044, which
amends ADR 0013). `L2-185` is suspended until launch, except its criterion 3. What this design
says of links to the app describes the launched state, which returns at launch.

## Description

- **`App`** (`jb-root`) — the page. It renders the top bar, the opening, the film section, the
  mission, the four content sections, the closing and the footer, and holds the in-page anchors
  `#top`, `#film`, `#mission`, `#why`, `#how`, `#inside` and `#businesses`.
- **The mission** — an ink section straight after the film, composed in `App` from
  `jb-marketing-section` and `jb-marketing-heading`: the heading "Our mission." and, as its lead,
  the mission statement of L0-001 (`docs/specs/L0.md`) word for word, from `MISSION` in
  `content.ts`. It is the one section the Magic Patterns reference does not have; the mission is
  the motive of the whole page, so the page states it. It has no top bar link.
- **`Lockup`** (`jb-lockup`) — the mark and wordmark at a given size, on cream or on ink. The
  wordmark is Archivo 700 at 110% width with −0.03em tracking, as everywhere in Jubilee.
- **`HeroVisual`** (`jb-hero-visual`) — the glimpse of the app in the opening: a search field,
  four verified businesses and the two floating notes.
- **`PitchVideo`** (`jb-pitch-video`) — the player. Before play it shows the still, the play
  button and the film's length; the `<video>` element has `preload="none"`, so the film is not
  fetched. Play, or a chapter, hides the still, turns the browser's controls on, seeks to the
  chapter's time and plays. The current chapter carries `aria-current="true"`. Captions are
  burned into the film, so the player adds no caption track.
- **`Benefits`**, **`HowItWorks`**, **`InsideTheApp`**, **`ForBusinesses`** — the four content
  sections. `InsideTheApp` renders five `MarketingBusinessCard`s, the first one featured.
- **`MarketingBusinessCard`** (`a[jb-marketing-business-card]`) — a photo card for a business:
  category or "Shop", name, tagline, highlight and the Verified mark.
- **`content.ts`** — the page's listings: the five cards, the four search results and the
  count of businesses. They are editorial content taken from the design reference, not read
  from the directory.
- **`APP_URL`** — injection token for the address of `Jubilee Web`; every link to the app is
  built from it (L2-185 AC4). It is removed, with `app-url.ts` and the environment files, until
  launch: the launching-soon page has no link to the app (ADR 0044).

Nothing is loaded from another host, except the bot challenge's script when a site key is
configured (ADR 0044). `npm run media:sync` copies the photos from
`docs/assets/photos/` into `photos/` and the film from
`docs/videos/01-jubilee-pitch/01-jubilee-pitch.mp4` to `media/jubilee-pitch.mp4`; Inter is
bundled beside Archivo (`docs/design-system/assets/fonts/Inter.woff2`, copied to
`frontend/projects/components/src/lib/assets/fonts/`) and declared by the marketing foundations,
`frontend/projects/components/src/lib/styles/marketing.css`.

## Requirements

The feature realizes the following level-2 (L2) requirements. Each L2 requirement refines a
level-1 (L1) requirement, cited by identifier.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-183` | `L1-026` | The marketing home page shall show the top bar with "Launching soon", the opening with the label "Launching soon" and a preview of the app that states no count and no reply time, the film section, the mission statement of L0-001, the benefits, the steps, five business cards that are not links, the section for businesses, "Be listed on launch day.", "Jubilee is launching soon." and the footer. |
| `L2-184` | `L1-026` | The film section shall show a still with a play button and the film's length until the visitor presses play, shall play the film with the browser's controls, and shall let the visitor jump to one of three chapters. |
| `L2-185` | `L1-026` | Suspended while Jubilee is launching soon (`L1-030`, ADR 0044), except that top bar links shall move within the page. At launch: every action that leaves the marketing site shall open the app at one configured address: the browse home, or joining with a return to listing a business. |
| `L2-186` | `L1-026`, `L1-022`, `L1-023` | The marketing site shall be its own application with no sign-in; rendering it shall call nothing but `GET /api/launch` on its own origin, and while Jubilee is launching soon it shall also send the two forms to the Jubilee API on its own origin and call nothing else; it shall use the light theme, be usable from 360 px to 1280 px and by keyboard, and respect reduced motion. |

## Diagrams

PlantUML source: [`diagrams/c4-container.puml`](diagrams/c4-container.puml) (not rendered: no
PlantUML on the machine that wrote this design).

In its launched state `Jubilee Marketing` links to `Jubilee Web` and serves its photos, fonts
and film from its own origin. While Jubilee is launching soon it has no link to `Jubilee Web` and
calls `/api/launch` on its own origin; that container view is in
[`../launching-soon/README.md`](../launching-soon/README.md).

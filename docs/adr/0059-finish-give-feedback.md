# 0059. Finish give feedback: a chip's touch target, and parity captures found by name

## Status

Accepted, 12 November 2026. Amends ADR 0036 (component parity specs); applies ADR 0043 (member
feedback) and ADR 0035 (best practice).

## Context

Journey 29 (give feedback) was recorded at 97%. Two things were left.

- `L2-210` AC12 asks that every target of the feedback launcher and panel be at least 44 px, and
  `L2-162` asks it of chips on a touch screen. The kudos chips of the panel are drawn 32 px tall
  (`--control-height-sm`), as are all chips of the design system, whose chip page said 32 px met
  the 24 px rule. A test that measured what a press reaches on a touch screen found them 32 px.
- The parity specs of the feedback components (ADR 0036) compare with the mocks only, because the
  Magic Patterns Feedback frame is not captured. A crop of a captured frame needs its clip, which
  is not known before the frame exists, so a spec had to be edited once the owner captured it.

## Decision

- **On a touch screen a chip is pressed over at least 44 × 44 px and is still drawn 32 px tall.**
  The chip mixin (`chip/_chip-base.scss`) gives the chip, under `@media (pointer: coarse)`, an
  invisible `::after` hit area of `max(100%, --target-comfortable)` centred on it, as platform
  guidance does for compact chips (a 32 px chip with a 48 px touch target). Nothing changes on
  screen, so the mocks, the Magic Patterns reference and the parity baselines stay as they are. A
  `cluster` sets chips 12 px apart, so the hit areas of two wrapped rows meet without overlapping.
  A small chip (`chip--sm`) sits in a dense card and keeps its 24 px target. `L2-210` AC12 now says
  this, and the chip page of the design system says it under Touch.
- **A parity spec picks up a capture of its component by name.** When a spec's reference is
  `absent`, `e2e/fixtures/parity.ts` looks, for each case and width, for
  `docs/design-reference/magic-patterns/components/<component>/<case>-<width>.png`: an image of
  that case of the component alone, light theme, captured at that viewport width. If it exists,
  the spec gains the test "`<case>` matches the Magic Patterns design at `<width>` px", which
  compares the whole image with the same region of the app from its top left corner at the 3 %
  threshold, exactly as a crop of a frame is compared. The spec is not edited; until the file is
  there, the case is compared with its mock only and its test says so.
  `docs/design-reference/magic-patterns/README.md` lists the captures the feedback components
  expect.

## Consequences

- The kudos chips of the panel and the feedback page, the category chips and every other default
  chip are easier to press on a phone; their look is unchanged.
- `e2e/tests/feedback-panel.spec.ts` measures a target by pressing points out from its middle
  (`elementFromPoint`), so a hit area larger than what is drawn counts and a neighbour drawn over
  it does not.
- Any parity spec whose reference is `absent`, not only the feedback ones, is compared with the
  reference the moment a capture of its component is saved by that name. The captures are the
  owner's export; an agent never makes them.
- A capture of a component alone is the owner's crop of the frame. If the owner prefers to export
  whole frames, the spec names the frame and its clips (`crops`), as before.

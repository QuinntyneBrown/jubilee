# Magic Patterns reference images

The Magic Patterns design is the source the mocks in `docs/mocks/` are drawn from
(<https://www.magicpatterns.com/os/vjQEdxvHPvuznVPfxRXYfe/bY9EUiQ7kdsZbenSTHQtty>). It trumps the
mocks: where a mock or a page of `docs/design-system/` differs from it, the mock and the design
system are corrected, never the other way round.

The images here are what the component parity specs (`e2e/tests/parity/`, ADR 0036) compare the
app with. Each is a full-page capture of one frame of the published design,
<https://jubilee-app-812-site.magicpatterns.app>, in Chromium, locale `en-CA`, named
`<frame>-<viewport width>.png`.

| File | Frame | Viewport | Theme | Captured |
|---|---|---|---|---|
| `home-360.png` | Home (browse, signed in) | 360 px | light | 11 November 2026 |
| `home-1280.png` | Home (browse, signed in) | 1280 px | light | 11 November 2026 |
| `business-services-360.png` | Business, services (Legacy Financial) | 360 px | light | 11 November 2026 |
| `business-services-1280.png` | Business, services (Legacy Financial) | 1280 px | light | 11 November 2026 |
| `business-shop-360.png` | Business, shop (Luzandre.com) | 360 px | light | 11 November 2026 |
| `business-shop-1280.png` | Business, shop (Luzandre.com) | 1280 px | light | 11 November 2026 |
| `list-your-business-1280.png` | List your business | 1280 px | light | 11 November 2026 |
| `sign-up-360.png` | Sign up ("Join Jubilee") | 360 px | light | 11 November 2026 |
| `sign-up-1280.png` | Sign up ("Join Jubilee") | 1280 px | light | 11 November 2026 |
| `log-in-360.png` | Log in ("Welcome back") | 360 px | light | 11 November 2026 |
| `log-in-1280.png` | Log in ("Welcome back") | 1280 px | light | 11 November 2026 |

The published site opens on Sign up. "Log in" under the form shows Log in, and "Create a free
account" shows Sign up again, at the same URL. The prototype's own "Log in" button, pressed with
nothing typed, opens the home frame; the business frames and the listing form are reached from
there as before. Nothing real is ever typed into the prototype.

The two screens switch layout at 1024 px: below it the lockup sits above a card on the cream
background; from it a dark brand panel takes the left 5/12 and the form the right 7/12, on white
and without a card. The 1280 px captures are one viewport tall (900 px) because the split layout
fills the viewport and does not scroll.

## What the reference does not hold

- **One theme.** The design is light only; the dark theme is compared with the mocks alone.
- **Six frames.** The published design has Sign up, Log in, the home, the two business frames and
  the listing form. It has no dialog, no loading, empty or error state, no messages, requests,
  account or admin screen. A parity spec for a component these frames do not show says so, names
  the nearest frame and compares with the mock only.
- **One state of Log in and Sign up.** Each is shown ready to fill in. Their other eight states
  (loading, error, invalid, submitting, success and the three Google notices) and the 768 px
  layout are drawn in the mocks from the same measurements (ADR 0038).
- **List your business at 360 px.** The phone layout of the design has no way to reach the form.
- **The "Marketing Site" frame "Home".** It exists in the Magic Patterns editor only, which needs
  the owner's account; it is not on the published site. The repository owner exports it here as
  `marketing-home-360.png` and `marketing-home-1280.png` and adds its rows to the table. Until
  then the marketing components are compared with the mocks only.

## Known differences

Where the design system and the mocks differ from the reference, the difference is listed here
and the parity spec carries it as `knownDifference`, so the comparison is reported as a known
failure until the design system and the mock are corrected. The owner decides each correction:
it changes how the product looks, which a component move must not do.

| Component | Reference | Design system and mocks |
|---|---|---|
| Button (top-bar action, `home-1280.png`) | 38 px tall, no border, Inter semibold | 32 px tall (`--control-height-sm`), hairline border, system text face |
| Field ("Business name", `list-your-business-1280.png`) | 50 px control with a 12 px radius, 12 px under the label, Inter | 44 px control (`--control-height-md`) with `--radius-md`, `--space-1` under the label, system text face |
| Input and select (`list-your-business-1280.png`) | 50 px tall, 12 px radius, the browser's own select arrow, Inter | 44 px tall (`--control-height-md`), `--radius-md`, a drawn arrow, system text face |
| Checkbox (`list-your-business-1280.png`) | the browser's own 16 px box in green, Inter 14 px text | a drawn 20 px box in the accent colour, system text face at 16 px |
| Controls of Log in and Sign up (`log-in-*.png`, `sign-up-*.png`) | 48 px tall under 1024 px and 44 px from it, 12 px radius, a 1 px edge of ink at 20 %, Inter; labels 15 px medium; the Google button in Roboto with Google's grey edge | `--control-height-md` (44 px) at every width, `--radius-md`, `--color-border-strong`, system text face; labels `--text-label` (14 px); the Google button is the default button at `--control-height-lg` |
| Checkbox of Log in and Sign up | the browser's own 20 px box in ink, 15 px text | the drawn 20 px box in the accent colour, 16 px text |
| Choice cards ("What do you offer?", `list-your-business-1280.png`) | 16 px radius, 2 px ink border when chosen, 40 px icon disc, Inter, other copy | `--radius-lg`, hairline border doubled by a shadow, avatar-size disc, system text face |
| Category chips on the hero (`home-1280.png`) | about 36 px tall, Inter at a medium weight | 44 px tall (`--control-height-md`), semibold label, system text face |
| Avatar in the top bar (`home-1280.png`) | 36 px across | `--avatar-size-sm`, 32 px |
| Unread count in the top bar (`home-1280.png`) | 20 px circle, numeral in Inter | badge height, label face, 1 px wider |

## Refreshing

Capture the frame again from the published site at the same viewport width, with fonts loaded and
animations off, replace the file and update its date. A parity spec names a crop of an image by
file and pixel rectangle, so a capture whose layout moved needs its crops checked.

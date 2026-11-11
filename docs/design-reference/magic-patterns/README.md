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

## What the reference does not hold

- **One theme.** The design is light only; the dark theme is compared with the mocks alone.
- **Four frames.** The published design has the home, the two business frames and the listing
  form. It has no dialog, no loading, empty or error state, no messages, requests, account or
  admin screen. A parity spec for a component these frames do not show says so, names the nearest
  frame and compares with the mock only.
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
| Choice cards ("What do you offer?", `list-your-business-1280.png`) | 16 px radius, 2 px ink border when chosen, 40 px icon disc, Inter, other copy | `--radius-lg`, hairline border doubled by a shadow, avatar-size disc, system text face |
| Category chips on the hero (`home-1280.png`) | about 36 px tall, Inter at a medium weight | 44 px tall (`--control-height-md`), semibold label, system text face |
| Avatar in the top bar (`home-1280.png`) | 36 px across | `--avatar-size-sm`, 32 px |
| Unread count in the top bar (`home-1280.png`) | 20 px circle, numeral in Inter | badge height, label face, 1 px wider |

## Refreshing

Capture the frame again from the published site at the same viewport width, with fonts loaded and
animations off, replace the file and update its date. A parity spec names a crop of an image by
file and pixel rectangle, so a capture whose layout moved needs its crops checked.

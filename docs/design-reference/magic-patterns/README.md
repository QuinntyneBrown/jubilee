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
| `sign-up-intents-1280.png` | Sign up with the "I'm here to" choices (reference only) | 1280 px | light | 11 November 2026 |
| `browse-rooms-shelf-360.png` | Home (browse) with the "Rooms & places to stay" shelf | 360 px | light | 11 November 2026 |
| `browse-rooms-shelf-1280.png` | Home (browse) with the "Rooms & places to stay" shelf | 1280 px | light | 11 November 2026 |
| `browse-rentals-360.png` | Browse, "Rooms & rentals" category, any length | 360 px | light | 11 November 2026 |
| `browse-rentals-1280.png` | Browse, "Rooms & rentals" category, any length | 1280 px | light | 11 November 2026 |
| `space-360.png` | Space, long term (Annex basement) | 360 px | light | 11 November 2026 |
| `space-1280.png` | Space, long term (Annex basement) | 1280 px | light | 11 November 2026 |
| `space-short-stay-1280.png` | Space, short stay (Roncesvalles suite) | 1280 px | light | 11 November 2026 |
| `space-room-1280.png` | Space, room (Leslieville room) | 1280 px | light | 11 November 2026 |
| `space-roommate-1280.png` | Space, roommate (East York house) | 1280 px | light | 11 November 2026 |
| `space-requested-360.png` | Space, long term, after "Request a viewing" | 360 px | light | 11 November 2026 |
| `space-requested-1280.png` | Space, long term, after "Request a viewing" | 1280 px | light | 11 November 2026 |
| `list-a-space-360.png` | List a space, long term | 360 px | light | 11 November 2026 |
| `list-a-space-1280.png` | List a space, long term | 1280 px | light | 11 November 2026 |
| `list-a-space-short-stay-1280.png` | List a space, short stays | 1280 px | light | 11 November 2026 |
| `list-a-space-room-1280.png` | List a space, rooms | 1280 px | light | 11 November 2026 |
| `list-a-space-roommate-1280.png` | List a space, roommates | 1280 px | light | 11 November 2026 |

The published site opens on Sign up. "Log in" under the form shows Log in, and "Create a free
account" shows Sign up again, at the same URL. The prototype's own "Log in" button, pressed with
nothing typed, opens the home frame; the business frames and the listing form are reached from
there as before. Nothing real is ever typed into the prototype.

The two screens switch layout at 1024 px: below it the lockup sits above a card on the cream
background; from it a dark brand panel takes the left 5/12 and the form the right 7/12, on white
and without a card. The 1280 px captures are one viewport tall (900 px) because the split layout
fills the viewport and does not scroll.

The rooms and rentals frames are reached the same way. From the home, the "Rooms & rentals" chip
shows the category; a space card on the home or in the category opens the space, and "Request a
viewing" on the long-term space shows the requested state. At 1280 px "Create a listing" opens
List a space; at 360 px it is reached by "List a space" at the foot of the "Rooms & rentals"
category. The term radios on List a space are drawn, not live: the prototype takes the term from
its `rentingAs` arg (`'Short stay' | 'Long term' | 'Room' | 'Roommate'`, default `'Room'`), which
only the editor sets. The `list-a-space-*` captures other than `-room` therefore change that one
default in the published bundle (`` rentingAs:`Room` `` in `index.js`) as the page loads, with
Playwright `route`, and change nothing else. The space pages' terms need no arg: each space is its
own card. The full-page 360 px captures show the phone tab bar where the first viewport ended, as
the earlier 360 px captures do.

The published Sign up and home have changed since `sign-up-*.png` and `home-*.png` were captured
(Sign up now asks "I'm here to", the home heading now reads "Hire, shop and find a place to live
…" and has the rooms shelf); those files are kept until their parity crops are checked against a
new capture. `sign-up-intents-1280.png` and `browse-rooms-shelf-*.png` show the current frames.

## What the reference does not hold

- **One theme.** The design is light only; the dark theme is compared with the mocks alone.
- **Few frames.** The published design has Sign up, Log in, the home and its categories, the
  business and space frames and the listing form. It has no dialog, no loading, empty or error state, no messages, requests,
  account or admin screen. A parity spec for a component these frames do not show says so, names
  the nearest frame and compares with the mock only.
- **One state of Log in and Sign up.** Each is shown ready to fill in. Their other eight states
  (loading, error, invalid, submitting, success and the three Google notices) and the 768 px
  layout are drawn in the mocks from the same measurements (ADR 0038).
- **List your business at 360 px.** The phone layout of the design has no way to reach the form.
  (List a space is reachable at 360 px, through the "Rooms & rentals" category.)
- **Most rooms and rentals states.** The space frames show the request made inline (move-in and
  stay chips in the price card, then "Sent to …"); the app asks for the dates in a request
  dialog, drawn in the mocks only. There is no empty "Rooms & rentals" term: every term chip has
  at least one space. There is no exact-address field on List a space (only the note that the
  address is shared once a request is accepted), no submitted, invalid or busy state of List a
  space, no incoming request or request detail for a space, and the roommate space's "Meet the
  household" and the short-stay dates are shown only as drawn. The Riverdale Fellowship Hall
  card shows hourly pricing ("$45 / hour"); hourly hall pricing is not built and has no frame.
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
| Service row (`business-services-1280.png`) | in a 768 px column, 77 px tall around a 42 px Book button, Inter | in a 704 px column, 79 px tall around a 32 px button (`--control-height-sm`), system text face |
| Head of a business (`business-services-1280.png`) | a 420 px column, two round actions (message, save) beside Book a meeting, Inter | a 440 px column, a third action (Share), system text face |
| Section head ("From the shops", `home-1280.png`) | the page 1216 px wide, the link ending with a chevron, Inter | a 1184 px container, the link without a chevron, system text face |
| Directory row (`home-1280.png`) | 380 px wide, a smaller tagline, Inter | a wider column, the tagline at `--text-body-sm`, system text face |
| Back link (`business-services-1280.png`) | a smaller arrow, closer to the words, Inter | the arrow at `--icon-size-md`, `--space-2` from the words, system text face |
| Hero (`home-1280.png`) | heading on two lines, chips at regular weight, the page 1216 px wide | heading held to `18ch` (three lines), semibold chips, a 1184 px container |
| Search field (top bar, `home-1280.png`) | 452 px wide, 12 px radius, Inter | a pill (`--radius-full`) that shares the bar with the navigation, system text face |
| Space card (`browse-rooms-shelf-1280.png`) | a photo for each space, the shelf in another order | a tinted tile by term until spaces have photos (L2-088) |
| Term filter (`browse-rooms-shelf-1280.png`) | filled ink chips, Inter | the plain chip row, system text face |
| Booking card (`space-short-stay-1280.png`, `space-room-1280.png`) | dates (check-in and out, or move-in and stay) and a total in the card | the rent, the minimum stay and the call to action; the dates are asked in the request dialog (ADR 0040) |
| Space facts (`space-short-stay-1280.png`) | a 794 px main column | the split’s 704 px main column |
| Rental rows (`space-short-stay-1280.png`) | 12 px above and below each row, a 794 px main column | `--space-2` above and below, the split’s 704 px main column |
| Included list (`space-short-stay-1280.png`) | other inclusions for the suite (fresh linens, coffee) | the seeded inclusions |
| House rules (`space-short-stay-1280.png`) | a lighter rule beside each line, wider spacing | `--color-border-strong`, `--space-2` between rules |
| Household (`space-room-1280.png`) | each member listed with an initial | the household as the owner wrote it, one text (L2-190) |
| Host card (`space-short-stay-1280.png`) | a 362 px side column, the name in Inter | the split’s wider side column, the name in `--text-h4` |
| Space card preview (`list-a-space-1280.png`) | a photo, “From Mar 1”, nothing marked pending | the tinted tile by term until the owner adds photos, “Pending verification” until approved (L2-189 AC3) |

## Refreshing

Capture the frame again from the published site at the same viewport width, with fonts loaded and
animations off, replace the file and update its date. A parity spec names a crop of an image by
file and pixel rectangle, so a capture whose layout moved needs its crops checked.

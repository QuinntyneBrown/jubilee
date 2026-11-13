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
| `listing-reviews-360.png` | Listing (Legacy Financial) with its Reviews section, full page | 360 px | light | 12 November 2026 |
| `listing-reviews-1280.png` | Listing (Legacy Financial) with its Reviews section, full page | 1280 px | light | 12 November 2026 |
| `listing-reviews-section-360.png` | The Reviews section of the Listing, cropped | 360 px | light | 12 November 2026 |
| `listing-reviews-section-1280.png` | The Reviews section of the Listing, cropped | 1280 px | light | 12 November 2026 |
| `write-review-360.png` | Write a Review (Legacy Financial), nothing chosen | 360 px | light | 12 November 2026 |
| `write-review-1280.png` | Write a Review (Legacy Financial), nothing chosen | 1280 px | light | 12 November 2026 |

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

The reviews frames (ADR 0066) are reached the same way: from the home, the Legacy Financial card
opens the Listing frame, whose Reviews section follows the services, and its "Write a review"
opens Write a Review. Nothing is chosen or typed, so the posted state, a pressed star bar and the
sort are not captured; the mocks draw them from the frames' source (`components/Reviews.tsx`,
`shared/components/Stars.tsx`). The older `business-services-*.png` predate the Reviews section
and are kept for their parity crops.

The published Sign up and home have changed since `sign-up-*.png` and `home-*.png` were captured
(Sign up now asks "I'm here to", the home heading now reads "Hire, shop and find a place to live
…" and has the rooms shelf); those files are kept until their parity crops are checked against a
new capture. `sign-up-intents-1280.png` and `browse-rooms-shelf-*.png` show the current frames.

## Captures of one component (ADR 0060)

A component the frames above do not show is compared with the reference as soon as its capture is
here, with no change to its parity spec. Each capture is an image of one case of the component
alone, cropped to the component's bounds, captured as the frames are (Chromium, locale `en-CA`,
light theme, the viewport at the width the file names), and saved as
`components/<component>/<case>-<width>.png`. `e2e/fixtures/parity.ts` finds it by that name and
compares the whole image with the same region of the app, from its top left corner, within 3 %.

The Feedback frames are the first expected this way. Export each case below at 360 px and at
1280 px (for example `components/star-scale/unrated-360.png` and
`components/star-scale/unrated-1280.png`):

| Component | Cases | What each shows |
|---|---|---|
| `feedback-launcher` | `launcher` | the round button above the tab bar (360 px), the "Feedback" pill (1280 px) |
| `star-scale` | `unrated`, `rated`, `large`, `large-invalid` | the panel's stars before and after a choice; the feedback page's stars, and with "Choose a rating from 1 to 5." |
| `score-scale` | `part`, `wide`, `wide-chosen` | one part's 1 to 5 score on the feedback page; a check-in's five scores, before and after a choice |
| `score-rows` | `parts` | the four parts of Jubilee under "And each part of it" |
| `moment-check` | `asked`, `low`, `thanks` | the check-in after a listing is published: the question, a low score with "What got in the way?", "Thanks, that helps us." |
| `feedback-history` | `list`, `empty`, `error` | "Your feedback" with items and a reply, with nothing yet, and when it fails to load |

Until a file is here the case is compared with its mock only, and its test says so.

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

- **The "Feedback" frame and the "Feedback Review" canvas.** Member feedback (L1-029) is drawn in
  the editor only: the frame "Feedback" (the feedback page,
  <https://www.magicpatterns.com/os/vjQEdxvHPvuznVPfxRXYfe/hTBKhcvY3pn42huxjd3C54>), the shared
  source `shared/components/Feedback.tsx` (the launcher, the panel, the star scale, the kind tabs
  and the moment check-in) and the canvas "Feedback Review"
  (<https://www.magicpatterns.com/os/vjQEdxvHPvuznVPfxRXYfe/w29MqU6vhuqi7xutXeQkF5>), which lays
  out every state: the panel on Browse (rate, report a bug, kudos, sent), the check-in on a listing
  after a request and on the submitted listing form, and the page (rate, report a bug, kudos for a
  business, sent). None of it is on the published site. The repository owner exports the canvas
  here as `feedback-page-<state>-<width>.png`, `feedback-panel-<state>-<width>.png` and
  `feedback-check-in-<width>.png` and adds their rows to the table. Until then the feedback
  components (`feedback-launcher`, `star-scale`, `score-scale`, `moment-check`, `feedback-history`
  and the `corner` dialog, the `segmented` tab list) are compared with the mocks only. The mocks
  were drawn from the frame's source: its sizes, radii, copy and motion.

## Feedback: what the product changes from the frame

The frame is a prototype with sample data. The product keeps its layout and changes these, by
decision (ADR 0043):

| Frame | Product | Why |
|---|---|---|
| "Rooms & rentals", "Request to rent", "rental", "host", "space" | "business", "request", "listing" | The specifications have no rentals; the words are those of `docs/specs/` |
| Four rating areas named for rentals | "Finding businesses", "Listing your business", "Messages and requests", "Trust and safety" | The product's real areas |
| "Logged as JB-1042. We'll message you in Jubilee when it's fixed." | "Logged as {reference}. Follow it under Your feedback." | Telling the member about a status change is deferred; the reference is real |
| "We've passed your note to Legacy Financial. It will appear on their page once they've seen it." and "Show this on their Jubilee page with my first name" | "Thank you. We've kept your note for {business}." and "Jubilee may show this on their page with my first name" | Showing kudos on a business page is deferred; the consent is stored |
| "Include a screenshot of this screen" in the panel | absent; the page's "Add screenshots" stays | A page cannot capture itself reliably on every phone browser |
| "We'll attach: … Safari on iPhone · v1.4.2" | the screen, the browser and the app version as the member's device reports them | Real values |
| "You can message me about this", ticked | the same label, not ticked | Consent is given, never assumed (L2-145) |
| The panel has no scrim from 768 px | the panel is a modal dialog with the scrim at every width | One dialog behaviour, focus held inside (L2-160) |

## Reviews: what the product changes from the frames

ADR 0066 records why. The parity specs of the reviews components carry these as known differences.

| Frame | Product | Why |
|---|---|---|
| "What did they do well? …" and the placeholder "They were on time, explained everything…" | "What did they do, and how did it go? …" and "Say what happened, as you would tell a friend." | The frame leads towards praise; no line asks for a good review (L2-227 AC6) |
| "Your review will show as Verified because you booked through Jubilee." | No such line: "Your review posts under your first name and last initial: {name}", and a second line "Keep to what happened to you: no private details of anyone and no advertising." | Jubilee shows no "Verified" mark anywhere (ADR 0057, ADR 0066) |
| "Verified means the reviewer made a booking through Jubilee." | absent, as is "Verified" on each review | The same |
| "Add photos (optional)" on Write a Review, a photo on a review | absent | Photos on reviews are deferred (ADR 0066) |
| "Helpful · 24" on each review | absent | Helpful is deferred; "Most relevant" ranks without votes |
| A context line under the name ("Trinity Annex", "Sanctuary Toronto", "Markham") | the date alone | The home church is private (L1-020); Jubilee collects no neighbourhood |
| Relative dates ("1 week ago") | "3 Nov 2026", with "Edited" when changed | L2-131 and L2-229 AC3 |
| The stars with no visible label | the legend "Your rating" above the stars | The star scale’s legend is its accessible name; the system shows it (Star scale) |
| The chosen service chip filled ink | filled gold (`.chip` with a checked radio), the chips wrapping in a cluster as the frame does | The system’s one chosen-chip colour |
| "Write a review" a filled ink button | an outlined button with the pen icon | The listing’s one primary action stays booking, requesting or messaging |
| 4.8 from 137 reviews, 118 of them 5 stars; ratings on the Deeks Insurance and JD Smith cards | the seeded sample: 4.6 from 5 reviews; no rating on a card below 3 reviews | The mocks, the seed and the e2e recording share one sample (ADR 0066) |
| Select with a chevron ("Most relevant") | the system select with its drawn arrow | Select component |
| The posted state, filters, edit, remove, reply and report | drawn in the mocks only | The frames have no such states |

## Known differences

**No Verified mark (ADR 0057).** Jubilee ships without listing verification, so the "Verified"
marks the captures show (a tick and the word "Verified" beside a business or host name, or a
count of "verified businesses") are intentionally not built: the design system, the mocks and
the app show the same layout without them. The captures are kept as captured; where a parity
crop includes such a mark, the spec carries it as `knownDifference`.

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
| Booking card (`space-short-stay-1280.png`, `space-room-1280.png`) | dates (check-in and out, or move-in and stay) and a total in the card | the rent, the minimum stay and the call to action; the dates are asked in the request dialog (ADR 0042) |
| Space facts (`space-short-stay-1280.png`) | a 794 px main column | the split’s 704 px main column |
| Rental rows (`space-short-stay-1280.png`) | 12 px above and below each row, a 794 px main column | `--space-2` above and below, the split’s 704 px main column |
| Included list (`space-short-stay-1280.png`) | other inclusions for the suite (fresh linens, coffee) | the seeded inclusions |
| House rules (`space-short-stay-1280.png`) | a lighter rule beside each line, wider spacing | `--color-border-strong`, `--space-2` between rules |
| Household (`space-room-1280.png`) | each member listed with an initial | the household as the owner wrote it, one text (L2-199) |
| Host card (`space-short-stay-1280.png`) | a 362 px side column, the name in Inter | the split’s wider side column, the name in `--text-h4` |
| Space card preview (`list-a-space-1280.png`) | a photo, “From Mar 1”, nothing marked pending | the tinted tile by term until the owner adds photos, “Not published yet” until the owner publishes it (L2-198 AC3) |

## Refreshing

Capture the frame again from the published site at the same viewport width, with fonts loaded and
animations off, replace the file and update its date. A parity spec names a crop of an image by
file and pixel rectangle, so a capture whose layout moved needs its crops checked.

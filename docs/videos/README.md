# Jubilee videos

One folder per video. The text files are the source; the media is generated from them.

| # | Video | Runtime | What it is |
|---|---|---|---|
| 01 | [Meet Jubilee](01-jubilee-pitch/README.md) | 1:04 | The pitch film for Toronto's Christian community: why join, what you can do, why list. Nine scenes cut to a 100 BPM grid, built from the Magic Patterns design. |
| 02 | [The Jubilee plan](02-business-plan/README.md) | 1:20 | The business plan, short: launch dates, how businesses pay, homes and stays, revenue, the raise and the roadmap. Ten picture-led scenes, narrated, no captions. |
| 03 | [Journey 1: Discover businesses](03-journey-01-discover-businesses/README.md) | 2:39 | The demo of journey 1: a visitor goes from the welcome page to the browse home and a filtered, sorted category, and three cards say how the directory read cache is cleared and proved (ADR 0003). Twelve narrated scenes recorded from the app. |
| 04 | [Journey 3: Search the directory](04-journey-03-search-directory/README.md) | 2:51 | The demo of journey 3: a member searches from the top bar, reads the grouped results, the no-results state and the empty search page, and sees a paused listing leave the next search; three cards say why search has no indexing job and how that is proved (ADR 0011). Twelve narrated scenes recorded from the app. |
| 05 | [Journey 2: view a business and its products](05-journey-02-view-business-and-products/README.md) | 1:20 | A demo of the implementation: the sold-out card, the owner's sold-out toast, the back-in-stock notice in the app and by e-mail, and the preview status. Eight scenes of screenshots of the running app, narrated, no captions. |
| 06 | [Journey 5: Sign in and out](06-journey-05-sign-in-and-out/README.md) | 3:13 | The demo of journey 5: a visitor is brought back to the message or the save they started, a member's message survives the end of the session and is restored after signing in, and the account page signs the other devices out. Four cards say what was proved behind the screen: where a draft is kept, the single session-expired redirect and the `__Host-` cookie with no other origin approved. |
| 07 | [Journey 7: Book a meeting](07-journey-07-book-a-meeting/README.md) | 2:47 | The demo of journey 7: an owner sets meeting hours on My services (the days, from and until in Toronto time, and how often a time is offered), and a member is offered only the times inside them. Three cards say what was proved behind the screen: the rules the API enforces, the two criteria of booking that gained a test, and what is left for the owner. |
| 08 | [Journey 4: Join Jubilee](08-journey-04-join-jubilee/README.md) | 1:32 | The demo of journey 4: an unconfirmed member changes a mistyped address in the "Use another e-mail" dialog, meets an address in use and reaches the resend limit; two cards say how tokens are kept out of the logs and what is left for the owner (ADR 0049). Eight narrated scenes recorded from the app. |
| 09 | [Journey 9: Request a product](09-journey-09-request-a-product/README.md) | 2:36 | The demo of journey 9: a member opens a product of a shop, chooses a size and a quantity and sends an order request, without payment: the delivery methods, the address a shipped request needs, the estimate that follows the choice, the dialog by keyboard and the confirmation, then the owner's Incoming requests. Three cards say what was proved behind the screen: who is told when an order is sent, what confirming does and the order card in the conversation, and what is left for the owner. |
| 10 | [Journey 13: Respond to customer requests](10-journey-13-respond-to-customer-requests/README.md) | 2:32 | The demo of journey 13: an owner's Incoming requests, where a request arrives over the event stream in one toast, a confirmation that fails after its dialog was closed is said in a danger toast with "Try again", and a decline of a request the customer cancelled closes the dialog and says why; then the "Replies fast" badge on a listing page and a business card. Three cards say what was proved behind the screen: the stream and its fallback, the response-time job and the customer's notification, and what is left for the owner. |
| 11 | [Journey 6: Message a business](11-journey-06-message-a-business/README.md) | 1:33 | The demo of journey 6: a member writes to a business from its listing, with the owner named in the hint and a counter for the last 200 characters; the conversation opens with a toast and a line that name the day the owner is back; an inbox of 64 conversations loads 50 and "Show more conversations" adds the rest; a photo that could not be scanned is not sent and "Try again" sends it once. Two cards say how a photo is scanned and stored and what is left for the owner (ADR 0051). Eight narrated scenes recorded from the app. |
| 12 | [Journey 15: Run a business listing](12-journey-15-run-a-business-listing/README.md) | 2:46 | The demo of journey 15: an owner's My business, where "Saved by members" carries its weekly change and a select moves the workspace between her businesses; the listing editor, where a photo is dragged by its handle to the front or moved with the keyboard, and a new name is live at once with the promise of a re-check; the photos on a public listing page; and the pause. Four cards say what was proved behind the screen: the re-check e-mails, the `picture` with `srcset`, the 60-second bound of a pause, and what is left for the owner. |
| 13 | [Journey 8: Request a quote](13-journey-08-request-a-quote/README.md) | 1:23 | The demo of journey 8: a member whose profile has a phone number asks a business for a quote and finds "Phone" already filled in, gives another number for that job and sends the request, and the account page still shows the profile's own number. Two cards say where the number comes from, who is told when a quote request is sent and answered, and that nothing is left for the owner (ADR 0016, amended). Eight narrated scenes recorded from the app. |
| 14 | [Journey 17: Stay notified](14-journey-17-stay-notified/README.md) | 2:54 | The demo of journey 17: the notification centre with "New in Shops: Flower Creations"; a toast that the pointer holds, an error toast that stays while a newer one pushes out the oldest, and an event stream the app opens again by itself after the server refused it; "One daily summary" in notification settings; and the unsubscribe page a notification e-mail links to, for one category, for the daily summary and for a link that does not verify. Cards say what the run built behind the screen: the daily summary job, the weekly note about new businesses, the tips for business owners, and the measured 2 seconds of the stream. |
| 15 | [Journey 19: Save listings for later](15-journey-19-save-listings/README.md) | 2:34 | The demo of journey 19: hearts on the business, space and product cards of Browse, saved at once with Undo and released again; a heart left busy while its save is on its way; the hearts of a shop and a category, with a saved business shown pressed; signing out, after which no heart is pressed; a visitor's press, "Join to save Luzandre.com", and the item saved once after sign-in; and the saved page. Cards say what the tests prove and what is left for the owner. |
| 16 | [Journey 10: List a business](16-journey-10-list-a-business/README.md) | 1:38 | The demo of journey 10: the highlight drawn as the green line of the preview, a service added through the full service editor with "Members can", the review screen's "No products or services yet" and the owner's other listings with their stages, and an owner asked to agree to the updated statement of faith, who chooses "Not now", then agrees, and after 30 days finds the listing paused until "Read and agree" makes it live again. Cards say what the run built behind the screen: the two daily jobs, the endpoints and their refusals, and the 10-second limit of a submission. Nine narrated scenes recorded from the app. |
| 17 | [Journey 21: Share or report a listing](17-journey-21-share-or-report-listing/README.md) | 2:47 | The demo of journey 21: the share dialog with its link, "Copied ✓" and the polite "Link copied", More… where the device has a share sheet, and focus back on Share; `og-image.png`, the image of every shared listing; a visitor asked to join before reporting; a member's report, read-only and busy while it is on its way, then thanked. Cards say how the app's host answers link-preview fetchers, what the team's e-mail of a report holds, what the tests prove and what is left for the owner. |
| 18 | [Journey 23: Recover from errors](18-journey-23-recover-from-errors/README.md) | 2:31 | The demo of journey 23: an old link of a renamed listing opens the listing at its current address; an address that is no page shows the not-found page; the static maintenance and server error pages the app's host serves when the app cannot answer; a member without a listing on the owner's workspace asks for access. Cards say how a listing's slug follows its name, how the host gives every page load its status, what the team's e-mail of an access request holds, what the tests prove and what is left for the owner. |
| 19 | [Journey 25: Moderate reports and feature businesses](19-journey-25-moderate-reports-and-feature-businesses/README.md) | 2:41 | The demo of journey 25, in the admin application: the admin bar counts the unresolved reports and catches up when the moderator moves between screens; a report opened into review and its listing placed on hold; the featured businesses of the week chosen and saved. Cards say what the team's e-mail of a reported conversation holds, how a hold, a removal or a featured week reaches every public page on the next request, what the tests prove and what is left for the owner. |
| 20 | [Journey 27: Meet Jubilee on the marketing site](20-journey-27-meet-jubilee-on-the-marketing-site/README.md) | 2:44 | The demo of journey 27, on the marketing site while Jubilee is launching soon: the pitch film played by keyboard, its own controls and a chapter, its captions read without sound, the mission word for word after the film, the accent of every heading, the fields reached by Tab with a focus ring, "Watch the film" and play under reduced motion, and the light page on a device set to dark. Cards say what the specs prove and that the links to the app (L2-185) wait on the owner's launch decision. |
| 21 | [Journey 12: Keep listings honest](21-journey-12-keep-listings-honest/README.md) | 1:22 | The demo of journey 12: the Jubilee team's Listings in the admin application with each status and the "Flagged" tag, a search by name, one listing with its owner, their other listings, the flag and how members see it, and "Take down listing" refused without a reason, then sent with one. Cards say what the run built behind the screen: the audit of each role change made with `jubilee staff` and of each opening of a listing. Eight narrated scenes recorded from the app. |
| 22 | [Journey 29: Give feedback](22-journey-29-give-feedback/README.md) | 2:51 | The demo of journey 29, in the app: the Feedback launcher and its panel (a rating thanked by name, a bug report that says what is attached, kudos chips), a check-in after a meeting request with a low score, the feedback page rating each part of Jubilee and "Your feedback" with statuses in words and the team's reply. Cards say what the new API tests and behaviour specs prove, how the parity specs pick up the owner's captures by name (ADR 0060) and what is left for the owner. |
| 23 | [Journey 14: Track and cancel requests](23-journey-14-track-and-cancel-requests/README.md) | 1:29 | The demo of journey 14: "Your requests" changing over the event stream when WaterWorks confirms, with one toast; the owner marking a confirmed order fulfilled from Incoming requests through its dialog; a member's order reading "Completed" the moment the shop marks it; a request nobody answered for a week with "Ask again" and "Cancel request", cancelled and taken back with Undo. Cards say what the tests prove behind the screen: the owner told in the app of a cancel and its withdrawal, the customer told of a fulfilled order, and the two request jobs run once per schedule. Ten narrated scenes recorded from the app. |
| 24 | [Journey 31: Get ready for launch](24-journey-31-get-ready-for-launch/README.md) | 2:58 | The demo of journey 31, on the marketing site in its launching-soon state: the launch notification sent empty, busy, still sending and then confirmed, and past the limit; the business pre-registration with fields the server refused, a bot challenge not passed, and confirmed. Cards say what the new tests prove behind the proxy, for the CLI's export and the daily job, show the owner's checklist of the launch settings (ADR 0062) and what is left for the owner. |
| 25 | [Journey 16: Manage products and services](25-journey-16-manage-products-and-services/README.md) | 1:29 | The demo of journey 16: Products with a drag handle on each row beside the arrows; "Add product" with a photo uploaded and shown before the save, a minimum order and two sizes each with its own stock; the new row with its photo; a product dragged by its handle to the top; a product page showing its photo in place of the tile; and a saved product the shop deleted reading "No longer available". Cards say what the tests prove behind the screen: the photo checked and scanned before it is stored, 30 an hour, options, drafts and the 50-services limit. Ten narrated scenes recorded from the app. |
| 26 | [Journey 18: Recover a forgotten password](26-journey-18-recover-password/README.md) | 1:30 | The demo of journey 18: at "Reset your password" an address gets the same answer whether or not it has an account; asked a fourth time in the hour, the form keeps the address and says "You’re doing that a lot. Try again in 42 minutes."; the link opens "Choose a new password", refuses a short password and changes it. Cards say what the tests prove behind the screen: the limit counts requests and never the account, the median time of 100 requests each, no reset token in any log, and the alert to the on-call contact on a burst. Eight narrated scenes recorded from the app. |
| 27 | [Journey 20: Manage profile and settings](27-journey-20-manage-profile-and-settings/README.md) | 1:28 | The demo of journey 20: the account page with the home church address "Shown to no one." and the pronouns hint; the new "Where you’re signed in" with this device first and another device, its network and when it was last active, signed out on its own; and the owner’s pronouns in the Owner panel of the admin application. Cards say what the tests prove behind the screen: credential changes in the security log with address and outcome, another member’s session not found and logged, and the home church given to no other reader. Seven narrated scenes recorded from the app. |
| 28 | [Journey 22: Read policies and get help](28-journey-22-read-policies-and-get-help/README.md) | 1:32 | The demo of journey 22: Policies in the admin application lists the four pages with their published version; the privacy notice opens in the editor, its lead is changed and the preview beside the fields follows; "Publish version 3 of Privacy?" says members read it at once and the publish is audited; version 3 is published and version 2 kept; a member reads the new version at `/privacy`. Cards say what the tests prove behind the screen: a publish from an older version refused, each publish stored with the administrator’s name and audited, only administrators let in, and the read cache the publish clears. Eight narrated scenes recorded from the app. |

### Out of date since Jubilee ships without verification (ADR 0057)

Jubilee no longer verifies businesses, and no page, e-mail or film may say a business is verified.
These rendered films (MP4, MP3 and, where they have them, `captions.vtt` and `timing.js`) were
made before that decision and still show or say it. They need rebuilding before they are shown
again:

- **02 The Jubilee plan.** Scene 02 said "vouched for by a pastor" under "Vouched for." with the
  seal ringed "Verified by the Jubilee team". Its source (`narration.json`, `script.md`, `film.js`,
  `README.md`) and the shared seal in `assets/pitch.js` are updated; regenerate the voice, then
  the MP4.
- **03 Journey 1, 04 Journey 3, 05 Journey 2 and 12 Journey 15.** Demos of runs made before the
  decision. They say "verified businesses", "the verification team", "a verifier's approval",
  "Pending verification" and (12) the re-check of a renamed listing, which is removed. Their
  narration is left as the record of what those runs built and proved; re-record each from the
  app once the code ships without verification, and rewrite its narration then.
- **06, 07, 09, 10, 11 and 13.** Demos recorded from the app while every public listing carried
  the "Verified" mark and the line "Verified Christian business · {category}". Their narration
  says nothing of verification, but listing pages and cards in passing may show the mark; check
  the frames and re-record before showing them.

Film 01 (Meet Jubilee) builds its own seal with the design's ring text and claims no verification.
Film 08 (Join Jubilee) shows only joining and the e-mail confirmation, which is not business
verification.

## How a pitch film is built

```
docs/videos/NN-topic/
  slides.html        the page that plays the film                          (written)
  film.js            the scenes: markup and the functions that move it     (written)
  narration.json     the lines, their windows and the words on a beat      (written)
  script.md          the transcript                                        (written)
  README.md          outline and run sheet                                 (written)
  narration.wav      the fitted voice alone                                (generated)
  timing.js          captions and spoken segments in film seconds          (generated)
  music.mp3          the track alone                                       (generated)
  sfx.mp3            the sound effects alone                               (generated)
  captions.vtt       captions in film time, a sidecar file                 (generated)
  NN-topic.mp3       voice, effects and ducked music                       (generated)
  NN-topic.mp4       1920x1080, 60 fps, captions burned in                 (generated)
```

```sh
pip install kokoro-onnx numpy
python tools/video-audio/film_audio.py docs/videos/NN-topic                 # voice, music, effects, mix, timing.js
python tools/video-audio/film_audio.py docs/videos/NN-topic --keep-voice    # the same, reusing narration.wav
python tools/video-audio/narrated_audio.py docs/videos/NN-topic             # a film without its own score: voice and a quiet piano bed
node tools/video-build/build.mjs docs/videos/NN-topic --check               # print the schedule and the captions
node tools/video-build/build.mjs docs/videos/NN-topic --frame 22.8 f.png    # look at one frame (film seconds)
node tools/video-build/build.mjs docs/videos/NN-topic                       # captions.vtt + mp4
node tools/video-build/build.mjs docs/videos/NN-topic --no-captions --fps 30 --crf 20   # no captions, a smaller file
```

- **The builder** needs Node with Playwright (Chromium) and ffmpeg with libx264 (`FFMPEG_PATH`
  overrides). Playwright is installed in `e2e/`; run the builder with
  `NODE_PATH=e2e/node_modules` so it finds that copy. It needs no network connection: the fonts
  and photos are in the repository (see below). The full render takes several minutes
  (3,888 frames for 64.8 s).
- **The audio is a synthesized stand-in.** `film_audio.py` writes the music and the sound effects
  with numpy and speaks the narration with Kokoro-82M (`af_heart`), run locally. The design's audio
  brief asks for a composed track and a recorded voice; when those exist, replace
  `NN-topic.mp3` with the real mix (same length, same hit points) and rebuild the MP4.
  The script is specific to video 01: its score follows that film's bar-by-bar brief.
  `narrated_audio.py` reuses its narration for any other film (`bpm` and `scenes` in
  `narration.json` set the length) and lays a quiet synthesized piano bed under it.
- **Voice.** The model and voice are looked for in `KOKORO_DIR`, `.cache/kokoro` and the Hugging
  Face cache, and downloaded once from `onnx-community/Kokoro-82M-v1.0-ONNX` otherwise. Free, no
  key. `--voice` or `KOKORO_VOICE` picks another voice.
- **Captions** are burned into the MP4, as the build spec asks (for silent autoplay on the
  marketing site). `--no-captions` renders without them; `captions.vtt` is written either way. In
  the deck, the Captions button or `c` toggles them, and `slides.html?captions=0` starts without.
  A deck whose `<body>` has `data-captions="off"` starts without them (`?captions=1` shows them).
- **Size.** `--fps` and `--crf` (default 60 and 16) trade smoothness and quality for file size.

## How a demo video is built

A demo video shows a finished piece of work in the app itself: a voice explains while the screen is
driven, over a quiet piano bed. Each journey prompt in `docs/prompts/` ends with one.

```
docs/videos/NN-topic/
  narration.json     the lines: { "title", "scenes": [{ "id", "say" }] }        (written)
  demo.spec.ts       drives the app, one demo.scene(id, …) per line           (written)
  README.md          what the video shows and its run sheet                    (written)
  script.md          the transcript                                            (generated)
  captions.vtt       captions in film time, a sidecar file                     (generated)
  NN-topic.mp3       voice and ducked music                                    (generated)
  NN-topic.mp4       1920x1080, 30 fps, captions burned in                     (generated)
```

```sh
pip install edge-tts
node tools/video-demo/build.mjs docs/videos/NN-topic --check             # speak the lines, print their lengths
node tools/video-demo/build.mjs docs/videos/NN-topic                     # record and encode
node tools/video-demo/build.mjs docs/videos/NN-topic --keep-recording    # encode again from the last recording
```

- **The voice** is edge-tts (`en-CA-ClaraNeural`; `"voice"` and `"rate"` in `narration.json` change
  it). It is free and needs the network. Each line is kept in `.cache/video-demo/` by what it says,
  so an unchanged line is not spoken again.
- **The recording** is `demo.spec.ts`, run by Playwright under `e2e/playwright.demo.config.ts`. It
  is not a test and `npm test` never runs it. It imports `test` from `e2e/fixtures/demo.ts` and the
  page objects from `e2e/pages/`; the app is answered from the recorded API and the stubs, as in
  every spec (ADR 0009), so a demo shows only what a behaviour spec can reach.
  `demo.scene(id, actions)` runs the actions and then waits until the line has been said;
  `demo.click`, `demo.type`, `demo.point` and `demo.scroll` move a visible pointer;
  `demo.card(title, lines)` covers the page with a card for the opening, the close and work that
  has nothing to show on a screen, and `demo.hideCard()` removes it. `demo.jb` opens screens by
  route key and `demo.page` is the page.
- **The music** is the piano bed of video 02 (`02-business-plan/music.mp3`), looped, turned down
  under the voice and faded out. `"music"` in `narration.json` names another file; `--no-music`
  leaves it out.
- **Captions** are burned in (`--no-captions` leaves them out); `captions.vtt` is written either way.

### A demo built from screenshots (video 05)

Video 05 was made without `tools/video-demo`, and is a film of the other kind: a deck
(`film.js`) that shows **screenshots of the running app** in drawn frames, with close-ups, built by
`tools/video-build`. New demos use the recorder above. This way still works, and suits a demo that
must show something no screen recording reaches, such as an e-mail or the same state on a phone
and a desktop side by side.

```
docs/videos/NN-journey-NN-topic/
  shots.ts           which states of the app to open and what to save      (written)
  shots/             the screenshots, PNG at double density                (generated, committed)
  email.txt          the body of an e-mail the journey sends, if any       (written)
  film.js, slides.html, narration.json, script.md, README.md               (written, as for any film)
```

```sh
V=docs/videos/NN-journey-NN-topic
# 1. An e-mail the journey sends, rendered by the backend's own layout (skip when there is none).
dotnet build backend/src/Jubilee.Application -c Release
dotnet fsi tools/video-record/render-email.fsx "<subject>" $V/email.txt $V/shots/email.html "<unsubscribe url>"
# 2. The screenshots: opens the app in Chromium and runs shots.ts.
JB_VIDEO_DIR=$V NODE_PATH=e2e/node_modules e2e/node_modules/.bin/playwright test -c tools/video-record/playwright.config.ts
# 3. Voice and the quiet piano bed, then the film.
python tools/video-audio/narrated_audio.py $V
NODE_PATH=e2e/node_modules node tools/video-build/build.mjs $V --check
NODE_PATH=e2e/node_modules node tools/video-build/build.mjs $V --frame 27 f.png
NODE_PATH=e2e/node_modules node tools/video-build/build.mjs $V --no-captions --fps 30 --crf 23
```

- **`shots.ts`** is written with the fixtures and page objects of `e2e/`: it imports `test` from
  `e2e/fixtures/jb-test.ts`, opens states by their key in `e2e/fixtures/routes.ts` (`jb.open`) or
  with a stub of `e2e/fixtures/`, and saves pictures with `shot`, `detail` and `bringToTop` from
  `tools/video-record/shots.ts`. `test.use(DESKTOP)` is a 1280×800 window and `test.use(PHONE)` a
  390×780 one, both at double density. `jb.goto` does not sign anyone in: call
  `jb.signInAs('member')` first, or use a stub that answers the session.
- **It is not a test run and not a sweep.** `tools/video-record/playwright.config.ts` only borrows
  Playwright to drive Chromium: it never sets `JB_SWEEPS`, `JB_BASELINE` or `JB_PARITY`, compares
  nothing, and is not part of `npm test`. Every `/api` request is answered from the recording or a
  stub, as in the behaviour specs (ADR 0009). It starts `npm start` in `frontend/` unless the app is
  already on `http://localhost:4200`.
- **The film** shows each picture in a frame drawn by `film.js` (`browser`, `phone`, `closeUp` in
  video 05) with a headline and the requirement it shows. A close-up is a `detail` shot enlarged:
  that is what makes small text readable at 1080p. Keep scenes at three bars; 72 BPM gives 10 s a
  scene, room for two sentences.
- **Say only what the branch does.** The narration uses the words of `docs/specs/` and follows
  `docs/scripture.md`; if it quotes the mission, it quotes it word for word. Name in the film's
  README what the pictures prove and what only the tests prove.
- **Size.** PNG screenshots are small (about 1.6 MB for video 05), and frames that hold still
  compress well: `--fps 30 --crf 23` gives about 6 MB for 80 s. Do not let a frame drift for a
  whole scene; it doubles the file. A demo's folder has a `.gitignore` for `narration.wav` and
  `music.mp3`, which `narrated_audio.py` writes again. Keep what is committed under about 15 MB.
- **Check before publishing:** `ffprobe` for 1920×1080 H.264 with audio and the expected length,
  and look at one frame per scene.

## The deck

`slides.html` loads `assets/pitch.css`, `assets/pitch.js` (the runtime) and the folder's `film.js`
(the scenes). The stage is 1920x1080. A film is a list of scenes of exactly three bars each
(7.2 s at 100 BPM; `data-bpm` on `<body>` sets the tempo), and every pixel is a pure function of
film time: the page plays live against the MP3, and the builder seeks it frame by frame through
`PITCH.seek(seconds)`. Nothing uses CSS animation or transition.

`film.js` calls `PITCH.film([{ id, build }])`. `build(S)` returns the scene's HTML; inside it:

| Helper | What it does |
|---|---|
| `S.ref((el, t) => …)` | Marks an element; the function runs on every frame with the scene-local time. |
| `S.words(at, text, { accent, accentClass, stagger })` | Masked word rise: each word slides up from behind its line, 300 ms, 50 ms stagger. |
| `S.rise(at)` | Fade and 24 px rise for supporting text and UI. |
| `S.drawnMark(size, { draw, bar })`, `S.wordmark(size, p)` | The J mark drawing itself and the "jubilee" wordmark rising letter by letter. |
| `S.wipe(p)` | The gold crossbar wipe: 0 off left, 0.5 covering, 1 off right. Marks a change of act. |
| `S.seal(size, spin)` | The Jubilee seal: the J mark in a ring of "Fruit that will last · Resource the Kingdom · In Jesus’ name". |
| `S.aurora(intensity, { horizon, colors })` | The WebGL aurora background. |
| `S.confetti(bursts, count)` | Canvas confetti, solved in closed form so any frame draws alone. |

`PITCH` also exposes the clock and the named curves: `b(n)` (beat n of a scene), `enter`, `exit`,
`prog`, `pulse`, `beatsBetween`, `brand`, `outBack`, `outExpo`, `inOutCubic`, `inQuart`.

Open `slides.html?guides=1` (or press `g`) for the safe areas, the timecode and the beat grid, and
`slides.html?t=22.8` to open paused on a film time.

**Fonts and photos.** Archivo is the repository's variable file with the width axis
(`docs/design-system/assets/fonts/Archivo.woff2`); headings are set at width 112. Inter is
`Inter.woff2` beside it (weights 400 to 600, Latin) and the photos are in `docs/assets/photos/`,
downloaded from the Magic Patterns design. The runtime waits for both before the first frame and
the builder stops if either fails to load.

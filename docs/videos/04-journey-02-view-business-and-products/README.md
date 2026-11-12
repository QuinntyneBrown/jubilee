# 04 · Journey 2: view a business and its products

> **Runtime:** 1:20 (80.00 s) · **Format:** 1920×1080, 30 fps, no captions · **Audience:** the team, and anyone reviewing journey 2

**Video:** [04-journey-02-view-business-and-products.mp4](04-journey-02-view-business-and-products.mp4) · [Live deck](slides.html) · **Audio:** [04-journey-02-view-business-and-products.mp3](04-journey-02-view-business-and-products.mp3) · [Transcript](script.md) · [Captions sidecar](captions.vtt)

## Why this video exists

A demo of what journey 2 ([`docs/journey.md`](../../journey.md), row 2) does now that it is
complete: the four things its last prompt added (`docs/prompts/02-view-business-and-products.md`,
ADR 0045). It is a demo of the implementation, so every picture is a screenshot of the running
Angular app, never a drawing of it. The film follows one product, the Gold cross stoneware mug of
Luzandre.com.

## Run sheet

Eight scenes of three bars each at 72 BPM (1 bar = 3.33 s, 1 scene = 10.0 s).

| # | Scene | In | Out | Pictures (`shots/`) | Requirement |
|---|---|---|---|---|---|
| 01 | Title | 0:00 | 0:10 | `shop-sold-out` | — |
| 02 | The owner is told | 0:10 | 0:20 | `owner-editor` → `owner-toast`, close-up `owner-toast-detail` | L2-036 AC3 |
| 03 | Sold out, in words | 0:20 | 0:30 | `shop-sold-out`, `shop-sold-out-phone`, close-up `shop-sold-out-detail` | L2-034 AC3 |
| 04 | A member asks | 0:30 | 0:40 | `product-sold-out` → `product-alert-requested` | L2-036 AC1, AC2 (built earlier; the step the notice answers) |
| 05 | Told in the app | 0:40 | 0:50 | `notice-toast` → `notifications`, close-up `notice-toast-detail` | L2-036 AC4, L2-064 AC6, L2-066 AC5 |
| 06 | And by e-mail | 0:50 | 1:00 | `email` | L2-036 AC5, L2-068 |
| 07 | The preview status | 1:00 | 1:10 | `preview-owner` → `preview-team`, close-ups of both banners | L2-219 |
| 08 | Close | 1:10 | 1:20 | The J mark, the wordmark and the mission, word for word | L0-001 |

The film fades up from ink and out to ink; the cuts between scenes are hard.

## What is real in the pictures

- **The app is the real one.** `shots.ts` opens the Angular app in Chromium and saves what it
  shows. Every `/api` request is answered as in the behaviour specs: from the recorded answers of
  the seeded API (`e2e/fixtures/api/responses.json`) or from the stubs of `e2e/fixtures/`
  (ADR 0009). No picture is edited.
- **The states are the ones the specs test.** The mug's sold-out card is the `shop.sold-out` route;
  the product page is the recorded mug answered as sold out, as `product-sold-out.spec.ts` does;
  the owner's toast is the product editor saving a stock of 0; the notification is pushed over the
  member's event stream, as `notifications.spec.ts` does; the previews are the `business.preview`
  route and the same listing answered for the verification team.
- **The e-mail is rendered by the backend's own code.** `tools/video-record/render-email.fsx`
  calls `Jubilee.Application`'s `EmailLayout.Render` on [`email.txt`](email.txt), the body
  `StockAlertNotifier` queues, with the mug's and the shop's names. The film shows that HTML.
- **What the film does not show:** a live API or a mail provider. That the notice is created once,
  only for members who asked, and that the e-mail follows "Request updates" is proved by
  `BackInStockTests`, not by a picture.
- The frames around the pictures (browser bar, phone, mail header) and the headlines are drawn in
  `film.js`. The address bar says `app.jubilee.to`; the pictures were taken on `localhost:4200`.

## Sound

- **Voice:** Kokoro-82M, `af_heart`, run locally, every phrase at speed 1.0.
- **Music:** the quiet synthesized piano-and-pad bed of `narrated_audio.py` (D, Bm, G, A, one chord
  a bar at 72 BPM), about 20 dB under the voice and ducked a further 6 dB while it speaks.
- **Mix:** −14 LUFS, peaks under −1 dB.

## Rebuild

From the repository root, with the app's dependencies installed (`npm ci --prefix frontend`,
`npm ci --prefix e2e`). The steps are those of "A demo built from screenshots" in
[`../README.md`](../README.md).

```sh
V=docs/videos/04-journey-02-view-business-and-products
dotnet build backend/src/Jubilee.Application -c Release
dotnet fsi tools/video-record/render-email.fsx "Gold cross stoneware mug is back in stock" $V/email.txt $V/shots/email.html "https://app.jubilee.to/api/email/unsubscribe/demo"
JB_VIDEO_DIR=$V NODE_PATH=e2e/node_modules e2e/node_modules/.bin/playwright test -c tools/video-record/playwright.config.ts
python tools/video-audio/narrated_audio.py $V
NODE_PATH=e2e/node_modules node tools/video-build/build.mjs $V --check
NODE_PATH=e2e/node_modules node tools/video-build/build.mjs $V --frame 27 f.png
NODE_PATH=e2e/node_modules node tools/video-build/build.mjs $V --no-captions --fps 30 --crf 23
```

The capture takes about 15 seconds once the app is being served, the audio about a minute and the
render about six minutes. The MP4 is about 6 MB. `narration.wav` and `music.mp3` are written by the
audio step and not committed (`.gitignore`).

## Checks worth repeating after a change

- Frames at 8, 17, 27, 38, 48, 58, 68 and 78 s: every close-up is readable, no headline runs under
  a frame, and the pictures show a signed-in member (Joanna, "JA") or the owner (Naomi, "NL").
- No narration runs into the next scene (`--check` prints the spoken times).
- The mission in scene 08 and in `narration.json` is `docs/specs/L0.md`, word for word.
- The wordmark is lowercase "jubilee" in Archivo 700 at 110% width and −0.03em tracking.

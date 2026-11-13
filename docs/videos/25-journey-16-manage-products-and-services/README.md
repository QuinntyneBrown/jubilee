# 25 · Journey 16: Manage products and services

> **Runtime:** 1:29 · **Format:** 1920×1080, 30 fps, captions burned in · **Audience:** the repository owner and reviewers of journey 16

**Video:** [25-journey-16-manage-products-and-services.mp4](25-journey-16-manage-products-and-services.mp4) · **Audio:** [25-journey-16-manage-products-and-services.mp3](25-journey-16-manage-products-and-services.mp3) · [Transcript](script.md) · [Captions sidecar](captions.vtt)

## What it shows

The run of `docs/prompts/16-manage-products-and-services.md`, which took journey 16 from 90% to 100%
(ADR 0063). Naomi's Products for Luzandre.com reads "4 products · 1 sold out"; each row has a drag
handle beside the move arrows, and the line under the table says "Drag a product by its handle, or
use the arrows, to change the order." (`L2-090` AC2). "Add product" opens the editor with "Add
photo" and "JPG or PNG, 5 MB at most"; the chosen photo shows beside "Change photo" (`L2-091` AC9).
She gives a minimum order of 2 and two sizes, each with its own stock (`L2-091` AC8), and saves:
"Gold cross travel mug (min. 2)" is listed with its photo and the toast "Product added" offers
"View in shop". She drags "Morning mug, set of two" by its handle to the top. A member opens the
tee's product page and sees its photo in place of the tile (`L2-091` AC10), and a saved product the
shop deleted reads "No longer available" in the member's Saved list (`L2-092` AC2). Two cards say
what the tests prove behind the screen and close the journey.

## What the pictures prove, and what only the tests prove

The app is answered from the stand-ins of the behaviour specs (`e2e/fixtures/catalogue.ts` and
`e2e/fixtures/saved.ts`, ADR 0009); every `/media/…` rendition is the mug of the design reference,
except the tee's, which is its tee. The pictures prove what the browser does: the photo control and
its preview, the options and the minimum order, the row with its photo, the drag and its saved
order, the photo on the product page and the "No longer available" card.

Only the tests prove what the server does:

- that a photo is checked (type, 5 MB, pixel size) and scanned before it is stored under a random
  name, that an infected one is refused and an unavailable scanner answers 503, that an owner may
  upload at most `CatalogueRules.PhotosPerHour` (30) an hour, and that a photo of another listing is
  refused on save (`CatalogueTests`, `L2-091` AC9, `L2-138` AC1, AC3, AC6). Said on a card;
- that options and the minimum order are stored and checked (`CatalogueTests`, `L2-091` AC8), and
  that a deleted product answers unavailable on members' saved lists (`L2-092` AC2). Said on a card;
- that a draft listing's products and services are managed and its header gives its stage, and that
  50 services is the most (`CatalogueTests`, `catalogue.spec.ts`, `L2-097` AC3, `L2-093` AC3). Said on
  a card.

Jubilee takes no payment: members pay the business directly.

## Run sheet

| # | Scene | In | Out | Picture |
|---|---|---|---|---|
| 01 | `intro` | 0:00 | 0:10 | Card: "Journey 16 · Manage products and services", from 90% to 100% |
| 02 | `products` | 0:10 | 0:21 | Products: the summary, a row, its drag handle and the drag help line (L2-090 AC2) |
| 03 | `photo` | 0:21 | 0:30 | "Add product": "Add photo", the chosen photo beside "Change photo", name and price (L2-091 AC9) |
| 04 | `options` | 0:30 | 0:42 | Minimum order 2, "What the options choose": Size, 12 oz and 16 oz with their stock (L2-091 AC8) |
| 05 | `saved` | 0:42 | 0:49 | The new row with its photo and "(min. 2)"; the toast "Product added" |
| 06 | `drag` | 0:49 | 0:56 | "Morning mug, set of two" dragged by its handle to the top (L2-090 AC2) |
| 07 | `page` | 0:56 | 1:03 | The tee's product page with its photo in place of the tile (L2-091 AC10) |
| 08 | `deleted` | 1:03 | 1:10 | Saved: "Leather journaling Bible, ESV · No longer available" (L2-092 AC2) |
| 09 | `behind` | 1:10 | 1:20 | Card: the photo checks and scan, the hourly limit, options, saved lists, drafts and the services limit |
| 10 | `close` | 1:20 | 1:29 | Card: journey 16 complete; Jubilee takes no payment |

## Rebuild

```sh
pip install edge-tts
node tools/video-demo/build.mjs docs/videos/25-journey-16-manage-products-and-services --check   # speak the lines, print their lengths
node tools/video-demo/build.mjs docs/videos/25-journey-16-manage-products-and-services           # record and encode
```

`narration.json` holds the lines and `demo.spec.ts` drives the app, one `demo.scene` per line. The
builder and its helpers are described in [`../README.md`](../README.md), "How a demo video is
built".

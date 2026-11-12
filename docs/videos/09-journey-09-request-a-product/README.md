# 09 · Journey 9: Request a product

> **Runtime:** 2:36 (155.7 s) · **Format:** 1920×1080, 30 fps, captions burned in · **Audience:** the repository owner and reviewers of journey 9

**Video:** [09-journey-09-request-a-product.mp4](09-journey-09-request-a-product.mp4) · **Audio:** [09-journey-09-request-a-product.mp3](09-journey-09-request-a-product.mp3) · [Transcript](script.md) · [Captions sidecar](captions.vtt)

## What it shows

The run of `docs/prompts/09-request-a-product.md`, which took journey 9 from 95% to complete. The
audit found no missing behaviour, only criteria without a test, so the video walks the journey in
the app itself: a member opens a product of Luzandre.com, chooses a size and a quantity, and sends
the shop an order request, without payment (`L2-046`). The dialog shows the shop's delivery
methods, the address a shipped request needs, and an estimate that follows the choice; it is then
driven by the arrow keys, and after sending the focus is on "View request", the one gap the run
found and closed. The order endpoints are answered by the fake of `e2e/fixtures/order.ts`, as in
`request-item.spec.ts`, and the owner's Incoming requests by the recorded API (ADR 0009): the
requests listed there are the recording's, not the one just sent. Three cards say what the run
proved behind the screen: who is told when an order is sent (`OrderRequestTests.cs`,
`EventStreamTests.cs`), what confirming does and the order card in the conversation
(`OrderRequestTests.cs`), and what is left for the owner (ADR 0017, amended).

## Run sheet

| # | Scene | In | Out | Picture |
|---|---|---|---|---|
| 01 | `intro` | 0:00 | 0:13 | Card: "Journey 9 · Request a product" |
| 02 | `product` | 0:13 | 0:25 | The Faith heavyweight tee of Luzandre.com: size M, quantity 2, "Request this item" |
| 03 | `dialog` | 0:25 | 0:39 | "Request this item": "No payment now. Luzandre.com confirms and you pay them directly.", the summary and the delivery methods |
| 04 | `ship` | 0:39 | 0:53 | "Ship to me": the address prefilled; Item $68.00, Shipping $9.00, Estimated total $77.00 + tax |
| 05 | `pickup` | 0:53 | 1:02 | "Pick up in Leslieville": no address, Shipping Free, $68.00 + tax |
| 06 | `keyboard` | 1:02 | 1:14 | The arrow keys move between the delivery methods |
| 07 | `send` | 1:14 | 1:32 | A note, "Send request": "Request sent to Luzandre.com" with "Keep shopping" and "View request" |
| 08 | `owner` | 1:32 | 1:42 | `/my-business/requests` of Luzandre.com from the recorded API: the "New" tab, "Decline" and "Confirm" |
| 09 | `told` | 1:42 | 2:03 | Card: `L2-046` AC8 in `OrderRequestTests.cs`, `L2-070` in `EventStreamTests.cs` |
| 10 | `confirmed` | 2:03 | 2:15 | Card: `L2-052` AC2 and AC4, `L2-057` AC8 in `OrderRequestTests.cs` |
| 11 | `close` | 2:15 | 2:35 | Card: journey 9 is complete; the sweeps are left for the owner |

## Rebuild

```sh
pip install edge-tts
node tools/video-demo/build.mjs docs/videos/09-journey-09-request-a-product --check   # speak the lines, print their lengths
node tools/video-demo/build.mjs docs/videos/09-journey-09-request-a-product           # record and encode
```

`narration.json` holds the lines and `demo.spec.ts` drives the app, one `demo.scene` per line. The
builder and its helpers are described in [`../README.md`](../README.md), "How a demo video is
built".

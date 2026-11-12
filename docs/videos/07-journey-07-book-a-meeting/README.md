# 07 · Journey 7: Book a meeting

> **Runtime:** 2:47 (166.8 s) · **Format:** 1920×1080, 30 fps, captions burned in · **Audience:** the repository owner and reviewers of journey 7

**Video:** [07-journey-07-book-a-meeting.mp4](07-journey-07-book-a-meeting.mp4) · **Audio:** [07-journey-07-book-a-meeting.mp3](07-journey-07-book-a-meeting.mp3) · [Transcript](script.md) · [Captions sidecar](captions.vtt)

## What it shows

The run of `docs/prompts/07-book-a-meeting.md`, which took journey 7 from 95% to complete. In the
app itself, an owner opens "Meeting hours" on My services, ticks the days, is told when "Until" is
not after "From", and saves; then a member books a business that saved those hours and is offered
only the times inside them, fewer for a longer service and none on a day that is not met
(`L2-220`). The owner's endpoints are answered by the fake of `e2e/fixtures/catalogue.ts` and the
booking endpoints by `e2e/fixtures/booking.ts`, as in `meeting-hours.spec.ts` and
`book-meeting.spec.ts` (ADR 0009); the two halves are two businesses (Luzandre.com and Legacy
Financial) given the same hours. Three cards say what the run settled behind the screen: the rules
the API enforces (`MeetingHoursTests.cs`), the two criteria of `L2-044` that gained a test, and
what is left for the owner (ADR 0047).

## Run sheet

| # | Scene | In | Out | Picture |
|---|---|---|---|---|
| 01 | `intro` | 0:00 | 0:12 | Card: "Journey 7 · Book a meeting" |
| 02 | `services` | 0:12 | 0:26 | `/my-business/services` of Luzandre.com with the new "Meeting hours" button |
| 03 | `dialog` | 0:26 | 0:39 | The "Meeting hours" dialog: Days, From, Until, "A time every" |
| 04 | `days` | 0:39 | 0:47 | Monday, Wednesday and Friday unticked, Saturday ticked |
| 05 | `invalid` | 0:47 | 0:58 | From 10:00, Until 09:00, "Save hours": "Choose a time after 10:00 a.m." |
| 06 | `saved` | 0:58 | 1:06 | Until 12:00, saved: toast "Meeting hours saved" |
| 07 | `member` | 1:06 | 1:22 | "Book a meeting with Legacy Financial": Thursday 12 November offers 10:00, 10:30, 11:00 and 11:30 a.m. |
| 08 | `longer` | 1:22 | 1:29 | The 60-minute review: 11:30 a.m. is no longer offered |
| 09 | `closed` | 1:29 | 1:38 | Friday 13 November: "Trevor can’t meet on that day. Trevor meets Tuesday, Thursday and Saturday." |
| 10 | `send` | 1:38 | 1:50 | Thursday at 10:30 a.m., sent: "Request sent to Legacy Financial" |
| 11 | `rules` | 1:50 | 2:11 | Card: the API decides (`L2-220` AC4, AC5), `MeetingHoursTests.cs` |
| 12 | `proved` | 2:11 | 2:27 | Card: `L2-044` AC6 in `book-meeting.spec.ts`, `L2-044` AC5 in `BookingTests.cs` |
| 13 | `close` | 2:27 | 2:46 | Card: journey 7 is complete; the sweeps are left for the owner |

## Rebuild

```sh
pip install edge-tts
node tools/video-demo/build.mjs docs/videos/07-journey-07-book-a-meeting --check   # speak the lines, print their lengths
node tools/video-demo/build.mjs docs/videos/07-journey-07-book-a-meeting           # record and encode
```

`narration.json` holds the lines and `demo.spec.ts` drives the app, one `demo.scene` per line. The
builder and its helpers are described in [`../README.md`](../README.md), "How a demo video is
built".

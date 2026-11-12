# Answer a moment check-in

## Overview

Jubilee is Toronto's Christian marketplace. Two moments matter most to a member:
sending a request to a business and submitting a listing for verification. Right
after either, the confirmation asks one question about how easy it was. This
feature covers that question, the follow-up for a low score and the way the
answer is stored.

The terms below are local to this feature.

- **moment** — point at which the question is asked: `request-sent` or `listing-submitted`
- **check-in** — one answer to the question of one confirmation: a score of 1 to 5 and an optional note
- **score** — one of the five choices between "Very hard" and "Very easy"
- **low score** — score of 3 or less, which asks "What got in the way?"
- **check-in id** — identifier the app makes once per confirmation and under which every change of the answer is stored

The question is a courtesy on a success screen. A member who ignores it stores
nothing. An answer that cannot be stored says nothing and blocks nothing
(`L2-211` criterion 6). A check-in is not listed under "Your feedback"
(`L2-213` criterion 6). The decisions behind the feature are recorded in
ADR 0043.

## Description

The feature is a vertical slice from four confirmations to the `Feedback` table.

- **`jb-moment-check`** — new component of the `components` library
  (`moment-check/`). It takes the question as an input and shows
  `jb-score-scale` between the words "Very hard" and "Very easy". It emits the
  chosen score and, for a low score, the note. It has three views: the question,
  the question with the field "What got in the way?" and the button "Send", and
  "Thanks, that helps us." The note is optional and the field holds it to
  1,000 characters. The component makes no request.
- **`jb-score-scale`** — new component of the `components` library
  (`score-scale/`). Five native radio inputs in one group draw the scores 1 to
  5, so the arrow keys and assistive technology work without script (ADR 0035,
  `L2-158`). The feedback page reuses it for the four area scores
  (`send-feedback-from-page`).
- **Placement after a request** — the success views of `BookMeetingDialog`,
  `RequestQuoteDialog` and `RequestItemDialog`
  (`frontend/projects/jubilee/src/app/dialogs/book-meeting/`, `request-quote/`,
  `request-item/`) render `jb-moment-check` with the question "How easy was it
  to send your request?" and the moment `request-sent`.
- **Placement after a listing** — the submitted view of `ListBusinessPage`
  (`frontend/projects/jubilee/src/app/pages/list-business/`) renders
  `jb-moment-check` with the question "How easy was it to list your business?"
  and the moment `listing-submitted`.
- **Check-in id** — each of the four containers holds a `MomentCheckIn`
  (`frontend/projects/jubilee/src/app/services/moment-check-in.ts`), which makes
  one id with `newKey()` and keeps the score and whether thanks are shown. Choosing a score, choosing
  another score and sending the note all address that id, so one answer is kept
  per confirmation and nothing is stored twice. No idempotency key is used
  (ADR 0043).
- **Choosing a score** — the container calls `FeedbackApi.saveCheckIn(id,
  { moment, score })` at once. A score of 4 or 5 shows "Thanks, that helps us."
  A score of 3 or less shows the field and "Send". Choosing another score sends
  the same call with the new score, which replaces the first.
- **Sending the note** — "Send" calls `FeedbackApi.saveCheckIn(id, { moment,
  score, note })` and shows "Thanks, that helps us."
- **Silent failure** — the container ignores every error of `saveCheckIn`: a
  lost connection, a timeout, HTTP 429 and HTTP 5xx. No alert, toast or busy
  state is shown, the view advances as if the answer were stored, and the
  confirmation behaves as before (`L2-211` criterion 6).
- **`FeedbackApi.saveCheckIn`** — method of the `FeedbackApi` contract
  (`FEEDBACK_API`, `HttpFeedbackApi`). It sends
  `PUT /api/feedback/check-ins/{id}` with the moment, the score and the optional
  note.
- **`FeedbackController`** — ASP.NET Core controller at `api/feedback`. The
  `PUT` action takes the member from the session and sends `SaveCheckInCommand`.
- **`SaveCheckInCommand`** and its handler — MediatR command in
  `Jubilee.Application/MemberFeedback/`. The handler validates the moment, the score
  and the note. It creates a `Feedback` of kind `CheckIn` with the given id, or
  replaces the score and the note when the id is a check-in of the same member.
  An id that belongs to another member's feedback answers 404 (`L2-133`). The
  handler refuses a new check-in past 30 in an hour per member with 429 and
  `Retry-After`; replacing an existing check-in is not counted.
- **`Feedback`** — domain entity (`Jubilee.Domain/Feedback.cs`). A check-in
  holds `Kind` `CheckIn`, the `CheckInMoment` (`RequestSent`,
  `ListingSubmitted`), the score in `Rating` and the note in `Note`. The fields
  of the other kinds stay null.

## Requirements

The feature realizes the following level-2 (L2) requirements. Each L2
requirement refines a level-1 (L1) requirement, cited by identifier.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-211` | `L1-029` | Right after a member sends a request or submits a listing, one question shall ask how easy it was. |

## Diagrams

### System context

A member who has just sent a request or submitted a listing answers one question
in Jubilee.

![C4 system context for answering a moment check-in](diagrams/c4-context.png)

### Containers

`Jubilee Web` asks the question on the confirmation and puts the answer to
`Jubilee API`, which stores it in `Jubilee database`.

![C4 container view for answering a moment check-in](diagrams/c4-container.png)

### Components

Four containers place `jb-moment-check`, which shows `jb-score-scale`. Each
container saves through `FeedbackApi` to the `PUT` action of
`FeedbackController`, which sends `SaveCheckInCommand`.

![C4 component view for answering a moment check-in](diagrams/c4-component.png)

### Class structure

`SaveCheckInCommand` carries the id the app made. The handler creates or
replaces one `Feedback` of kind `CheckIn` with a `CheckInMoment`.

![Class diagram for answering a moment check-in](diagrams/class-structure.png)

### Behaviour — answer the question

Each change of the answer is the same `PUT` to the same id. A high score ends
with the thanks, a low score asks for a note, and a failure is silent
(`L2-211`).

![Sequence diagram for answering a moment check-in](diagrams/sequence-answer-check-in.png)

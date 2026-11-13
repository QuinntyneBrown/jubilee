# 22 · Journey 14: Track and cancel requests

The transcript, written from `narration.json` by `tools/video-demo/build.mjs`.

Journey fourteen: track and cancel requests. A member follows each request and cancels one that is still open.

Your requests lists every booking, quote and order, open ones first, with how many are awaiting a reply.

The page now listens to Jubilee's event stream. When WaterWorks confirms, the row changes a second later, with one toast.

A confirmed order now offers the owner Mark fulfilled. The dialog names the customer, the order and the total, with Not yet first.

Marking it fulfilled closes the order. The customer is told in the app and by e-mail, and their request reads Completed.

A member watching their order sees it complete the moment the shop marks it, with no reload.

A request nobody answered for a week offers cancel or ask again.

Cancel request asks first. The business is told straight away, and Undo opens the request again.

Behind the screen, the tests prove the owner is told in the app of a cancel and its withdrawal, and the request jobs run once per schedule.

Journey fourteen is complete. Jubilee takes no payment: members pay the business directly.

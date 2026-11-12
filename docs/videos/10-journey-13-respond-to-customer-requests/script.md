# 10 · Journey 13: Respond to customer requests

The transcript, written from `narration.json` by `tools/video-demo/build.mjs`.

Journey thirteen: respond to customer requests. An owner sees the requests customers sent, and confirms or declines each one. This run takes the journey from ninety percent to complete.

Naomi owns Luzandre.com. Incoming requests shows three new ones: two orders and a quote request, each with Decline and Confirm.

New in this run, the page listens to the event stream instead of asking every five seconds. Grace sends a booking request, and it is on the page at once, announced in one toast, not two.

Naomi confirms Samuel's order, and closes the dialog with Escape before the answer is back. This time the answer is a failure.

She is still told. A danger toast says: couldn't confirm the order. Samuel's request is still new. It stays until she dismisses it, or presses Try again.

Try again confirms the same request from the page. Order confirmed, Samuel has been told, and Undo is offered as usual.

The decline dialog now opens on Keep request, the safe choice. Naomi writes to David and declines, but David cancelled a moment earlier.

So the dialog closes, the list is read again, and a toast says why: request not declined. David Chen cancelled this request.

An owner who answers within a day keeps the Replies fast badge. Members now see it: on the listing page beside the credentials, and on the business card.

Behind the screen. While the event stream cannot connect, the page asks every five seconds, and stops the moment the stream is back. While it is connected, no timer runs.

The job that awards the badge now runs once per hour, however many instances are up, and records its last success. And the tests now assert that the customer is told of a confirmation and of a decline.

Journey thirteen is complete. Left for the owner: the visual, responsive and accessibility sweeps, and the migration that adds the job runs table. Retries and the dead-letter queue belong to the background jobs design.

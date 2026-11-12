# 14 · Journey 17: Stay notified

The transcript, written from `narration.json` by `tools/video-demo/build.mjs`.

Journey seventeen: stay notified. A member receives events through the notification centre, toasts, banners and e-mail. This run takes the journey from eighty-nine percent to complete.

This is the notification centre. One line is new in this run: New in Shops, Flower Creations. When a business is approved for the first time, members who browsed its category in the last ninety days are told.

A notification that arrives while the app is open rises as a toast. It leaves after eight seconds, but while the pointer rests on it, or the focus is in it, the timer holds.

Marking all as read fails here, and the error is an alert that stays until it is dismissed. At most three toasts show. A fourth pushes out the oldest, and never the error.

Now the server refuses the event stream, and the browser gives up on it. The app opens the stream again by itself after five seconds, from the last event it received, so the next notification still arrives, and nothing is shown twice.

In notification settings, How often now does what it says. The member chooses one daily summary, and it saves at once.

From then on, e-mails about messages and requests are held. At seven in the morning, Toronto time, a job sends one e-mail that lists them in order. Meeting reminders and e-mails about sign-in and security are never held.

Two more jobs send the e-mails a member can ask for. On Monday morning, a weekly note lists the businesses that joined in the categories a member browsed. On the first of the month, an owner of a public listing gets the next of four tips. Each carries Jubilee's mailing address.

Every notification e-mail ends with an unsubscribe link. It now opens a page, without signing in. The page turns that one category off, and says what stops and what still reaches the member in Jubilee.

The link of a daily summary turns off new messages and request updates together, and the page says so. A link that does not verify changes nothing, and says that too.

Behind the screen, the event stream is measured. In the API's tests, twenty notifications each reach an open stream, and ninety-five in a hundred must arrive within two seconds.

Journey seventeen is complete. Left for the owner: set the mailing address in production, run the migration, measure delivery in production, and run the sweeps.

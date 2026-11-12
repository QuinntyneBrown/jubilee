# 06 · Journey 5: Sign in and out

The transcript, written from `narration.json` by `tools/video-demo/build.mjs`.

Journey five: sign in and out. A member signs in, stays signed in safely, and signs out. This run takes the journey from seventy-six percent to complete.

A visitor on Legacy Financial's page presses Message. Jubilee asks them to join or sign in first, and remembers what they started.

They sign in, and they are back on the same listing with the message dialog open. The same holds for booking a meeting, asking for a quote and requesting an item.

A save works the same way. A visitor presses the heart and signs in. The business is saved once, and the heart shows it.

Now a draft. A member writes a message to Trevor. Before they send it, the session ends on the server.

They press Send. The app keeps what they typed on this device, closes the dialog and opens the session-expired page. The Sign in link carries the address to return to.

After signing in, the dialog is open again with the message in it, and a notice says: We kept what you typed. Nothing is sent until the member presses Send.

Every form a member writes in keeps its draft this way: requests, the reply box of a conversation, a report, feedback, the profile and the owner's editors. A draft holds no password and no file, stays on the device for thirty days, is restored once, and is removed when a different member signs in.

On the account page, the Sign out section now says where the member is signed in: on this phone and one other device. Sign out of other devices asks first.

They confirm. Every other session ends, this one stays, and the section says: signed in on this phone only. The button is no longer offered.

Sign out asks too. It ends this session only and lands on the welcome page. An unsent draft is kept at sign-out and returns to the same member.

Behind the screen, two more criteria are proved. When several calls are refused for one ended session, together or one after another, the session-expired page opens once.

And outside development the session cookie is now issued with the host prefix: secure, HTTP-only, same-site lax. The app, the marketing site and the admin application each call the API on their own origin, so no other origin is approved. Seventeen API test cases prove both.

Decision record forty-six holds these decisions, and journey five is complete. Left for the owner: the visual, responsive and accessibility sweeps. The list of sessions with their location belongs to journey twenty, and token redaction in logs to journey four.

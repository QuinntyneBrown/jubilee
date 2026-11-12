# 06 · Journey 4: Join Jubilee

The transcript, written from `narration.json` by `tools/video-demo/build.mjs`.

Journey four: join Jubilee. A visitor creates an account by e-mail or Google and confirms the address. This run finishes what was left.

A member who has just joined can browse, search and save. Until the address is confirmed, a banner on every signed-in page says where the link went.

If the address was mistyped, Change e-mail now opens a dialog. It asks for the new address and no password, because the address is not proven yet.

The new address replaces the unconfirmed one. Earlier links stop working, a new link goes out, and the banner names the new address.

An address that another account already uses is not taken. The dialog says so beside the field, and the member keeps the address they had.

Send it again works five times an hour. After that nothing more is sent, and the banner says how long to wait.

Behind the screen, a token in a request path is now written to the logs as redacted. And the member session cookie carries the Host prefix; a cookie under the earlier name is removed, and the member signs in again.

Journey four stands at ninety-eight percent. One step is left for the owner: the keys of the bot challenge in Azure.

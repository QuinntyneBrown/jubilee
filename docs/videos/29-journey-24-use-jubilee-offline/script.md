# 29 · Journey 24: Use Jubilee offline

The transcript, written from `narration.json` by `tools/video-demo/build.mjs`.

Journey twenty-four: use Jubilee offline. New in this run: Jubilee opens with no connection, sends what was written even when it is closed, and leaves nothing behind at sign-out.

The service worker keeps the app shell on the device. With the connection gone, the page loads again: Jubilee opens, with the directory saved at nine. Search waits for a connection.

A conversation already opened is still readable. A message written now is kept on the device, marked Waiting to send.

When the connection returns, it is sent with its idempotency key, and the banner says one saved message was sent.

If Jubilee is closed by then, Background Sync wakes the service worker, which sends the queue in order.

On a slow connection, a warning says so. A save still sending is tried again, for up to a minute, until it goes through.

Signing out removes the saved pages and any message still waiting, so nothing personal stays on the device.

The tests also prove that the service worker never keeps an answer of the API, that nothing it sent is sent twice, and that a message waiting a day is marked Not sent.

What is left is the owner's: the address of a status page for Check status.

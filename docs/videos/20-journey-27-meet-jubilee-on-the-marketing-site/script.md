# 20 · Journey 27: Meet Jubilee on the marketing site

The transcript, written from `narration.json` by `tools/video-demo/build.mjs`.

Journey twenty-seven: meet Jubilee on the marketing site. Jubilee is still launching soon, and the owner has not yet decided to open it. So this run did the part that does not wait on launch: every criterion of the marketing page, the pitch film and the site's delivery now has a behaviour spec.

A visitor opens the marketing site. The top bar and the opening say Launching soon, and beside the heading stands a preview of the app.

This visitor uses the keyboard. Tab moves through the top bar and the opening to the film's play button. Enter plays the film from the start, and the film takes the focus.

The sound is off. The narration is still readable, because the captions are part of the picture. A new spec reads the caption box under the picture at a line in each chapter, and was first seen failing against a film without captions.

Because the film has the focus, the browser's own controls answer the keyboard: Space pauses it. Tab goes through those controls to the chapters, and Enter on Finding someone you can trust plays the film from twenty-one seconds, marked as the current chapter.

Straight after the film, the page states the mission, word for word: Jubilee helps Christian business owners in Toronto do well in business and use what they earn to support God’s work. We do this because we love Jesus and stay close to Him.

Every heading reads as one sentence to a screen reader, and its second part is set in the accent colour. That criterion had no spec before; now it does.

Tab reaches every link, button and field of the page in reading order, twenty-eight stops from Skip to content to the last button, and every stop shows a focus ring.

This visitor prefers reduced motion. Watch the film jumps to the film instead of scrolling smoothly, and pressing play gives way to the film at once, without a zoom.

And on a device set to dark, the page stays in its light theme, cream paper and ink type, as the design asks. Specs now hold it on a light device and a dark one.

Each new spec was seen failing against a broken page before it was relied on. The whole behaviour suite passes, with the parity specs.

What is left waits on the owner. On the day the owner decides to open Jubilee, the journey twenty-seven prompt brings back the links to the app from one configured address. Until then the journey stands at ninety-five percent.

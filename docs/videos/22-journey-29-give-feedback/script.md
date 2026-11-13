# 22 · Journey 29: Give feedback

The transcript, written from `narration.json` by `tools/video-demo/build.mjs`.

Journey twenty-nine: give feedback. A member rates Jubilee, reports a bug or sends kudos from any screen, answers a check-in, and follows what became of it. This run closed the last tests of the feedback requirements, L2-210 to L2-214.

Joanna is signed in on Browse. At the bottom right is the Feedback launcher. It opens by a click, a tap, Enter or Space; new specs now prove Space and touch, and that the feedback page and the error pages show no launcher.

The panel asks how Jubilee is working for her so far. Five stars, each with its word. She chooses four, Good, and the note asks what's working well. Send rating, and the panel thanks her by name.

Report a bug asks what went wrong, and says what will be attached: the screen she is on, her browser and device, and the app's version.

Kudos are chips, as many as she likes, each saying whether it is pressed. On a touch screen a chip can now be pressed over forty-four pixels, while it is still drawn thirty-two pixels tall. That was the one defect this run found, and fixed.

After a meeting request, the confirmation asks one question: how easy was it to send your request? A low score asks what got in the way. The question is a courtesy, never an error on a success screen.

The full form is the feedback page. Rate asks about the whole of Jubilee and then each part of it, and she can skip any part she hasn't used.

Beside the form, Your feedback lists what she sent, newest first: each with its date, its status in words, the reference of a bug report and the team's reply.

Behind it, the API answers only the member of the session. New tests prove that a PNG screenshot is cleaned and stored, that kudos sent twice with the same key are stored once, and that the list never carries what was written.

For a member who prefers reduced motion, the launcher and the panel now appear without movement, and a spec holds it. Each new spec was first seen failing against broken code.

The parity specs of the six feedback components will compare with the Magic Patterns design the moment the owner saves its captures, by name, with no change to a spec. ADR 0060 records it.

What is left is the owner's: export the Feedback captures, and run the sweeps by hand. Journey twenty-nine stands at ninety-nine percent.

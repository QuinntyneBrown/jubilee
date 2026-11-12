# Caleb's onboarding journey

[Back to Caleb Wright](README.md)

## How Caleb finds Jubilee

After a finance committee meeting, the church's roofer, a client of Caleb's, sends him the elevator
pitch on WhatsApp with the message that goes with it. The one page arrives as an image. VoiceOver
reads "image" and nothing else, so Caleb asks him to paste the words, then opens jubilee.to on his
laptop that evening.

## Steps

| Step | What Caleb does | What Jubilee shows | What Caleb thinks or feels |
|---|---|---|---|
| 1 | Opens the marketing site with NVDA and lists the headings | "Toronto’s Christian businesses, in one place.", "Start browsing", "Watch the film", "Free for members · Every business verified" | The heading order makes sense. A good first sign |
| 2 | Presses the button "Play the Jubilee film" (1:04) | The film with the browser's own controls and three chapters; the current one carries `aria-current` | He hears the narration and can jump by chapter. He learns later that the captions are part of the picture: no text his braille display can read, and nothing tells him what is shown |
| 3 | Follows "List your business free" | `/join`: "Join Jubilee", "Free for everyone in Toronto’s Christian community." "Continue with Google" first, then the fields | He braces for a picture CAPTCHA. The bot challenge is invisible and asks him nothing. Relief |
| 4 | Types his name, e-mail and a password; leaves Home church for later | "At least 10 characters." is read with the field; the show-password button has a name | He leaves the checkbox unticked on purpose, to test the errors |
| 5 | Submits with two mistakes | A summary, "Fix 2 things to continue", with a link to each field; focus moves to the summary | "Somebody tested this." He fixes both and ticks "I am 18 or older and agree to Jubilee’s statement of faith and terms." |
| 6 | Opens the confirmation e-mail on his iPhone | "Check your e-mail", then "E-mail confirmed" with "Start browsing" and "List your business" | The link works once, for 24 hours. He confirms at once |
| 7 | Chooses "List your business" and fills in `/list` (see [profile setup](profile-setup-journey.md)) | "What do you offer?", the form, and the live preview "How members see you" marked "Pending verification" | Friction: he cannot tell what the preview looks like, only what it says. He trusts the text |
| 8 | Presses "Submit for verification" | "Wright Bookkeeping is in for verification. Nothing more to do right now. We'll e-mail you the moment you're live." and "How easy was it to list your business?" | He scores it 4. The form was easy; the photo still ahead of him is not |
| 9 | Next day, reads a request for changes: the listing needs a photo | The verification team checks "At least one photo of the products or work" | Friction: bookkeeping is not a visual trade, and he cannot judge a photo. Denise takes one of his desk; he writes the alt text himself |
| 10 | Two days after submitting, gets the e-mail that he is live; a week later a daycare owner books a meeting | Incoming requests with "Decline" and "Confirm"; a notification and an e-mail | He confirms from the keyboard in under a minute. First valuable moment |

## Where it could go wrong

- The pitch arrives as an image with no text. Caleb only got further because a friend pasted the
  words. Many blind owners would stop there.
- The live preview and the "{n} / 90" counter update as he types. If each change is announced, the
  form becomes noise; if none is, he cannot check his own listing.
- One unlabelled control in a dialog (the day and time in "Book a meeting", the photo reorder
  buttons) would be enough for him to stop trusting the rest.
- Other owners' photos with the default alt text, "{business} photo {n}", tell him nothing when he
  is the one hiring a roofer.

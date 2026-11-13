# 26 · Journey 18: Recover a forgotten password

The transcript, written from `narration.json` by `tools/video-demo/build.mjs`.

Journey eighteen: recover a forgotten password. A member who has lost their password asks for a link by e-mail and chooses a new one.

At forgot password, the visitor enters their e-mail and presses Send reset link. The answer is the same whether or not the address has an account, and the link works for sixty minutes.

New in this run: a fourth request for one address within an hour is refused. The form stays and says when to try again, and it says the same for every address.

The link opens Choose a new password, for the account's address. The page takes the token out of the address bar as soon as it reads it.

A password of five characters is refused with the rule it broke.

A good password is saved. Every other session ends, and a security e-mail tells the holder their password changed.

Behind the screen, the tests prove the limit counts requests and never the account, the answer takes as long for any address, no reset token reaches a log, and a burst of more than a hundred requests in five minutes alerts the on-call contact.

Journey eighteen is complete. The owner sets the on-call address; until then, the Jubilee team hears of a burst.

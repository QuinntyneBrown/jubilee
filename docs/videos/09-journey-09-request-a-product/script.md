# 09 · Journey 9: Request a product

The transcript, written from `narration.json` by `tools/video-demo/build.mjs`.

Journey nine: request a product. A member sends a shop an order request for a product, without payment. This run takes the journey from ninety-five percent to complete.

Joanna is a member. On Luzandre.com she opens the Faith heavyweight tee, chooses size M and a quantity of two, and presses Request this item.

The dialog says it first: no payment now. Luzandre.com confirms and you pay them directly. Below are the tee, the size and the quantity, and the shop's ways to get it.

Ship to me needs a shipping address, filled in from the last one she used. The estimate reads: item sixty-eight dollars, shipping nine, estimated total seventy-seven dollars plus tax.

She chooses pick up in Leslieville. The address field goes away, shipping is free, and the estimate follows at once.

New in this run, the dialog is proved by keyboard alone. The arrow keys move between the ways to get it, and Escape closes the dialog and sends nothing.

She adds a note and sends the request. Request sent to Luzandre.com: Naomi confirms stock and tells her how to pay. The keyboard test found a gap here. The focus was lost with the form; now it moves to View request.

Where does it go? The owner finds each order request in Incoming requests, under New, and confirms or declines it there.

Behind the screen, four API tests now prove who is told. The owner gets an in-app notification, new order request from Joanna, that links to Incoming requests. It reaches the owner's open page as a real-time event. The member is told nothing until the owner answers.

When the shop confirms, the customer is told in the app, and only then does the stock go down. And the order appears as a card in the conversation between the member and the shop.

The order request has an eighth acceptance criterion for this, the design names the code as built, and journey nine is complete. Left for the owner: the visual, responsive and accessibility sweeps. Tax is shown as plus tax and never calculated, and Jubilee takes no payment.

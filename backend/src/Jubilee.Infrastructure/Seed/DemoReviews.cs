namespace Jubilee.Infrastructure.Seed;

/// <summary>
/// The sample reviews of the mocks (ADR 0066): the same authors, ratings, items, texts, dates and replies as
/// <c>docs/mocks/pages/business</c>, <c>shop</c> and <c>space</c>. An item names a service or a product of the listing
/// by name, or is the stay of a space. Dates are fixed so the recording and the mocks agree.
/// </summary>
internal static class DemoReviews
{
    internal sealed record DemoReply(string Text, DateTimeOffset At);

    internal sealed record DemoReview(string Slug, string Author, int Rating, string Item, DateTimeOffset At, string Text, DemoReply? Reply = null);

    private static DateTimeOffset On(int month, int day) => new(2026, month, day, 17, 0, 0, TimeSpan.Zero);

    internal static readonly DemoReview[] All =
    [
        new("legacy-financial", "Grace Adebayo", 5, "Estate & legacy plan", On(11, 3),
            "Trevor helped my husband and me write wills and a giving plan after our second child. He never pushed a product, prayed with us at the end of the first meeting, and the written plan was clear enough that our parents understood it too.",
            new("Thank you, Grace. It was a joy to work with you both. See you at the six-month check-in.", On(11, 4))),
        new("legacy-financial", "Marcus Thompson", 5, "Discovery meeting", On(10, 20),
            "Booked the free meeting expecting a sales pitch. Got an honest look at our debt and a plan to be clear of it in three years. We went back for the RRSP review."),
        new("legacy-financial", "Esther Lau", 4, "Retirement & RRSP review", On(9, 8),
            "Very knowledgeable and patient with my questions. Scheduling took longer than I hoped in tax season, so book early.",
            new("Fair point, Esther. We’ve added evening slots from February to April this year.", On(9, 9))),
        new("legacy-financial", "Priya Sharma", 4, "Discovery meeting", On(8, 2),
            "Helpful first meeting and no pressure, but the follow-up notes took two weeks to arrive and I had to ask for them twice."),
        new("legacy-financial", "Paul Kim", 5, "Life & disability insurance review", On(6, 15),
            "Found we were paying for two overlapping policies. Saved us $64 a month."),

        new("luzandre", "Tamara Jones", 5, "Custom church team tee (min. 12)", On(11, 5),
            "Ordered 40 tees for our youth retreat. The proof came back the same day, the print is thick and hasn’t cracked after a dozen washes. The kids actually wear them outside church.",
            new("Thank you Tamara! Send us a photo from the retreat, we’d love to share it.", On(11, 6))),
        new("luzandre", "Ruth Mensah", 5, "Gold cross stoneware mug", On(10, 12),
            "Heavier than I expected in a good way. The gold has stayed bright in the dishwasher."),
        new("luzandre", "Samuel Park", 4, "Gold cross stoneware mug", On(9, 30),
            "Good mug, solid glaze. It took nine days to ship to Scarborough, longer than the five I was told."),
        new("luzandre", "Kofi Boateng", 3, "Faith heavyweight tee, charcoal", On(8, 14),
            "Love the design. Runs a full size small, so order up. Exchange was easy but took about two weeks by mail.",
            new("Thanks Kofi. We’ve added a fit note and a size chart to every tee.", On(8, 15))),
        new("luzandre", "David Chen", 5, "Gold cross stoneware mug", On(7, 22),
            "Bought two as gifts for our small group leaders. Both arrived well packed and they use them every Sunday."),

        new("roncesvalles-guest-suite", "Lydia Moreau", 5, "My stay", On(10, 27),
            "Spotless, quiet, and the breakfast basket had fresh bread from the Polish bakery down the street. Paul and Marta checked in once and otherwise left us to rest.",
            new("You’re welcome back any time, Lydia!", On(10, 28))),
        new("roncesvalles-guest-suite", "Chris Dubois", 4, "My stay", On(9, 5),
            "Lovely suite and hosts. Street parking was tight on a Saturday, plan for a short walk."),
    ];
}

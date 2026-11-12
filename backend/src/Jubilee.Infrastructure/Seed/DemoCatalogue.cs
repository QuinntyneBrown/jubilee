using Jubilee.Domain;
using static Jubilee.Domain.AreaServed;
using static Jubilee.Domain.OfferFilter;

namespace Jubilee.Infrastructure.Seed;

/// <summary>
/// The demo directory: the catalogue the mocks in <c>docs/mocks</c> show. Names, taglines and
/// category counts come from the design reference; the listings the mocks do not name, and all
/// offers, areas and prices, are invented. Within a category the order here is the mock order,
/// and the seeder makes it the Recommended order.
/// </summary>
internal static class DemoCatalogue
{
    internal sealed record DemoListing(
        string Category, string Slug, string Name, string Tagline, string Highlight, OfferFilter Offers, AreaServed Areas);

    internal sealed record DemoHiddenListing(DemoListing Listing, HiddenBecause Because);

    internal enum HiddenBecause
    {
        Draft,
        PendingReference,
        ChangesRequested,
        Paused,
        UnderModerationHold,
    }

    internal sealed record DemoService(string Name, string Detail, ServicePrice Price, ServiceAction Action);

    /// <summary>What a listing page shows of a business the mocks describe in full.</summary>
    internal sealed record DemoProfile(
        ListingProfile Profile, DateTimeOffset JoinedOn, int? MedianReplyMinutes, DemoService[] Services);

    internal sealed record DemoProduct(
        string ShopSlug, string Slug, string Name, int PriceCents, bool PerUnit, TileTint Tint, TileIcon Icon);

    private const AreaServed AllOfToronto = Scarborough | NorthYork | EastYork | Etobicoke | Downtown;

    /// <summary>The 47 verified, live businesses.</summary>
    internal static readonly DemoListing[] PublicListings =
    [
        // Shops (3)
        new("shops", "luzandre", "Luzandre.com", "Unique & custom Christian apparel, artworks & gifts that bring joy", "Ships across Canada", OpenSaturdays, AllOfToronto),
        new("shops", "christian-bookstores", "Christian Bookstores", "Bibles, devotionals and gifts from Toronto’s Christian booksellers", "Pickup in store", OpenSaturdays, Downtown | NorthYork),
        new("shops", "flower-creations", "Flower Creations", "Fresh Blooms for Every Occasion", "Same-day delivery", OpenSaturdays | FreeQuote, EastYork | Scarborough),

        // Financial & insurance (3)
        new("financial-insurance", "legacy-financial", "Legacy Financial", "Build a Legacy. Protect a Legacy. Leave a Legacy.", "Free first meeting", FreeQuote, AllOfToronto),
        new("financial-insurance", "deeks-insurance", "Deeks Insurance", "We put our heart – and faith – into everything we do as a business.", "Get a quote", FreeQuote, Downtown | Etobicoke),
        new("financial-insurance", "jd-smith-insurance-brokers", "JD Smith Insurance Brokers", "Personal & commercial insurance solutions", "Get a quote", FreeQuote, NorthYork | Scarborough),

        // Legal & immigration (6)
        new("legal-immigration", "kevin-marshall-barrister-solicitor", "Kevin Marshall, Barrister & Solicitor", "Caring for you, so you can take care of what matters", "Free first call", FreeQuote, Downtown | EastYork),
        new("legal-immigration", "desloges-law-group", "Desloges Law Group", "Helping thousands of people from all over the world obtain legal status and make Canada their home.", "Immigration specialists", FreeQuote, Downtown | NorthYork),
        new("legal-immigration", "kyl-law-firm", "KYL Law Firm", "Immigration and family matters, handled ethically and efficiently.", "Evening appointments", OpenSaturdays, NorthYork | Scarborough),
        new("legal-immigration", "law-office-of-denise-badley-castello", "Law Office of Denise Badley-Castello", "Legal Representation You Can Trust", "Free first call", FreeQuote, Etobicoke | Downtown),
        new("legal-immigration", "covenant-immigration-services", "Covenant Immigration Services", "Study permits, sponsorships and citizenship, one careful step at a time.", "Open Saturdays", OpenSaturdays | FreeQuote, Scarborough | EastYork),
        new("legal-immigration", "beacon-family-law", "Beacon Family Law", "Steady counsel for families in hard seasons.", "Free first call", FreeQuote, NorthYork | Etobicoke),

        // Home & property (10). The filter mocks rely on these offers and areas: three take
        // emergency calls, two of those are open Saturdays, none of the three serves Scarborough,
        // and four offer a free quote in East York.
        new("home-property", "waterworks-plumbing-drains", "WaterWorks Plumbing & Drains", "Treating Every Customer As Family", "Emergency calls", EmergencyCalls | OpenSaturdays, EastYork | NorthYork | Downtown),
        new("home-property", "ace-waterproofing", "Ace Waterproofing", "Specializing In Basement Waterproofing", "Free quote", FreeQuote, EastYork | Scarborough),
        new("home-property", "atera-construction-and-renovation", "Atera Construction and Renovation", "Expert construction on any project", "Free quote", FreeQuote, EastYork | NorthYork),
        new("home-property", "moores-cleaning-service", "Moore’s Cleaning Service", "Enjoy the Freedom of Clean", "Weekly or one-time", FreeQuote, EastYork | Downtown),
        new("home-property", "cornerstone-electric", "Cornerstone Electric", "Licensed electricians who show up when they say they will", "Emergency calls", EmergencyCalls | OpenSaturdays, Etobicoke | NorthYork),
        new("home-property", "shepherds-heating-cooling", "Shepherd’s Heating & Cooling", "Furnaces and air conditioners kept running, winter and summer", "Emergency calls", EmergencyCalls | FreeQuote, Downtown | Etobicoke),
        new("home-property", "good-ground-landscaping", "Good Ground Landscaping", "Gardens, lawns and snow, cared for all year", "Free quote", FreeQuote, EastYork | Scarborough),
        new("home-property", "mustard-seed-painting", "Mustard Seed Painting", "Small crew, careful work, clean lines", "Free quote", FreeQuote, NorthYork | Scarborough),
        new("home-property", "olive-branch-roofing", "Olive Branch Roofing", "Roofs repaired and replaced without the runaround", "Free quote", FreeQuote, Scarborough | Etobicoke),
        new("home-property", "plumb-line-handyman", "Plumb Line Handyman", "The small jobs done properly", "Free quote", FreeQuote, Downtown | NorthYork),

        // Real estate & living (4)
        new("real-estate-living", "bob-bush-realty", "Bob Bush Realty", "Find your dream Cottage!", "Free home evaluation", FreeQuote, NorthYork | Etobicoke),
        new("real-estate-living", "remax-professional-jonathan-bradshaw", "RE/MAX Professional – Jonathan Bradshaw", "Putting people and homes together is my passion!", "Free home evaluation", FreeQuote | OpenSaturdays, Etobicoke | Downtown),
        new("real-estate-living", "sutton-old-mill-liz-st-louis", "Sutton Old Mill – Liz St Louis", "Building your future one key at a time…", "Open Saturdays", OpenSaturdays, Etobicoke | Downtown),
        new("real-estate-living", "ccsvillage-lifestyle-community", "CCSVillage Lifestyle Community", "Welcome Home to Faith, Fellowship, and Carefree Living.", "Tours on Saturdays", OpenSaturdays, Scarborough),

        // Health & family (4)
        new("health-family", "adrianne-sequeira", "Adrianne Sequeira, DMin., RP, RMFT, RN", "Expert therapy and counselling for individuals, couples, and families", "Accepting new clients", FreeQuote, Downtown | EastYork),
        new("health-family", "break-free-family-centre", "Break Free Family Centre", "“Every mountain top is within reach if you just keep climbing.”", "Accepting new clients", FreeQuote, Scarborough | EastYork),
        new("health-family", "confident-smiles-implant-denture-solutions", "Confident Smiles Implant Denture Solutions", "Ensuring your smile stays bright.", "Free consultation", FreeQuote | OpenSaturdays, NorthYork),
        new("health-family", "angelic-treasures-christian-childcare", "Angelic Treasures Christian Childcare", "Christian childcare business opportunity", "Spaces available", FreeQuote, Scarborough | NorthYork),

        // Business & tech (5)
        new("business-tech", "ccbf-canadian-christian-business-federation", "CCBF Canadian Christian Business Federation", "Connecting your Sunday faith to your Monday work.", "Monthly breakfasts", FreeQuote, AllOfToronto),
        new("business-tech", "digital-consultants", "Digital Consultants", "Igniting Online Presence", "Free quote", FreeQuote, Downtown | NorthYork),
        new("business-tech", "east-west-express", "East-West Express", "Operating in Canada since 1991", "Free quote", FreeQuote | OpenSaturdays, AllOfToronto),
        new("business-tech", "lamont-it-services", "Lamont IT Services", "Your Complete On-site IT Solutions Partner!", "On-site visits", FreeQuote, EastYork | Downtown),
        new("business-tech", "kingdom-bookkeeping", "Kingdom Bookkeeping", "Tidy books for churches, charities and small businesses.", "Free first meeting", FreeQuote, NorthYork | Etobicoke),

        // Learning (2)
        new("learning", "talent-can-be-taught", "Talent Can Be Taught", "Learning Music Made Simple.", "First lesson free", OpenSaturdays, NorthYork | Scarborough),
        new("learning", "the-revelation-centre", "The Revelation Centre", "Discipleship training through empirical theology. Come and see.", "Evening classes", OpenSaturdays, Downtown),

        // Media (7)
        new("media", "amen-fm-christian-superstation", "Amen FM Christian Superstation", "Radio with a purpose", "Listen live", FreeQuote, AllOfToronto),
        new("media", "faith-tv", "FAITH TV", "The Nation’s Faith Station", "Watch online", FreeQuote, AllOfToronto),
        new("media", "joy-radio-cjye", "Joy Radio CJYE", "Discover the life changing power of Joy Radio!", "Listen live", FreeQuote, AllOfToronto),
        new("media", "joy-tv", "JOY TV", "Faith and Opinion", "Watch online", FreeQuote, AllOfToronto),
        new("media", "cornerstone-print-design", "Cornerstone Print & Design", "Bulletins, banners and signs for churches and shops.", "Free quote", FreeQuote | OpenSaturdays, EastYork | Scarborough),
        new("media", "salt-light-video", "Salt & Light Video", "Weddings, baptisms and ministry stories on film.", "Free quote", FreeQuote | OpenSaturdays, Downtown | Etobicoke),
        new("media", "good-news-podcast-studio", "Good News Podcast Studio", "Record, edit and publish your message.", "Studio by the hour", OpenSaturdays, Downtown),

        // Community (3)
        new("community", "the-scott-mission", "The Scott Mission", "A Christian Ministry of Mercy and Love.", "Volunteers welcome", OpenSaturdays, Downtown),
        new("community", "teen-challenge-canada-vehicle-donation", "Teen Challenge Canada – Vehicle Donation", "Donated vehicles change lives!", "Free pickup", FreeQuote, AllOfToronto),
        new("community", "jesus-in-the-city-parade-and-festival", "Jesus in the City Parade and Festival", "Celebrating our love for God and love for people", "Every September", OpenSaturdays, Downtown),
    ];

    /// <summary>Listings that are not public, so the demo shows that they never appear (L2-028).</summary>
    internal static readonly DemoHiddenListing[] HiddenListings =
    [
        new(new("shops", "emmaus-road-coffee-roasters", "Emmaus Road Coffee Roasters", "Small-batch coffee roasted in the Junction.", "Ships across Canada", OpenSaturdays, Etobicoke | Downtown), HiddenBecause.Draft),
        new(new("learning", "narrow-gate-tutoring", "Narrow Gate Tutoring", "Patient math and reading help for grades 1 to 8.", "First lesson free", OpenSaturdays, Scarborough | EastYork), HiddenBecause.PendingReference),
        new(new("home-property", "living-stone-masonry", "Living Stone Masonry", "Brick, stone and chimney repair.", "Emergency calls", EmergencyCalls | FreeQuote | OpenSaturdays, Scarborough | EastYork), HiddenBecause.ChangesRequested),
        new(new("shops", "bethel-gift-baskets", "Bethel Gift Baskets", "Gift baskets for new neighbours, new babies and hard days.", "Pickup in store", OpenSaturdays, NorthYork), HiddenBecause.Paused),
        new(new("health-family", "shiloh-wellness-clinic", "Shiloh Wellness Clinic", "Physiotherapy and massage close to home.", "Accepting new clients", FreeQuote, EastYork | Downtown), HiddenBecause.UnderModerationHold),
    ];

    /// <summary>The listing pages of the mocks: pages/business (Legacy Financial) and pages/shop (Luzandre.com).</summary>
    internal static readonly Dictionary<string, DemoProfile> Profiles = new()
    {
        ["legacy-financial"] = new(
            new ListingProfile(
                OwnerName: "Trevor Chew, CKA®, CFP®, CLU®",
                Credentials: ["CKA® · CFP® · CLU®"],
                About: "Financial planning grounded in biblical stewardship: budgeting and debt, retirement, insurance and estate planning, and a generosity plan your family can keep for generations.",
                Where: "2 Sheppard Ave E, North York · video across Ontario",
                Hours: "Mon–Fri 9:00–5:00 · Thu until 8:00",
                Languages: "English, Cantonese",
                Delivery: null,
                MadeToOrder: null),
            JoinedOn: new DateTimeOffset(2026, 3, 16, 14, 0, 0, TimeSpan.Zero),
            MedianReplyMinutes: 9 * 60,
            Services:
            [
                new("Discovery meeting", "30 min · In person or video", ServicePrice.Free, ServiceAction.Book),
                new("Retirement & RRSP review", "60 min · Bring your statements", ServicePrice.Ask, ServiceAction.Book),
                new("Life & disability insurance review", "45 min", ServicePrice.Free, ServiceAction.Book),
                new("Estate & legacy plan", "Two sessions, written plan", ServicePrice.Ask, ServiceAction.Book),
            ]),
        ["luzandre"] = new(
            new ListingProfile(
                OwnerName: null,
                Credentials: [],
                About: "Custom tees, mugs and original artwork designed to share joy. Order a ready-made piece or ask for something made just for your church, team or family.",
                Where: "Online · studio pickup in Leslieville",
                Hours: null,
                Languages: null,
                Delivery: "Canada Post, $9 flat · free over $75",
                MadeToOrder: "Ready in 5–7 days"),
            JoinedOn: new DateTimeOffset(2026, 6, 8, 14, 0, 0, TimeSpan.Zero),
            MedianReplyMinutes: 2 * 60,
            Services:
            [
                new("Custom design consultation", "30 min · Video", ServicePrice.Free, ServiceAction.Ask),
                new("Church merch package", "Tees, mugs and totes for your congregation", ServicePrice.Ask, ServiceAction.Ask),
            ]),
    };

    /// <summary>A space in "Rooms & rentals" (L2-188): its host, what the host says, and its rental details.</summary>
    internal sealed record DemoSpace(string Slug, string Name, string Tagline, string Host, string About, Func<SpaceDetails> Details);

    /// <summary>The live spaces of the design's sample data, one or more per term, newest first.</summary>
    internal static readonly DemoSpace[] Spaces =
    [
        new(
            "roncesvalles-guest-suite",
            "Guest suite near Roncesvalles",
            "Private suite for visiting family, conferences or a weekend away",
            "Paul & Marta Kowalski",
            "Ten minutes’ walk to High Park and the Queen streetcar. Members of our church get a quiet, clean place to land.",
            () => SpaceDetails.Create(
                SpaceTerm.ShortStay, 120, "Most weekends", 2, "Roncesvalles", "48 Galley Ave, Toronto ON M6R 1G9", "Guest suite",
                ["Queen bed", "Private bath", "Sleeps 2", "Self check-in"],
                ["Wi-Fi", "Furnished", "Parking", "Private bath"],
                null,
                ["Check-in after 3 pm", "No parties", "No smoking"])),
        new(
            "leslieville-family-room",
            "Furnished room in a family home, Leslieville",
            "Quiet room with a desk, shared bath, home-cooked Sunday dinners",
            "Ruth Mensah",
            "Our eldest left for university and her room is free. Ideal for a student or young professional new to the city.",
            () => SpaceDetails.Create(
                SpaceTerm.Room, 950, "Now", 4, "Leslieville", "27 Curzon St, Toronto ON M4M 3B4", "Private room",
                ["Double bed", "Shared bath", "Furnished", "Desk"],
                ["Utilities", "Wi-Fi", "Laundry", "Furnished", "Kitchen use"],
                "Ruth and Kwame with our daughter Abena (14) and a very calm cat. We eat together on Sundays and you’re always welcome.",
                ["No overnight guests", "No smoking or alcohol", "Share the chore rota"])),
        new(
            "annex-basement-apartment",
            "Bright basement apartment in the Annex",
            "Separate entrance, garden walkout, five minutes to Bathurst station",
            "Grace & Daniel Okafor",
            "We live upstairs with our two kids and attend Trinity Annex. We’d love a tenant who’ll stay a while.",
            () => SpaceDetails.Create(
                SpaceTerm.LongTerm, 1850, "Dec 1", 12, "The Annex", "112 Brunswick Ave, Toronto ON M5S 2L7", "Basement apartment",
                ["1 bedroom", "1 bath", "650 sq ft", "Separate entrance"],
                ["Utilities", "Wi-Fi", "Laundry", "Private bath"],
                null,
                ["No smoking", "Quiet after 10 pm", "One small pet considered"])),
        new(
            "east-york-roommate",
            "Roommate wanted: 3-bedroom house in East York",
            "Two housemates looking for a third: big kitchen, backyard, near Pape",
            "Hannah Lee",
            "We’re both at Sanctuary Toronto and pray together most Wednesdays. Looking for someone tidy and friendly.",
            () => SpaceDetails.Create(
                SpaceTerm.Roommate, 1100, "Jan 1", 6, "East York", "9 Cosburn Ave, Toronto ON M4K 2E8", "Private room",
                ["Unfurnished room", "Shared bath (2)", "Backyard", "Parking spot"],
                ["Wi-Fi", "Laundry", "Parking", "Kitchen use"],
                "Two women in our late 20s, a nurse and a grad student. Looking for a third who’s tidy, friendly and up for a weekly house dinner.",
                ["Weekly house dinner", "Clean as you go", "No smoking"])),
        new(
            "scarborough-furnished-condo",
            "Furnished 2-bed condo near Scarborough Town Centre",
            "Move-in ready while we serve overseas — gym, parking, steps to transit",
            "Samuel & Joy Tan",
            "We’re on a mission posting in Kenya and want our home cared for by someone from the community.",
            () => SpaceDetails.Create(
                SpaceTerm.LongTerm, 2400, "Feb 1", 6, "Scarborough", "300 Borough Dr, Unit 1204, Toronto ON M1P 4P5", "Condo",
                ["2 bedrooms", "2 baths", "Furnished", "1 parking"],
                ["Utilities", "Furnished", "Parking"],
                null,
                ["No smoking", "No pets (building rule)", "Tenant insurance required"])),
    ];

    /// <summary>"Featured this week", positions 1 to 5.</summary>
    internal static readonly string[] FeaturedSlugs =
    [
        "legacy-financial",
        "luzandre",
        "christian-bookstores",
        "adrianne-sequeira",
        "waterworks-plumbing-drains",
    ];

    /// <summary>
    /// The session subjects of the demo owners, by listing slug. Signing in arrives with the
    /// accounts journey, which issues these subjects to the demo cast.
    /// </summary>
    internal static readonly IReadOnlyDictionary<string, string> Owners = new Dictionary<string, string>
    {
        ["legacy-financial"] = "demo|trevor-chew",
        ["luzandre"] = "demo|naomi-laurent",
        ["roncesvalles-guest-suite"] = "demo|paul-kowalski",
    };

    /// <summary>What the product page of a demo product tells members, by product slug.</summary>
    internal static readonly IReadOnlyDictionary<string, Action<Product>> ProductDetails = new Dictionary<string, Action<Product>>
    {
        ["faith-heavyweight-tee-charcoal"] = tee =>
        {
            tee.Describe(new ProductDescription(
                "A 240 gsm combed-cotton tee with a small gold-thread emblem on the chest. Printed and stitched to order in Leslieville.",
                "plus $9 shipping, or free pickup",
                [new("Fit", "Relaxed, true to size"), new("Care", "Cold wash, hang dry"), new("Ready in", "5–7 days, made to order"), new("Returns", "14 days, unworn")]));
            tee.SetOptions("Size", [new("S", 8), new("M", 20), new("L", 14), new("XL", 6), new("2XL", 4)]);
        },
        ["gold-cross-stoneware-mug"] = mug => mug.Describe(new ProductDescription(
            "A 12 oz stoneware mug with a hand-gilded cross. Dishwasher safe.",
            "plus $9 shipping, or free pickup",
            [new("Care", "Dishwasher safe, not for the microwave"), new("Returns", "14 days, unused")])),
        ["custom-church-team-tee"] = tee =>
        {
            tee.Describe(new ProductDescription(
                "Your church or team's design on our heavyweight tee. Send the artwork with your request.",
                "free pickup, or shipping quoted with your order",
                [new("Ready in", "10–14 days, made to order")]));
            tee.SetMinimumQuantity(12);
        },
    };

    /// <summary>Products, newest first. The last belongs to a paused shop and never shows.</summary>
    internal static readonly DemoProduct[] Products =
    [
        new("luzandre", "faith-heavyweight-tee-charcoal", "Faith heavyweight tee, charcoal", 3400, false, TileTint.Ink, TileIcon.Shirt),
        new("luzandre", "gold-cross-stoneware-mug", "Gold cross stoneware mug", 2400, false, TileTint.Gold, TileIcon.Mug),
        new("luzandre", "custom-church-team-tee", "Custom church team tee (min. 12)", 2200, true, TileTint.Blue, TileIcon.Shirt),
        new("luzandre", "morning-mug-set-of-two", "Morning mug, set of two", 4200, false, TileTint.Green, TileIcon.Mug),
        new("christian-bookstores", "leather-journaling-bible-esv", "Leather journaling Bible, ESV", 6400, false, TileTint.Gold, TileIcon.Book),
        new("bethel-gift-baskets", "welcome-home-basket", "Welcome home basket", 5800, false, TileTint.Green, TileIcon.Bag),
    ];
}

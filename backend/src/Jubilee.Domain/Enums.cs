namespace Jubilee.Domain;

/// <summary>Where a listing is on its way to the public directory.</summary>
public enum ListingStage
{
    Draft = 0,
    Live = 5,
}

/// <summary>Offer attributes a member can filter a category by.</summary>
[Flags]
public enum OfferFilter
{
    None = 0,
    FreeQuote = 1,
    EmergencyCalls = 2,
    OpenSaturdays = 4,
}

/// <summary>Areas of Toronto a business serves.</summary>
[Flags]
public enum AreaServed
{
    None = 0,
    Scarborough = 1,
    NorthYork = 2,
    EastYork = 4,
    Etobicoke = 8,
    Downtown = 16,
}

/// <summary>Sort orders of a category page.</summary>
public enum ListingSort
{
    Recommended = 0,
    Newest = 1,
    NameAscending = 2,
}

/// <summary>Colour of a product's placeholder media tile, until photo upload exists.</summary>
public enum TileTint
{
    Ink = 0,
    Gold = 1,
    Green = 2,
    Blue = 3,
}

/// <summary>Icon of a product's placeholder media tile, until photo upload exists.</summary>
public enum TileIcon
{
    Shirt = 0,
    Mug = 1,
    Book = 2,
    Bag = 3,
}

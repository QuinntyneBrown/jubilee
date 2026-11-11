using Jubilee.Application.Abstractions;
using Jubilee.Application.Errors;
using Jubilee.Domain;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Application.Search;

/// <summary>Searches the directory (L2-029). An empty query answers with the start payload.</summary>
public sealed record SearchDirectoryQuery(string? Raw, Viewer Viewer) : IRequest<SearchAnswer>;

public sealed class SearchDirectoryQueryHandler(
    ISearchIndex index,
    DatabaseNameSearch fallback,
    SearchStartBuilder start,
    IAppDbContext db,
    TimeProvider clock) : IRequestHandler<SearchDirectoryQuery, SearchAnswer>
{
    public async Task<SearchAnswer> Handle(SearchDirectoryQuery request, CancellationToken cancellationToken)
    {
        var query = SearchQueryText.From(request.Raw);
        if (query.IsEmpty)
        {
            return new SearchAnswer(null, await start.BuildAsync(request.Viewer, cancellationToken));
        }

        SearchResults results;
        try
        {
            results = await index.SearchAsync(query.Value, cancellationToken);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            results = await fallback.SearchAsync(query.Value, cancellationToken);
        }

        if (request.Viewer.Subject is { } subject)
        {
            await RecordAsync(subject, query.Value, cancellationToken);
        }

        return new SearchAnswer(results, null);
    }

    private async Task RecordAsync(string subject, string query, CancellationToken cancellationToken)
    {
        var mine = await db.RecentSearches.Where(r => r.MemberSubject == subject).ToListAsync(cancellationToken);
        var same = mine.FirstOrDefault(r => string.Equals(r.Query, query, StringComparison.OrdinalIgnoreCase));
        if (same is null)
        {
            db.RecentSearches.Add(RecentSearch.Record(subject, query, clock.GetUtcNow()));
        }
        else
        {
            same.Touch(clock.GetUtcNow());
        }

        await db.SaveChangesAsync(cancellationToken);
    }
}

/// <summary>Builds the empty search page: a member's 5 newest searches and the popular categories.</summary>
public sealed class SearchStartBuilder(IAppDbContext db)
{
    public const int RecentLimit = 5;
    public const int PopularLimit = 5;

    public async Task<SearchStartDto> BuildAsync(Viewer viewer, CancellationToken cancellationToken)
    {
        IReadOnlyList<RecentSearchDto> recent = [];
        if (viewer.Subject is { } subject)
        {
            var rows = await db.RecentSearches.AsNoTracking()
                .Where(r => r.MemberSubject == subject)
                .ToListAsync(cancellationToken);
            recent = [.. rows.OrderByDescending(r => r.SearchedAt).Take(RecentLimit).Select(r => new RecentSearchDto(r.Id, r.Query))];
        }

        // Popular: the categories with the most public listings; empty ones are left out.
        var listings = await db.Listings.AsNoTracking().WherePublic().Select(l => l.CategorySlug).ToListAsync(cancellationToken);
        var counts = listings.GroupBy(slug => slug).ToDictionary(g => g.Key, g => g.Count());
        var popular = Category.All
            .Where(c => counts.ContainsKey(c.Slug))
            .OrderByDescending(c => counts[c.Slug])
            .Take(PopularLimit)
            .Select(c => new PopularCategoryDto(c.Slug, c.Name, counts[c.Slug]))
            .ToList();
        return new SearchStartDto(recent, popular);
    }
}

public sealed record GetSearchStartQuery(Viewer Viewer) : IRequest<SearchStartDto>;

public sealed class GetSearchStartQueryHandler(SearchStartBuilder start) : IRequestHandler<GetSearchStartQuery, SearchStartDto>
{
    public Task<SearchStartDto> Handle(GetSearchStartQuery request, CancellationToken cancellationToken) =>
        start.BuildAsync(request.Viewer, cancellationToken);
}

/// <summary>Removes one recent search of the caller. Another member's entry is not found (L2-133).</summary>
public sealed record RemoveRecentSearchCommand(Guid Id, string MemberSubject) : IRequest;

public sealed class RemoveRecentSearchCommandHandler(IAppDbContext db) : IRequestHandler<RemoveRecentSearchCommand>
{
    public const string NotFoundCode = "recent_search_not_found";

    public async Task Handle(RemoveRecentSearchCommand request, CancellationToken cancellationToken)
    {
        var entry = await db.RecentSearches
            .SingleOrDefaultAsync(r => r.Id == request.Id && r.MemberSubject == request.MemberSubject, cancellationToken)
            ?? throw new NotFoundException(NotFoundCode, "There is no such recent search.");
        db.RecentSearches.Remove(entry);
        await db.SaveChangesAsync(cancellationToken);
    }
}

public sealed record ClearRecentSearchesCommand(string MemberSubject) : IRequest;

public sealed class ClearRecentSearchesCommandHandler(IAppDbContext db) : IRequestHandler<ClearRecentSearchesCommand>
{
    public async Task Handle(ClearRecentSearchesCommand request, CancellationToken cancellationToken)
    {
        db.RecentSearches.RemoveRange(await db.RecentSearches
            .Where(r => r.MemberSubject == request.MemberSubject).ToListAsync(cancellationToken));
        await db.SaveChangesAsync(cancellationToken);
    }
}

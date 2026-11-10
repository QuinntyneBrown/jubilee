using Jubilee.Application.Abstractions;
using Jubilee.Domain;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Application.Directory;

public sealed record GetWelcomeQuery : IRequest<WelcomeDto>;

public sealed class GetWelcomeQueryHandler(
    IAppDbContext db,
    FeaturedSelector featuredSelector,
    IDirectoryReadCache cache,
    TimeProvider clock)
    : IRequestHandler<GetWelcomeQuery, WelcomeDto>
{
    public const int FeaturedLimit = 4;

    public Task<WelcomeDto> Handle(GetWelcomeQuery request, CancellationToken cancellationToken) =>
        cache.GetOrCreateAsync("welcome", BuildAsync, cancellationToken);

    private async Task<WelcomeDto> BuildAsync(CancellationToken cancellationToken)
    {
        var count = await db.Listings.WherePublic().CountAsync(cancellationToken);
        var featured = await featuredSelector.SelectAsync(clock.GetUtcNow(), FeaturedLimit, cancellationToken);
        return new WelcomeDto(count, CategoryLinkDto.All, [.. featured.Select(BusinessCardDto.From)]);
    }
}

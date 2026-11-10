using Jubilee.Application.Directory;
using Jubilee.Infrastructure.Persistence;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Jubilee.Infrastructure.Tests;

/// <summary>The real infrastructure on a private EF Core InMemory store (ADR 0009).</summary>
public sealed class InMemoryDatabase : IDisposable
{
    private readonly ServiceProvider _services;

    public InMemoryDatabase()
    {

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Database:Provider"] = DependencyInjection.InMemoryProvider,
                ["ConnectionStrings:Jubilee"] = $"jubilee-infra-{Guid.NewGuid():N}",
            })
            .Build();
        _services = new ServiceCollection()
            .AddLogging()
            .AddInfrastructure(configuration)
            .BuildServiceProvider();

        using var scope = _services.CreateScope();
        scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.EnsureCreated();
    }

    public IDirectoryReadCache Cache => _services.GetRequiredService<IDirectoryReadCache>();

    public async Task<T> WithDb<T>(Func<AppDbContext, Task<T>> work)
    {
        using var scope = _services.CreateScope();
        return await work(scope.ServiceProvider.GetRequiredService<AppDbContext>());
    }

    public void Dispose()
    {
        _services.Dispose();
    }
}

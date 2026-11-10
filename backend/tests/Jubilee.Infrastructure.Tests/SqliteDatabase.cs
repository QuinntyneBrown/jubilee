using Jubilee.Application.Directory;
using Jubilee.Infrastructure.Persistence;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Jubilee.Infrastructure.Tests;

/// <summary>The real infrastructure on a private in-memory SQLite database.</summary>
public sealed class SqliteDatabase : IDisposable
{
    private readonly SqliteConnection _keepAlive;
    private readonly ServiceProvider _services;

    public SqliteDatabase()
    {
        var connectionString = $"DataSource=file:infra-{Guid.NewGuid():N}?mode=memory&cache=shared";
        _keepAlive = new SqliteConnection(connectionString);
        _keepAlive.Open();

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Database:Provider"] = "Sqlite",
                ["ConnectionStrings:Jubilee"] = connectionString,
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
        _keepAlive.Dispose();
    }
}

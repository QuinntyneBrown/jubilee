using Jubilee.Application.Abstractions;
using Jubilee.Application.Directory;
using Jubilee.Infrastructure.Caching;
using Jubilee.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace Jubilee.Infrastructure;

public static class DependencyInjection
{
    public const string SqlServerProvider = "SqlServer";
    public const string SqliteProvider = "Sqlite";

    /// <summary>
    /// Registers persistence and the directory read cache. <c>Database:Provider</c> picks SQL Server (the default) or SQLite;
    /// both read <c>ConnectionStrings:Jubilee</c>.
    /// </summary>
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.TryAddSingleton(TimeProvider.System);

        var useSqlite = UsesSqlite(configuration);
        var connectionString = configuration.GetConnectionString("Jubilee");
        services.AddDbContext<AppDbContext>((provider, options) =>
        {
            options.AddInterceptors(provider.GetRequiredService<DirectoryCacheInvalidationInterceptor>());
            if (useSqlite)
            {
                options.UseSqlite(connectionString);
            }
            else
            {
                options.UseSqlServer(connectionString);
            }
        });
        services.AddScoped<IAppDbContext>(sp => sp.GetRequiredService<AppDbContext>());

        // Redis when configured (ConnectionStrings:Redis), otherwise an in-process cache.
        var redis = configuration.GetConnectionString("Redis");
        if (string.IsNullOrWhiteSpace(redis))
        {
            services.AddDistributedMemoryCache();
        }
        else
        {
            services.AddStackExchangeRedisCache(options =>
            {
                options.Configuration = redis;
                options.InstanceName = "jubilee:";
            });
        }

        services.AddSingleton<IDirectoryReadCache, DistributedDirectoryReadCache>();
        services.AddSingleton<DirectoryCacheInvalidationInterceptor>();

        return services;
    }

    public static bool UsesSqlite(IConfiguration configuration) =>
        string.Equals(configuration["Database:Provider"], SqliteProvider, StringComparison.OrdinalIgnoreCase);

    /// <summary>
    /// Prepares the database when the host starts. Migrations are never applied here: SQL Server
    /// is migrated explicitly with <c>jubilee migrate</c>. SQLite has no migrations, so its schema
    /// is created from the model.
    /// </summary>
    public static async Task InitialiseDatabaseAsync(this IServiceProvider services, IConfiguration configuration)
    {
        if (!UsesSqlite(configuration))
        {
            return;
        }

        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.Database.EnsureCreatedAsync();
    }
}

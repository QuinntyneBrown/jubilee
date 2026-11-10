using Jubilee.Infrastructure;
using Jubilee.Infrastructure.Persistence;
using Jubilee.Infrastructure.Seed;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Jubilee.Cli;

/// <summary>
/// <c>jubilee migrate | seed | reset</c>. Configuration comes from <c>appsettings.json</c> beside
/// the executable, environment variables and <c>--Key=Value</c> arguments, in that order.
/// </summary>
public static class JubileeCli
{
    private const string Usage = """
        Usage: jubilee <command> [--Database:Provider=SqlServer|Sqlite] [--ConnectionStrings:Jubilee=...]

        Commands:
          migrate   Apply the EF Core migrations (SQL Server) or create the schema from the model (SQLite).
          seed      Add the demo directory. Safe to run again.
          reset     Delete the database.
        """;

    public static async Task<int> RunAsync(string[] args, TextWriter output)
    {
        var command = args.FirstOrDefault()?.ToLowerInvariant();
        if (command is not ("migrate" or "seed" or "reset"))
        {
            await output.WriteLineAsync(Usage);
            return 1;
        }

        var configuration = new ConfigurationBuilder()
            .SetBasePath(AppContext.BaseDirectory)
            .AddJsonFile("appsettings.json", optional: true)
            .AddEnvironmentVariables()
            .AddCommandLine(args[1..])
            .Build();
        var sqlite = DependencyInjection.SchemaFromModel(configuration);

        await using var services = new ServiceCollection()
            .AddLogging(logging => logging.AddConsole().SetMinimumLevel(LogLevel.Warning))
            .AddInfrastructure(configuration)
            .BuildServiceProvider();
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        switch (command)
        {
            case "migrate":
                await PrepareSchemaAsync(db, sqlite);
                await output.WriteLineAsync("Database is up to date.");
                break;
            case "seed":
                if (sqlite)
                {
                    // SQLite has no migrations; make sure the schema exists before seeding.
                    await db.Database.EnsureCreatedAsync();
                }

                await scope.ServiceProvider.GetRequiredService<DemoDataSeeder>().SeedAsync();
                await output.WriteLineAsync(
                    $"Seeded: {await db.Listings.CountAsync()} listings, {await db.Products.CountAsync()} products, "
                    + $"{await db.FeaturedSlots.CountAsync()} featured slots.");
                break;
            case "reset":
                await db.Database.EnsureDeletedAsync();
                await output.WriteLineAsync("Database deleted.");
                break;
        }

        return 0;
    }

    private static Task PrepareSchemaAsync(AppDbContext db, bool sqlite) =>
        sqlite ? db.Database.EnsureCreatedAsync() : db.Database.MigrateAsync();
}

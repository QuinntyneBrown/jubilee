using Jubilee.Application;
using Jubilee.Application.Launch;
using Jubilee.Application.Staff;
using Jubilee.Infrastructure;
using MediatR;
using Jubilee.Infrastructure.Persistence;
using Jubilee.Infrastructure.Seed;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Jubilee.Cli;

/// <summary>
/// <c>jubilee migrate | seed | reset | staff | launch</c>. Configuration comes from <c>appsettings.json</c> beside
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
          staff grant  --email {address} --role moderator|admin   Give a staff account a role (creates the account).
          staff revoke --email {address} --role moderator|admin   Take a role away and end the account's staff sessions.
          staff list                                             Print each staff account and its roles.
          launch list --kind notifications|businesses            Print the launch sign-ups or the business pre-registrations as CSV.
        """;

    public static async Task<int> RunAsync(string[] args, TextWriter output)
    {
        var command = args.FirstOrDefault()?.ToLowerInvariant();
        var staff = command is "staff" or "launch" ? args.ElementAtOrDefault(1)?.ToLowerInvariant() : null;
        if (command is not ("migrate" or "seed" or "reset" or "staff" or "launch")
            || (command == "staff" && staff is not ("grant" or "revoke" or "list"))
            || (command == "launch" && staff is not "list"))
        {
            await output.WriteLineAsync(Usage);
            return 1;
        }

        var configuration = new ConfigurationBuilder()
            .SetBasePath(AppContext.BaseDirectory)
            .AddJsonFile("appsettings.json", optional: true)
            .AddEnvironmentVariables()
            .AddCommandLine(args[(staff is null ? 1 : 2)..])
            .Build();
        var sqlite = Infrastructure.DependencyInjection.SchemaFromModel(configuration);

        await using var services = new ServiceCollection()
            .AddLogging(logging => logging.AddConsole().SetMinimumLevel(LogLevel.Warning))
            .AddApplication()
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
            case "staff":
                return await StaffAsync(scope.ServiceProvider.GetRequiredService<ISender>(), staff!, configuration, output);
            case "launch":
                return await LaunchAsync(scope.ServiceProvider.GetRequiredService<ISender>(), configuration, output);
            case "reset":
                await db.Database.EnsureDeletedAsync();
                await output.WriteLineAsync("Database deleted.");
                break;
        }

        return 0;
    }

    /// <summary>Staff accounts are managed here only, never from a screen (L2-193, ADR 0040).</summary>
    private static async Task<int> StaffAsync(ISender sender, string action, IConfiguration configuration, TextWriter output)
    {
        try
        {
            var lines = action switch
            {
                "grant" => [await sender.Send(new GrantStaffRoleCommand(configuration["email"], configuration["role"]))],
                "revoke" => [await sender.Send(new RevokeStaffRoleCommand(configuration["email"], configuration["role"]))],
                _ => await sender.Send(new ListStaffQuery()),
            };
            foreach (var line in lines)
            {
                await output.WriteLineAsync(line);
            }

            return 0;
        }
        catch (StaffCommandException refused)
        {
            await output.WriteLineAsync(refused.Message);
            return 1;
        }
    }

    /// <summary>The only way the team reads what the launching-soon page collected (L2-218 AC4, ADR 0044).</summary>
    private static async Task<int> LaunchAsync(ISender sender, IConfiguration configuration, TextWriter output)
    {
        try
        {
            foreach (var line in await sender.Send(new ListLaunchSubmissionsQuery(configuration["kind"])))
            {
                await output.WriteLineAsync(line);
            }

            return 0;
        }
        catch (LaunchCommandException refused)
        {
            await output.WriteLineAsync(refused.Message);
            return 1;
        }
    }

    private static Task PrepareSchemaAsync(AppDbContext db, bool sqlite) =>
        sqlite ? db.Database.EnsureCreatedAsync() : db.Database.MigrateAsync();
}

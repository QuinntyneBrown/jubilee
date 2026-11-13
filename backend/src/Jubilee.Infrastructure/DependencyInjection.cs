using Jubilee.Application.Abstractions;
using Jubilee.Application.Content;
using Jubilee.Application.Directory;
using Jubilee.Infrastructure.Caching;
using Jubilee.Infrastructure.Persistence;
using Jubilee.Infrastructure.Seed;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace Jubilee.Infrastructure;

public static class DependencyInjection
{
    public const string SqlServerProvider = "SqlServer";
    public const string SqliteProvider = "Sqlite";

    /// <summary>
    /// EF Core InMemory, for automated tests only (ADR 0009): <c>ConnectionStrings:Jubilee</c> names
    /// the store, which lives as long as the process.
    /// </summary>
    public const string InMemoryProvider = "InMemory";

    /// <summary>The stores of the InMemory provider, shared by every service provider of the process.</summary>
    public static readonly InMemoryDatabaseRoot InMemoryRoot = new();

    /// <summary>
    /// Registers persistence and the directory read cache. <c>Database:Provider</c> picks SQL Server (the default), SQLite
    /// or, in tests, InMemory; each reads <c>ConnectionStrings:Jubilee</c>.
    /// </summary>
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.TryAddSingleton(TimeProvider.System);

        var provider = configuration["Database:Provider"];
        var useSqlite = UsesSqlite(configuration);
        var useInMemory = string.Equals(provider, InMemoryProvider, StringComparison.OrdinalIgnoreCase);
        var connectionString = configuration.GetConnectionString("Jubilee");
        services.AddDbContext<AppDbContext>((provider, options) =>
        {
            options.AddInterceptors(provider.GetRequiredService<DirectoryCacheInvalidationInterceptor>());
            if (useInMemory)
            {
                options.UseInMemoryDatabase(connectionString ?? "jubilee", InMemoryRoot);
            }
            else if (useSqlite)
            {
                options.UseSqlite(connectionString);
            }
            else
            {
                options.UseSqlServer(connectionString);
            }
        });
        services.AddScoped<IAppDbContext>(sp => sp.GetRequiredService<AppDbContext>());
        services.Configure<Application.Maintenance.MaintenanceOptions>(configuration.GetSection("Maintenance"));
        services.AddSingleton<Application.Maintenance.IMaintenanceState, Maintenance.OptionsMaintenanceState>();

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

        services.AddScoped<Application.Search.ISearchIndex, Search.DatabaseSearchIndex>();
        services.AddSingleton(new Application.Accounts.AccountSettings(configuration["App:PublicBaseUrl"] ?? "http://localhost:4200"));
        services.AddSingleton(new Application.Accounts.EmailSettings(configuration["Email:MailingAddress"]));
        services.AddSingleton(new Application.Launch.LaunchSettings(configuration["Launch:TeamEmail"]));
        services.AddSingleton(new Application.Moderation.TeamSettings(
            configuration["Moderation:TeamEmail"] is { Length: > 0 } team ? team : configuration["Launch:TeamEmail"],
            configuration["StaffSignIn:PublicBaseUrl"] ?? "https://admin.jubilee.to"));
        // The on-call security contact (ADR 0064): Security:OnCallEmail, else the Jubilee team's address.
        services.AddSingleton(provider => new Application.Accounts.SecuritySettings(
            configuration["Security:OnCallEmail"] is { Length: > 0 } onCall
                ? onCall
                : provider.GetRequiredService<Application.Moderation.TeamSettings>().TeamEmail));
        services.AddSingleton<Application.Accounts.IPasswordHasher, Accounts.Argon2idPasswordHasher>();
        services.AddHttpClient<Application.Accounts.IBreachedPasswordChecker, Accounts.HaveIBeenPwnedChecker>();
        services.AddHttpClient<Application.Accounts.IBotChallengeVerifier, Accounts.TurnstileBotChallengeVerifier>();
        services.AddHttpClient<Application.Accounts.IGoogleIdentityClient, Accounts.GoogleIdentityClient>();
        // The staff directory (ADR 0040): Entra ID, or the development identity (refused outside Development by the API).
        if (string.Equals(configuration["StaffSignIn:Provider"], "Development", StringComparison.OrdinalIgnoreCase))
        {
            services.AddSingleton<Application.Staff.IStaffIdentityClient, Accounts.DevelopmentStaffIdentityClient>();
        }
        else
        {
            services.AddHttpClient<Application.Staff.IStaffIdentityClient, Accounts.EntraStaffIdentityClient>();
        }
        // The e-mail provider when it is configured (ADR 0038); otherwise nothing leaves the system (L2-179 AC7).
        if (string.IsNullOrWhiteSpace(configuration["Email:ConnectionString"]))
        {
            services.AddSingleton<Application.Accounts.IEmailSender, Emails.LoggingEmailSender>();
        }
        else
        {
            services.AddHttpClient<Application.Accounts.IEmailSender, Emails.AzureCommunicationEmailSender>();
        }

        services.AddSingleton<Application.Notifications.IUnsubscribeLinks>(
            new Application.Notifications.HmacUnsubscribeLinks(configuration["Email:UnsubscribeKey"] ?? "development-only-unsubscribe-key"));
        services.AddSingleton<Application.Accounts.IOidcTransactionStore, Accounts.CacheOidcTransactionStore>();
        // The deletion ledger, outside the database, so that a restore can delete again (L2-017 AC7, ADR 0069).
        services.AddSingleton<Application.Accounts.IDeletionLedger>(new Accounts.FileDeletionLedger(
            configuration["Deletions:LedgerPath"] ?? Path.Combine(AppContext.BaseDirectory, "deletions", "ledger.jsonl")));
        // The export store: data archives on persistent storage, outside the database (L2-018 AC5, ADR 0069).
        services.AddSingleton<IExportStore>(new Media.FileExportStore(
            configuration["Exports:Root"] ?? Path.Combine(AppContext.BaseDirectory, "exports")));
        services.AddSingleton<IImageProcessor, Media.SkiaImageProcessor>();
        services.AddSingleton<IMediaStore>(new Media.FileMediaStore(
            configuration["Media:Root"] ?? Path.Combine(AppContext.BaseDirectory, "media")));
        // The malware scanner (L2-138 AC4, ADR 0051). With none configured no upload passes.
        var scanner = configuration["Malware:Scanner"];
        var clamHost = configuration["Malware:ClamAv:Host"];
        if (string.Equals(scanner, "clamav", StringComparison.OrdinalIgnoreCase) && !string.IsNullOrWhiteSpace(clamHost))
        {
            var clamPort = configuration.GetValue<int?>("Malware:ClamAv:Port") ?? Media.ClamAvMalwareScanner.DefaultPort;
            var clamTimeout = configuration.GetValue<double?>("Malware:ClamAv:TimeoutSeconds") is { } seconds
                ? TimeSpan.FromSeconds(seconds)
                : Media.ClamAvMalwareScanner.DefaultTimeout;
            services.AddSingleton<IMalwareScanner>(sp => new Media.ClamAvMalwareScanner(
                clamHost, clamPort, clamTimeout, sp.GetService<Microsoft.Extensions.Logging.ILogger<Media.ClamAvMalwareScanner>>()));
        }
        else if (string.Equals(scanner, "none", StringComparison.OrdinalIgnoreCase))
        {
            services.AddSingleton<IMalwareScanner, Media.NoMalwareScanner>();
        }
        else
        {
            services.AddSingleton<IMalwareScanner, Media.UnavailableMalwareScanner>();
        }

        services.AddScoped<DemoDataSeeder>();
        services.AddSingleton<IDirectoryReadCache, DistributedDirectoryReadCache>();
        services.AddSingleton<IContentReadCache, DistributedContentReadCache>();
        services.AddSingleton<DirectoryCacheInvalidationInterceptor>();

        return services;
    }

    public static bool UsesSqlite(IConfiguration configuration) =>
        string.Equals(configuration["Database:Provider"], SqliteProvider, StringComparison.OrdinalIgnoreCase);

    /// <summary>SQLite and InMemory have no migrations: their schema comes from the model.</summary>
    public static bool SchemaFromModel(IConfiguration configuration) =>
        UsesSqlite(configuration)
        || string.Equals(configuration["Database:Provider"], InMemoryProvider, StringComparison.OrdinalIgnoreCase);

    /// <summary>
    /// Prepares the database when the host starts. Migrations are never applied here: SQL Server
    /// is migrated explicitly with <c>jubilee migrate</c>. SQLite has no migrations, so its schema
    /// is created from the model, and <c>Seed:OnStartup=true</c> (honoured with SQLite only) seeds the
    /// demo data, as the e2e API does.
    /// </summary>
    public static async Task InitialiseDatabaseAsync(this IServiceProvider services, IConfiguration configuration)
    {
        if (!SchemaFromModel(configuration))
        {
            return;
        }

        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.Database.EnsureCreatedAsync();

        if (string.Equals(configuration["Seed:OnStartup"], "true", StringComparison.OrdinalIgnoreCase))
        {
            await scope.ServiceProvider.GetRequiredService<DemoDataSeeder>().SeedAsync();
        }
    }
}

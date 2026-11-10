using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Jubilee.Infrastructure.Persistence;

/// <summary>
/// Used by <c>dotnet ef</c> only. Migrations target SQL Server; the connection string matters
/// only for commands that touch a database and can be set with <c>ConnectionStrings__Jubilee</c>.
/// </summary>
public sealed class AppDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var connectionString = Environment.GetEnvironmentVariable("ConnectionStrings__Jubilee")
            ?? "Server=(localdb)\\MSSQLLocalDB;Database=Jubilee;Trusted_Connection=True;TrustServerCertificate=True";
        return new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseSqlServer(connectionString).Options);
    }
}

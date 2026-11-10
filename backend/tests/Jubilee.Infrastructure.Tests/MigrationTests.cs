using Jubilee.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Jubilee.Infrastructure.Tests;

public class MigrationTests
{
    // `jubilee migrate` must produce the schema the code expects. No server is contacted.
    [Fact]
    public void The_sql_server_migrations_are_up_to_date_with_the_model()
    {
        using var db = new AppDbContextFactory().CreateDbContext([]);

        Assert.NotEmpty(db.Database.GetMigrations());
        Assert.False(db.Database.HasPendingModelChanges());
    }
}

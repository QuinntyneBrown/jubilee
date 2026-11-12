using Jubilee.Application.Directory;
using Microsoft.Extensions.DependencyInjection;

namespace Jubilee.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddMediatR(c => c.RegisterServicesFromAssembly(typeof(DependencyInjection).Assembly));
        services.AddScoped<FeaturedSelector>();
        services.AddScoped<Content.ContentReader>();
        services.AddScoped<Maintenance.MaintenanceWindowService>();
        services.AddScoped<DirectoryGrouping>();
        services.AddScoped<Accounts.AccountEmails>();
        services.AddScoped<Accounts.OutboxDispatcher>();
        services.AddScoped<Accounts.PasswordResetLinks>();
        services.AddScoped<Accounts.DataExportBuilder>();
        services.AddScoped<Accounts.AccountErasure>();
        services.AddScoped<Notifications.MeetingReminders>();
        services.AddScoped<Jobs.ScheduledJobs>();
        services.AddScoped<Search.DatabaseNameSearch>();
        services.AddScoped<Search.SearchStartBuilder>();
        return services;
    }
}

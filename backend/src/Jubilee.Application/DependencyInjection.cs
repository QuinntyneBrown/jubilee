using Jubilee.Application.Directory;
using Microsoft.Extensions.DependencyInjection;

namespace Jubilee.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddMediatR(c => c.RegisterServicesFromAssembly(typeof(DependencyInjection).Assembly));
        services.AddScoped<FeaturedSelector>();
        services.AddScoped<DirectoryGrouping>();
        return services;
    }
}

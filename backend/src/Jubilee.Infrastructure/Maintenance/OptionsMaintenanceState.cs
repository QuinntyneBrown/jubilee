using Jubilee.Application.Maintenance;
using Microsoft.Extensions.Options;

namespace Jubilee.Infrastructure.Maintenance;

/// <summary>The switch as the configuration holds it; a change of the configuration shows without a restart (L2-117 AC3).</summary>
public sealed class OptionsMaintenanceState(IOptionsMonitor<MaintenanceOptions> options) : IMaintenanceState
{
    public bool Enabled => options.CurrentValue.Enabled;

    public DateTimeOffset? BackBy => options.CurrentValue.BackBy;
}

using Jubilee.Api.Errors;
using Jubilee.Application.Notifications;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace Jubilee.Api.Controllers;

/// <summary>The notification centre of the signed-in member (L2-064). Only the caller's own are ever reached (L2-133 AC2).</summary>
[ApiController]
[Route("api/notifications")]
public sealed class NotificationsController(ISender sender) : ControllerBase
{
    private string Subject => User.ToViewer().Subject!;

    [HttpGet]
    [ErrorReference("JB-NTF-503")]
    public Task<NotificationListDto> List(CancellationToken cancellationToken) =>
        sender.Send(new ListNotificationsQuery(Subject), cancellationToken);

    [HttpPost("{id:guid}/read")]
    public Task<UnreadDto> Read(Guid id, CancellationToken cancellationToken) =>
        sender.Send(new MarkNotificationReadCommand(Subject, id), cancellationToken);

    [HttpPost("read-all")]
    public Task<UnreadDto> ReadAll(CancellationToken cancellationToken) =>
        sender.Send(new MarkAllNotificationsReadCommand(Subject), cancellationToken);
}

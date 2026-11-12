using Jubilee.Application.Documents;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Jubilee.Api.Controllers;

/// <summary>
/// What a page load answers, asked by the app's host before it serves the app (L2-113, L2-114 AC1, ADR 0056).
/// Anonymous: the session, when the host passes its cookie, decides what the caller may see.
/// </summary>
[ApiController]
[Route("api/documents/status")]
[AllowAnonymous]
public sealed class DocumentsController(ISender sender) : ControllerBase
{
    [HttpGet]
    public async Task<DocumentStatusDto> Get(string? path, bool owner, CancellationToken cancellationToken)
    {
        Response.Headers.CacheControl = "no-store";
        return await sender.Send(new GetDocumentStatusQuery(path, owner, User.ToViewer()), cancellationToken);
    }
}

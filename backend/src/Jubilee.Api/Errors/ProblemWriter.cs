using Microsoft.AspNetCore.Mvc;

namespace Jubilee.Api.Errors;

/// <summary>Writes every API error as ProblemDetails carrying the correlation ID.</summary>
public static class ProblemWriter
{
    public static Task WriteAsync(
        HttpContext context,
        int status,
        string title,
        string? detail = null,
        string? code = null,
        string? reference = null,
        IReadOnlyDictionary<string, string>? errors = null)
    {
        var problem = new ProblemDetails { Status = status, Title = title, Detail = detail };
        problem.Extensions["correlationId"] = context.TraceIdentifier;
        if (code is not null)
        {
            problem.Extensions["code"] = code;
        }

        if (errors is not null)
        {
            problem.Extensions["errors"] = errors;
        }

        if (reference is not null)
        {
            problem.Extensions["reference"] = reference;
        }

        context.Response.StatusCode = status;
        return context.Response.WriteAsJsonAsync(problem, options: null, contentType: "application/problem+json");
    }
}

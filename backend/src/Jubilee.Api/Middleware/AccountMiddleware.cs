using System.Security.Cryptography;
using Jubilee.Api.Controllers;
using Jubilee.Api.Errors;
using Jubilee.Application.Accounts;
using Jubilee.Domain;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace Jubilee.Api.Middleware;

/// <summary>
/// The anti-CSRF token (L2-135 AC2): a random value in the <c>XSRF-TOKEN</c> cookie that the app
/// copies into the <c>X-XSRF-TOKEN</c> header of every state-changing request.
/// </summary>
public static class CsrfToken
{
    public const string Cookie = "XSRF-TOKEN";
    public const string Header = "X-XSRF-TOKEN";
    public const string SessionCookie = "jubilee.session";

    public static void Issue(HttpContext context) =>
        context.Response.Cookies.Append(
            Cookie,
            Application.Accounts.LinkTokens.NewValue(),
            new CookieOptions { HttpOnly = false, SameSite = SameSiteMode.Lax, Path = "/", Secure = context.Request.IsHttps });
}

/// <summary>
/// Refuses a state-changing request that carries a session cookie but not the matching anti-CSRF
/// token (403). Requests without a session cookie have nothing to forge.
/// </summary>
public sealed class CsrfMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context)
    {
        var unsafeMethod = HttpMethods.IsPost(context.Request.Method) || HttpMethods.IsPut(context.Request.Method)
            || HttpMethods.IsPatch(context.Request.Method) || HttpMethods.IsDelete(context.Request.Method);
        if (unsafeMethod && context.Request.Cookies.ContainsKey(CsrfToken.SessionCookie))
        {
            var cookie = context.Request.Cookies[CsrfToken.Cookie];
            var header = context.Request.Headers[CsrfToken.Header].ToString();
            if (string.IsNullOrEmpty(cookie) || !CryptographicOperations.FixedTimeEquals(
                    System.Text.Encoding.UTF8.GetBytes(cookie), System.Text.Encoding.UTF8.GetBytes(header)))
            {
                await ProblemWriter.WriteAsync(context, StatusCodes.Status403Forbidden, "You can't do that.", code: "csrf_token_invalid");
                return;
            }
        }

        await next(context);
    }
}

/// <summary>Response headers every answer carries (L2-139 AC2).</summary>
public sealed class SecurityHeadersMiddleware(RequestDelegate next)
{
    public Task InvokeAsync(HttpContext context)
    {
        context.Response.OnStarting(() =>
        {
            var headers = context.Response.Headers;
            headers["X-Content-Type-Options"] = "nosniff";
            if (!headers.ContainsKey("Referrer-Policy"))
            {
                headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
            }

            headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(), payment=(), usb=()";
            headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'";
            if (context.Request.IsHttps)
            {
                headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";
            }

            return Task.CompletedTask;
        });
        return next(context);
    }
}

/// <summary>
/// A member who joined with Google cannot do anything but accept the agreement until they have
/// (L2-003 AC1): every other authenticated request is refused with <c>AGREEMENT_REQUIRED</c>.
/// </summary>
public sealed class AgreementRequiredMiddleware(RequestDelegate next)
{
    private static readonly string[] Allowed = ["/api/session", "/api/account/agreement", "/api/health"];

    public async Task InvokeAsync(HttpContext context, ISender sender)
    {
        var path = context.Request.Path.Value ?? string.Empty;
        if (context.User.Identity?.IsAuthenticated == true
            && !Allowed.Contains(path, StringComparer.OrdinalIgnoreCase)
            && !path.StartsWith("/api/auth/", StringComparison.OrdinalIgnoreCase))
        {
            var subject = context.User.ToViewer().Subject;
            var account = subject is null ? null : await sender.Send(new GetMemberAccountQuery(subject), context.RequestAborted);
            if (account is { AgreementRequired: true })
            {
                await ProblemWriter.WriteAsync(
                    context, StatusCodes.Status403Forbidden, "Agree to the statement of faith to continue.", code: "AGREEMENT_REQUIRED");
                return;
            }
        }

        await next(context);
    }
}

/// <summary>
/// Marks an endpoint that needs a confirmed e-mail: message, booking, quote and order requests and
/// listing submissions. An unconfirmed member is refused with 403 <c>EMAIL_UNCONFIRMED</c>
/// (L2-005 AC2). Saving does not carry it.
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public sealed class RequiresConfirmedEmailAttribute : Attribute, IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var subject = context.HttpContext.User.ToViewer().Subject;
        var account = subject is null
            ? null
            : await context.HttpContext.RequestServices.GetRequiredService<ISender>()
                .Send(new GetMemberAccountQuery(subject), context.HttpContext.RequestAborted);
        if (account is { EmailStatus: "unconfirmed" })
        {
            context.Result = new ObjectResult(new ProblemDetails
            {
                Status = StatusCodes.Status403Forbidden,
                Title = "Confirm your e-mail first.",
                Extensions = { ["code"] = "EMAIL_UNCONFIRMED", ["correlationId"] = context.HttpContext.TraceIdentifier },
            })
            {
                StatusCode = StatusCodes.Status403Forbidden,
                ContentTypes = { "application/problem+json" },
            };
            return;
        }

        await next();
    }
}

namespace Jubilee.Application.Errors;

/// <summary>
/// The caller is signed in but may not do this. The API answers 403 ProblemDetails carrying
/// <see cref="Code"/> and logs the failed authorization (L2-098 AC1, L2-143 AC1).
/// </summary>
public sealed class ForbiddenException(string code, string message) : Exception(message)
{
    public string Code { get; } = code;
}

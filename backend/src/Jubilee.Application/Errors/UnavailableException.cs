namespace Jubilee.Application.Errors;

/// <summary>
/// A service the request needs is not open or could not be reached, and nothing was changed. The API
/// answers 503 ProblemDetails carrying <see cref="Code"/> and the endpoint's error reference (L2-118).
/// </summary>
public sealed class UnavailableException(string code, string message, Exception? inner = null) : Exception(message, inner)
{
    public string Code { get; } = code;
}

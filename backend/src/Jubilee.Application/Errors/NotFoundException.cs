namespace Jubilee.Application.Errors;

/// <summary>
/// The thing asked for does not exist, or the caller may not know it exists (L2-113). The API
/// answers 404 ProblemDetails carrying <see cref="Code"/>.
/// </summary>
public sealed class NotFoundException(string code, string message) : Exception(message)
{
    public string Code { get; } = code;
}

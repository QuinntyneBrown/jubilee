namespace Jubilee.Application.Errors;

/// <summary>
/// The request is valid but the thing is not in a state that allows it. The API answers 409
/// ProblemDetails carrying <see cref="Code"/>.
/// </summary>
public sealed class ConflictException(string code, string message) : Exception(message)
{
    public string Code { get; } = code;

    /// <summary>Extra facts the client may branch on, for example the status a request is in.</summary>
    public IReadOnlyDictionary<string, string>? Facts { get; init; }
}

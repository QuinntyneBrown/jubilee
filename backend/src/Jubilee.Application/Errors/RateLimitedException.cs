namespace Jubilee.Application.Errors;

/// <summary>
/// The caller did something too often (L2-137). The API answers 429 ProblemDetails with
/// <c>Retry-After</c> set to <see cref="RetryAfter"/>.
/// </summary>
public sealed class RateLimitedException(string code, TimeSpan retryAfter) : Exception("Too many requests.")
{
    public string Code { get; } = code;

    public TimeSpan RetryAfter { get; } = retryAfter;
}

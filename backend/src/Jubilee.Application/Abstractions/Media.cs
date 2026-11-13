namespace Jubilee.Application.Abstractions;

/// <summary>One size of a stored image: <c>jpeg</c> or <c>webp</c>, <paramref name="Width"/> pixels wide (L2-088 AC4).</summary>
public sealed record Rendition(int Width, string Format, byte[] Data);

/// <summary>A checked, re-encoded upload with its renditions (L2-138 AC1).</summary>
public sealed record ProcessedImage(int Width, int Height, IReadOnlyList<Rendition> Renditions);

/// <summary>An upload that fails a rule; <see cref="Code"/> names the rule.</summary>
public sealed class InvalidPhotoException(string code, string message) : Exception(message)
{
    public string Code { get; } = code;
}

/// <summary>Checks an upload by its content and produces the renditions; the original is never kept.</summary>
public interface IImageProcessor
{
    ProcessedImage Process(Stream upload);
}

/// <summary>What the malware scanner says of an upload (L2-138 AC4).</summary>
public enum ScanVerdict
{
    Clean,
    Infected,

    /// <summary>No scanner is configured, or it did not answer: the upload is not accepted.</summary>
    Unavailable,
}

/// <summary>Scans an upload for malware before it is stored; it never throws for a scanner that is down.</summary>
public interface IMalwareScanner
{
    Task<ScanVerdict> Scan(byte[] content, CancellationToken cancellationToken);
}

/// <summary>Where renditions live: outside the web root, under random names (L2-138 AC2).</summary>
public interface IMediaStore
{
    Task Save(string key, int width, string format, byte[] data, CancellationToken cancellationToken);

    Task<byte[]?> Read(string key, int width, string format, CancellationToken cancellationToken);

    Task Delete(string key, CancellationToken cancellationToken);
}

/// <summary>
/// The export store (L2-018 AC5, ADR 0069): data archives, outside the database, in a private place no address serves.
/// Only the download reads an archive; it is deleted when the link expires or the account is deleted.
/// </summary>
public interface IExportStore
{
    Task Save(string key, string archive, CancellationToken cancellationToken);

    Task<string?> Read(string key, CancellationToken cancellationToken);

    Task Delete(string key, CancellationToken cancellationToken);
}

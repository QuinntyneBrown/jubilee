using Jubilee.Application.Abstractions;

namespace Jubilee.Infrastructure.Media;

/// <summary>
/// Keeps each data archive as a file in one private folder (<c>Exports:Root</c>), named by its random key: on the app's
/// persistent storage, which Azure encrypts at rest, outside the web root and the media folder (ADR 0069).
/// </summary>
public sealed class FileExportStore(string root) : IExportStore
{
    public async Task Save(string key, string archive, CancellationToken cancellationToken)
    {
        Directory.CreateDirectory(root);
        await File.WriteAllTextAsync(PathOf(key), archive, cancellationToken);
    }

    public async Task<string?> Read(string key, CancellationToken cancellationToken)
    {
        var path = PathOf(key);
        return File.Exists(path) ? await File.ReadAllTextAsync(path, cancellationToken) : null;
    }

    public Task Delete(string key, CancellationToken cancellationToken)
    {
        File.Delete(PathOf(key));
        return Task.CompletedTask;
    }

    // A key is 32 hexadecimal characters, so it cannot climb out of the folder.
    private string PathOf(string key) =>
        key.Length == 32 && key.All(Uri.IsHexDigit)
            ? Path.Combine(root, $"{key}.json")
            : throw new ArgumentException("An export key is 32 hexadecimal characters.", nameof(key));
}

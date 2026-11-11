using Jubilee.Application.Abstractions;

namespace Jubilee.Infrastructure.Media;

/// <summary>Keeps renditions as files in one folder outside the web root, named by a random key.</summary>
public sealed class FileMediaStore(string root) : IMediaStore
{
    public async Task Save(string key, int width, string format, byte[] data, CancellationToken cancellationToken)
    {
        Directory.CreateDirectory(Folder(key));
        await File.WriteAllBytesAsync(Path(key, width, format), data, cancellationToken);
    }

    public async Task<byte[]?> Read(string key, int width, string format, CancellationToken cancellationToken)
    {
        var path = Path(key, width, format);
        return File.Exists(path) ? await File.ReadAllBytesAsync(path, cancellationToken) : null;
    }

    public Task Delete(string key, CancellationToken cancellationToken)
    {
        var folder = Folder(key);
        if (Directory.Exists(folder))
        {
            Directory.Delete(folder, true);
        }

        return Task.CompletedTask;
    }

    // A key is hex only, so it cannot climb out of the folder.
    private string Folder(string key) => System.IO.Path.Combine(root, Safe(key));

    private string Path(string key, int width, string format) =>
        System.IO.Path.Combine(Folder(key), $"{width}.{(format == "webp" ? "webp" : "jpg")}");

    private static string Safe(string key) =>
        key.All(Uri.IsHexDigit) ? key : throw new ArgumentException("A media key is hexadecimal.", nameof(key));
}

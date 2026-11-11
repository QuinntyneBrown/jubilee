using System.Collections.Concurrent;
using Jubilee.Application.Abstractions;

namespace Jubilee.Api.Tests.Support;

/// <summary>Holds renditions in memory, so no test touches the file system (ADR 0009).</summary>
public sealed class InMemoryMediaStore : IMediaStore
{
    private readonly ConcurrentDictionary<(string Key, int Width, string Format), byte[]> _files = new();

    public IEnumerable<string> Keys => _files.Keys.Select(k => k.Key).Distinct();

    public Task Save(string key, int width, string format, byte[] data, CancellationToken cancellationToken)
    {
        _files[(key, width, format)] = data;
        return Task.CompletedTask;
    }

    public Task<byte[]?> Read(string key, int width, string format, CancellationToken cancellationToken) =>
        Task.FromResult(_files.TryGetValue((key, width, format), out var data) ? data : null);

    public Task Delete(string key, CancellationToken cancellationToken)
    {
        foreach (var file in _files.Keys.Where(k => k.Key == key).ToList())
        {
            _files.TryRemove(file, out _);
        }

        return Task.CompletedTask;
    }

    public void Clear() => _files.Clear();
}

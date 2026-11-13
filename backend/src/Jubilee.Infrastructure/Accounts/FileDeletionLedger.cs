using System.Text.Json;
using Jubilee.Application.Accounts;

namespace Jubilee.Infrastructure.Accounts;

/// <summary>
/// The deletion ledger as a file of JSON lines, one per deletion, on storage a database restore does not touch
/// (<c>Deletions:LedgerPath</c>, ADR 0069). Lines are only ever appended. The API appends and the worker reads, in two
/// processes, so each write and read retries briefly while the other holds the file.
/// </summary>
public sealed class FileDeletionLedger(string path) : IDeletionLedger
{
    private static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web);

    public async Task Record(DeletedAccount entry, CancellationToken cancellationToken)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(Path.GetFullPath(path))!);
        var line = JsonSerializer.Serialize(entry, Options) + "\n";
        await Retry(async () =>
        {
            await using var stream = new FileStream(path, FileMode.Append, FileAccess.Write, FileShare.Read);
            await using var writer = new StreamWriter(stream);
            await writer.WriteAsync(line.AsMemory(), cancellationToken);
        }, cancellationToken);
    }

    public async Task<IReadOnlyList<DeletedAccount>> ReadAll(CancellationToken cancellationToken)
    {
        if (!File.Exists(path))
        {
            return [];
        }

        string text = string.Empty;
        await Retry(async () =>
        {
            await using var stream = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.ReadWrite);
            using var reader = new StreamReader(stream);
            text = await reader.ReadToEndAsync(cancellationToken);
        }, cancellationToken);

        var entries = new List<DeletedAccount>();
        foreach (var line in text.Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            // A line cut short by a crash is skipped; the worker writes its deletion again from the database.
            try
            {
                if (JsonSerializer.Deserialize<DeletedAccount>(line, Options) is { MemberId: var id } entry && id != Guid.Empty)
                {
                    entries.Add(entry);
                }
            }
            catch (JsonException)
            {
            }
        }

        return entries;
    }

    private static async Task Retry(Func<Task> work, CancellationToken cancellationToken)
    {
        for (var attempt = 1; ; attempt++)
        {
            try
            {
                await work();
                return;
            }
            catch (IOException) when (attempt < 10)
            {
                await Task.Delay(50 * attempt, cancellationToken);
            }
        }
    }
}

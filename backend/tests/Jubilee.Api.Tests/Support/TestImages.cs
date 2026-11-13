namespace Jubilee.Api.Tests.Support;

/// <summary>A small PNG with a text chunk that cleaning must strip (L2-138).</summary>
internal static class TestImages
{
    public static byte[] Png(int width = 1, int height = 1, bool withText = true)
    {
        using var stream = new MemoryStream();
        stream.Write([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
        Chunk(stream, "IHDR", [.. BigEndian(width), .. BigEndian(height), 8, 2, 0, 0, 0]);
        if (withText)
        {
            Chunk(stream, "tEXt", "Author\0Secret Photographer"u8.ToArray());
        }

        Chunk(stream, "IDAT", [0x78, 0x9C, 0x62, 0x00, 0x00, 0x00, 0x06, 0x00, 0x05]);
        Chunk(stream, "IEND", []);
        return stream.ToArray();
    }

    private static byte[] BigEndian(int value) => [(byte)(value >> 24), (byte)(value >> 16), (byte)(value >> 8), (byte)value];

    private static void Chunk(Stream stream, string type, byte[] data)
    {
        stream.Write(BigEndian(data.Length));
        var body = System.Text.Encoding.ASCII.GetBytes(type).Concat(data).ToArray();
        stream.Write(body);
        stream.Write(BigEndian((int)Crc32(body)));
    }

    private static uint Crc32(byte[] bytes)
    {
        var crc = 0xFFFFFFFFu;
        foreach (var b in bytes)
        {
            crc ^= b;
            for (var bit = 0; bit < 8; bit++)
            {
                crc = (crc & 1) != 0 ? (crc >> 1) ^ 0xEDB88320u : crc >> 1;
            }
        }

        return ~crc;
    }
}

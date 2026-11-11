namespace Jubilee.Application.Messaging;

/// <summary>Why a photo was refused (L2-060 AC2, AC3; L2-138 AC1).</summary>
public enum ImageProblem
{
    None,
    NotAnImage,
    TooLarge,
}

public sealed record SanitizedImage(string ContentType, byte[] Content, ImageProblem Problem)
{
    public static SanitizedImage Refused(ImageProblem problem) => new(string.Empty, [], problem);

    public bool Accepted => Problem == ImageProblem.None;
}

/// <summary>
/// Decides what an upload is from its bytes, never from its name or the type the client claims,
/// accepts only JPEG and PNG up to 5 MB and 8000 pixels wide, and drops everything that is not
/// picture data: EXIF and other metadata segments, text chunks and comments.
/// </summary>
public static class ImageSanitizer
{
    public const int MaxBytes = 5 * 1024 * 1024;
    public const int MaxWidth = 8000;

    private static readonly byte[] PngSignature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];

    public static SanitizedImage Sanitize(byte[] bytes)
    {
        if (bytes.Length > MaxBytes)
        {
            return SanitizedImage.Refused(ImageProblem.TooLarge);
        }

        if (bytes.Length > PngSignature.Length && bytes.AsSpan(0, PngSignature.Length).SequenceEqual(PngSignature))
        {
            return Png(bytes);
        }

        if (bytes.Length > 4 && bytes[0] == 0xFF && bytes[1] == 0xD8)
        {
            return Jpeg(bytes);
        }

        return SanitizedImage.Refused(ImageProblem.NotAnImage);
    }

    private static SanitizedImage Png(byte[] bytes)
    {
        using var output = new MemoryStream();
        output.Write(PngSignature);
        var position = PngSignature.Length;
        var sawHeader = false;
        var sawData = false;
        var sawEnd = false;
        while (position + 12 <= bytes.Length)
        {
            var length = ReadInt(bytes, position);
            if (length < 0 || position + 12L + length > bytes.Length)
            {
                return SanitizedImage.Refused(ImageProblem.NotAnImage);
            }

            var type = System.Text.Encoding.ASCII.GetString(bytes, position + 4, 4);
            if (type == "IHDR" && length >= 13)
            {
                if (ReadInt(bytes, position + 8) > MaxWidth)
                {
                    return SanitizedImage.Refused(ImageProblem.TooLarge);
                }

                sawHeader = true;
            }

            if (type is "IHDR" or "PLTE" or "tRNS" or "IDAT" or "IEND")
            {
                output.Write(bytes, position, 12 + length);
            }

            sawData |= type == "IDAT";
            position += 12 + length;
            if (type == "IEND")
            {
                sawEnd = true;
                break;
            }
        }

        return sawHeader && sawData && sawEnd
            ? new SanitizedImage("image/png", output.ToArray(), ImageProblem.None)
            : SanitizedImage.Refused(ImageProblem.NotAnImage);
    }

    private static SanitizedImage Jpeg(byte[] bytes)
    {
        using var output = new MemoryStream();
        output.Write(bytes, 0, 2);
        var position = 2;
        var sawFrame = false;
        while (position + 2 <= bytes.Length)
        {
            if (bytes[position] != 0xFF)
            {
                return SanitizedImage.Refused(ImageProblem.NotAnImage);
            }

            var marker = bytes[position + 1];
            if (marker == 0xFF)
            {
                position++;
                continue;
            }

            if (marker == 0xD9)
            {
                output.Write(bytes, position, 2);
                return sawFrame
                    ? new SanitizedImage("image/jpeg", output.ToArray(), ImageProblem.None)
                    : SanitizedImage.Refused(ImageProblem.NotAnImage);
            }

            if (marker == 0x01 || marker is >= 0xD0 and <= 0xD8)
            {
                output.Write(bytes, position, 2);
                position += 2;
                continue;
            }

            if (position + 4 > bytes.Length)
            {
                return SanitizedImage.Refused(ImageProblem.NotAnImage);
            }

            var length = (bytes[position + 2] << 8) | bytes[position + 3];
            if (length < 2 || position + 2 + length > bytes.Length)
            {
                return SanitizedImage.Refused(ImageProblem.NotAnImage);
            }

            var isFrame = marker is >= 0xC0 and <= 0xCF && marker is not (0xC4 or 0xC8 or 0xCC);
            if (isFrame)
            {
                if (length < 8)
                {
                    return SanitizedImage.Refused(ImageProblem.NotAnImage);
                }

                var width = (bytes[position + 7] << 8) | bytes[position + 8];
                if (width > MaxWidth)
                {
                    return SanitizedImage.Refused(ImageProblem.TooLarge);
                }

                sawFrame = true;
            }

            // Application segments (EXIF, XMP, ICC...) and comments are metadata; keep JFIF only.
            var isMetadata = (marker is >= 0xE1 and <= 0xEF) || marker == 0xFE;
            if (!isMetadata)
            {
                output.Write(bytes, position, 2 + length);
            }

            position += 2 + length;
            if (marker == 0xDA)
            {
                // Start of scan: the entropy-coded data and the end marker follow unchanged.
                if (!sawFrame)
                {
                    return SanitizedImage.Refused(ImageProblem.NotAnImage);
                }

                output.Write(bytes, position, bytes.Length - position);
                return new SanitizedImage("image/jpeg", output.ToArray(), ImageProblem.None);
            }
        }

        return SanitizedImage.Refused(ImageProblem.NotAnImage);
    }

    private static int ReadInt(byte[] bytes, int position) =>
        (bytes[position] << 24) | (bytes[position + 1] << 16) | (bytes[position + 2] << 8) | bytes[position + 3];
}

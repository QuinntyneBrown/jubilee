using Jubilee.Application.Abstractions;
using SkiaSharp;

namespace Jubilee.Infrastructure.Media;

/// <summary>
/// Accepts only JPEG and PNG, decided by the file's content and not its name, up to 5 MB and
/// 8,000 x 8,000 pixels. The image is decoded and encoded again, which drops every piece of metadata,
/// GPS included, and is produced at 320, 640 and 1280 pixels wide in WebP and JPEG.
/// </summary>
public sealed class SkiaImageProcessor : IImageProcessor
{
    public const int MaxBytes = 5 * 1024 * 1024;

    public const int MaxSide = 8000;

    public static readonly int[] Widths = [320, 640, 1280];

    private static readonly byte[] PngMagic = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];

    public ProcessedImage Process(Stream upload)
    {
        using var buffer = new MemoryStream();
        upload.CopyTo(buffer);
        if (buffer.Length > MaxBytes)
        {
            throw new InvalidPhotoException("TOO_LARGE", "Photos can be 5 MB at most.");
        }

        var bytes = buffer.ToArray();
        var isJpeg = bytes.Length > 3 && bytes[0] == 0xFF && bytes[1] == 0xD8 && bytes[2] == 0xFF;
        var isPng = bytes.Length > PngMagic.Length && bytes.AsSpan(0, PngMagic.Length).SequenceEqual(PngMagic);
        if (!isJpeg && !isPng)
        {
            throw NotAnImage();
        }

        using var data = SKData.CreateCopy(bytes);
        using var codec = SKCodec.Create(data);
        if (codec is null)
        {
            throw NotAnImage();
        }

        if (codec.Info.Width > MaxSide || codec.Info.Height > MaxSide)
        {
            throw new InvalidPhotoException("TOO_BIG_IN_PIXELS", "Photos can be 8,000 by 8,000 pixels at most.");
        }

        using var bitmap = SKBitmap.Decode(codec);
        if (bitmap is null)
        {
            throw NotAnImage();
        }

        var renditions = new List<Rendition>();
        foreach (var width in Widths)
        {
            var targetWidth = Math.Min(width, bitmap.Width);
            var targetHeight = Math.Max(1, (int)Math.Round(bitmap.Height * (targetWidth / (double)bitmap.Width)));
            using var resized = bitmap.Resize(new SKImageInfo(targetWidth, targetHeight), new SKSamplingOptions(SKFilterMode.Linear, SKMipmapMode.Linear))
                ?? throw NotAnImage();
            using var image = SKImage.FromBitmap(resized);
            renditions.Add(new Rendition(width, "jpeg", Encode(image, SKEncodedImageFormat.Jpeg, 82)));
            renditions.Add(new Rendition(width, "webp", Encode(image, SKEncodedImageFormat.Webp, 80)));
        }

        return new ProcessedImage(bitmap.Width, bitmap.Height, renditions);
    }

    private static InvalidPhotoException NotAnImage() => new("NOT_AN_IMAGE", "Add a JPG or PNG photo.");

    private static byte[] Encode(SKImage image, SKEncodedImageFormat format, int quality)
    {
        using var encoded = image.Encode(format, quality);
        return encoded.ToArray();
    }
}

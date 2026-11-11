import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { crc32, deflateSync } from 'node:zlib';

// Photo files for the attachment specs (L2-060), built here so the repository holds no large binaries.

/** The photo the mocks show in a conversation (docs/assets/photos/monday.jpg). */
export const MOCK_PHOTO = join(__dirname, '..', '..', 'docs', 'assets', 'photos', 'monday.jpg');

export interface PhotoFile {
  name: string;
  mimeType: string;
  buffer: Buffer;
}

export const smallJpeg = (name = 'statement.jpg'): PhotoFile => ({
  name,
  mimeType: 'image/jpeg',
  buffer: readFileSync(MOCK_PHOTO),
});

function chunk(type: string, data: Buffer): Buffer {
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const sum = Buffer.alloc(4);
  sum.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, sum]);
}

/** A real PNG of the given size whose pixels are stored uncompressed, so its file is as large as its pixels. */
export function png(width: number, height: number, name = 'scan.png'): PhotoFile {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 2, 0, 0, 0], 8);
  const row = Buffer.alloc(1 + width * 3, 0x90);
  row[0] = 0;
  const pixels = Buffer.concat(Array.from({ length: height }, () => row));
  return {
    name,
    mimeType: 'image/png',
    buffer: Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk('IHDR', header),
      chunk('IDAT', deflateSync(pixels, { level: 0 })),
      chunk('IEND', Buffer.alloc(0)),
    ]),
  };
}

/** A PNG a little over 5 MB (1,400 × 1,300 pixels, uncompressed). */
export const largePng = (): PhotoFile => png(1400, 1300);

/** A PDF that calls itself a JPEG: refused by its bytes, not its name (L2-060 AC3). */
export const pdfNamedJpeg = (): PhotoFile => ({
  name: 'photo.jpg',
  mimeType: 'image/jpeg',
  buffer: Buffer.from('%PDF-1.7\n1 0 obj\n<<>>\nendobj\n'),
});

/** Over 5 MB, starts like a JPEG and cannot be decoded, so it cannot be shrunk (L2-060 AC3). */
export const brokenLargeJpeg = (): PhotoFile => ({
  name: 'broken.jpg',
  mimeType: 'image/jpeg',
  buffer: Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(5_300_000, 7)]),
});

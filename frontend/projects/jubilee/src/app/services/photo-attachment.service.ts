import { Injectable } from '@angular/core';

/** A photo is sent at 5 MB or less (L2-060). */
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

/** The long side of a shrunk photo, in pixels, to begin with. */
const MAX_SIDE = 4096;
/** Below this side a photo is not worth sending; shrinking gives up. */
const MIN_SIDE = 256;
const QUALITIES = [0.85, 0.7, 0.5];

/** A photo ready to upload, and whether it had to be shrunk first. */
export interface PreparedPhoto {
  blob: Blob;
  shrunk: boolean;
}

/**
 * Checks and shrinks a photo on the device before it is sent (L2-060 AC2, AC3; ADR 0039). The
 * file is a JPEG or PNG by its first bytes, whatever it is called. Over 5 MB it is drawn to a
 * canvas and encoded as JPEG, at lower quality and then smaller, until it fits. The server
 * decides again; this is for feedback and for the member's data plan.
 */
@Injectable({ providedIn: 'root' })
export class PhotoAttachmentService {
  /** The type the bytes say, or null when the file is neither a JPEG nor a PNG. */
  async typeOf(file: Blob): Promise<'image/jpeg' | 'image/png' | null> {
    const head = new Uint8Array(await file.slice(0, 8).arrayBuffer());
    if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return 'image/jpeg';
    const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    return png.every((byte, index) => head[index] === byte) ? 'image/png' : null;
  }

  needsShrinking(file: Blob): boolean {
    return file.size > MAX_PHOTO_BYTES;
  }

  /** The photo as it will be sent, or null when it cannot be used. */
  async prepare(file: Blob): Promise<PreparedPhoto | null> {
    const type = await this.typeOf(file);
    if (!type) return null;
    if (!this.needsShrinking(file)) return { blob: file.slice(0, file.size, type), shrunk: false };
    const blob = await this.shrink(file);
    return blob ? { blob, shrunk: true } : null;
  }

  private async shrink(file: Blob): Promise<Blob | null> {
    let bitmap: ImageBitmap;
    try {
      bitmap = await createImageBitmap(file);
    } catch {
      // Not a picture the device can read, or a device without the means to shrink it.
      return null;
    }
    try {
      let scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
      while (Math.max(bitmap.width, bitmap.height) * scale >= MIN_SIDE) {
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(bitmap.width * scale));
        canvas.height = Math.max(1, Math.round(bitmap.height * scale));
        const context = canvas.getContext('2d');
        if (!context) return null;
        // A JPEG has no transparency: a see-through PNG gets a white ground.
        context.fillStyle = 'white';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        for (const quality of QUALITIES) {
          const blob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob(resolve, 'image/jpeg', quality),
          );
          if (blob && blob.size <= MAX_PHOTO_BYTES) return blob;
        }
        scale *= 0.75;
      }
      return null;
    } finally {
      bitmap.close();
    }
  }
}

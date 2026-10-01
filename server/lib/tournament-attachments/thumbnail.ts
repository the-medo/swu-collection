import sharp from 'sharp';
import { AttachmentError } from './storage.ts';

let processing = false;
const waiting: Array<() => void> = [];

// Claim a slot before reading the encrypted original so queued requests hold no image buffers.
export async function withAttachmentThumbnail<T>(create: () => Promise<T>): Promise<T> {
  if (processing) {
    if (waiting.length >= 16)
      throw new AttachmentError('Image previews are busy. Please retry shortly.', 503);
    await new Promise<void>((resolve, reject) => {
      const resume = () => {
        clearTimeout(timer);
        resolve();
      };
      const timer = setTimeout(() => {
        const index = waiting.indexOf(resume);
        if (index >= 0) waiting.splice(index, 1);
        reject(new AttachmentError('Image previews are busy. Please retry shortly.', 503));
      }, 10_000);
      waiting.push(resume);
    });
  } else processing = true;
  try {
    return await create();
  } finally {
    const next = waiting.shift();
    if (next) next();
    else processing = false;
  }
}

export async function attachmentThumbnail(body: Uint8Array): Promise<Buffer> {
  try {
    return await sharp(body, { limitInputPixels: 64_000_000, sequentialRead: true })
      .rotate()
      .resize(96, 96, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 75 })
      .timeout({ seconds: 5 })
      .toBuffer();
  } catch {
    // Damaged, oversized or slow-to-decode uploads can still be opened as originals.
    throw new AttachmentError('Could not generate an image preview.', 400);
  }
}

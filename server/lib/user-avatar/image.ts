import sharp from 'sharp';
import type { CardList } from '../../../lib/swu-resources/types.ts';
import {
  avatarSize,
  avatarCropSchema,
  type AvatarCrop,
  type CardAvatarSource,
} from '../../../types/UserAvatar.ts';

export class AvatarError extends Error {
  constructor(
    message: string,
    public status: 400 | 404 | 502 | 503,
  ) {
    super(message);
  }
}

// Only catalog-owned paths within the public cards directory can be fetched.
export function resolveAvatarImage(cards: CardList, input: CardAvatarSource): string {
  const card = Object.prototype.hasOwnProperty.call(cards, input.cardId)
    ? cards[input.cardId]
    : undefined;
  const variant =
    card && Object.prototype.hasOwnProperty.call(card.variants, input.variantId)
      ? card.variants[input.variantId]
      : undefined;
  const path = variant?.image[input.side];
  if (!path) throw new AvatarError('This card version or side has no image.', 404);
  if (
    !/^[a-zA-Z0-9_/-]+\.(webp|png|jpe?g)$/i.test(path) ||
    path.startsWith('/') ||
    path.includes('..')
  ) {
    throw new AvatarError('This card image is unavailable.', 400);
  }
  return `https://images.swubase.com/cards/${path}`;
}

export async function fetchAvatarSource(url: string): Promise<Uint8Array> {
  const maxBytes = 10 * 1024 * 1024;
  try {
    const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(15_000) });
    if (!response.ok || !response.body) throw new Error('Image unavailable');
    if (Number(response.headers.get('content-length')) > maxBytes) {
      await response.body.cancel();
      throw new Error('Image too large');
    }
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let length = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        length += value.length;
        if (length > maxBytes) throw new Error('Image too large');
        chunks.push(value);
      }
    } finally {
      await reader.cancel();
    }
    return Buffer.concat(chunks);
  } catch {
    throw new AvatarError('Could not load the image. Please try again.', 502);
  }
}

export async function cropAvatar(source: Uint8Array, input: AvatarCrop): Promise<Buffer> {
  const parsed = avatarCropSchema.safeParse(input);
  if (!parsed.success) throw new AvatarError('Select a square of at least 100 × 100 pixels.', 400);
  const { left, top, size } = parsed.data;
  try {
    // Match the browser's EXIF orientation before checking pixel coordinates.
    const { data, info } = await sharp(source, { limitInputPixels: 32_000_000 })
      .rotate()
      .toBuffer({ resolveWithObject: true });
    if (left + size > info.width || top + size > info.height) {
      throw new AvatarError('The selected square must stay inside the image.', 400);
    }
    return await sharp(data)
      .extract({ left, top, width: size, height: size })
      .resize(avatarSize, avatarSize)
      .webp({ quality: 90 })
      .toBuffer();
  } catch (error) {
    if (error instanceof AvatarError) throw error;
    throw new AvatarError('Could not process this image. Try another image.', 502);
  }
}

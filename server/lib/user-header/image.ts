import sharp from 'sharp';
import { headerCropSchema, type HeaderCrop } from '../../../types/UserHeader.ts';
import { UserFileError } from '../user-files/errors.ts';
import { AvatarError, fetchAvatarSource } from '../user-avatar/image.ts';

export async function fetchHeaderSource(url: string) {
  try {
    return await fetchAvatarSource(url);
  } catch (error) {
    if (error instanceof AvatarError) throw new UserFileError(error.message, error.status);
    throw error;
  }
}

export async function cropHeader(source: Uint8Array, crop: HeaderCrop) {
  const parsed = headerCropSchema.safeParse(crop);
  if (!parsed.success)
    throw new UserFileError('Select a header with a width-to-height ratio of at least 4:1.', 400);
  try {
    const { data, info } = await sharp(source, { limitInputPixels: 40_000_000, failOn: 'warning' })
      .rotate()
      .timeout({ seconds: 10 })
      .toBuffer({ resolveWithObject: true });
    const { left, top, width, height } = parsed.data;
    if (left + width > info.width || top + height > info.height)
      throw new UserFileError('The selected header must stay inside the image.', 400);
    // Preserve the selected dimensions, including crops wider than the suggested 1600 pixels.
    return await sharp(data)
      .extract({ left, top, width, height })
      .webp({ quality: 90 })
      .timeout({ seconds: 10 })
      .toBuffer();
  } catch (error) {
    if (error instanceof UserFileError) throw error;
    throw new UserFileError('Could not process this header. Choose another image.', 400);
  }
}

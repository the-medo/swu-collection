import sharp from 'sharp';
import { maxUserFileBytes } from '../../../types/UserFile.ts';
import { UserFileError } from './errors.ts';

export async function optimizeUserImage(file: File) {
  if (!file.size) throw new UserFileError('Choose a nonempty image.', 400);
  if (file.size > maxUserFileBytes)
    throw new UserFileError('Images must be 10 MB or smaller.', 413);
  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const input = sharp(bytes, { limitInputPixels: 40_000_000, failOn: 'warning' });
    const meta = await input.metadata();
    // Decode the actual contents, never trust a filename or browser-provided MIME type.
    if (!['jpeg', 'png', 'webp', 'gif'].includes(meta.format ?? ''))
      throw new UserFileError('Choose a JPEG, PNG, WebP or GIF image.', 400);
    if ((meta.pages ?? 1) > 1)
      throw new UserFileError('Animated images are not supported. Choose a still image.', 400);
    // Re-encoding strips EXIF/GPS and other metadata. Rotation applies EXIF orientation first.
    const { data: image, info } = await input
      .rotate()
      .resize(2560, 2560, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .timeout({ seconds: 10 })
      .toBuffer({ resolveWithObject: true });
    const thumbnail = await sharp(image)
      .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 75 })
      .timeout({ seconds: 5 })
      .toBuffer();
    return { image, thumbnail, width: info.width, height: info.height };
  } catch (error) {
    if (error instanceof UserFileError) throw error;
    throw new UserFileError(
      'This image cannot be processed. Use a valid image under 40 megapixels.',
      400,
    );
  }
}

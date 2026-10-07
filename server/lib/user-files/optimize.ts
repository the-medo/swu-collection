import sharp from 'sharp';
import { maxUserFileBytes } from '../../../types/UserFile.ts';
import { UserFileError } from './errors.ts';

export async function optimizeUserImage(
  file: File,
  { maxDimension = 2560, quality = 82, preserveWidth = 0 } = {},
) {
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
    const sideways = [5, 6, 7, 8].includes(meta.orientation ?? 1);
    const width = (sideways ? meta.height : meta.width)!;
    const height = (sideways ? meta.width : meta.height)!;
    // Preserve useful width in tall artwork that already has it, without rejecting
    // smaller images or enlarging them.
    const widthToPreserve = width >= preserveWidth ? preserveWidth : 0;
    const heightLimit = widthToPreserve
      ? Math.max(maxDimension, Math.ceil((widthToPreserve * height) / width))
      : maxDimension;
    // Re-encoding strips EXIF/GPS and other metadata. Rotation applies EXIF orientation first.
    const { data: image, info } = await input
      .rotate()
      .resize(maxDimension, heightLimit, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality })
      .timeout({ seconds: 10 })
      .toBuffer({ resolveWithObject: true });
    if (preserveWidth && image.length > maxUserFileBytes)
      throw new UserFileError('The processed image exceeds 10 MB. Choose a smaller image.', 413);
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

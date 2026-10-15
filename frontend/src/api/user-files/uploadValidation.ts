import { maxUserFileBytes, userFileMimeTypes } from '../../../../types/UserFile.ts';

export function validateUserImageFiles(files: File[]) {
  for (const file of files) {
    if (
      !userFileMimeTypes.some(type => type === file.type) &&
      !(file.type === '' && /\.(jpe?g|png|webp|gif)$/i.test(file.name))
    )
      throw new Error(`${file.name}: choose a JPEG, PNG, WebP or still GIF image.`);
    if (file.size > maxUserFileBytes)
      throw new Error(`${file.name}: images must be 10 MB or smaller.`);
  }
}

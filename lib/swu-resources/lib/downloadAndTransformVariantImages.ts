import { downloadAndTransformImage } from './downloadAndTransformImage.ts';
import { variantFilename } from './variantFilename.ts';
import { delay } from './delay.ts';
import type { CardVariant } from '../types.ts';

export async function downloadAndTransformVariantImages(
  variant: CardVariant,
  cardFilename: string,
): Promise<CardVariant> {
  const baseFilename = variantFilename(variant, cardFilename);
  variant.variantId = baseFilename;

  const frontFilename = `${baseFilename}-front`;
  const frontHorizontal = await downloadAndTransformImage(variant.image.front, frontFilename);
  variant.image.front = frontFilename + '.webp';
  variant.front = { horizontal: frontHorizontal.horizontal };
  console.log('Front image downloaded: ', variant.image.front);
  await delay(500);

  if (variant.image.back) {
    const backFilename = `${baseFilename}-back`;
    const backHorizontal = await downloadAndTransformImage(variant.image.back, backFilename);
    variant.image.back = backFilename + '.webp';
    variant.back = { horizontal: backHorizontal.horizontal };
    console.log('Back image downloaded: ', variant.image.back);
    await delay(500);
  }

  return variant;
}

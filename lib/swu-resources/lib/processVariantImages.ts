import { delay } from './delay.ts';
import type { CardVariant } from '../types.ts';

export async function processVariantImages(variant: CardVariant): Promise<CardVariant> {
  const variantDetailResponse = await fetch(
    `https://admin.starwarsunlimited.com/api/card/details/${variant.swuId}?locale=all`,
  );

  if (!variantDetailResponse.ok) {
    throw new Error(`HTTP error! status: ${variantDetailResponse.status}`);
  }

  const variantDetails = (await variantDetailResponse.json()) as any;
  await delay(500);

  variant.image = {
    front: variantDetails.data.attributes.artFront.data.attributes.url,
    back: variantDetails.data.attributes.artBack?.data?.attributes?.url ?? null,
  };

  console.log(
    'processPrintingImages',
    variant.cardNo,
    variant.fullSetName,
    'DONE',
    variant.image.front,
    variant.image.back,
  );

  return variant;
}

import type { CardPrinting } from '../types.ts';
import { delay } from './delay.ts';

export async function processPrintingImages(printing: CardPrinting): Promise<CardPrinting> {
  const printingDetailResponse = await fetch(
    `https://admin.starwarsunlimited.com/api/card/details/${printing.swuId}?locale=all`,
  );

  if (!printingDetailResponse.ok) {
    throw new Error(`HTTP error! status: ${printingDetailResponse.status}`);
  }

  const printingDetails = (await printingDetailResponse.json()) as any;
  await delay(1000);

  printing.image = {
    front: printingDetails.data.attributes.artFront.data.attributes.url,
    back: printingDetails.data.attributes.artBack?.data?.attributes?.url ?? null,
  };

  console.log(
    'processPrintingImages',
    printing.cardNo,
    printing.fullSetName,
    'DONE',
    printing.image.front,
    printing.image.back,
  );

  return printing;
}

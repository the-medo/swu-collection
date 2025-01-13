import type { CardPrinting } from '../types.ts';
import { downloadAndTransformImage } from './downloadAndTransformImage.ts';
import { printingFilename } from './printingFilename.ts';
import { delay } from './delay.ts';

export async function downloadAndTransformPrintingImages(
  printing: CardPrinting,
  cardFilename: string,
): Promise<CardPrinting> {
  const baseFilename = printingFilename(printing, cardFilename);

  const frontFilename = `${baseFilename}-front`;
  await downloadAndTransformImage(printing.image.front, frontFilename);
  printing.image.front = frontFilename + '.webp';
  console.log('Front image downloaded: ', printing.image.front);
  await delay(1000);

  if (printing.image.back) {
    const backFilename = `${baseFilename}-back`;
    await downloadAndTransformImage(printing.image.back, backFilename);
    printing.image.back = backFilename + '.webp';
    console.log('Back image downloaded: ', printing.image.back);
    await delay(1000);
  }

  return printing;
}

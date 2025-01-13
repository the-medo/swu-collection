import type { CardPrinting } from '../types.ts';
import { createFileName } from './createFileName.ts';

export function printingFilename(printing: CardPrinting, cardFilename: string): string {
  return `${cardFilename}-${printing.cardNo}-${createFileName(printing.fullSetName)}`;
}

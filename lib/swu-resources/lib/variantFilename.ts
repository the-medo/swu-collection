import type { CardVariant } from '../types.ts';
import { createFileName } from './createFileName.ts';

export function variantFilename(variant: CardVariant, cardFilename: string): string {
  return `${cardFilename}-${variant.cardNo}-${createFileName(variant.fullSetName)}`;
}

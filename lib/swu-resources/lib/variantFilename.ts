import { transformToId } from './transformToId.ts';
import type { CardVariant } from '../types.ts';

export function variantFilename(variant: CardVariant, cardFilename: string): string {
  return `${cardFilename}-${variant.cardNo}-${transformToId(variant.fullSetName)}`;
}

import { describe, expect, test } from 'bun:test';
import { SwuSet } from '../../../types/enums.ts';
import { setInfo } from '../set-info.ts';
import { getFoilBasedOnVariantAndSet } from '../../../frontend/src/components/app/collections/CollectionInput/collectionInputLib.ts';
import { processVariantWithoutImages } from './processVariantWithoutImages.ts';
import { mergeVariantsWithoutImages } from './mergeVariantsWithoutImages.ts';
import { variantFilename } from './variantFilename.ts';

const printing = (set: SwuSet, id: number, cardNumber: number, foil: boolean) => ({
  id,
  cardNumber,
  cardCount: setInfo[set].cardCount,
  expansion: { code: set.toUpperCase(), name: setInfo[set].name },
  variantTypes: [{ name: foil ? 'Hyperspace Foil' : 'Hyperspace', foil }],
  artist: 'Test artist',
});

describe('official foil printing names', () => {
  test('separately numbered IC27 foils remain selectable with the correct collection default', () => {
    const nonfoil = processVariantWithoutImages(printing(SwuSet.IC27, 67648, 343, false));
    const foil = processVariantWithoutImages(printing(SwuSet.IC27, 68538, 521, true));
    const variants = mergeVariantsWithoutImages([nonfoil, foil]);

    expect(variants.map(v => v.variantName)).toEqual(['Hyperspace', 'Hyperspace Foil']);
    expect(getFoilBasedOnVariantAndSet(nonfoil, true)).toBe(false);
    expect(getFoilBasedOnVariantAndSet(foil, false)).toBe(true);
    expect(variantFilename(foil, 'grogu--irresistible')).toBe(
      'grogu--irresistible-521-icons-2027-edition',
    );
  });

  test('early sets still combine foil and nonfoil printings with shared numbering', () => {
    const nonfoil = processVariantWithoutImages(printing(SwuSet.SOR, 1, 300, false));
    const foil = processVariantWithoutImages(printing(SwuSet.SOR, 2, 300, true));
    const variants = mergeVariantsWithoutImages([nonfoil, foil]);

    expect(variants).toHaveLength(1);
    expect(variants[0]).toMatchObject({
      variantName: 'Hyperspace',
      swuId: 1,
      hasFoil: true,
      hasNonfoil: true,
    });
  });
});

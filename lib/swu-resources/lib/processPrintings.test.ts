import { describe, expect, test } from 'bun:test';
import { SwuSet } from '../../../types/enums.ts';
import { processPrintings } from './processPrintings.ts';

const printing = (
  id: number,
  code: string,
  cardNumber: number,
  options: { publishedAt?: string | null; foil?: boolean } = {},
) => ({
  id,
  cardUid: String(id).padStart(10, '0'),
  expansion: { code, name: code === 'P26' ? '2026 Promo' : 'Icons 2027 Edition' },
  cardNumber,
  cardCount: 194,
  artist: 'Test Artist',
  publishedAt: options.publishedAt === undefined ? '2026-10-27T00:00:00.000Z' : options.publishedAt,
  variantTypes: [
    {
      name: code === 'P26' ? 'SQ Prize Wall' : options.foil ? 'Standard Foil' : 'Standard',
      foil: options.foil ?? false,
    },
  ],
});

describe('official printing selection', () => {
  test('rejects cards with no published printing instead of staging an empty card', () => {
    expect(() =>
      processPrintings(
        {
          original: printing(1, 'IC27', 41, { publishedAt: null }),
          printings: [printing(2, 'P26', 243, { publishedAt: null })],
        },
        SwuSet.IC27,
      ),
    ).toThrow('No published printings');
  });

  test('imports published promos without requesting their unpublished original images', () => {
    const result = processPrintings(
      {
        original: printing(66088, 'IC27', 41, { publishedAt: null }),
        printings: [printing(68743, 'P26', 243), printing(68803, 'P26', 255)],
      },
      'p26' as SwuSet,
    );

    expect(result.set).toBe(SwuSet.IC27);
    expect(result.cardUid).toEqual(['0000066088', '0000068743', '0000068803']);
    expect(result.variants.map(variant => variant.swuId)).toEqual([68743, 68803]);
    expect(result.variants.map(variant => variant.cardNo)).toEqual([243, 255]);
    expect(result.variants.every(variant => variant.fullSetName === '2026 Promo')).toBe(true);
  });

  test('preserves standard foil pairing alongside a separate promo printing', () => {
    const result = processPrintings(
      {
        original: printing(1, 'IC27', 166),
        printings: [printing(2, 'IC27', 166, { foil: true }), printing(3, 'P26', 269)],
      },
      SwuSet.IC27,
    );

    expect(result.variants).toHaveLength(2);
    expect(result.variants[0]).toMatchObject({
      swuId: 1,
      set: SwuSet.IC27,
      variantName: 'Standard',
      hasFoil: true,
      hasNonfoil: true,
    });
    expect(result.variants[1]).toMatchObject({ swuId: 3, set: 'p26', cardNo: 269 });
  });

  test('rejects a promo whose playable set has not been registered', () => {
    expect(() =>
      processPrintings(
        {
          original: printing(1, 'UNKNOWN', 1, { publishedAt: null }),
          printings: [printing(2, 'P26', 1)],
        },
        'p26' as SwuSet,
      ),
    ).toThrow('No known playable set');
  });

  test('does not move an existing card to an unpublished future reprint set', () => {
    const result = processPrintings(
      {
        original: printing(1, 'HMW', 1),
        printings: [printing(2, 'IC27', 1, { publishedAt: null }), printing(3, 'P26', 240)],
      },
      SwuSet.HMW,
    );

    expect(result.set).toBe(SwuSet.HMW);
    expect(result.cardUid).toEqual(['0000000001', '0000000003']);
    expect(result.variants.map(variant => variant.swuId)).toEqual([1, 3]);
  });
});

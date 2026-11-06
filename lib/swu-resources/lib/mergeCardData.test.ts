import { describe, expect, test } from 'bun:test';
import { SwuRarity, SwuSet } from '../../../types/enums.ts';
import type { CardDataWithVariants, CardListVariants, CardVariant } from '../types.ts';
import { mergeCardData } from './mergeCardData.ts';

const variant = (variantId: string, swuId: number, cardNo = 60): CardVariant => ({
  variantId,
  swuId,
  cardNo,
  set: SwuSet.IBH,
  fullSetName: 'Intro Battle: Hoth',
  variantName: 'Standard',
  baseSet: true,
  hasFoil: false,
  hasNonfoil: true,
  artist: 'Test artist',
  image: { front: `${variantId}-front.webp`, back: null },
});

const card = (variants: CardVariant[]): CardDataWithVariants => ({
  cardId: 'admiral-piett--commanding-the-armada',
  cardUid: ['new-uid'],
  updatedAt: '2026-11-06T00:00:00.000Z',
  title: 'Admiral Piett',
  name: 'Admiral Piett, Commanding the Armada',
  subtitle: 'Commanding the Armada',
  set: SwuSet.IC27,
  type: 'Unit',
  rarity: SwuRarity.UNCOMMON,
  variants,
  cost: 2,
  hp: 3,
  power: 1,
  upgradeHp: null,
  upgradePower: null,
  text: '',
  rules: '',
  deployBox: null,
  epicAction: null,
  front: { horizontal: false },
  back: null,
  arenas: [],
  aspects: [],
  traits: [],
  keywords: [],
});

const stored = (variants: CardVariant[]): CardDataWithVariants<CardListVariants> => ({
  ...card(variants),
  set: SwuSet.IBH,
  cardUid: ['old-uid'],
  rarity: SwuRarity.RARE,
  rules: 'An existing official ruling.',
  variants: Object.fromEntries(variants.map(v => [v.variantId, v])),
});

describe('official reprint merge', () => {
  test('keeps saved variant IDs, UID aliases, rarity, rulings, and absent printings', () => {
    const old = variant('legacy-id', 39130);
    const absent = variant('retained-promo', 50000, 200);
    const incoming = variant('newly-generated-id', 39130);
    const result = mergeCardData(card([incoming]), stored([old, absent]));

    expect(Object.keys(result.variants)).toEqual(['legacy-id', 'retained-promo']);
    expect(result.variants['legacy-id']).toMatchObject({
      variantId: 'legacy-id',
      image: incoming.image,
    });
    expect(result.cardUid).toEqual(['new-uid', 'old-uid']);
    expect(result.set).toBe(SwuSet.IC27);
    expect(result.rarity).toBe(SwuRarity.RARE);
    expect(result.rules).toBe('An existing official ruling.');
    expect(mergeCardData(card([incoming]), result)).toEqual(result);
  });

  test('updates a corrected Hoth upstream ID without duplicating its Standard printing', () => {
    const old = { ...variant('old-id-numbered-65', 39155), hasNonfoil: false };
    const incoming = variant('new-id-numbered-60', 39130);
    const result = mergeCardData(card([incoming]), stored([old]));

    expect(Object.keys(result.variants)).toEqual(['old-id-numbered-65']);
    expect(result.variants['old-id-numbered-65']).toMatchObject({
      swuId: 39130,
      cardNo: 60,
      hasNonfoil: true,
    });
  });

  test('accepts nonempty new rulings and the rarity of a newly introduced card', () => {
    const incoming = { ...card([variant('new-id', 39130)]), rules: 'Updated ruling.' };
    expect(mergeCardData(incoming).rarity).toBe(SwuRarity.UNCOMMON);
    expect(mergeCardData(incoming, stored([])).rules).toBe('Updated ruling.');
  });

  test('allows a deliberate rarity correction even when the set stays the same', () => {
    const previous = stored([variant('existing-id', 39130)]);
    const incoming = { ...card([variant('existing-id', 39130)]), set: SwuSet.IBH };

    expect(mergeCardData(incoming, previous).rarity).toBe(SwuRarity.RARE);
    expect(mergeCardData(incoming, previous, { updateRarity: true }).rarity).toBe(
      SwuRarity.UNCOMMON,
    );
  });

  test('rejects new duplicates by upstream identity or printing details', () => {
    expect(() => mergeCardData(card([variant('one', 1), variant('two', 1)]))).toThrow(
      'Duplicate printing',
    );
    expect(() => mergeCardData(card([variant('one', 1), variant('two', 2)]))).toThrow(
      'Duplicate printing',
    );
  });

  test('preserves existing legacy duplicates but rejects ambiguous ID remapping', () => {
    const old = stored([variant('one', 1), variant('two', 1)]);
    expect(Object.keys(mergeCardData(card([variant('one', 1)]), old).variants)).toEqual([
      'one',
      'two',
    ]);
    expect(() => mergeCardData(card([variant('three', 1)]), old)).toThrow(
      'Ambiguous existing printing',
    );
  });
});

import { describe, expect, test } from 'bun:test';
import type {
  CardDataWithVariants,
  CardListVariants,
} from '../../../../../../lib/swu-resources/types.ts';
import { matchesBaseSearch, matchesBaseTraitFilter } from './baseSelectorFilters.ts';

const base = (
  cardId: string,
  name: string,
  traits: string[],
  text: string | null,
  hp: number | null,
) => ({ cardId, name, traits, text, hp }) as CardDataWithVariants<CardListVariants>;

describe('base selector filters', () => {
  const lakeCountry = base('lake-country', 'Lake Country', [], '', 34);
  const crystalCaves = base(
    'crystal-caves',
    'Crystal Caves',
    [],
    'When a friendly Force unit attacks: The Force is with you.',
    28,
  );

  test('matches the selected trait for basic and non-basic bases', () => {
    expect(matchesBaseTraitFilter(lakeCountry, 'Naboo')).toBe(true);
    expect(matchesBaseTraitFilter(lakeCountry, 'Endor')).toBe(false);
    expect(matchesBaseTraitFilter(lakeCountry, undefined)).toBe(true);
  });

  test('searches names, traits, and card text case-insensitively', () => {
    expect(matchesBaseSearch(lakeCountry, 'lake')).toBe(true);
    expect(matchesBaseSearch(lakeCountry, 'naboo')).toBe(true);
    expect(matchesBaseSearch(crystalCaves, 'force')).toBe(true);
    expect(matchesBaseSearch(lakeCountry, 'shield')).toBe(false);
  });

  test('matches hp for a numeric search', () => {
    expect(matchesBaseSearch(lakeCountry, '34')).toBe(true);
    expect(matchesBaseSearch(lakeCountry, '30')).toBe(false);
    expect(matchesBaseSearch(lakeCountry, '   ')).toBe(true);
  });
});

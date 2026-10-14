import { describe, expect, test } from 'bun:test';
import { cardList } from '../../../db/lists.ts';
import { SwuAspect } from '../../../../types/enums.ts';
import { baseDistributionCategories } from '../../../../types/DailySnapshots.ts';
import {
  countBaseDistribution,
  getBaseDistributionCategories,
} from './base-distribution-counts.ts';

const hemlock = 'doctor-hemlock--emotion-has-no-place-here';
const row = (baseCardId: string, leaderCardId = hemlock) => ({
  leaderCardId,
  baseCardId,
  total: 7,
  top8: 3,
  winner: 1,
});

describe('base distribution', () => {
  test.each([
    ['nightsister-lair', ['force']],
    ['mystic-monastery', ['force', 'nonbasic']],
    ['shield-generator-complex', ['endor']],
    ['freetown', ['tatooine']],
    ['kachirho', ['kashyyyk']],
    ['otoh-gunga', ['naboo']],
    ['canto-bight', ['splash']],
    ['daimyo-s-palace', ['splash', 'tatooine']],
    ['lake-country', ['naboo', 'nonbasic']],
    ['great-pit-of-carkoon', ['tatooine', 'nonbasic']],
    ['energy-conversion-lab', ['nonbasic']],
    ['massassi-temple', ['other-basic']],
  ])('classifies %s in all applicable categories', (cardId, expected) => {
    expect(getBaseDistributionCategories(cardList[cardId]!)).toEqual(expected);
  });

  test('Hemlock and Otoh Gunga contribute to exactly the three requested cells', () => {
    const result = countBaseDistribution([row('otoh-gunga')], cardList);
    for (const [part, count] of [
      ['total', 7],
      ['top8', 3],
      ['champions', 1],
    ] as const) {
      expect(result[part].deckCount).toBe(count);
      expect(result[part].categories.naboo).toEqual({
        count,
        aspects: {
          Vigilance: count,
          Villainy: count,
          Cunning: count,
          Command: 0,
          Aggression: 0,
          Heroism: 0,
        },
      });
      expect(Object.values(result[part].categories).reduce((sum, c) => sum + c.count, 0)).toBe(
        count,
      );
    }
  });

  test('overlap repeats category membership, but neither deck totals nor duplicate aspects', () => {
    const result = countBaseDistribution([row('daimyo-s-palace'), row('lake-country')], cardList);
    expect(result.total.deckCount).toBe(14);
    for (const category of ['splash', 'tatooine', 'naboo', 'nonbasic'] as const) {
      expect(result.total.categories[category].count).toBe(7);
      expect(result.total.categories[category].aspects.Vigilance).toBe(7);
      expect(result.total.categories[category].aspects.Villainy).toBe(7);
    }
    expect(Object.values(result.total.categories).reduce((sum, c) => sum + c.count, 0)).toBe(28);
  });

  test('combines leaders sharing a category, including Heroism', () => {
    const hero = Object.values(cardList).find(
      c => c?.type === 'Leader' && c.aspects.includes(SwuAspect.HEROISM),
    )!;
    const result = countBaseDistribution(
      [row('otoh-gunga'), row('theed-palace', hero.cardId)],
      cardList,
    );
    expect(result.total.categories.naboo.count).toBe(14);
    expect(result.total.categories.naboo.aspects.Heroism).toBe(7);
    expect(result.total.categories.naboo.aspects.Villainy).toBe(7);
  });

  test('does not double-count a planet supplied by both catalog traits and legacy mappings', () => {
    const base = { ...cardList['otoh-gunga']!, traits: ['Naboo'] };
    expect(getBaseDistributionCategories(base)).toEqual(['naboo']);
  });

  test('unknown bases are excluded and unknown leaders contribute only base aspects', () => {
    const result = countBaseDistribution(
      [row(''), row('unresolved-base'), row(hemlock), row('otoh-gunga', 'unknown')],
      cardList,
    );
    expect(result.total.deckCount).toBe(7);
    expect(result.total.categories.naboo.aspects.Cunning).toBe(7);
    expect(result.total.categories.naboo.aspects.Vigilance).toBe(0);
    expect(result.total.categories.naboo.aspects.Villainy).toBe(0);
  });

  test('empty input includes all eight rows and six zero-valued columns for every selection', () => {
    const result = countBaseDistribution([], cardList);
    for (const part of Object.values(result)) {
      expect(part.deckCount).toBe(0);
      expect(Object.keys(part.categories)).toEqual([...baseDistributionCategories]);
      for (const category of Object.values(part.categories)) {
        expect(category.count).toBe(0);
        expect(Object.values(category.aspects)).toEqual([0, 0, 0, 0, 0, 0]);
      }
    }
  });
});

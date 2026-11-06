import { describe, expect, test } from 'bun:test';
import cardsJson from '../server/db/json/card-list.json';
import type { CardList } from '../lib/swu-resources/types.ts';
import { filterCards } from '../frontend/src/components/app/cards/AdvancedCardSearch/searchService.ts';
import { cardFilterByFormatId, setRestrictionByFormat } from './Format.ts';
import { SwuSet } from './enums.ts';

const cards = cardsJson as unknown as CardList;
const newLeader = 'darth-vader--no-one-to-stop-us';
const legalBaseReprint = 'city-in-the-clouds';
const rotatedReprint = 'academy-training';
const candidates = [newLeader, legalBaseReprint, rotatedReprint];

describe('IC27 preview formats', () => {
  test.each([
    { format: 1, expected: [legalBaseReprint] },
    { format: 6, expected: [legalBaseReprint, rotatedReprint] },
    { format: 7, expected: candidates },
    { format: 8, expected: candidates },
  ])(
    'format $format offers the intended cards in selectors and deck search',
    async ({ format, expected }) => {
      const filter = cardFilterByFormatId[format]!;
      expect(candidates.filter(id => filter.filterCallback(cards[id]!))).toEqual(expected);

      const sets = Object.keys(setRestrictionByFormat[format]) as SwuSet[];
      expect(await filterCards(cards, candidates, { sets })).toEqual(expected);
      expect(filter.setMap).toEqual(setRestrictionByFormat[format]);
    },
  );

  test('an IC27 reprint keeps its existing Premier legality despite its newest core set', () => {
    for (const id of [legalBaseReprint, 'mos-eisley', 'death-trooper']) {
      expect(cards[id]!.set).toBe(SwuSet.IC27);
      expect(cardFilterByFormatId[1]!.filterCallback(cards[id]!)).toBe(true);
    }
    expect(cardFilterByFormatId[1]!.filterCallback(cards[rotatedReprint]!)).toBe(false);
    expect(cardFilterByFormatId[7]!.filterCallback(cards[rotatedReprint]!)).toBe(true);
  });
});

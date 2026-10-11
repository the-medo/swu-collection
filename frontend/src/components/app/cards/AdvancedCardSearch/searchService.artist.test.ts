import { describe, expect, test } from 'bun:test';
import { filterCards, selectSearchVariant } from './searchService.ts';
import { selectDefaultVariant } from '../../../../../../server/lib/cards/selectDefaultVariant.ts';
import cardsJson from '../../../../../../server/db/json/card-list.json';
import type { CardList } from '../../../../../../lib/swu-resources/types.ts';
import { SwuSet } from '../../../../../../types/enums.ts';
import { getCardDetailDialogSearch } from '../CardDetail/cardDetailSearchParams.ts';

const cards = cardsJson as unknown as CardList;
const cardId = 'admiral-ackbar--brilliant-strategist';
const card = cards[cardId]!;

describe('artist search printing selection', () => {
  test('shows the matching alternate artist instead of the standard artwork', async () => {
    const filters = { artist: 'DAVID buisán' };
    expect(await filterCards(cards, [cardId], filters)).toEqual([cardId]);
    const selected = selectSearchVariant(card, filters)!;
    expect(card.variants[selected]?.artist).toBe('David Buisan');
    expect(selected).not.toBe(selectDefaultVariant(card));
  });

  test('requires artist, set and treatment to match the same printing', async () => {
    expect(
      await filterCards(cards, [cardId], { artist: 'David Buisan', sets: [SwuSet.SOR] }),
    ).toEqual([]);
    expect(
      await filterCards(cards, [cardId], { artist: 'David Buisan', variants: ['Standard'] }),
    ).toEqual([]);
    const filters = { artist: 'Luke Harrington', variants: ['Hyperspace'], sets: [SwuSet.SOR] };
    expect(await filterCards(cards, [cardId], filters)).toEqual([cardId]);
    expect(card.variants[selectSearchVariant(card, filters)!]?.variantName).toBe('Hyperspace');
  });

  test('keeps normal selection for a missing or blank artist and excludes nonmatches', async () => {
    expect(selectSearchVariant(card, {})).toBe(selectDefaultVariant(card));
    expect(selectSearchVariant(card, { artist: '  ' })).toBe(selectDefaultVariant(card));
    expect(await filterCards(cards, [cardId], { artist: 'No such artist' })).toEqual([]);
  });

  test('opens the selected printing and clears stale dialog state', () => {
    const selected = selectSearchVariant(card, { artist: 'David Buisan' });
    const previous = { formatId: 1, modalCardTab: 'variants', modalCardVariantId: 'old' };
    expect(getCardDetailDialogSearch(previous, cardId, selected)).toEqual({
      formatId: 1,
      modalCardId: cardId,
      modalCardTab: undefined,
      modalCardVariantId: selected,
    });
    expect(getCardDetailDialogSearch(previous, cardId).modalCardVariantId).toBeUndefined();
  });
});

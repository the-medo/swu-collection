import { describe, expect, test } from 'bun:test';
import type { CardList } from '../../../lib/swu-resources/types.ts';
import type { Deck } from '../../../types/Deck.ts';
import type { User } from '../../../types/User.ts';
import type { DeckCard } from '../../../types/ZDeckCard.ts';
import cards from '../../db/json/card-list.json';
import { parseImportedDeck } from './deckBuilders.ts';
import { parseTextToJson } from './deckConverterService.tsx';
import { createDeckJsonExport, createDeckTextExport } from './deckExport.ts';

const cardList = cards as unknown as CardList;
const deck: Deck = {
  id: 'test-deck',
  userId: 'test-user',
  format: 2,
  name: 'Twin Suns [test]',
  description: null,
  leaderCardId1: 'luke-skywalker--faithful-friend',
  leaderCardId2: 'leia-organa--alliance-general',
  baseCardId: 'echo-base',
  cardPoolId: null,
  public: 1,
  createdAt: '2026-10-22T00:00:00Z',
  updatedAt: '2026-10-22T00:00:00Z',
};
const user = { displayName: 'Test author' } as User;
const deckCards: DeckCard[] = [1, 2, 3].map(board => ({
  deckId: deck.id,
  cardId: 'rebel-assault',
  board,
  quantity: board,
}));

describe('deck JSON export', () => {
  test('exports the SWUDB secondleader key and preserves both leaders on import', () => {
    const json = JSON.parse(JSON.stringify(createDeckJsonExport(deck, deckCards, user, cardList)));

    expect(json).toEqual({
      metadata: { name: 'Twin Suns', author: 'Test author' },
      leader: { id: 'SOR_005', count: 1 },
      secondleader: { id: 'SOR_009', count: 1 },
      base: { id: 'SOR_024', count: 1 },
      deck: [{ id: 'SOR_103', count: 1 }],
      sideboard: [{ id: 'SOR_103', count: 2 }],
    });
    expect(parseImportedDeck(json, cardList)).toMatchObject({
      leaderCardId1: deck.leaderCardId1,
      leaderCardId2: deck.leaderCardId2,
      baseCardId: deck.baseCardId,
      cards: [
        { cardId: 'rebel-assault', board: 1, note: '', quantity: 1 },
        { cardId: 'rebel-assault', board: 2, note: '', quantity: 2 },
      ],
      errors: [],
    });
  });

  test('omits the second leader for single-leader decks', () => {
    const json = createDeckJsonExport(
      { ...deck, format: 1, leaderCardId2: null },
      deckCards,
      user,
      cardList,
    );

    expect(json.leader).toEqual({ id: 'SOR_005', count: 1 });
    expect(json).not.toHaveProperty('secondleader');
    expect(json).not.toHaveProperty('leader2');
    expect(json).not.toHaveProperty('secondLeader');
  });
});

describe('text-to-JSON deck conversion', () => {
  test.each([
    ['shared leader section', '1 | Leia Organa | Alliance General'],
    ['separate leader sections', 'Leader\n1 | Leia Organa | Alliance General'],
  ])('preserves both leaders through %s', (_name, secondLeaderLine) => {
    const text = createDeckTextExport(deck, deckCards, cardList).replace(
      '1 | Leia Organa | Alliance General',
      secondLeaderLine,
    );
    const [converted, unmatched] = parseTextToJson(text, cardList, 'Twin Suns', user.displayName);
    const json = JSON.parse(JSON.stringify(converted));

    expect(unmatched.cards).toEqual([]);
    expect(json).toEqual(createDeckJsonExport(deck, deckCards, user, cardList));
    expect(json.secondleader).toEqual({ id: 'SOR_009', count: 1 });
    expect(json).not.toHaveProperty('leader2');
    expect(json).not.toHaveProperty('secondLeader');
    expect(parseImportedDeck(json, cardList)).toMatchObject({
      leaderCardId1: deck.leaderCardId1,
      leaderCardId2: deck.leaderCardId2,
      errors: [],
    });
  });

  test('omits the second leader when converting a single-leader deck', () => {
    const text = createDeckTextExport({ ...deck, leaderCardId2: null }, deckCards, cardList);
    const [json, unmatched] = parseTextToJson(text, cardList);

    expect(unmatched.cards).toEqual([]);
    expect(json.leader).toEqual({ id: 'SOR_005', count: 1 });
    expect(json).not.toHaveProperty('secondleader');
    expect(json).not.toHaveProperty('leader2');
    expect(json).not.toHaveProperty('secondLeader');
  });
});

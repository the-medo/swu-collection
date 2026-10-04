import { expect, test } from 'bun:test';
import { validateProfileCards } from './service.ts';
import { cardList } from '../../db/lists.ts';

test('favorites validate logical card IDs and require a leader for the leader slot', () => {
  const leader = Object.values(cardList).find(card => card?.type === 'Leader')!;
  const unit = Object.values(cardList).find(card => card?.type === 'Unit')!;
  expect(() =>
    validateProfileCards(
      { favoriteLeaderCardId: leader.cardId, favoriteCardId: unit.cardId },
      cardList,
    ),
  ).not.toThrow();
  expect(() => validateProfileCards({ favoriteLeaderCardId: unit.cardId }, cardList)).toThrow(
    'Choose a valid leader.',
  );
  expect(() => validateProfileCards({ favoriteCardId: 'missing-card' }, cardList)).toThrow(
    'Choose a valid card.',
  );
  expect(() => validateProfileCards({ favoriteCardId: '__proto__' }, cardList)).toThrow(
    'Choose a valid card.',
  );
  expect(() =>
    validateProfileCards({ favoriteCardId: null, favoriteLeaderCardId: null }, cardList),
  ).not.toThrow();
});

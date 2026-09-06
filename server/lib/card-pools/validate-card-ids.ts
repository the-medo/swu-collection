import type { CardList } from '../../../lib/swu-resources/types.ts';
import type { SwuSet } from '../../../types/enums.ts';

export type CustomCardPoolValidation = {
  invalidCardIds: string[];
  cardsOutsideSet: string[];
  tokenCardIds: string[];
};

const uniqueInFirstSeenOrder = (values: string[]) => [...new Set(values)];

/**
 * Returns a list of invalid card ids (those not present in the merged card list).
 * The result is unique and keeps the first-seen order of invalid items.
 */
export function findInvalidCardIds(cardIds: string[], cardList: CardList): string[] {
  const seen = new Set<string>();
  const invalid: string[] = [];
  for (const id of cardIds) {
    if (!cardList[id] && !seen.has(id)) {
      seen.add(id);
      invalid.push(id);
    }
  }
  return invalid;
}

export function validateCustomCardPoolCards(
  cardIds: string[],
  set: SwuSet,
  cardList: CardList,
): CustomCardPoolValidation {
  const invalidCardIds = findInvalidCardIds(cardIds, cardList);
  const invalidCardIdSet = new Set(invalidCardIds);
  const cardsOutsideSet: string[] = [];
  const tokenCardIds: string[] = [];

  for (const cardId of cardIds) {
    if (invalidCardIdSet.has(cardId)) continue;

    const card = cardList[cardId];
    if (!card) continue;

    const belongsToSet = Object.values(card.variants).some(variant => variant?.set === set);
    if (!belongsToSet) cardsOutsideSet.push(cardId);
    if (card.type.includes('Token')) tokenCardIds.push(cardId);
  }

  return {
    invalidCardIds,
    cardsOutsideSet: uniqueInFirstSeenOrder(cardsOutsideSet),
    tokenCardIds: uniqueInFirstSeenOrder(tokenCardIds),
  };
}

export function isCustomCardPoolValidationSuccessful(validation: CustomCardPoolValidation) {
  return (
    validation.invalidCardIds.length === 0 &&
    validation.cardsOutsideSet.length === 0 &&
    validation.tokenCardIds.length === 0
  );
}

const summarizeCardIds = (cardIds: string[]) => {
  const visibleCardIds = cardIds.slice(0, 5).join(', ');
  const remainingCount = cardIds.length - 5;
  return remainingCount > 0 ? `${visibleCardIds} (+${remainingCount} more)` : visibleCardIds;
};

export function describeCustomCardPoolValidation(validation: CustomCardPoolValidation): string {
  const problems: string[] = [];

  if (validation.invalidCardIds.length > 0) {
    problems.push(`unknown cards: ${summarizeCardIds(validation.invalidCardIds)}`);
  }
  if (validation.cardsOutsideSet.length > 0) {
    problems.push(
      `cards outside the selected set: ${summarizeCardIds(validation.cardsOutsideSet)}`,
    );
  }
  if (validation.tokenCardIds.length > 0) {
    problems.push(`token cards: ${summarizeCardIds(validation.tokenCardIds)}`);
  }

  return problems.length > 0
    ? `Invalid custom card pool (${problems.join('; ')})`
    : 'Invalid custom card pool';
}

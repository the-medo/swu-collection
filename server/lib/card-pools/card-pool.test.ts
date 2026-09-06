import { describe, expect, test } from 'bun:test';
import type { CardList } from '../../../lib/swu-resources/types.ts';
import { CardPoolType, MAX_CUSTOM_CARD_POOL_SIZE } from '../../../shared/types/cardPools.ts';
import { Visibility } from '../../../shared/types/visibility.ts';
import { SwuSet } from '../../../types/enums.ts';
import { zCardPoolCreate } from '../../routes/card-pools/post.ts';
import { zCardPoolCardsPut } from '../../routes/card-pools/_id/cards/put.ts';
import { generateCardPool, transformCardPoolToCardPoolCards } from './generate-card-pool.ts';
import {
  describeCustomCardPoolValidation,
  isCustomCardPoolValidationSuccessful,
  validateCustomCardPoolCards,
} from './validate-card-ids.ts';

const createCard = (type: string, set: SwuSet) =>
  ({
    type,
    variants: {
      standard: { set },
    },
  }) as unknown as NonNullable<CardList[string]>;

describe('card pool creation contract', () => {
  const generatedPool = {
    set: SwuSet.ASH,
    type: CardPoolType.Sealed,
    visibility: Visibility.Private,
  };

  test('preserves the legacy six-pack defaults', () => {
    expect(zCardPoolCreate.parse(generatedPool)).toEqual({
      ...generatedPool,
      custom: false,
    });
  });

  test('allows eight packs for sealed pools', () => {
    expect(zCardPoolCreate.safeParse({ ...generatedPool, boosterCount: 8 }).success).toBe(true);
    expect(zCardPoolCreate.safeParse({ ...generatedPool, boosterCount: 7 }).success).toBe(false);
  });

  test('keeps prerelease pools at six packs', () => {
    expect(
      zCardPoolCreate.safeParse({
        ...generatedPool,
        type: CardPoolType.Prerelease,
        boosterCount: 8,
      }).success,
    ).toBe(false);
  });

  test('allows custom cards without a booster count', () => {
    expect(
      zCardPoolCreate.safeParse({
        ...generatedPool,
        custom: true,
        cards: ['card-one', 'card-one'],
      }).success,
    ).toBe(true);
  });

  test('rejects generated cards, custom booster counts, draft, and oversized custom pools', () => {
    expect(zCardPoolCreate.safeParse({ ...generatedPool, cards: ['card-one'] }).success).toBe(
      false,
    );
    expect(
      zCardPoolCreate.safeParse({ ...generatedPool, custom: true, boosterCount: 6 }).success,
    ).toBe(false);
    expect(zCardPoolCreate.safeParse({ ...generatedPool, type: CardPoolType.Draft }).success).toBe(
      false,
    );
    expect(
      zCardPoolCreate.safeParse({
        ...generatedPool,
        custom: true,
        cards: Array.from({ length: MAX_CUSTOM_CARD_POOL_SIZE + 1 }, () => 'card-one'),
      }).success,
    ).toBe(false);
  });
});

describe('custom card pool update contract', () => {
  test('allows clearing a pool and still enforces the maximum size', () => {
    expect(zCardPoolCardsPut.safeParse({ cards: [] }).success).toBe(true);
    expect(
      zCardPoolCardsPut.safeParse({
        cards: Array.from({ length: MAX_CUSTOM_CARD_POOL_SIZE + 1 }, () => 'card-one'),
      }).success,
    ).toBe(false);
  });
});

describe('card pool generation', () => {
  test('generates the expected physical card counts', () => {
    expect(generateCardPool(SwuSet.ASH, CardPoolType.Sealed, 6)).toHaveLength(90);
    expect(generateCardPool(SwuSet.ASH, CardPoolType.Sealed, 8)).toHaveLength(120);
    expect(generateCardPool(SwuSet.ASH, CardPoolType.Prerelease, 6)).toHaveLength(92);
  });

  test('assigns a distinct sequential identity to duplicate physical cards', () => {
    expect(transformCardPoolToCardPoolCards(['same-card', 'same-card'], 'pool-id')).toEqual([
      { cardPoolId: 'pool-id', cardId: 'same-card', cardPoolNumber: 1 },
      { cardPoolId: 'pool-id', cardId: 'same-card', cardPoolNumber: 2 },
    ]);
  });
});

describe('custom card pool validation', () => {
  const cardList = {
    valid: createCard('Unit', SwuSet.ASH),
    'other-set': createCard('Unit', SwuSet.LAW),
    token: createCard('Token Unit', SwuSet.ASH),
  } satisfies CardList;

  test('accepts duplicate playable cards from the selected set', () => {
    const validation = validateCustomCardPoolCards(['valid', 'valid'], SwuSet.ASH, cardList);

    expect(isCustomCardPoolValidationSuccessful(validation)).toBe(true);
  });

  test('reports unknown, wrong-set, and token cards without duplicate errors', () => {
    const validation = validateCustomCardPoolCards(
      ['missing', 'missing', 'other-set', 'other-set', 'token', 'token'],
      SwuSet.ASH,
      cardList,
    );

    expect(validation).toEqual({
      invalidCardIds: ['missing'],
      cardsOutsideSet: ['other-set'],
      tokenCardIds: ['token'],
    });
    expect(isCustomCardPoolValidationSuccessful(validation)).toBe(false);
    expect(describeCustomCardPoolValidation(validation)).toBe(
      'Invalid custom card pool (unknown cards: missing; cards outside the selected set: other-set; token cards: token)',
    );
  });
});

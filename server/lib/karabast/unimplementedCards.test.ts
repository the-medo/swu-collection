import { describe, expect, test } from 'bun:test';
import type { CardList } from '../../../lib/swu-resources/types.ts';
import {
  buildKarabastUnimplementedMappingContext,
  resolveKarabastUnimplementedCardId,
  transformKarabastUnimplementedRowsForStorage,
  type KarabastUnimplementedApiRow,
} from './unimplementedCards.ts';

const card = (
  cardId: string,
  options: {
    set?: string;
    cardNo?: number;
    cardUid?: string[];
    preview?: boolean;
    karabastIdToSwubaseId?: string;
  } = {},
) =>
  ({
    cardId,
    cardUid: options.cardUid ?? [],
    preview: options.preview,
    karabast_id_to_swubase_id: options.karabastIdToSwubaseId,
    variants:
      options.set && options.cardNo
        ? {
            [`${cardId}-standard`]: {
              variantId: `${cardId}-standard`,
              set: options.set,
              cardNo: options.cardNo,
            },
          }
        : {},
  }) as CardList[string];

const row = (overrides: Partial<KarabastUnimplementedApiRow>): KarabastUnimplementedApiRow => ({
  id: 'karabast-id',
  titleAndSubtitle: 'Unknown Card',
  ...overrides,
});

function captureWarnings<T>(fn: () => T): { result: T; warnings: string[] } {
  const originalWarn = console.warn;
  const warnings: string[] = [];
  console.warn = (...args: unknown[]) => {
    warnings.push(args.map(String).join(' '));
  };

  try {
    return {
      result: fn(),
      warnings,
    };
  } finally {
    console.warn = originalWarn;
  }
}

describe('Karabast unimplemented card mapping', () => {
  test('prefers set and number over external ID matches', () => {
    const cards = {
      'set-number-match': card('set-number-match', { set: 'ASH', cardNo: 264 }),
      'uid-match': card('uid-match', { cardUid: ['karabast-id'] }),
    } as CardList;

    const context = buildKarabastUnimplementedMappingContext(cards);

    expect(
      resolveKarabastUnimplementedCardId(
        row({
          setId: {
            set: 'ASH',
            number: 264,
          },
        }),
        context,
      ),
    ).toBe('set-number-match');
  });

  test('resolves cardUid matches when set and number are absent', () => {
    const cards = {
      'uid-match': card('uid-match', { cardUid: ['karabast-id'] }),
    } as CardList;

    const context = buildKarabastUnimplementedMappingContext(cards);

    expect(resolveKarabastUnimplementedCardId(row({}), context)).toBe('uid-match');
  });

  test('resolves preview inbound Karabast IDs from preview metadata', () => {
    const previewCards = {
      'preview-card': card('preview-card', {
        preview: true,
        karabastIdToSwubaseId: 'karabast-preview-id',
      }),
    } as CardList;

    const context = buildKarabastUnimplementedMappingContext(previewCards, previewCards);

    expect(resolveKarabastUnimplementedCardId(row({ id: 'karabast-preview-id' }), context)).toBe(
      'preview-card',
    );
  });

  test('warns and falls through when preview metadata points outside the merged list', () => {
    const cards = {
      'title-match': card('title-match'),
    } as CardList;
    const previewCards = {
      'preview-card': card('preview-card', {
        preview: true,
        karabastIdToSwubaseId: 'karabast-preview-id',
      }),
    } as CardList;

    const context = buildKarabastUnimplementedMappingContext(cards, previewCards);
    const { result, warnings } = captureWarnings(() =>
      resolveKarabastUnimplementedCardId(
        row({
          id: 'karabast-preview-id',
          titleAndSubtitle: 'Title Match',
        }),
        context,
      ),
    );

    expect(result).toBe('title-match');
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('is not in the merged card list');
  });

  test('warns and keeps the first card for duplicate non-preview set and number matches', () => {
    const cards = {
      'first-card': card('first-card', { set: 'ASH', cardNo: 264 }),
      'second-card': card('second-card', { set: 'ASH', cardNo: 264 }),
    } as CardList;

    const { result: context, warnings } = captureWarnings(() =>
      buildKarabastUnimplementedMappingContext(cards),
    );

    expect(context.setNumberCardIds.get('ASH:264')).toBe('first-card');
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('Duplicate Karabast unimplemented set/number mapping ASH:264');
  });

  test('warns and keeps the first card for duplicate non-preview cardUid matches', () => {
    const cards = {
      'first-card': card('first-card', { cardUid: ['karabast-id'] }),
      'second-card': card('second-card', { cardUid: ['karabast-id'] }),
    } as CardList;

    const { result: context, warnings } = captureWarnings(() =>
      buildKarabastUnimplementedMappingContext(cards),
    );

    expect(context.cardUidCardIds.get('karabast-id')).toBe('first-card');
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('Duplicate Karabast unimplemented cardUid mapping karabast-id');
  });

  test('prefers non-preview cards over preview cards without warning', () => {
    const cards = {
      'preview-card': card('preview-card', { set: 'ASH', cardNo: 264, preview: true }),
      'official-card': card('official-card', { set: 'ASH', cardNo: 264 }),
    } as CardList;

    const { result: context, warnings } = captureWarnings(() =>
      buildKarabastUnimplementedMappingContext(cards),
    );

    expect(context.setNumberCardIds.get('ASH:264')).toBe('official-card');
    expect(warnings).toHaveLength(0);
  });

  test('prefers non-preview cardUid matches over preview cardUid matches without warning', () => {
    const cards = {
      'preview-card': card('preview-card', { cardUid: ['karabast-id'], preview: true }),
      'official-card': card('official-card', { cardUid: ['karabast-id'] }),
    } as CardList;

    const { result: context, warnings } = captureWarnings(() =>
      buildKarabastUnimplementedMappingContext(cards),
    );

    expect(context.cardUidCardIds.get('karabast-id')).toBe('official-card');
    expect(warnings).toHaveLength(0);
  });

  test('uses transformed title only when the card exists', () => {
    const cards = {
      'arcana-star-map--path-to-peridea': card('arcana-star-map--path-to-peridea'),
    } as CardList;

    const context = buildKarabastUnimplementedMappingContext(cards);

    expect(
      resolveKarabastUnimplementedCardId(
        row({
          id: 'missing-id',
          titleAndSubtitle: 'Arcana Star Map, Path to Peridea',
        }),
        context,
      ),
    ).toBe('arcana-star-map--path-to-peridea');

    expect(
      resolveKarabastUnimplementedCardId(
        row({
          id: 'missing-id',
          titleAndSubtitle: 'Different Formatting',
        }),
        context,
      ),
    ).toBeNull();
  });

  test('transforms API rows into storage rows with null card IDs for misses', () => {
    const cards = {
      'a-new-order': card('a-new-order'),
    } as CardList;

    const context = buildKarabastUnimplementedMappingContext(cards);

    expect(
      transformKarabastUnimplementedRowsForStorage(
        [
          row({
            id: 'missing-id',
            titleAndSubtitle: 'A New Order',
          }),
          row({
            id: 'missing-id',
            titleAndSubtitle: 'Not In SWUBase',
          }),
        ],
        context,
      ),
    ).toEqual([
      {
        title: 'A New Order',
        cardId: 'a-new-order',
        data: {
          id: 'missing-id',
          titleAndSubtitle: 'A New Order',
        },
      },
      {
        title: 'Not In SWUBase',
        cardId: null,
        data: {
          id: 'missing-id',
          titleAndSubtitle: 'Not In SWUBase',
        },
      },
    ]);
  });
});

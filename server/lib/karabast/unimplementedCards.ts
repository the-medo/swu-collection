import { z } from 'zod';
import type { CardList } from '../../../lib/swu-resources/types.ts';
import { transformToId } from '../../../lib/swu-resources/lib/transformToId.ts';
import {
  buildKarabastPreviewIdMap,
  type KarabastPreviewIdMap,
} from '../game-results/resolveKarabastCardId.ts';

export const karabastUnimplementedApiRowSchema = z
  .object({
    id: z.string(),
    setId: z
      .object({
        set: z.string(),
        number: z.number(),
      })
      .optional(),
    types: z.string().optional(),
    titleAndSubtitle: z.string(),
  })
  .catchall(z.unknown());

export const karabastUnimplementedApiResponseSchema = z.array(karabastUnimplementedApiRowSchema);

export type KarabastUnimplementedApiRow = z.infer<typeof karabastUnimplementedApiRowSchema>;
// DB `data` stores the raw API row for now; the alias names that storage contract explicitly.
export type KarabastUnimplementedCardRow = KarabastUnimplementedApiRow;
export type KarabastUnimplementedMap = Record<string, true>;

export type KarabastUnimplementedStorageRow = {
  title: string;
  cardId: string | null;
  data: KarabastUnimplementedCardRow;
};

export type KarabastUnimplementedMappingContext = {
  cards: CardList;
  setNumberCardIds: Map<string, string>;
  cardUidCardIds: Map<string, string>;
  previewIdMap: KarabastPreviewIdMap;
};

const setNumberKey = (set: string, number: number): string =>
  `${set.trim().toUpperCase()}:${number}`;

function setPreferredCardId(
  map: Map<string, string>,
  key: string,
  cardId: string,
  cards: CardList,
  label: string,
): void {
  const existingCardId = map.get(key);

  if (!existingCardId) {
    map.set(key, cardId);
    return;
  }

  if (existingCardId === cardId) return;

  const existingCard = cards[existingCardId];
  const nextCard = cards[cardId];

  if (existingCard?.preview && !nextCard?.preview) {
    map.set(key, cardId);
    return;
  }

  if (!existingCard?.preview && nextCard?.preview) return;

  console.warn(
    `Duplicate Karabast unimplemented ${label} mapping ${key}: using ${existingCardId} from candidates ${[existingCardId, cardId].sort().join(', ')}`,
  );
}

export function buildKarabastUnimplementedMappingContext(
  cards: CardList,
  previewCards: CardList = {},
): KarabastUnimplementedMappingContext {
  const setNumberCardIds = new Map<string, string>();
  const cardUidCardIds = new Map<string, string>();

  Object.values(cards)
    .filter(Boolean)
    .forEach(card => {
      const cardId = card?.cardId;

      if (!cardId) return;

      Object.values(card.variants ?? {}).forEach(variant => {
        if (!variant) return;
        const key = setNumberKey(variant.set, variant.cardNo);

        setPreferredCardId(setNumberCardIds, key, cardId, cards, 'set/number');
      });

      ((typeof card.cardUid === 'string' ? [card.cardUid] : card.cardUid) ?? []).forEach(uid => {
        const lookupUid = uid.trim();
        if (!lookupUid) return;

        setPreferredCardId(cardUidCardIds, lookupUid, cardId, cards, 'cardUid');
      });
    });

  return {
    cards,
    setNumberCardIds,
    cardUidCardIds,
    previewIdMap: buildKarabastPreviewIdMap(previewCards),
  };
}

export function resolveKarabastUnimplementedCardId(
  row: KarabastUnimplementedApiRow,
  context: KarabastUnimplementedMappingContext,
): string | null {
  if (row.setId) {
    const setNumberMatch = context.setNumberCardIds.get(
      setNumberKey(row.setId.set, row.setId.number),
    );

    if (setNumberMatch) return setNumberMatch;
  }

  const lookupId = row.id.trim();
  if (lookupId) {
    const cardUidMatch = context.cardUidCardIds.get(lookupId);
    if (cardUidMatch) return cardUidMatch;

    const previewIdMatch = context.previewIdMap.get(lookupId);
    if (previewIdMatch && context.cards[previewIdMatch]) return previewIdMatch;
    if (previewIdMatch) {
      console.warn(
        `Ignoring Karabast unimplemented preview mapping ${lookupId}: ${previewIdMatch} is not in the merged card list`,
      );
    }
  }

  const transformedTitle = transformToId(row.titleAndSubtitle.trim());
  if (transformedTitle && context.cards[transformedTitle]) return transformedTitle;

  return null;
}

export function transformKarabastUnimplementedRowsForStorage(
  rows: KarabastUnimplementedApiRow[],
  context: KarabastUnimplementedMappingContext,
): KarabastUnimplementedStorageRow[] {
  return rows.map(row => ({
    title: row.titleAndSubtitle,
    cardId: resolveKarabastUnimplementedCardId(row, context),
    data: row,
  }));
}

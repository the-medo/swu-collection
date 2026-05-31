import type { CardList } from '../../../lib/swu-resources/types.ts';
import { cardUidToCardId } from '../../../shared/lib/cardUidToCardId.ts';
import { baseSpecialNames } from '../../../shared/lib/basicBases.ts';
import { cardsByUid } from '../../db/lists.ts';
import { getPreviewCardList } from '../cards/cardListProvider.ts';

export type KarabastPreviewIdMap = Map<string, string>;
export type KarabastCardIdResolver = (
  uid?: string | null,
  useSpecialBaseKey?: boolean,
) => string | null;

const applySpecialBaseKey = (cardId: string, useSpecialBaseKey: boolean): string => {
  if (!useSpecialBaseKey) return cardId;
  return baseSpecialNames[cardId] ?? cardId;
};

export function buildKarabastPreviewIdMap(previewCards: CardList): KarabastPreviewIdMap {
  const candidatesByKarabastId = new Map<string, string[]>();

  Object.values(previewCards).forEach(card => {
    if (!card) return;

    const karabastId = card.karabast_id_to_swubase_id?.trim();
    if (!karabastId) return;

    const cardId = card.cardId.trim();
    if (!cardId) {
      console.warn(
        `Ignoring preview Karabast mapping ${karabastId}: preview card has an empty or whitespace-only cardId`,
      );
      return;
    }

    const candidates = candidatesByKarabastId.get(karabastId) ?? [];
    candidates.push(cardId);
    candidatesByKarabastId.set(karabastId, candidates);
  });

  const previewIdMap: KarabastPreviewIdMap = new Map();
  candidatesByKarabastId.forEach((cardIds, karabastId) => {
    const sortedCardIds = [...new Set(cardIds)].sort();

    if (sortedCardIds.length > 1) {
      console.warn(
        `Duplicate preview Karabast mapping ${karabastId}: using ${sortedCardIds[0]} from candidates ${sortedCardIds.join(', ')}`,
      );
    }

    previewIdMap.set(karabastId, sortedCardIds[0]);
  });

  return previewIdMap;
}

export function resolveKarabastCardIdWithMap(
  uid: string | null | undefined,
  previewIdMap: KarabastPreviewIdMap,
  useSpecialBaseKey = false,
): string | null {
  if (!uid?.trim()) return null;

  const lookupUid = uid.trim();
  const officialCard = cardsByUid[lookupUid];

  if (officialCard) {
    return cardUidToCardId(lookupUid, useSpecialBaseKey);
  }

  const previewCardId = previewIdMap.get(lookupUid);
  if (previewCardId) {
    return applySpecialBaseKey(previewCardId, useSpecialBaseKey);
  }

  return lookupUid;
}

export async function createKarabastCardIdResolver(): Promise<KarabastCardIdResolver> {
  const previewIdMap = buildKarabastPreviewIdMap(await getPreviewCardList());
  return (uid, useSpecialBaseKey = false) =>
    resolveKarabastCardIdWithMap(uid, previewIdMap, useSpecialBaseKey);
}

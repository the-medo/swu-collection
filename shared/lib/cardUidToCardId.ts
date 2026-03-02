import { baseSpecialNames } from './basicBases.ts';
import { cardsByUid } from '../../server/db/lists.ts';

export const cardUidToCardId = (uid?: string | null, useSpecialBaseKey = false): string | null => {
  if (!uid) return null;

  const card = cardsByUid[uid];
  let cardId = card?.cardId ?? null;

  if (cardId && useSpecialBaseKey && baseSpecialNames[cardId]) {
    cardId = baseSpecialNames[cardId];
  }

  return cardId ?? uid;
};

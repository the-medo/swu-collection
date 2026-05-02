import { cardList } from '../../db/lists.ts';
import { transformToId } from '../../../lib/swu-resources/lib/transformToId.ts';
import { getBaseKey } from '../../../shared/lib/basicBases.ts';

export type MeleeDecklistLeaderBase = {
  leaderCardId: string;
  baseCardKey: string;
};

export const parseMeleeDecklistLeaderBase = (
  decklistName: unknown,
): MeleeDecklistLeaderBase | null => {
  if (typeof decklistName !== 'string') return null;

  const normalizedName = decklistName.trim();
  const separatorIndex = normalizedName.lastIndexOf(' - ');
  if (separatorIndex <= 0 || separatorIndex >= normalizedName.length - 3) {
    return null;
  }

  const leaderName = normalizedName.slice(0, separatorIndex).trim();
  const baseName = normalizedName.slice(separatorIndex + 3).trim();
  if (!leaderName || !baseName) return null;

  const leaderCardId = transformToId(leaderName);
  const baseCardId = transformToId(baseName);
  if (!cardList[leaderCardId] || !cardList[baseCardId]) {
    return null;
  }

  return {
    leaderCardId,
    baseCardKey: getBaseKey(baseCardId),
  };
};

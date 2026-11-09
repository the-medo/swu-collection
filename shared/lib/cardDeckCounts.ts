import { getBaseKey } from './basicBases.ts';

export interface CardDeckCounts {
  totalDeckCount: number;
  byLeader: Record<string, number>;
  byLeaderBase: Record<string, number>;
}

interface DeckCountRow {
  leaderCardId: string | null | undefined;
  baseCardId: string | null | undefined;
  count?: number;
}

/** Count known tournament deck entries, using the same base groups as card statistics. */
export function buildCardDeckCounts(rows: DeckCountRow[]): CardDeckCounts {
  const counts: CardDeckCounts = {
    totalDeckCount: 0,
    byLeader: Object.create(null),
    byLeaderBase: Object.create(null),
  };

  for (const { leaderCardId, baseCardId, count = 1 } of rows) {
    if (!leaderCardId || !baseCardId) continue;
    const key = `${leaderCardId}|${getBaseKey(baseCardId)}`;
    counts.totalDeckCount += count;
    counts.byLeader[leaderCardId] = (counts.byLeader[leaderCardId] ?? 0) + count;
    counts.byLeaderBase[key] = (counts.byLeaderBase[key] ?? 0) + count;
  }

  return counts;
}

export function getCardDeckCount(
  counts: CardDeckCounts | undefined,
  leaderCardId?: string,
  baseCardId?: string,
): number | undefined {
  if (!counts) return undefined;
  if (leaderCardId && baseCardId) {
    return counts.byLeaderBase[`${leaderCardId}|${getBaseKey(baseCardId)}`] ?? 0;
  }
  if (leaderCardId) return counts.byLeader[leaderCardId] ?? 0;
  return baseCardId ? undefined : counts.totalDeckCount;
}

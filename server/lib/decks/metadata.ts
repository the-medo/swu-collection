import type { CardList } from '../../../lib/swu-resources/types.ts';
import { SwuAspect } from '../../../types/enums.ts';
import { baseSpecialNames } from '../../../shared/lib/basicBases.ts';

/** Shared derived metadata, independent of the main application's DB/cache. */
export function buildDeckMetadata(
  data: { leaderCardId1: string | null; leaderCardId2: string | null; baseCardId: string | null },
  cardList: CardList,
) {
  const leader1 = data.leaderCardId1 ? cardList[data.leaderCardId1] : null;
  const leader2 = data.leaderCardId2 ? cardList[data.leaderCardId2] : null;
  const baseCard = data.baseCardId ? cardList[data.baseCardId] : null;
  const baseSpecialName = data.baseCardId ? (baseSpecialNames[data.baseCardId] ?? null) : null;

  // Initialize aspect counts
  const aspectCounts = {
    [SwuAspect.COMMAND]: 0,
    [SwuAspect.VIGILANCE]: 0,
    [SwuAspect.AGGRESSION]: 0,
    [SwuAspect.CUNNING]: 0,
    [SwuAspect.HEROISM]: 0,
    [SwuAspect.VILLAINY]: 0,
  };

  // Process leader1 aspects
  if (leader1 && leader1.aspects) {
    leader1.aspects.forEach(aspect => aspectCounts[aspect]++);
  }

  // Process leader2 aspects
  if (leader2 && leader2.aspects) {
    leader2.aspects.forEach(aspect => aspectCounts[aspect]++);
  }

  // Process base aspects and determine base aspect
  let baseAspect = null;
  if (baseCard && baseCard.aspects && baseCard.aspects.length > 0) {
    baseAspect = baseCard.aspects[0];
    aspectCounts[baseAspect]++;
  }

  return {
    aspectCommand: aspectCounts[SwuAspect.COMMAND],
    aspectVigilance: aspectCounts[SwuAspect.VIGILANCE],
    aspectAggression: aspectCounts[SwuAspect.AGGRESSION],
    aspectCunning: aspectCounts[SwuAspect.CUNNING],
    aspectHeroism: aspectCounts[SwuAspect.HEROISM],
    aspectVillainy: aspectCounts[SwuAspect.VILLAINY],
    baseAspect,
    baseSpecialName,
  };
}

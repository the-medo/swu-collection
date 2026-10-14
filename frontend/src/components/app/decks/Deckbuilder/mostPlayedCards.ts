import type { CardStat } from '@/api/card-stats/useCardStats.ts';
import type { CardList } from '../../../../../../lib/swu-resources/types.ts';
import type { SwuAspect } from '../../../../../../types/enums.ts';

/** Match each aspect symbol, including repeated aspects, against the deck's supply. */
export function getMostPlayedCardIds(
  stats: CardStat[],
  cards: CardList,
  deckAspects: SwuAspect[],
): string[] {
  return stats
    .filter(stat => {
      const card = cards[stat.cardId];
      if (!card || !['Unit', 'Event', 'Upgrade'].includes(card.type)) return false;
      if (stat.countMd + stat.countSb <= 0) return false;

      const remainingAspects = [...deckAspects];
      return card.aspects.every(aspect => {
        const index = remainingAspects.indexOf(aspect);
        if (index === -1) return false;
        remainingAspects.splice(index, 1);
        return true;
      });
    })
    .sort(
      (a, b) =>
        b.countMd + b.countSb - (a.countMd + a.countSb) ||
        b.deckCount - a.deckCount ||
        a.cardId.localeCompare(b.cardId),
    )
    .map(stat => stat.cardId);
}

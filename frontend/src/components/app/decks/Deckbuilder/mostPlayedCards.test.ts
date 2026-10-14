import { describe, expect, it } from 'bun:test';
import type { CardStat } from '@/api/card-stats/useCardStats.ts';
import type { CardList } from '../../../../../../lib/swu-resources/types.ts';
import catalog from '../../../../../../server/db/json/card-list.json';
import { SwuAspect } from '../../../../../../types/enums.ts';
import { getMostPlayedCardIds } from './mostPlayedCards.ts';

const cards = catalog as unknown as CardList;
const stat = (cardId: string, countMd = 10, countSb = 0, deckCount = 5): CardStat => ({
  cardId,
  countMd,
  countSb,
  deckCount,
  matchWin: 0,
  matchLose: 0,
});

describe('deckbuilder most played cards', () => {
  it('includes neutral and matching cards while excluding missing aspects, leaders, bases and unknown cards', () => {
    const result = getMostPlayedCardIds(
      [
        stat('battlefield-marine'),
        stat('resupply'),
        stat('confiscate'),
        stat('overwhelming-barrage'),
        stat('sabine-wren--galvanized-revolutionary'),
        stat('command-center'),
        stat('unknown-card'),
      ],
      cards,
      [SwuAspect.AGGRESSION, SwuAspect.HEROISM, SwuAspect.COMMAND],
    );

    expect(result).toEqual(['battlefield-marine', 'confiscate', 'resupply']);
  });

  it('requires both symbols for double-aspect cards and responds to changed deck aspects', () => {
    const stats = [stat('command')];
    expect(getMostPlayedCardIds(stats, cards, [SwuAspect.COMMAND, SwuAspect.HEROISM])).toEqual([]);
    expect(
      getMostPlayedCardIds(stats, cards, [SwuAspect.COMMAND, SwuAspect.HEROISM, SwuAspect.COMMAND]),
    ).toEqual(['command']);
  });

  it('ranks main-deck and sideboard copies together, breaks ties by deck count, and excludes unplayed cards', () => {
    const stats = [
      stat('battlefield-marine', 30, 0, 10),
      stat('resupply', 0, 35, 15),
      stat('confiscate', 10, 20, 20),
      stat('command', 0, 0, 0),
    ];
    const original = structuredClone(stats);
    expect(
      getMostPlayedCardIds(stats, cards, [SwuAspect.HEROISM, SwuAspect.COMMAND, SwuAspect.COMMAND]),
    ).toEqual(['resupply', 'confiscate', 'battlefield-marine']);
    expect(stats).toEqual(original);
  });
});

import { GameResult } from '../../../../../../../server/db/schema/game_result.ts';

export type CardStatTableRow = {
  cardId: string;
  included: number;
  includedInWins: number;
  includedInLosses: number;
  includedWinrate: number;

  drawn: number;
  drawnInWins: number;
  drawnInLosses: number;
  drawnWinrate: number;

  played: number;
  playedInWins: number;
  playedInLosses: number;
  playedWinrate: number;

  activated: number;
  activatedInWins: number;
  activatedInLosses: number;
  activatedWinrate: number;

  resourced: number;
  resourcedInWins: number;
  resourcedInLosses: number;
  resourcedWinrate: number;

  discarded: number;
  discardedInWins: number;
  discardedInLosses: number;
  discardedWinrate: number;
};

export type CardStatTableDataMap = Record<string, CardStatTableRow>;
export type CardStatTableData = CardStatTableRow[];

export const transformMetricsToTableData = (games: GameResult[]): CardStatTableData => {
  const map: CardStatTableDataMap = {};

  games.forEach(game => {
    const isWinner = game.isWinner ?? false;
    const metrics = game.cardMetrics;

    Object.entries(metrics).forEach(([cardId, metric]) => {
      if (!map[cardId]) {
        map[cardId] = {
          cardId,
          included: 0,
          includedInWins: 0,
          includedInLosses: 0,
          includedWinrate: 0,
          drawn: 0,
          drawnInWins: 0,
          drawnInLosses: 0,
          drawnWinrate: 0,
          played: 0,
          playedInWins: 0,
          playedInLosses: 0,
          playedWinrate: 0,
          activated: 0,
          activatedInWins: 0,
          activatedInLosses: 0,
          activatedWinrate: 0,
          resourced: 0,
          resourcedInWins: 0,
          resourcedInLosses: 0,
          resourcedWinrate: 0,
          discarded: 0,
          discardedInWins: 0,
          discardedInLosses: 0,
          discardedWinrate: 0,
        };
      }

      const row = map[cardId];
      row.included++;
      if (isWinner) row.includedInWins++;
      else row.includedInLosses++;

      if (metric.drawn) {
        row.drawn += metric.drawn;
        if (isWinner) row.drawnInWins += metric.drawn;
        else row.drawnInLosses += metric.drawn;
      }
      if (metric.played) {
        row.played += metric.played;
        if (isWinner) row.playedInWins += metric.played;
        else row.playedInLosses += metric.played;
      }
      if (metric.activated) {
        row.activated += metric.activated;
        if (isWinner) row.activatedInWins += metric.activated;
        else row.activatedInLosses += metric.activated;
      }
      if (metric.resourced) {
        row.resourced += metric.resourced;
        if (isWinner) row.resourcedInWins += metric.resourced;
        else row.resourcedInLosses += metric.resourced;
      }
      if (metric.discarded) {
        row.discarded += metric.discarded;
        if (isWinner) row.discardedInWins += metric.discarded;
        else row.discardedInLosses += metric.discarded;
      }
    });
  });

  const calculateWinrate = (wins: number, losses: number) => {
    const total = wins + losses;
    return total > 0 ? (wins / total) * 100 : 0;
  };

  return Object.values(map).map(row => ({
    ...row,
    includedWinrate: calculateWinrate(row.includedInWins, row.includedInLosses),
    drawnWinrate: calculateWinrate(row.drawnInWins, row.drawnInLosses),
    playedWinrate: calculateWinrate(row.playedInWins, row.playedInLosses),
    activatedWinrate: calculateWinrate(row.activatedInWins, row.activatedInLosses),
    resourcedWinrate: calculateWinrate(row.resourcedInWins, row.resourcedInLosses),
    discardedWinrate: calculateWinrate(row.discardedInWins, row.discardedInLosses),
  }));
};

export const getCardStatSorter = (
  key: keyof CardStatTableRow,
  direction: 'asc' | 'desc' = 'desc',
) => {
  return (a: CardStatTableRow, b: CardStatTableRow) => {
    const aValue = a[key];
    const bValue = b[key];

    if (aValue === bValue) return 0;

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return direction === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    }

    const valA = (aValue as number) ?? 0;
    const valB = (bValue as number) ?? 0;

    return direction === 'asc' ? valA - valB : valB - valA;
  };
};

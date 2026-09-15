import type { GameResult } from '../../../../../../server/db/schema/game_result.ts';
import type { MatchResult } from './MatchResult.ts';
import { getStatisticsTimestampMs } from './date.ts';

/** Explicit match metadata wins over heuristics, including a single game in a
 * running BO3, draws extending a match, and a forfeit while ahead on games. */
export function summarizeMatch(
  games: GameResult[],
): Pick<
  MatchResult,
  'type' | 'result' | 'finalWins' | 'finalLosses' | 'status' | 'completionReason'
> {
  const authoritative = games
    .filter(game => game.gameSource === 'crossfire' && game.otherData?.crossfire)
    .sort(
      (a, b) => getStatisticsTimestampMs(b.updatedAt) - getStatisticsTimestampMs(a.updatedAt),
    )[0]?.otherData.crossfire?.match;
  if (authoritative)
    return {
      type: authoritative.bestOf === 3 ? 'Bo3' : 'Bo1',
      result:
        authoritative.status !== 'complete'
          ? undefined
          : authoritative.outcome === 'win'
            ? 3
            : authoritative.outcome === 'loss'
              ? 0
              : 1,
      finalWins: authoritative.wins,
      finalLosses: authoritative.losses,
      status: authoritative.status,
      completionReason: authoritative.reason ?? undefined,
    };
  const wins = games.filter(game => game.isWinner === true).length;
  const losses = games.filter(game => game.isWinner === false).length;
  return {
    type: games.length === 1 ? 'Bo1' : games.length <= 3 ? 'Bo3' : 'other',
    result: wins > losses ? 3 : wins === losses ? 1 : 0,
    finalWins: wins,
    finalLosses: losses,
  };
}

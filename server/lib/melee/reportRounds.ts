import type { TournamentMatch } from '../../db/schema/tournament_match.ts';
import type {
  TournamentReportDeck,
  TournamentReportRound,
} from '../../../shared/types/TournamentReport.ts';

/** Imported scores are from player one's perspective, regardless of the article author. */
export function reportRounds(
  matches: TournamentMatch[],
  ownDeckId: string,
  decks: Map<string, TournamentReportDeck>,
): TournamentReportRound[] {
  const byRound = new Map<
    number,
    {
      row: TournamentReportRound;
      opponentId: string | null;
      authorFirst: boolean;
    }[]
  >();
  for (const match of matches) {
    const first = match.p1DeckId === ownDeckId;
    if (!first && match.p2DeckId !== ownDeckId) continue;
    const opponentId = match.isBye ? null : first ? match.p2DeckId : match.p1DeckId;
    const wins = first ? match.gameWin : match.gameLose;
    const losses = first ? match.gameLose : match.gameWin;
    const result = first || match.result === 1 ? match.result : 3 - match.result;
    const outcome = match.isBye
      ? 'bye'
      : match.result === 1
        ? 'draw'
        : match.gameWin + match.gameLose === 0
          ? 'unknown'
          : result === 3
            ? 'win'
            : result === 0
              ? 'loss'
              : 'unknown';
    const row: TournamentReportRound = {
      round: match.round,
      opponentName: match.isBye ? null : first ? match.p2Username : match.p1Username,
      opponentDeck: !match.isBye && opponentId ? (decks.get(opponentId) ?? null) : null,
      outcome,
      // Old imports use 0–0–3 for an unspecified draw and 0–0–0 for an unknown result.
      games: !match.isBye && wins + losses > 0 ? { wins, losses, draws: match.gameDraw } : null,
      record: null,
    };
    byRound.set(row.round, [
      ...(byRound.get(row.round) ?? []),
      { row, opponentId, authorFirst: first },
    ]);
  }
  const record = { wins: 0, losses: 0, draws: 0 };
  let previousRound = 0;
  let complete = true;
  return [...byRound.entries()]
    .sort(([a], [b]) => a - b)
    .map(([round, rows]) => {
      // Mirrored imports must not double-count a round; conflicting rows need author input.
      const preferred = rows.find(candidate => candidate.authorFirst) ?? rows[0]!;
      const opponentIds = new Set(
        rows.flatMap(candidate => (candidate.opponentId ? [candidate.opponentId] : [])),
      );
      const opponentId = opponentIds.size === 1 ? [...opponentIds][0]! : null;
      const sameRound = rows.every(candidate => {
        // Names can change between imports. Compare stable deck identities, including
        // non-public IDs retained only here. A renamed opponent can leave one side's
        // deck lookup empty; the mirrored row can supply that missing identity.
        const sameOpponent =
          opponentIds.size <= 1 &&
          (opponentId !== null ||
            candidate.row.opponentName?.trim().toLowerCase() ===
              preferred.row.opponentName?.trim().toLowerCase());
        return (
          sameOpponent &&
          candidate.row.outcome === preferred.row.outcome &&
          JSON.stringify(candidate.row.games) === JSON.stringify(preferred.row.games)
        );
      });
      const row: TournamentReportRound = sameRound
        ? { ...preferred.row, opponentDeck: opponentId ? (decks.get(opponentId) ?? null) : null }
        : {
            round,
            opponentName: null,
            opponentDeck: null,
            outcome: 'unknown',
            games: null,
            record: null,
          };
      complete &&= round === previousRound + 1 && row.outcome !== 'unknown';
      previousRound = round;
      if (row.outcome === 'win' || row.outcome === 'bye') record.wins++;
      if (row.outcome === 'loss') record.losses++;
      if (row.outcome === 'draw') record.draws++;
      return { ...row, record: complete ? { ...record } : null };
    });
}

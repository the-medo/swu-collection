import type { TransactionSql } from 'postgres';
import type { CrossfireMatchStatistics } from '../../shared/types/crossfire-statistics.ts';

export const statisticsMatchId = (matchId: string) => `crossfire:${matchId}`;
export const statisticsGameId = (gameId: string) => `crossfire:${gameId}`;

/** Reads sealed summaries, never infers a BO3 result from a temporary lead. */
export async function matchStatistics(tx: TransactionSql, matchId: string) {
  const [root] = await tx`SELECT best_of FROM play.lobbies WHERE id = ${matchId}`;
  if (!root) throw new Error('Missing statistics match');
  const games = await tx`SELECT g.status, g.summary FROM play.match_games mg
    JOIN play.lobbies l ON l.id = mg.lobby_id JOIN play.games g ON g.id = l.game_id
    WHERE mg.match_id = ${matchId} ORDER BY mg.number`;
  const [exit] = await tx`SELECT status, seat FROM play.match_exits WHERE match_id = ${matchId}`;
  const score = { p1: 0, p2: 0 };
  for (const game of games) {
    const winner = game.summary?.result?.winner as 'p1' | 'p2' | undefined;
    if (['ended', 'finalized'].includes(game.status) && (winner === 'p1' || winner === 'p2'))
      score[winner]++;
  }
  const last = games.at(-1);
  const abandoned = exit?.status === 'abandoned' || last?.status === 'abandoned';
  const forfeited = exit?.status === 'forfeit';
  const complete =
    forfeited ||
    (exit?.status !== 'pending' &&
      !!last &&
      ['ended', 'finalized'].includes(last.status) &&
      (root.best_of === 1 || score.p1 >= 2 || score.p2 >= 2));
  const winner = forfeited
    ? exit.seat === 'p1'
      ? 'p2'
      : 'p1'
    : score.p1 === score.p2
      ? null
      : score.p1 > score.p2
        ? 'p1'
        : 'p2';
  return Object.fromEntries(
    (['p1', 'p2'] as const).map(seat => [
      seat,
      {
        bestOf: root.best_of as 1 | 3,
        status: abandoned ? 'abandoned' : complete ? 'complete' : 'in-progress',
        outcome:
          abandoned || !complete
            ? null
            : winner === null
              ? 'draw'
              : winner === seat
                ? 'win'
                : 'loss',
        reason: abandoned ? 'abandoned' : forfeited ? 'forfeit' : complete ? 'score' : null,
        wins: score[seat],
        losses: score[seat === 'p1' ? 'p2' : 'p1'],
      } satisfies CrossfireMatchStatistics,
    ]),
  ) as Record<'p1' | 'p2', CrossfireMatchStatistics>;
}

/** Caller holds the match lock. Also used when leaving between BO3 games. */
export async function refreshMatchStatistics(tx: TransactionSql, matchId: string) {
  const summaries = await matchStatistics(tx, matchId);
  for (const seat of ['p1', 'p2'] as const) {
    const rows = await tx`UPDATE public.game_result r SET
      other_data = jsonb_set(r.other_data, '{crossfire,match}', ${tx.json(summaries[seat])}),
      updated_at = clock_timestamp() AT TIME ZONE 'UTC'
      FROM play.participants p WHERE p.lobby_id = ${matchId} AND p.seat = ${seat}
      AND r.user_id = p.user_id AND r.match_id = ${statisticsMatchId(matchId)} AND r.game_source = 'crossfire'
      AND r.other_data->'crossfire'->'match' IS DISTINCT FROM ${tx.json(summaries[seat])}
      RETURNING r.user_id`;
    for (const userId of new Set(rows.map(r => r.user_id))) await notifyStatistics(tx, userId);
  }
}

/** Commit-delivered invalidation only; readers enforce current account/team access. */
export async function notifyStatistics(tx: TransactionSql, userId: string) {
  const teams = await tx`SELECT team_id FROM public.team_member WHERE user_id = ${userId}`;
  // One small notification per scope stays below PostgreSQL's payload limit.
  await tx`SELECT pg_notify('game_results', ${JSON.stringify({ userId })})`;
  for (const team of teams)
    await tx`SELECT pg_notify('game_results', ${JSON.stringify({ teamId: team.team_id })})`;
}

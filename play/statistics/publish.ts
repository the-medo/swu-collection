import type { Sql } from 'postgres';
import type { DeckSnapshot } from '../admission/decks.ts';
import { getBaseKey } from '../../shared/lib/basicBases.ts';
import type { CrossfireGameStatistics } from '../../shared/types/crossfire-statistics.ts';
import type { History } from '../history/records.ts';
import { collectStatistics } from './collect.ts';
import {
  matchStatistics,
  notifyStatistics,
  refreshMatchStatistics,
  statisticsGameId,
  statisticsMatchId,
} from './matches.ts';

/** A retryable projection of verified history into account statistics. Both
 * players, team-deck links and the export receipt commit in one transaction. */
export async function publishStatistics(sql: Sql, history: History) {
  const { players, state } = collectStatistics(history);
  return sql.begin(async tx => {
    const [lobby] = await tx`SELECT l.id, coalesce(mg.match_id, l.id) AS match_id,
      coalesce(mg.number, 1) AS number FROM play.lobbies l
      LEFT JOIN play.match_games mg ON mg.lobby_id = l.id WHERE l.game_id = ${history.gameId}`;
    // Early development games can predate match metadata. Adopt identity only.
    if (lobby) {
      await tx`INSERT INTO play.matches(id) VALUES (${lobby.match_id}) ON CONFLICT DO NOTHING`;
      await tx`SELECT id FROM play.matches WHERE id = ${lobby.match_id} FOR UPDATE`;
      await tx`INSERT INTO play.match_games(match_id, number, lobby_id, initiative_chooser)
        VALUES (${lobby.match_id}, ${lobby.number}, ${lobby.id}, 'p1') ON CONFLICT DO NOTHING`;
    }
    const [game] = await tx`SELECT * FROM play.games WHERE id = ${history.gameId} FOR UPDATE`;
    if (
      !game ||
      game.status !== 'finalized' ||
      game.state_hash !== history.stateHash ||
      game.sequence !== history.sequence
    )
      throw new Error('Statistics require the sealed archived head');
    if (game.statistics_at) return false;
    if (lobby) {
      const summaries = await matchStatistics(tx, lobby.match_id);
      const decks =
        await tx`SELECT seat, deck_snapshot FROM play.participants WHERE lobby_id = ${lobby.id}`;
      const people = await tx`SELECT p.seat, p.user_id, p.deck_snapshot FROM play.participants p
        JOIN public."user" u ON u.id = p.user_id WHERE p.lobby_id = ${lobby.id} ORDER BY p.seat FOR KEY SHARE OF u`;
      for (const person of people) {
        const seat = person.seat as 'p1' | 'p2';
        const metrics = players[seat];
        const own = state.players[seat],
          other = state.players[seat === 'p1' ? 'p2' : 'p1'];
        if (!metrics || !own || !other) throw new Error('Statistics seat mismatch');
        const snapshot = person.deck_snapshot as DeckSnapshot;
        const opposing = decks.find(p => p.seat !== seat)!.deck_snapshot as DeckSnapshot;
        const [deck] =
          await tx`SELECT id, name, card_pool_id FROM public.deck WHERE id = ${snapshot.sourceDeckId} FOR KEY SHARE`;
        const crossfire: CrossfireGameStatistics = {
          version: 1,
          lobbyId: lobby.id,
          match: summaries[seat],
          totals: metrics.totals,
          resumed: game.provenance !== null,
        };
        const otherData = {
          crossfire,
          roundNumber: state.round,
          startedAt: game.created_at.toISOString(),
          finishedAt: game.ended_at.toISOString(),
          deckInfo: {
            name: deck?.name,
            cardPoolId: deck?.card_pool_id,
            formatId: snapshot.sourceFormat,
          },
        };
        // Public deck selection remains associated with the playing account's row.
        // Deleting/editing the deck cannot change the frozen leader/base identities.
        await tx`INSERT INTO public.game_result
          (user_id, deck_id, match_id, game_id, game_number, format,
           leader_card_id, base_card_key, opponent_leader_card_id, opponent_base_card_key,
           has_initiative, has_mulligan, is_winner, game_source, card_metrics, round_metrics, other_data, created_at)
          VALUES (${person.user_id}, ${deck?.id ?? null}, ${statisticsMatchId(lobby.match_id)}, ${statisticsGameId(history.gameId)},
            ${lobby.number}, ${snapshot.sourceKind === 'limited' ? 'limited' : 'premier'},
            ${snapshot.leader}, ${getBaseKey(snapshot.base)},
            ${opposing.leader}, ${getBaseKey(opposing.base)},
            ${metrics.hasInitiative}, ${metrics.hasMulligan}, ${state.result!.winner === null ? null : state.result!.winner === seat},
            'crossfire', ${tx.json(metrics.cardMetrics)}, ${tx.json(metrics.roundMetrics)}, ${tx.json(otherData)},
            ${game.ended_at} AT TIME ZONE 'UTC')
          ON CONFLICT (user_id, game_id) DO NOTHING`;
        if (deck)
          await tx`INSERT INTO public.team_deck(team_id, deck_id)
          SELECT team_id, ${deck.id} FROM public.team_member WHERE user_id = ${person.user_id} AND auto_add_deck
          ON CONFLICT DO NOTHING`;
        await notifyStatistics(tx, person.user_id);
      }
      await refreshMatchStatistics(tx, lobby.match_id);
    }
    await tx`UPDATE play.games SET statistics_at = clock_timestamp() WHERE id = ${history.gameId}`;
    return true;
  });
}

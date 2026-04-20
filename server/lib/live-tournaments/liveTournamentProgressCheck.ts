import { and, eq, sql } from 'drizzle-orm';
import { db } from '../../db';
import { tournament as tournamentTable } from '../../db/schema/tournament.ts';
import {
  player as playerTable,
  tournamentStanding,
  tournamentWeekendMatch,
  tournamentWeekendTournament,
} from '../../db/schema/tournament_weekend.ts';
import { mergeLiveTournamentAdditionalData } from './additionalData.ts';
import { publishLiveTournamentProgressChecked } from './liveTournamentEvents.ts';
import { fetchLiveTournamentProgressFromMelee } from './melee.ts';
import type {
  LiveMeleeMatch,
  LiveMeleePlayer,
  LiveMeleeStanding,
  LiveTournamentBracketRound,
  LiveTournamentCheckInput,
  LiveTournamentProgressCheckResult,
} from './types.ts';

const topCutRoundNames = new Set(['Quarterfinals', 'Semifinals', 'Finals']);

const getMatchLosses = (matchRecord: string) => {
  const [, losses] = matchRecord.split('-').map(value => Number.parseInt(value, 10));
  return Number.isFinite(losses) ? losses : null;
};

const uniquePlayers = (
  standings: LiveMeleeStanding[],
  matches: LiveMeleeMatch[],
): LiveMeleePlayer[] => {
  const playersById = new Map<number, LiveMeleePlayer>();

  standings.forEach(standing => {
    playersById.set(standing.id, {
      id: standing.id,
      displayName: standing.displayName,
    });
  });

  matches.forEach(match => {
    playersById.set(match.player1.id, match.player1);
    if (match.player2) {
      playersById.set(match.player2.id, match.player2);
    }
  });

  return [...playersById.values()];
};

export function deriveUndefeatedPlayers(
  roundNumber: number,
  standings: LiveMeleeStanding[],
): LiveMeleeStanding[] {
  if (roundNumber < 4) {
    return [];
  }

  return standings.filter(standing => getMatchLosses(standing.matchRecord) === 0);
}

export function deriveBracket(matches: LiveMeleeMatch[]): LiveTournamentBracketRound[] {
  const bracketByRoundName = new Map<string, LiveMeleeMatch[]>();

  matches.forEach(match => {
    if (!topCutRoundNames.has(match.roundName)) {
      return;
    }

    const existing = bracketByRoundName.get(match.roundName);
    if (existing) {
      existing.push(match);
      return;
    }

    bracketByRoundName.set(match.roundName, [match]);
  });

  return [...bracketByRoundName.entries()].map(([roundName, roundMatches]) => ({
    roundName,
    matches: roundMatches,
  }));
}

export async function liveTournamentProgressCheck(
  input: LiveTournamentCheckInput,
): Promise<LiveTournamentProgressCheckResult> {
  const row = (
    await db
      .select({
        weekendTournament: tournamentWeekendTournament,
        tournament: tournamentTable,
      })
      .from(tournamentWeekendTournament)
      .innerJoin(tournamentTable, eq(tournamentWeekendTournament.tournamentId, tournamentTable.id))
      .where(
        and(
          eq(tournamentWeekendTournament.tournamentWeekendId, input.weekendId),
          eq(tournamentWeekendTournament.tournamentId, input.tournamentId),
        ),
      )
      .limit(1)
  )[0];

  if (!row) {
    return {
      type: 'skipped',
      weekendId: input.weekendId,
      tournamentId: input.tournamentId,
      reason: 'Tournament weekend row not found.',
    };
  }

  const meleeId = row.tournament.meleeId;
  if (!meleeId) {
    return {
      type: 'skipped',
      weekendId: input.weekendId,
      tournamentId: input.tournamentId,
      reason: 'Tournament has no Melee id.',
    };
  }

  const progress = await fetchLiveTournamentProgressFromMelee({ meleeId });
  const players = uniquePlayers(progress.standings, progress.matches);

  if (players.length > 0) {
    await db
      .insert(playerTable)
      .values(players)
      .onConflictDoUpdate({
        target: playerTable.id,
        set: {
          displayName: sql`excluded.display_name`,
          updatedAt: sql`NOW()`,
        },
      });
  }

  if (progress.standings.length > 0) {
    await db
      .insert(tournamentStanding)
      .values(
        progress.standings.map(standing => ({
          tournamentId: input.tournamentId,
          playerId: standing.id,
          roundNumber: progress.roundNumber,
          rank: standing.rank,
          points: standing.points,
          gameRecord: standing.gameRecord,
          matchRecord: standing.matchRecord,
        })),
      )
      .onConflictDoUpdate({
        target: [
          tournamentStanding.tournamentId,
          tournamentStanding.roundNumber,
          tournamentStanding.playerId,
        ],
        set: {
          rank: sql`excluded.rank`,
          points: sql`excluded.points`,
          gameRecord: sql`excluded.game_record`,
          matchRecord: sql`excluded.match_record`,
          updatedAt: sql`NOW()`,
        },
      });
  }

  if (progress.matches.length > 0) {
    await db
      .insert(tournamentWeekendMatch)
      .values(
        progress.matches.map(match => ({
          tournamentId: input.tournamentId,
          roundNumber: match.roundNumber,
          matchKey: match.matchKey,
          playerId1: match.player1.id,
          playerId2: match.player2?.id ?? null,
          leaderCardId1: match.leaderCardId1,
          baseCardKey1: match.baseCardKey1,
          leaderCardId2: match.leaderCardId2,
          baseCardKey2: match.baseCardKey2,
          player1GameWin: match.player1GameWin,
          player2GameWin: match.player2GameWin,
          updatedAt: match.updatedAt,
        })),
      )
      .onConflictDoUpdate({
        target: [
          tournamentWeekendMatch.tournamentId,
          tournamentWeekendMatch.roundNumber,
          tournamentWeekendMatch.matchKey,
        ],
        set: {
          playerId1: sql`excluded.player_id_1`,
          playerId2: sql`excluded.player_id_2`,
          leaderCardId1: sql`COALESCE(excluded.leader_card_id_1, ${tournamentWeekendMatch.leaderCardId1})`,
          baseCardKey1: sql`COALESCE(excluded.base_card_key_1, ${tournamentWeekendMatch.baseCardKey1})`,
          leaderCardId2: sql`COALESCE(excluded.leader_card_id_2, ${tournamentWeekendMatch.leaderCardId2})`,
          baseCardKey2: sql`COALESCE(excluded.base_card_key_2, ${tournamentWeekendMatch.baseCardKey2})`,
          player1GameWin: sql`excluded.player_1_game_win`,
          player2GameWin: sql`excluded.player_2_game_win`,
          updatedAt: sql`excluded.updated_at`,
        },
      });
  }

  const undefeatedPlayers = deriveUndefeatedPlayers(progress.roundNumber, progress.standings);
  const bracket = deriveBracket(progress.matches);
  const additionalData = mergeLiveTournamentAdditionalData(
    row.weekendTournament.additionalData,
    progress.additionalData,
  );

  await db
    .update(tournamentWeekendTournament)
    .set({
      roundNumber: progress.roundNumber,
      roundName: progress.roundName,
      matchesTotal: progress.matchesTotal,
      matchesRemaining: progress.matchesRemaining,
      additionalData: additionalData,
      lastUpdatedAt: sql`NOW()`,
      updatedAt: sql`NOW()`,
    })
    .where(
      and(
        eq(tournamentWeekendTournament.tournamentWeekendId, input.weekendId),
        eq(tournamentWeekendTournament.tournamentId, input.tournamentId),
      ),
    );

  const result: LiveTournamentProgressCheckResult = {
    type: 'checked',
    weekendId: input.weekendId,
    tournamentId: input.tournamentId,
    meleeId,
    roundNumber: progress.roundNumber,
    roundName: progress.roundName,
    standingsCount: progress.standings.length,
    matchesCount: progress.matches.length,
    matchesRemaining: progress.matchesRemaining,
    undefeatedPlayers,
    bracket,
  };

  await publishLiveTournamentProgressChecked(result);

  return result;
}

import { and, count, eq, sql } from 'drizzle-orm';
import { db } from '../../db';
import { tournament as tournamentTable } from '../../db/schema/tournament.ts';
import {
  tournamentStanding,
  tournamentWeekendMatch,
  tournamentWeekendPlayer,
  tournamentWeekendTournament,
} from '../../db/schema/tournament_weekend.ts';
import { mergeLiveTournamentAdditionalData } from './additionalData.ts';
import { publishLiveTournamentProgressChecked } from './liveTournamentEvents.ts';
import { fetchLiveTournamentProgressFromMelee } from './melee.ts';
import { recomputeTournamentWeekendPlayerScores } from './tournamentWeekendPlayerScores.ts';
import type {
  LiveMeleeMatch,
  LiveMeleePlayer,
  LiveMeleeStanding,
  LiveTournamentBracketRound,
  LiveTournamentCheckInput,
  LiveTournamentProgressCheckResult,
} from './types.ts';
import { upsertPlayers } from './upsertPlayers.ts';

const topCutRoundNames = new Set(['Quarterfinals', 'Semifinals', 'Finals']);

const getMatchLosses = (matchRecord: string) => {
  const [, losses] = matchRecord.split('-').map(value => Number.parseInt(value, 10));
  return Number.isFinite(losses) ? losses : null;
};

const uniquePlayers = (
  standings: LiveMeleeStanding[],
  matches: LiveMeleeMatch[],
): LiveMeleePlayer[] => {
  const playersByDisplayName = new Map<string, LiveMeleePlayer>();

  const setPlayer = (player: LiveMeleePlayer) => {
    const existing = playersByDisplayName.get(player.displayName);

    playersByDisplayName.set(player.displayName, {
      displayName: player.displayName,
      meleePlayerId: player.meleePlayerId ?? existing?.meleePlayerId ?? null,
    });
  };

  standings.forEach(standing => {
    setPlayer(standing);
  });

  matches.forEach(match => {
    setPlayer(match.player1);
    if (match.player2) {
      setPlayer(match.player2);
    }
  });

  return [...playersByDisplayName.values()];
};

const matchLeaderBaseByPlayerDisplayName = (matches: LiveMeleeMatch[]) => {
  const leaderBaseByPlayerDisplayName = new Map<
    string,
    {
      leaderCardId: string | null;
      baseCardKey: string | null;
    }
  >();

  const setLeaderBase = (
    playerDisplayName: string,
    leaderCardId: string | null,
    baseCardKey: string | null,
  ) => {
    const existing = leaderBaseByPlayerDisplayName.get(playerDisplayName);

    leaderBaseByPlayerDisplayName.set(playerDisplayName, {
      leaderCardId: leaderCardId ?? existing?.leaderCardId ?? null,
      baseCardKey: baseCardKey ?? existing?.baseCardKey ?? null,
    });
  };

  for (const match of matches) {
    setLeaderBase(match.player1.displayName, match.leaderCardId1, match.baseCardKey1);

    if (match.player2) {
      setLeaderBase(match.player2.displayName, match.leaderCardId2, match.baseCardKey2);
    }
  }

  return leaderBaseByPlayerDisplayName;
};

const getImportedRoundMatchCounts = async (tournamentId: string) => {
  const rows = await db
    .select({
      roundNumber: tournamentWeekendMatch.roundNumber,
      matchCount: count(),
    })
    .from(tournamentWeekendMatch)
    .where(eq(tournamentWeekendMatch.tournamentId, tournamentId))
    .groupBy(tournamentWeekendMatch.roundNumber);

  return new Map(rows.map(row => [row.roundNumber, row.matchCount]));
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

  const progress = await fetchLiveTournamentProgressFromMelee({
    meleeId,
    importedRoundMatchCounts: await getImportedRoundMatchCounts(input.tournamentId),
  });
  const players = uniquePlayers(progress.standings, progress.matches);

  if (players.length > 0) {
    await upsertPlayers(players);
  }

  if (players.length > 0) {
    const leaderBaseByPlayerDisplayName = matchLeaderBaseByPlayerDisplayName(progress.matches);

    await db
      .insert(tournamentWeekendPlayer)
      .values(
        players.map(player => {
          const leaderBase = leaderBaseByPlayerDisplayName.get(player.displayName);

          return {
            tournamentId: input.tournamentId,
            playerDisplayName: player.displayName,
            leaderCardId: leaderBase?.leaderCardId ?? null,
            baseCardKey: leaderBase?.baseCardKey ?? null,
          };
        }),
      )
      .onConflictDoUpdate({
        target: [tournamentWeekendPlayer.tournamentId, tournamentWeekendPlayer.playerDisplayName],
        set: {
          leaderCardId: sql`COALESCE(excluded.leader_card_id, ${tournamentWeekendPlayer.leaderCardId})`,
          baseCardKey: sql`COALESCE(excluded.base_card_key, ${tournamentWeekendPlayer.baseCardKey})`,
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
          playerDisplayName: standing.displayName,
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
          tournamentStanding.playerDisplayName,
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
          playerDisplayName1: match.player1.displayName,
          playerDisplayName2: match.player2?.displayName ?? null,
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
          playerDisplayName1: sql`excluded.player_display_name_1`,
          playerDisplayName2: sql`excluded.player_display_name_2`,
          player1GameWin: sql`excluded.player_1_game_win`,
          player2GameWin: sql`excluded.player_2_game_win`,
          updatedAt: sql`excluded.updated_at`,
        },
      });
  }

  await recomputeTournamentWeekendPlayerScores(input.tournamentId);

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

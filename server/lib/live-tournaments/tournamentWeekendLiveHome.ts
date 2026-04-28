import { and, asc, count, eq, inArray, or, sql, type SQL } from 'drizzle-orm';
import { db } from '../../db';
import { deck as deckTable } from '../../db/schema/deck.ts';
import { format as formatTable } from '../../db/schema/format.ts';
import { meta as metaTable } from '../../db/schema/meta.ts';
import { tournament as tournamentTable } from '../../db/schema/tournament.ts';
import { tournamentDeck as tournamentDeckTable } from '../../db/schema/tournament_deck.ts';
import { tournamentGroup as tournamentGroupTable } from '../../db/schema/tournament_group.ts';
import { tournamentGroupLeaderBase as tournamentGroupLeaderBaseTable } from '../../db/schema/tournament_group_leader_base.ts';
import { tournamentType as tournamentTypeTable } from '../../db/schema/tournament_type.ts';
import {
  playerWatch as playerWatchTable,
  tournamentStanding as tournamentStandingTable,
  tournamentWeekend,
  tournamentWeekendMatch,
  tournamentWeekendResource,
  tournamentWeekendTournament,
  tournamentWeekendTournamentGroup,
} from '../../db/schema/tournament_weekend.ts';
import type {
  LiveTournamentHomeDetail,
  LiveTournamentHomeStandingSummary,
  LiveTournamentHomeTournament,
  LiveTournamentHomeWatchedMatch,
  LiveTournamentHomeWatchedTournament,
  LiveTournamentWinningDeck,
} from '../../../types/TournamentWeekend.ts';

const topCutRoundNames = new Set(['Quarterfinals', 'Semifinals', 'Finals']);

const groupBy = <T, K extends string | number>(items: T[], getKey: (item: T) => K) => {
  const grouped = new Map<K, T[]>();

  for (const item of items) {
    const key = getKey(item);
    const existing = grouped.get(key);
    if (existing) {
      existing.push(item);
      continue;
    }
    grouped.set(key, [item]);
  }

  return grouped;
};

const combineOr = (filters: SQL[]) => {
  if (filters.length === 0) return undefined;
  if (filters.length === 1) return filters[0];
  return or(...filters);
};

const getMatchLosses = (matchRecord: string) => {
  const [, losses] = matchRecord.split('-').map(value => Number.parseInt(value, 10));
  return Number.isFinite(losses) ? losses : null;
};

const parseAdditionalData = (value: string | null | undefined): Record<string, unknown> => {
  if (!value) return {};

  try {
    const parsed = JSON.parse(value);
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

const getRoundNameMap = (value: {
  additionalData: string | null;
  roundNumber: number | null;
  roundName: string | null;
}) => {
  const additionalData = parseAdditionalData(value.additionalData);
  const liveRounds = additionalData.liveRounds;
  const roundNameByNumber = new Map<number, string>();

  if (Array.isArray(liveRounds)) {
    liveRounds.forEach(round => {
      if (
        typeof round === 'object' &&
        round !== null &&
        typeof (round as { number?: unknown }).number === 'number' &&
        typeof (round as { name?: unknown }).name === 'string'
      ) {
        roundNameByNumber.set(
          (round as { number: number }).number,
          (round as { name: string }).name,
        );
      }
    });
  }

  if (value.roundNumber !== null && value.roundName !== null) {
    roundNameByNumber.set(value.roundNumber, value.roundName);
  }

  return roundNameByNumber;
};

const toDateString = (value: Date | string) => {
  if (typeof value === 'string') return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
};

const mapTournament = (row: typeof tournamentTable.$inferSelect): LiveTournamentHomeTournament => ({
  id: row.id,
  type: row.type,
  location: row.location,
  continent: row.continent,
  name: row.name,
  attendance: row.attendance,
  meleeId: row.meleeId,
  format: row.format,
  meta: row.meta,
  days: row.days,
  dayTwoPlayerCount: row.dayTwoPlayerCount,
  date: toDateString(row.date),
  imported: row.imported,
  bracketInfo: row.bracketInfo,
});

const standingKey = (playerDisplayName: string, tournamentId: string) =>
  `${playerDisplayName}:${tournamentId}`;

const isNewerWatchedMatch = (
  candidate: LiveTournamentHomeWatchedMatch,
  existing: LiveTournamentHomeWatchedMatch | undefined,
) => {
  if (!existing) return true;
  if (candidate.roundNumber !== existing.roundNumber) {
    return candidate.roundNumber > existing.roundNumber;
  }

  const candidateTimestamp = Date.parse(candidate.updatedAt ?? candidate.createdAt);
  const existingTimestamp = Date.parse(existing.updatedAt ?? existing.createdAt);

  if (candidateTimestamp !== existingTimestamp) {
    return candidateTimestamp > existingTimestamp;
  }

  return candidate.matchKey.localeCompare(existing.matchKey) > 0;
};

const getWatchedMatchSummary = (
  playerDisplayName: string,
  match: {
    tournamentId: string;
    roundNumber: number;
    matchKey: string;
    playerDisplayName1: string;
    playerDisplayName2: string | null;
    player1GameWin: number | null;
    player2GameWin: number | null;
    updatedAt: string | null;
    createdAt: string;
  },
): LiveTournamentHomeWatchedMatch => {
  const isPlayer1 = match.playerDisplayName1 === playerDisplayName;
  const playerGameWins = isPlayer1 ? match.player1GameWin : match.player2GameWin;
  const opponentGameWins = isPlayer1 ? match.player2GameWin : match.player1GameWin;
  const opponentDisplayName = isPlayer1 ? match.playerDisplayName2 : match.playerDisplayName1;

  let outcome: 'win' | 'loss' | null = null;
  if (playerGameWins !== null && opponentGameWins !== null && playerGameWins !== opponentGameWins) {
    outcome = playerGameWins > opponentGameWins ? 'win' : 'loss';
  }

  return {
    tournamentId: match.tournamentId,
    roundNumber: match.roundNumber,
    matchKey: match.matchKey,
    playerDisplayName,
    opponentDisplayName,
    playerGameWins,
    opponentGameWins,
    outcome,
    updatedAt: match.updatedAt,
    createdAt: match.createdAt,
  };
};

const selectCurrentStandings = async (
  displayRoundByTournament: Map<string, number | null>,
): Promise<LiveTournamentHomeStandingSummary[]> => {
  const filters: SQL[] = [];

  displayRoundByTournament.forEach((roundNumber, tournamentId) => {
    if (roundNumber === null) return;

    const filter = and(
      eq(tournamentStandingTable.tournamentId, tournamentId),
      eq(tournamentStandingTable.roundNumber, roundNumber),
    );
    if (filter) filters.push(filter);
  });

  const where = combineOr(filters);
  if (!where) return [];

  return db
    .select({
      tournamentId: tournamentStandingTable.tournamentId,
      playerDisplayName: tournamentStandingTable.playerDisplayName,
      roundNumber: tournamentStandingTable.roundNumber,
      rank: tournamentStandingTable.rank,
      points: tournamentStandingTable.points,
      gameRecord: tournamentStandingTable.gameRecord,
      matchRecord: tournamentStandingTable.matchRecord,
      updatedAt: tournamentStandingTable.updatedAt,
    })
    .from(tournamentStandingTable)
    .where(where)
    .orderBy(
      asc(tournamentStandingTable.tournamentId),
      asc(tournamentStandingTable.rank),
      asc(tournamentStandingTable.playerDisplayName),
    );
};

const selectBracketMatchCounts = async (
  tournaments: {
    tournament: typeof tournamentTable.$inferSelect;
    weekendTournament: typeof tournamentWeekendTournament.$inferSelect;
  }[],
) => {
  const filters: SQL[] = [];

  tournaments.forEach(row => {
    const roundNameByNumber = getRoundNameMap(row.weekendTournament);
    roundNameByNumber.forEach((roundName, roundNumber) => {
      if (!topCutRoundNames.has(roundName)) return;

      const filter = and(
        eq(tournamentWeekendMatch.tournamentId, row.tournament.id),
        eq(tournamentWeekendMatch.roundNumber, roundNumber),
      );
      if (filter) filters.push(filter);
    });
  });

  const where = combineOr(filters);
  if (!where) return new Map<string, number>();

  const rows = await db
    .select({
      tournamentId: tournamentWeekendMatch.tournamentId,
      matchCount: count(),
    })
    .from(tournamentWeekendMatch)
    .where(where)
    .groupBy(tournamentWeekendMatch.tournamentId);

  return new Map(rows.map(row => [row.tournamentId, row.matchCount]));
};

const selectWatchedPlayers = async (
  userId: string | undefined,
  tournamentIds: string[],
  currentStandings: LiveTournamentHomeStandingSummary[],
) => {
  if (!userId || tournamentIds.length === 0) {
    return {
      watchlist: [],
      watchedPlayerDisplayNames: [],
      watchedPlayers: [],
    };
  }

  const watchlist = await db
    .select({
      watch: playerWatchTable,
      displayName: playerWatchTable.playerDisplayName,
    })
    .from(playerWatchTable)
    .where(eq(playerWatchTable.userId, userId))
    .orderBy(asc(playerWatchTable.playerDisplayName));

  const watchedPlayerDisplayNames = watchlist.map(row => row.displayName);
  if (watchedPlayerDisplayNames.length === 0) {
    return {
      watchlist,
      watchedPlayerDisplayNames,
      watchedPlayers: [],
    };
  }

  const currentStandingByKey = new Map(
    currentStandings
      .filter(row => watchedPlayerDisplayNames.includes(row.playerDisplayName))
      .map(row => [standingKey(row.playerDisplayName, row.tournamentId), row]),
  );

  const watchedMatchRows = await db
    .select({
      tournamentId: tournamentWeekendMatch.tournamentId,
      roundNumber: tournamentWeekendMatch.roundNumber,
      matchKey: tournamentWeekendMatch.matchKey,
      playerDisplayName1: tournamentWeekendMatch.playerDisplayName1,
      playerDisplayName2: tournamentWeekendMatch.playerDisplayName2,
      player1GameWin: tournamentWeekendMatch.player1GameWin,
      player2GameWin: tournamentWeekendMatch.player2GameWin,
      updatedAt: tournamentWeekendMatch.updatedAt,
      createdAt: tournamentWeekendMatch.createdAt,
    })
    .from(tournamentWeekendMatch)
    .where(
      and(
        inArray(tournamentWeekendMatch.tournamentId, tournamentIds),
        or(
          inArray(tournamentWeekendMatch.playerDisplayName1, watchedPlayerDisplayNames),
          inArray(tournamentWeekendMatch.playerDisplayName2, watchedPlayerDisplayNames),
        ),
      ),
    );

  const latestMatchByKey = new Map<string, LiveTournamentHomeWatchedMatch>();
  for (const match of watchedMatchRows) {
    const players = [match.playerDisplayName1, match.playerDisplayName2].filter(
      (displayName): displayName is string =>
        displayName !== null && watchedPlayerDisplayNames.includes(displayName),
    );

    for (const playerDisplayName of players) {
      const summary = getWatchedMatchSummary(playerDisplayName, match);
      const key = standingKey(playerDisplayName, match.tournamentId);
      const existing = latestMatchByKey.get(key);

      if (isNewerWatchedMatch(summary, existing)) {
        latestMatchByKey.set(key, summary);
      }
    }
  }

  const watchedPlayers = watchlist.map(row => {
    const tournaments = tournamentIds
      .map((tournamentId): LiveTournamentHomeWatchedTournament | null => {
        const key = standingKey(row.displayName, tournamentId);
        const standing = currentStandingByKey.get(key) ?? null;
        const latestMatch = latestMatchByKey.get(key) ?? null;

        if (!standing && !latestMatch) return null;

        return {
          tournamentId,
          standing,
          latestMatch,
        };
      })
      .filter((entry): entry is LiveTournamentHomeWatchedTournament => entry !== null);

    return {
      displayName: row.displayName,
      watch: row.watch,
      tournaments,
    };
  });

  return {
    watchlist,
    watchedPlayerDisplayNames,
    watchedPlayers,
  };
};

export async function getLiveTournamentHome(
  weekendId: string,
  userId?: string,
): Promise<LiveTournamentHomeDetail | null> {
  const weekend = (
    await db.select().from(tournamentWeekend).where(eq(tournamentWeekend.id, weekendId)).limit(1)
  )[0];

  if (!weekend) {
    return null;
  }

  const tournamentGroups = await db
    .select({
      weekendTournamentGroup: tournamentWeekendTournamentGroup,
      tournamentGroup: tournamentGroupTable,
      format: formatTable,
      meta: metaTable,
    })
    .from(tournamentWeekendTournamentGroup)
    .innerJoin(
      tournamentGroupTable,
      eq(tournamentWeekendTournamentGroup.tournamentGroupId, tournamentGroupTable.id),
    )
    .leftJoin(formatTable, eq(tournamentWeekendTournamentGroup.formatId, formatTable.id))
    .leftJoin(metaTable, eq(tournamentWeekendTournamentGroup.metaId, metaTable.id))
    .where(eq(tournamentWeekendTournamentGroup.tournamentWeekendId, weekendId))
    .orderBy(asc(tournamentGroupTable.position), asc(tournamentGroupTable.name));

  const tournamentGroupIds = tournamentGroups.map(row => row.tournamentGroup.id);
  const tournamentGroupLeaderBase =
    tournamentGroupIds.length > 0
      ? await db
          .select()
          .from(tournamentGroupLeaderBaseTable)
          .where(inArray(tournamentGroupLeaderBaseTable.tournamentGroupId, tournamentGroupIds))
      : [];
  const leaderBaseByTournamentGroupId = groupBy(
    tournamentGroupLeaderBase,
    row => row.tournamentGroupId,
  );

  const tournaments = await db
    .select({
      weekendTournament: tournamentWeekendTournament,
      tournament: tournamentTable,
      tournamentType: tournamentTypeTable,
      winningDeck: sql<LiveTournamentWinningDeck | null>`
        (
          SELECT jsonb_build_object(
            'tournamentDeck', jsonb_snake_to_camel(to_jsonb(td.*)),
            'deck', jsonb_snake_to_camel(to_jsonb(d.*))
          )
          FROM ${tournamentDeckTable} td
          LEFT JOIN ${deckTable} d ON td.deck_id = d.id
          WHERE td.tournament_id = ${tournamentTable.id}
          AND td.placement = 1
          LIMIT 1
        )
      `,
    })
    .from(tournamentWeekendTournament)
    .innerJoin(tournamentTable, eq(tournamentWeekendTournament.tournamentId, tournamentTable.id))
    .innerJoin(tournamentTypeTable, eq(tournamentTable.type, tournamentTypeTable.id))
    .where(eq(tournamentWeekendTournament.tournamentWeekendId, weekendId))
    .orderBy(asc(tournamentTable.date), asc(tournamentTable.name));

  const tournamentIds = tournaments.map(row => row.tournament.id);

  const resources =
    tournamentIds.length > 0
      ? await db
          .select()
          .from(tournamentWeekendResource)
          .where(
            and(
              inArray(tournamentWeekendResource.tournamentId, tournamentIds),
              eq(tournamentWeekendResource.approved, true),
            ),
          )
          .orderBy(asc(tournamentWeekendResource.createdAt))
      : [];

  const maxStandingRounds =
    tournamentIds.length > 0
      ? await db
          .select({
            tournamentId: tournamentStandingTable.tournamentId,
            roundNumber: sql<number | null>`MAX(${tournamentStandingTable.roundNumber})`,
          })
          .from(tournamentStandingTable)
          .where(inArray(tournamentStandingTable.tournamentId, tournamentIds))
          .groupBy(tournamentStandingTable.tournamentId)
      : [];
  const maxStandingRoundByTournament = new Map(
    maxStandingRounds.map(row => [
      row.tournamentId,
      row.roundNumber === null ? null : Number(row.roundNumber),
    ]),
  );
  const displayRoundByTournament = new Map(
    tournaments.map(row => [
      row.tournament.id,
      row.weekendTournament.roundNumber ??
        maxStandingRoundByTournament.get(row.tournament.id) ??
        null,
    ]),
  );

  const currentStandings = await selectCurrentStandings(displayRoundByTournament);
  const currentStandingsByTournamentId = groupBy(currentStandings, row => row.tournamentId);
  const bracketMatchCountByTournamentId = await selectBracketMatchCounts(tournaments);
  const watchedData = await selectWatchedPlayers(userId, tournamentIds, currentStandings);

  return {
    weekend,
    tournamentGroups: tournamentGroups.map(row => ({
      ...row,
      leaderBase: leaderBaseByTournamentGroupId.get(row.tournamentGroup.id) ?? [],
    })),
    tournaments: tournaments.map(row => {
      const standings = currentStandingsByTournamentId.get(row.tournament.id) ?? [];
      const displayRound = displayRoundByTournament.get(row.tournament.id) ?? null;
      const championStanding = standings.find(standing => standing.rank === 1) ?? null;
      const undefeatedPlayers =
        displayRound !== null && displayRound >= 4
          ? standings.filter(standing => getMatchLosses(standing.matchRecord) === 0)
          : [];

      return {
        weekendTournament: {
          tournamentWeekendId: row.weekendTournament.tournamentWeekendId,
          tournamentId: row.weekendTournament.tournamentId,
          status: row.weekendTournament.status,
          hasDecklists: row.weekendTournament.hasDecklists,
          additionalData: row.weekendTournament.additionalData,
          roundNumber: row.weekendTournament.roundNumber,
          roundName: row.weekendTournament.roundName,
          matchesTotal: row.weekendTournament.matchesTotal,
          matchesRemaining: row.weekendTournament.matchesRemaining,
          exactStart: row.weekendTournament.exactStart,
          lastUpdatedAt: row.weekendTournament.lastUpdatedAt,
          isLiveCheckEnabled: row.weekendTournament.isLiveCheckEnabled,
        },
        tournament: mapTournament(row.tournament),
        tournamentType: row.tournamentType,
        winningDeck: row.winningDeck,
        championStanding,
        undefeatedPlayers,
        hasBracketMatches: (bracketMatchCountByTournamentId.get(row.tournament.id) ?? 0) > 0,
      };
    }),
    resources,
    watchlist: watchedData.watchlist,
    watchedPlayerDisplayNames: watchedData.watchedPlayerDisplayNames,
    watchedPlayers: watchedData.watchedPlayers,
  };
}

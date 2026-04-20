import { and, asc, eq, inArray, sql } from 'drizzle-orm';
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
  player as playerTable,
  playerWatch as playerWatchTable,
  tournamentStanding as tournamentStandingTable,
  tournamentWeekend,
  tournamentWeekendMatch,
  tournamentWeekendPlayer,
  tournamentWeekendResource,
  tournamentWeekendTournament,
  tournamentWeekendTournamentGroup,
} from '../../db/schema/tournament_weekend.ts';

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

export type TournamentWeekendDetailOptions = {
  includeUnapprovedResources?: boolean;
};

export async function getTournamentWeekendDetail(
  weekendId: string,
  userId?: string,
  options: TournamentWeekendDetailOptions = {},
) {
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
      meta: metaTable,
      winningDeck: sql`
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
    .leftJoin(metaTable, eq(tournamentTable.meta, metaTable.id))
    .where(eq(tournamentWeekendTournament.tournamentWeekendId, weekendId))
    .orderBy(asc(tournamentTable.date), asc(tournamentTable.name));

  const tournamentIds = tournaments.map(row => row.tournament.id);

  const resources =
    tournamentIds.length > 0
      ? await db
          .select()
          .from(tournamentWeekendResource)
          .where(
            options.includeUnapprovedResources
              ? inArray(tournamentWeekendResource.tournamentId, tournamentIds)
              : and(
                  inArray(tournamentWeekendResource.tournamentId, tournamentIds),
                  eq(tournamentWeekendResource.approved, true),
                ),
          )
          .orderBy(asc(tournamentWeekendResource.createdAt))
      : [];

  const allStandings =
    tournamentIds.length > 0
      ? await db
          .select({
            standing: tournamentStandingTable,
            player: playerTable,
          })
          .from(tournamentStandingTable)
          .innerJoin(playerTable, eq(tournamentStandingTable.playerId, playerTable.id))
          .where(inArray(tournamentStandingTable.tournamentId, tournamentIds))
          .orderBy(
            asc(tournamentStandingTable.tournamentId),
            asc(tournamentStandingTable.roundNumber),
            asc(tournamentStandingTable.rank),
          )
      : [];

  const maxStandingRoundByTournament = new Map<string, number>();
  for (const row of allStandings) {
    const currentMax = maxStandingRoundByTournament.get(row.standing.tournamentId);
    if (currentMax === undefined || row.standing.roundNumber > currentMax) {
      maxStandingRoundByTournament.set(row.standing.tournamentId, row.standing.roundNumber);
    }
  }

  const displayRoundByTournament = new Map(
    tournaments.map(row => [
      row.tournament.id,
      row.weekendTournament.roundNumber ??
        maxStandingRoundByTournament.get(row.tournament.id) ??
        null,
    ]),
  );

  const standings = allStandings.filter(row => {
    const displayRound = displayRoundByTournament.get(row.standing.tournamentId);
    return displayRound === null || row.standing.roundNumber === displayRound;
  });

  const matches =
    tournamentIds.length > 0
      ? await db
          .select()
          .from(tournamentWeekendMatch)
          .where(inArray(tournamentWeekendMatch.tournamentId, tournamentIds))
          .orderBy(
            asc(tournamentWeekendMatch.tournamentId),
            asc(tournamentWeekendMatch.roundNumber),
            asc(tournamentWeekendMatch.matchKey),
          )
      : [];

  const tournamentPlayers =
    tournamentIds.length > 0
      ? await db
          .select({
            tournamentPlayer: tournamentWeekendPlayer,
            player: playerTable,
          })
          .from(tournamentWeekendPlayer)
          .innerJoin(playerTable, eq(tournamentWeekendPlayer.playerId, playerTable.id))
          .where(inArray(tournamentWeekendPlayer.tournamentId, tournamentIds))
          .orderBy(
            asc(tournamentWeekendPlayer.tournamentId),
            asc(playerTable.displayName),
            asc(tournamentWeekendPlayer.playerId),
          )
      : [];

  const matchPlayerIds = [
    ...new Set(
      matches.flatMap(match => [match.playerId1, match.playerId2]).filter(id => id !== null),
    ),
  ];

  const matchPlayers =
    matchPlayerIds.length > 0
      ? await db.select().from(playerTable).where(inArray(playerTable.id, matchPlayerIds))
      : [];

  const playersById = new Map(matchPlayers.map(player => [player.id, player]));
  for (const row of standings) {
    playersById.set(row.player.id, row.player);
  }
  for (const row of tournamentPlayers) {
    playersById.set(row.player.id, row.player);
  }

  const tournamentPlayerByKey = new Map(
    tournamentPlayers.map(row => [
      `${row.tournamentPlayer.tournamentId}:${row.tournamentPlayer.playerId}`,
      row.tournamentPlayer,
    ]),
  );
  const getTournamentPlayer = (tournamentId: string, playerId: number | null) =>
    playerId === null ? null : (tournamentPlayerByKey.get(`${tournamentId}:${playerId}`) ?? null);

  const matchesWithPlayers = matches.map(match => ({
    match,
    player1: playersById.get(match.playerId1) ?? null,
    player2: match.playerId2 ? (playersById.get(match.playerId2) ?? null) : null,
    tournamentPlayer1: getTournamentPlayer(match.tournamentId, match.playerId1),
    tournamentPlayer2: getTournamentPlayer(match.tournamentId, match.playerId2),
  }));

  const resourcesByTournamentId = groupBy(resources, resource => resource.tournamentId);
  const standingsByTournamentId = groupBy(standings, row => row.standing.tournamentId);
  const matchesByTournamentId = groupBy(matchesWithPlayers, row => row.match.tournamentId);
  const tournamentPlayersByTournamentId = groupBy(
    tournamentPlayers,
    row => row.tournamentPlayer.tournamentId,
  );

  const watchlist = userId
    ? await db
        .select({
          watch: playerWatchTable,
          player: playerTable,
        })
        .from(playerWatchTable)
        .innerJoin(playerTable, eq(playerWatchTable.playerId, playerTable.id))
        .where(eq(playerWatchTable.userId, userId))
        .orderBy(asc(playerTable.displayName))
    : [];

  const watchedPlayerIds = new Set(watchlist.map(row => row.player.id));
  const watchedPlayers = watchlist.map(row => ({
    ...row,
    standings: allStandings.filter(standing => standing.player.id === row.player.id),
    matches: matchesWithPlayers.filter(
      match => match.match.playerId1 === row.player.id || match.match.playerId2 === row.player.id,
    ),
    tournamentPlayers: tournamentPlayers.filter(
      tournamentPlayer => tournamentPlayer.player.id === row.player.id,
    ),
  }));

  return {
    weekend,
    tournamentGroups: tournamentGroups.map(row => ({
      ...row,
      leaderBase: leaderBaseByTournamentGroupId.get(row.tournamentGroup.id) ?? [],
    })),
    tournaments: tournaments.map(row => ({
      ...row,
      resources: resourcesByTournamentId.get(row.tournament.id) ?? [],
      standings: standingsByTournamentId.get(row.tournament.id) ?? [],
      matches: matchesByTournamentId.get(row.tournament.id) ?? [],
      players: tournamentPlayersByTournamentId.get(row.tournament.id) ?? [],
    })),
    resources,
    watchlist,
    watchedPlayerIds: [...watchedPlayerIds],
    watchedPlayers,
  };
}

import { db } from '../../../db';
import { and, desc, eq, getTableColumns, inArray } from 'drizzle-orm';
import { tournament } from '../../../db/schema/tournament.ts';
import { tournamentGroupTournament } from '../../../db/schema/tournament_group_tournament.ts';
import { tournamentDeck } from '../../../db/schema/tournament_deck.ts';
import { deck } from '../../../db/schema/deck.ts';
import {
  type DailySnapshotSectionData,
  type SectionRecentTournaments,
  type SectionRecentTournamentsItem,
} from '../../../../types/DailySnapshots.ts';
import { user } from '../../../db/schema/auth-schema.ts';

import type { TournamentGroupExtendedInfo } from '../../../../types/DailySnapshots.ts';

export const buildRecentTournamentsSection = async (
  groupExt?: TournamentGroupExtendedInfo | null,
): Promise<DailySnapshotSectionData<SectionRecentTournaments>> => {
  const tournamentGroupId = groupExt?.tournamentGroup.id ?? null;
  // If no group id, return empty payload to keep contract stable
  if (!tournamentGroupId) {
    const empty: SectionRecentTournaments = {
      tournamentGroupId: '',
      tournaments: [],
      tournamentGroupExt: groupExt ?? null,
    };
    return { id: 'recent-tournaments', title: 'Recent Tournaments', data: empty };
  }

  const tournamentColumns = getTableColumns(tournament);

  // 1) Get up to 5 most recently updated, imported tournaments from the 2-week group
  const recent = await db
    .select({
      ...tournamentColumns,
    })
    .from(tournament)
    .innerJoin(tournamentGroupTournament, eq(tournamentGroupTournament.tournamentId, tournament.id))
    .where(
      and(eq(tournamentGroupTournament.groupId, tournamentGroupId), eq(tournament.imported, true)),
    )
    .orderBy(desc(tournament.updatedAt))
    .limit(5);

  const tournamentIds = recent.map(r => r.id);

  let tdByTournamentId = new Map<
    string,
    { tournamentId: string; deckId: string } & {
      placement: number | null;
      topRelativeToPlayerCount: boolean;
      recordWin: number;
      recordLose: number;
      recordDraw: number;
      points: number;
      meleeDecklistGuid: string | null;
      meleePlayerUsername: string | null;
    }
  >();
  let deckById = new Map<
    string,
    {
      id: string;
      userId: string;
      format: number;
      name: string;
      description: string;
      leaderCardId1: string | null;
      leaderCardId2: string | null;
      baseCardId: string | null;
      public: boolean;
      createdAt: Date;
      updatedAt: Date;
    }
  >();

  if (tournamentIds.length > 0) {
    // 2) Fetch winning tournament_deck (placement = 1) for those tournaments
    const winningTDs = await db
      .select({
        tournamentId: tournamentDeck.tournamentId,
        deckId: tournamentDeck.deckId,
        placement: tournamentDeck.placement,
        topRelativeToPlayerCount: tournamentDeck.topRelativeToPlayerCount,
        recordWin: tournamentDeck.recordWin,
        recordLose: tournamentDeck.recordLose,
        recordDraw: tournamentDeck.recordDraw,
        points: tournamentDeck.points,
        meleeDecklistGuid: tournamentDeck.meleeDecklistGuid,
        meleePlayerUsername: tournamentDeck.meleePlayerUsername,
      })
      .from(tournamentDeck)
      .where(
        and(inArray(tournamentDeck.tournamentId, tournamentIds), eq(tournamentDeck.placement, 1)),
      );

    winningTDs.forEach(td => tdByTournamentId.set(td.tournamentId, td));

    const deckIds = winningTDs.map(td => td.deckId);

    if (deckIds.length > 0) {
      const decks = await db
        .select({
          id: deck.id,
          userId: deck.userId,
          format: deck.format,
          name: deck.name,
          description: deck.description,
          leaderCardId1: deck.leaderCardId1,
          leaderCardId2: deck.leaderCardId2,
          baseCardId: deck.baseCardId,
          public: deck.public,
          createdAt: deck.createdAt,
          updatedAt: deck.updatedAt,
        })
        .from(deck)
        .where(inArray(deck.id, deckIds));

      decks.forEach(d => deckById.set(d.id, d));
    }
  }

  // 3) Build result items
  const items: SectionRecentTournamentsItem[] = recent.map(t => {
    const td = tdByTournamentId.get(t.id) ?? null;
    const d = td ? (deckById.get(td.deckId) ?? null) : null;

    return {
      tournament: {
        id: t.id,
        userId: t.userId,
        type: t.type,
        location: t.location,
        continent: t.continent,
        name: t.name,
        meta: t.meta ?? 0,
        attendance: t.attendance,
        meleeId: t.meleeId ?? null,
        format: t.format,
        days: t.days,
        dayTwoPlayerCount: t.dayTwoPlayerCount ?? null,
        date: (t.date as unknown as Date).toISOString().slice(0, 10),
        createdAt: (t.createdAt as Date).toISOString(),
        updatedAt: (t.updatedAt as Date).toISOString(),
        imported: t.imported,
        bracketInfo: t.bracketInfo ?? undefined,
      },
      winningTournamentDeck: td
        ? {
            tournamentId: td.tournamentId,
            deckId: td.deckId,
            placement: td.placement,
            topRelativeToPlayerCount: td.topRelativeToPlayerCount,
            recordWin: td.recordWin,
            recordLose: td.recordLose,
            recordDraw: td.recordDraw,
            points: td.points,
            meleeDecklistGuid: td.meleeDecklistGuid ?? null,
            meleePlayerUsername: td.meleePlayerUsername ?? null,
          }
        : null,
      deck: d
        ? {
            id: d.id,
            userId: d.userId,
            format: d.format,
            name: d.name,
            description: d.description,
            leaderCardId1: d.leaderCardId1 ?? null,
            leaderCardId2: d.leaderCardId2 ?? null,
            baseCardId: d.baseCardId ?? null,
            public: d.public,
            createdAt: d.createdAt as Date,
            updatedAt: d.updatedAt as Date,
          }
        : null,
    };
  });

  const data: SectionRecentTournaments = {
    tournamentGroupId,
    tournaments: items,
    tournamentGroupExt: groupExt ?? null,
  };

  return { id: 'recent-tournaments', title: 'Recent Tournaments', data };
};

export default buildRecentTournamentsSection;

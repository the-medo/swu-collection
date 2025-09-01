import { db } from '../../../db';
import { and, desc, eq, getTableColumns, inArray } from 'drizzle-orm';
import { tournament } from '../../../db/schema/tournament.ts';
import { tournamentGroupTournament } from '../../../db/schema/tournament_group_tournament.ts';
import { type TournamentDeck, tournamentDeck } from '../../../db/schema/tournament_deck.ts';
import { deck } from '../../../db/schema/deck.ts';
import {
  type DailySnapshotSectionData,
  type SectionRecentTournaments,
  type SectionRecentTournamentsItem,
} from '../../../../types/DailySnapshots.ts';
import type { TournamentGroupExtendedInfo } from '../../../../types/DailySnapshots.ts';
import type { Deck } from '../../../../types/Deck.ts';

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

  // 1) Get all imported tournaments from the provided group (no limit)
  const groupTournaments = await db
    .select({
      ...tournamentColumns,
    })
    .from(tournament)
    .innerJoin(tournamentGroupTournament, eq(tournamentGroupTournament.tournamentId, tournament.id))
    .where(eq(tournamentGroupTournament.groupId, tournamentGroupId))
    .orderBy(desc(tournament.updatedAt));

  const groupTournamentIds = groupTournaments.map(t => t.id);

  // 2) For group tournaments: fetch ALL tournament_deck rows (all placements)
  let groupTDs: TournamentDeck[] = [];

  if (groupTournamentIds.length > 0) {
    groupTDs = await db
      .select()
      .from(tournamentDeck)
      .where(
        and(
          inArray(tournamentDeck.tournamentId, groupTournamentIds),
          eq(tournamentDeck.placement, 1),
        ),
      );
  }

  const groupDeckIds = Array.from(new Set(groupTDs.map(td => td.deckId)));

  // 3) Load Decks for group tournament decks
  const deckById = new Map<string, Deck>();

  if (groupDeckIds.length > 0) {
    const decksRes = await db.select().from(deck).where(inArray(deck.id, groupDeckIds));

    decksRes.forEach(d => deckById.set(d.id, d));
  }

  // 4) Also include tournaments of type SQ, RQ, GC from the last 50 days
  const now = new Date();
  const fiftyDaysAgo = new Date(now.getTime() - 50 * 24 * 60 * 60 * 1000);

  const majorTypes = ['sq', 'rq', 'gc'] as const;

  const majorsRecentAll = await db
    .select({
      ...tournamentColumns,
    })
    .from(tournament)
    .where(inArray(tournament.type, majorTypes as unknown as string[]))
    .orderBy(desc(tournament.updatedAt));

  // Filter to last 50 days in JS to avoid extra SQL helpers
  const majorsRecent = majorsRecentAll.filter(t => {
    const d = t.date as unknown as Date;
    return d >= fiftyDaysAgo;
  });

  // Exclude tournaments already in the group to avoid duplicates
  const groupIdSet = new Set(groupTournamentIds);
  const extraMajors = majorsRecent.filter(t => !groupIdSet.has(t.id));
  const extraMajorIds = extraMajors.map(t => t.id);

  // 5) For extra majors, fetch WINNING deck only
  const extraWinningTDs: TournamentDeck[] = extraMajorIds.length
    ? await db
        .select()
        .from(tournamentDeck)
        .where(
          and(inArray(tournamentDeck.tournamentId, extraMajorIds), eq(tournamentDeck.placement, 1)),
        )
    : [];

  const extraDeckIds = Array.from(new Set(extraWinningTDs.map(td => td.deckId)));

  if (extraDeckIds.length > 0) {
    const decksRes = await db.select().from(deck).where(inArray(deck.id, extraDeckIds));

    decksRes.forEach(d => deckById.set(d.id, d));
  }

  // Helper to convert a tournament row into TournamentStringDate
  const toTournamentStringDate = (t: any) => ({
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
  });

  // 6) Build result items
  const items: SectionRecentTournamentsItem[] = [];

  // a) All decks for group tournaments (one item per tournament_deck)
  const groupTournamentById = new Map(groupTournaments.map(t => [t.id, t] as const));
  for (const td of groupTDs) {
    const t = groupTournamentById.get(td.tournamentId);
    if (!t) continue;
    const d = deckById.get(td.deckId) ?? null;

    items.push({
      tournament: toTournamentStringDate(t),
      winningTournamentDeck: {
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
      },
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
    });
  }

  // b) Extra majors (SQ/RQ/GC last 50 days) with their winning deck
  const extraById = new Map(extraMajors.map(t => [t.id, t] as const));
  const extraWinningByTid = new Map(extraWinningTDs.map(td => [td.tournamentId, td] as const));

  for (const t of extraMajors) {
    const td = extraWinningByTid.get(t.id) ?? null;
    const d = td ? (deckById.get(td.deckId) ?? null) : null;

    items.push({
      tournament: toTournamentStringDate(t),
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
    });
  }

  // c) Add a random SQ tournament (for frontend testing)
  const randId = `random-sq-${Math.random().toString(36).slice(2, 10)}`;
  const nowISO = new Date().toISOString();
  const todayStr = new Date().toISOString().slice(0, 10);
  items.push({
    tournament: {
      id: randId,
      userId: 'system',
      type: 'sq',
      location: 'Test Location',
      continent: 'NA',
      name: 'Random SQ Test Tournament',
      meta: 0,
      attendance: 64,
      meleeId: null,
      format: 0,
      days: 1,
      dayTwoPlayerCount: null,
      date: todayStr,
      createdAt: nowISO,
      updatedAt: nowISO,
      imported: false,
      bracketInfo: undefined,
    },
    winningTournamentDeck: null,
    deck: null,
  });

  // Sort items by tournament.updatedAt desc
  items.sort((a, b) =>
    (b.tournament.updatedAt as string).localeCompare(a.tournament.updatedAt as string),
  );

  const data: SectionRecentTournaments = {
    tournamentGroupId,
    tournaments: items,
    tournamentGroupExt: groupExt ?? null,
  };

  return { id: 'recent-tournaments', title: 'Recent Tournaments', data };
};

export default buildRecentTournamentsSection;

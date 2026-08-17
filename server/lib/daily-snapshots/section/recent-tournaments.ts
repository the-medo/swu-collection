import { db } from '../../../db';
import { and, desc, eq, getTableColumns, gte, inArray, lte } from 'drizzle-orm';
import { tournament } from '../../../db/schema/tournament.ts';
import { tournamentGroupTournament } from '../../../db/schema/tournament_group_tournament.ts';
import { tournamentDeck } from '../../../db/schema/tournament_deck.ts';
import { deck, type Deck } from '../../../db/schema/deck.ts';
import { tournamentType as tournamentTypeTable } from '../../../db/schema/tournament_type.ts';
import {
  type DailySnapshotSectionData,
  type SectionRecentTournaments,
  type SectionRecentTournamentsItem,
} from '../../../../types/DailySnapshots.ts';
import { subDays } from 'date-fns';
import type { TournamentGroupExtendedInfo } from '../../../../types/DailySnapshots.ts';
import type { TournamentDeck } from '../../../db/schema/tournament_deck.ts';
import { dailySnapshotFeaturedTournamentTypes } from '../../../../types/Tournament.ts';
import { dailySnapshotAdditionalFormatIds } from '../../../../types/Format.ts';

export const buildRecentTournamentsSection = async (
  groupExt?: TournamentGroupExtendedInfo | null,
  dateInput?: Date | string,
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

  // 1) Get all Premier tournaments from the provided stats group (no limit)
  const groupTournaments = await db
    .select({
      ...tournamentColumns,
    })
    .from(tournament)
    .innerJoin(tournamentGroupTournament, eq(tournamentGroupTournament.tournamentId, tournament.id))
    .where(eq(tournamentGroupTournament.groupId, tournamentGroupId))
    .orderBy(desc(tournament.updatedAt));

  const snapshotDate = dateInput
    ? typeof dateInput === 'string'
      ? new Date(dateInput)
      : dateInput
    : new Date();
  const fourteenDaysAgo = subDays(snapshotDate, 14);
  const thirtyDaysAgo = subDays(snapshotDate, 30);

  // 2) Add Eternal and limited majors for the same recent window. These are display-only and are
  // intentionally not attached to the Premier tournament group used by statistical sections.
  const additionalFormatTournaments = await db
    .select({ ...tournamentColumns })
    .from(tournament)
    .innerJoin(tournamentTypeTable, eq(tournament.type, tournamentTypeTable.id))
    .where(
      and(
        eq(tournamentTypeTable.major, 1),
        inArray(tournament.format, dailySnapshotAdditionalFormatIds),
        gte(tournament.date, fourteenDaysAgo),
        lte(tournament.date, snapshotDate),
      ),
    )
    .orderBy(desc(tournament.updatedAt));

  // 3) Also include featured tournaments from the last 30 days, in any format.
  const majorTypes: string[] = [...dailySnapshotFeaturedTournamentTypes];
  const majorsRecent = await db
    .select()
    .from(tournament)
    .where(
      and(
        inArray(tournament.type, majorTypes),
        gte(tournament.date, thirtyDaysAgo),
        lte(tournament.date, snapshotDate),
      ),
    )
    .orderBy(desc(tournament.updatedAt));

  // 4) Merge the display-only sources without changing the Premier stats group.
  const tournamentById = new Map(
    [...groupTournaments, ...additionalFormatTournaments, ...majorsRecent].map(
      t => [t.id, t] as const,
    ),
  );
  const tournamentIds = [...tournamentById.keys()];

  // 5) Load each tournament's winning deck, when available.
  const winningTDs: TournamentDeck[] = tournamentIds.length
    ? await db
        .select()
        .from(tournamentDeck)
        .where(
          and(inArray(tournamentDeck.tournamentId, tournamentIds), eq(tournamentDeck.placement, 1)),
        )
    : [];
  const winningByTournamentId = new Map(winningTDs.map(td => [td.tournamentId, td] as const));
  const deckIds = [...new Set(winningTDs.map(td => td.deckId))];
  const decks = deckIds.length ? await db.select().from(deck).where(inArray(deck.id, deckIds)) : [];
  const deckById = new Map<string, Deck>();
  decks.forEach(d => deckById.set(d.id, d));

  // 6) Build one result item per tournament, including tournaments whose data is not imported yet.
  const items: SectionRecentTournamentsItem[] = [...tournamentById.values()].map(t => {
    const td = winningByTournamentId.get(t.id) ?? null;
    const d = td ? (deckById.get(td.deckId) ?? null) : null;
    return {
      tournament: t,
      winningTournamentDeck: td,
      deck: d,
    } as unknown as SectionRecentTournamentsItem;
  });

  // Sort items by tournament.updatedAt desc
  items.sort((a, b) => (b.tournament.updatedAt < a.tournament.updatedAt ? -1 : 1));

  const data: SectionRecentTournaments = {
    tournamentGroupId,
    tournaments: items,
    tournamentGroupExt: groupExt ?? null,
  };

  return { id: 'recent-tournaments', title: 'Recent Tournaments', data };
};

export default buildRecentTournamentsSection;

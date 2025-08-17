import { db } from '../../../db';
import { and, desc, eq, sql } from 'drizzle-orm';
import { cardStatTournamentGroup } from '../../../db/schema/card_stats_tournament_group_schema.ts';
import type {
  DailySnapshotSectionData,
  SectionMostPlayedCards,
  SectionMostPlayedCardsItem,
} from '../../../../types/DailySnapshots.ts';

const SECTION_ID = 'most-played-cards';
const SECTION_TITLE = 'Most played cards (last 2 weeks)';

const buildEmpty = (tournamentGroupId: string | null): DailySnapshotSectionData<SectionMostPlayedCards> => ({
  id: SECTION_ID,
  title: SECTION_TITLE,
  data: {
    tournamentGroupId: tournamentGroupId ?? '',
    dataPoints: [],
  },
});

export default async function buildMostPlayedCardsSection(
  tournamentGroupId: string | null,
): Promise<DailySnapshotSectionData<SectionMostPlayedCards>> {
  if (!tournamentGroupId) return buildEmpty(tournamentGroupId);

  try {
    const rows = await db
      .select({
        cardId: cardStatTournamentGroup.cardId,
        deckCount: cardStatTournamentGroup.deckCount,
        countMd: cardStatTournamentGroup.countMd,
        countSb: cardStatTournamentGroup.countSb,
      })
      .from(cardStatTournamentGroup)
      .where(eq(cardStatTournamentGroup.tournamentGroupId, tournamentGroupId))
      .orderBy(desc(cardStatTournamentGroup.deckCount), cardStatTournamentGroup.cardId)
      .limit(5);

    const dataPoints: SectionMostPlayedCardsItem[] = rows.map(r => ({
      cardId: r.cardId,
      deckCount: r.deckCount ?? 0,
      countMd: r.countMd ?? 0,
      countSb: r.countSb ?? 0,
    }));

    return {
      id: SECTION_ID,
      title: SECTION_TITLE,
      data: {
        tournamentGroupId,
        dataPoints,
      },
    };
  } catch (e) {
    // On any failure, return empty dataset to keep snapshot flow resilient
    return buildEmpty(tournamentGroupId);
  }
}

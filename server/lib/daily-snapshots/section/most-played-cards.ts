import { db } from '../../../db';
import { and, desc, eq, sql } from 'drizzle-orm';
import { cardStatTournamentGroup } from '../../../db/schema/card_stats_tournament_group_schema.ts';
import type {
  DailySnapshotSectionData,
  SectionMostPlayedCards,
  SectionMostPlayedCardsItem,
  TournamentGroupExtendedInfo,
} from '../../../../types/DailySnapshots.ts';

const SECTION_ID = 'most-played-cards';
const SECTION_TITLE = 'Cards in most decks (last 2 weeks)';

const buildEmpty = (
  groupExt: TournamentGroupExtendedInfo | null,
): DailySnapshotSectionData<SectionMostPlayedCards> => ({
  id: SECTION_ID,
  title: SECTION_TITLE,
  data: {
    tournamentGroupId: groupExt?.tournamentGroup.id ?? '',
    dataPoints: [],
    tournamentGroupExt: groupExt ?? null,
  },
});

export default async function buildMostPlayedCardsSection(
  groupExt: TournamentGroupExtendedInfo | null,
): Promise<DailySnapshotSectionData<SectionMostPlayedCards>> {
  const tournamentGroupId = groupExt?.tournamentGroup.id ?? null;
  if (!tournamentGroupId) return buildEmpty(groupExt);

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
        tournamentGroupExt: groupExt ?? null,
      },
    };
  } catch (e) {
    // On any failure, return empty dataset to keep snapshot flow resilient
    return buildEmpty(tournamentGroupId);
  }
}

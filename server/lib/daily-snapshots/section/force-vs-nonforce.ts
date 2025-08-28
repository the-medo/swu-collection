import { db } from '../../../db';
import { eq, sql } from 'drizzle-orm';
import type {
  DailySnapshotSectionData,
  SectionForceVsNonForceCounts,
  TournamentGroupExtendedInfo,
} from '../../../../types/DailySnapshots.ts';
import { tournamentGroupLeaderBase } from '../../../db/schema/tournament_group_leader_base.ts';
import { baseSpecialNames } from '../../../../shared/lib/basicBases.ts';

const SECTION_ID = 'force-vs-nonforce';
const SECTION_TITLE = 'Force vs Non-Force';

const FORCE_BASE_EXCEPTIONS = new Set<string>([
  'mystic-monastery',
  'temple-of-destruction',
  'tomb-of-eilram',
  'vergence-temple',
]);

const isForceBase = (baseId: string | null | undefined): boolean => {
  if (!baseId) return false;
  if (baseSpecialNames[baseId]?.endsWith('-Force')) return true;
  return FORCE_BASE_EXCEPTIONS.has(baseId);
};

async function countForGroup(
  tournamentGroupId: string | null | undefined,
): Promise<{ force: number; nonforce: number }> {
  if (!tournamentGroupId) return { force: 0, nonforce: 0 };

  try {
    const rows = await db
      .select({
        baseCardId: tournamentGroupLeaderBase.baseCardId,
        // SUM returns bigint in Postgres; driver may return it as string. We'll coerce in JS below.
        decks: sql<number>`sum(${tournamentGroupLeaderBase.total})`,
      })
      .from(tournamentGroupLeaderBase)
      .where(eq(tournamentGroupLeaderBase.tournamentGroupId, tournamentGroupId))
      .groupBy(tournamentGroupLeaderBase.baseCardId);

    let force = 0;
    let nonforce = 0;

    for (const r of rows) {
      const count = typeof r.decks === 'number' ? r.decks : Number((r as any).decks ?? 0);
      if (!r.baseCardId) continue;
      if (isForceBase(r.baseCardId)) force += count;
      else if (r.baseCardId !== '') nonforce += count;
    }

    return { force, nonforce };
  } catch (e) {
    // Resilient: return zeros on any error
    return { force: 0, nonforce: 0 };
  }
}

export default async function buildForceVsNonForceSection(
  twoWeeksExt: TournamentGroupExtendedInfo | null,
  week1Ext: TournamentGroupExtendedInfo | null,
  week2Ext: TournamentGroupExtendedInfo | null,
): Promise<DailySnapshotSectionData<SectionForceVsNonForceCounts>> {
  const twoWeeks = await countForGroup(twoWeeksExt?.tournamentGroup.id);
  const week1 = await countForGroup(week1Ext?.tournamentGroup.id);
  const week2 = await countForGroup(week2Ext?.tournamentGroup.id);

  return {
    id: SECTION_ID,
    title: SECTION_TITLE,
    data: { twoWeeks, week1, week2 },
  };
}

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
): Promise<{ total: { force: number; nonforce: number }; top8: { force: number; nonforce: number }; champions: { force: number; nonforce: number } }> {
  if (!tournamentGroupId)
    return {
      total: { force: 0, nonforce: 0 },
      top8: { force: 0, nonforce: 0 },
      champions: { force: 0, nonforce: 0 },
    };

  try {
    const rows = await db
      .select({
        baseCardId: tournamentGroupLeaderBase.baseCardId,
        // SUM returns bigint in Postgres; driver may return it as string. We'll coerce in JS below.
        totalSum: sql<number>`sum(${tournamentGroupLeaderBase.total})`,
        top8Sum: sql<number>`sum(${tournamentGroupLeaderBase.top8})`,
        winnersSum: sql<number>`sum(${tournamentGroupLeaderBase.winner})`,
      })
      .from(tournamentGroupLeaderBase)
      .where(eq(tournamentGroupLeaderBase.tournamentGroupId, tournamentGroupId))
      .groupBy(tournamentGroupLeaderBase.baseCardId);

    const result = {
      total: { force: 0, nonforce: 0 },
      top8: { force: 0, nonforce: 0 },
      champions: { force: 0, nonforce: 0 },
    };

    for (const r of rows as any[]) {
      const total = typeof r.totalSum === 'number' ? r.totalSum : Number(r.totalSum ?? 0);
      const top8 = typeof r.top8Sum === 'number' ? r.top8Sum : Number(r.top8Sum ?? 0);
      const winners = typeof r.winnersSum === 'number' ? r.winnersSum : Number(r.winnersSum ?? 0);
      const baseId: string | null | undefined = r.baseCardId;
      if (!baseId || baseId === '') continue;
      const target = isForceBase(baseId) ? 'force' : 'nonforce' as const;
      result.total[target] += total;
      result.top8[target] += top8;
      result.champions[target] += winners;
    }

    return result;
  } catch (e) {
    // Resilient: return zeros on any error
    return {
      total: { force: 0, nonforce: 0 },
      top8: { force: 0, nonforce: 0 },
      champions: { force: 0, nonforce: 0 },
    };
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
    data: {
      twoWeeks,
      week1,
      week2,
      twoWeeksGroupExt: twoWeeksExt ?? null,
      week1GroupExt: week1Ext ?? null,
      week2GroupExt: week2Ext ?? null,
    },
  };
}

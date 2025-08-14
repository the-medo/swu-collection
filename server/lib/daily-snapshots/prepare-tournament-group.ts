import { db } from '../../db';
import { meta } from '../../db/schema/meta';
import { format as formatTable } from '../../db/schema/format';
import { tournament } from '../../db/schema/tournament';
import { tournamentGroup } from '../../db/schema/tournament_group';
import { tournamentGroupTournament } from '../../db/schema/tournament_group_tournament';
import { and, desc, eq, gte, lte } from 'drizzle-orm';
import { isWeekend, subDays, startOfWeek, isMonday, format as formatDate } from 'date-fns';
import { updateTournamentGroupStatistics } from '../card-statistics/update-tournament-group-statistics';

export type SnapshotContext = {
  // YYYY-MM-DD string for the snapshot date
  date: string;
  // Optional tournament group id for which the snapshot is prepared
  tournamentGroupId: string | null;
};

export const prepareTournamentGroup = async (): Promise<SnapshotContext> => {
  // Today and date-only string
  const now = new Date();
  const dateOnly = now.toISOString().slice(0, 10);

  // 1) Get current meta ID from Meta table, with format called 'Premier'
  let premierFormatId: number | null = null;
  try {
    const fmt = (
      await db.select().from(formatTable).where(eq(formatTable.name, 'Premier')).limit(1)
    )[0];
    if (fmt?.id != null) {
      premierFormatId = fmt.id as number;
    }
  } catch (e) {
    // No-op: fallback handled below
  }

  // Fallback if not found (meta.format = 1 used for Premier)
  if (premierFormatId == null) premierFormatId = 1;

  let currentMetaId: number | null = null;
  try {
    const latestPremierMeta = (
      await db
        .select()
        .from(meta)
        .where(eq(meta.format, premierFormatId))
        .orderBy(desc(meta.date))
        .limit(1)
    )[0];
    if (latestPremierMeta?.id != null) {
      currentMetaId = latestPremierMeta.id as number;
    }
  } catch (e) {
    // Leave currentMetaId as null if any error
  }

  // 2) Compute dates of current TG of last 2 weeks using date-fns
  // Rule:
  // - if date is Sat or Sun -> base = DATE-7 days
  // - else -> base = DATE-14 days
  const base = subDays(now, isWeekend(now) ? 7 : 14);
  // Monday strictly before base
  const startOfWeekMonday = startOfWeek(base, { weekStartsOn: 1 });
  const startMonday = isMonday(base) ? subDays(startOfWeekMonday, 7) : startOfWeekMonday;
  const dateFrom = formatDate(startMonday, 'yyyy-MM-dd');

  // From found start date (monday), make a TG name
  const tournamentGroupName = `Two week snapshot ${dateFrom}`;

  // If we failed to resolve meta, we can't proceed with grouping
  if (currentMetaId == null) {
    return { date: dateOnly, tournamentGroupId: null };
  }

  // 3) Ensure tournament_group exists for this name & meta; create if missing
  let groupId: string | null = null;
  try {
    const existing = (
      await db
        .select({ id: tournamentGroup.id })
        .from(tournamentGroup)
        .where(and(eq(tournamentGroup.name, tournamentGroupName), eq(tournamentGroup.metaId, currentMetaId)))
        .limit(1)
    )[0];

    if (existing?.id) {
      groupId = existing.id;
    } else {
      const inserted = (
        await db
          .insert(tournamentGroup)
          .values({
            name: tournamentGroupName,
            metaId: currentMetaId,
            position: 0,
            description: null,
            visible: false,
          })
          .returning({ id: tournamentGroup.id })
      )[0];
      groupId = inserted?.id ?? null;
    }
  } catch (e) {
    // If something went wrong, bail out returning minimal context
    return { date: dateOnly, tournamentGroupId: null };
  }

  if (!groupId) {
    return { date: dateOnly, tournamentGroupId: null };
  }

  // 4) Insert tournaments of given meta between dateFrom and dateOnly into join table
  try {
    const tourneys = await db
      .select({ id: tournament.id })
      .from(tournament)
      .where(
        and(
          eq(tournament.meta, currentMetaId),
          gte(tournament.date, new Date(dateFrom)),
          lte(tournament.date, new Date(dateOnly)),
        ),
      );

    if (tourneys.length > 0) {
      const values = tourneys.map(t => ({
        tournamentId: t.id,
        groupId: groupId,
        position: 0,
      }));

      await db
        .insert(tournamentGroupTournament)
        .values(values)
        .onConflictDoNothing({
          target: [tournamentGroupTournament.tournamentId, tournamentGroupTournament.groupId],
        });
    }
  } catch (e) {
    // Ignore failures for insert; the group was created anyway
  }

  // 5) Recompute statistics for this tournament group
  try {
    await updateTournamentGroupStatistics(groupId!);
  } catch (e) {
    // Stats recomputation failures shouldn't break snapshot preparation
  }

  return {
    date: dateOnly,
    tournamentGroupId: groupId,
  };
};

export default prepareTournamentGroup;

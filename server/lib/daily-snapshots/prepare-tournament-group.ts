import { db } from '../../db';
import { meta } from '../../db/schema/meta';
import { format as formatTable } from '../../db/schema/format';
import { tournament } from '../../db/schema/tournament';
import { tournamentGroup } from '../../db/schema/tournament_group';
import { tournamentGroupTournament } from '../../db/schema/tournament_group_tournament';
import { tournamentType as tournamentTypeTable } from '../../db/schema/tournament_type.ts';
import { and, desc, eq, gte, lte } from 'drizzle-orm';
import { isWeekend, subDays, startOfWeek, isMonday, format as formatDate, addDays } from 'date-fns';
import { updateTournamentGroupStatistics } from '../card-statistics/update-tournament-group-statistics';

export type SnapshotContext = {
  // YYYY-MM-DD string for the snapshot date
  date: string;
  // Explicit IDs for all prepared groups
  tournamentGroupIdTwoWeeks: string | null;
  tournamentGroupIdWeek1: string | null; // most recent weekend
  tournamentGroupIdWeek2: string | null; // previous weekend
  upcomingWeekTournamentGroupId: string | null; // current or upcoming weekend, per spec
};

// Helper to create or update a tournament group for a given meta and date range
const upsertTournamentGroupForRange = async (
  metaId: number,
  dateFromInput: Date | string,
  dateToInput?: Date | string,
): Promise<string | null> => {
  const fromDate = typeof dateFromInput === 'string' ? new Date(dateFromInput) : dateFromInput;
  const toDate = dateToInput
    ? typeof dateToInput === 'string'
      ? new Date(dateToInput)
      : dateToInput
    : addDays(fromDate, 1); // weekend snapshot spans 2 days if dateTo not provided

  // Build group name
  let tournamentGroupName: string;
  if (dateToInput) {
    tournamentGroupName = `Two week snapshot from ${formatDate(fromDate, 'yyyy-MM-dd')}`;
  } else {
    const sameMonthAndYear =
      fromDate.getFullYear() === toDate.getFullYear() && fromDate.getMonth() === toDate.getMonth();
    const weekendLabel = sameMonthAndYear
      ? `${formatDate(fromDate, 'd')}-${formatDate(toDate, 'do MMMM')}`
      : `${formatDate(fromDate, 'do MMMM')} - ${formatDate(toDate, 'do MMMM')}`;
    tournamentGroupName = `Weekend ${weekendLabel}`;
  }

  // Ensure tournament_group exists
  let groupId: string | null = null;
  try {
    const existing = (
      await db
        .select({ id: tournamentGroup.id })
        .from(tournamentGroup)
        .where(
          and(eq(tournamentGroup.name, tournamentGroupName), eq(tournamentGroup.metaId, metaId)),
        )
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
            metaId,
            position: 0,
            description: null,
            visible: false,
          })
          .returning({ id: tournamentGroup.id })
      )[0];
      groupId = inserted?.id ?? null;
    }
  } catch (e) {
    return null;
  }

  if (!groupId) return null;

  // Insert tournaments for meta in [fromDate, toDate] and with major type
  try {
    const tourneys = await db
      .select({ id: tournament.id })
      .from(tournament)
      .innerJoin(tournamentTypeTable, eq(tournament.type, tournamentTypeTable.id))
      .where(
        and(
          eq(tournament.meta, metaId),
          eq(tournamentTypeTable.major, 1),
          gte(tournament.date, new Date(formatDate(fromDate, 'yyyy-MM-dd'))),
          lte(tournament.date, new Date(formatDate(toDate, 'yyyy-MM-dd'))),
        ),
      );

    if (tourneys.length > 0) {
      const values = tourneys.map(t => ({ tournamentId: t.id, groupId, position: 0 }));

      await db
        .insert(tournamentGroupTournament)
        .values(values)
        .onConflictDoNothing({
          target: [tournamentGroupTournament.tournamentId, tournamentGroupTournament.groupId],
        });
    }
  } catch (e) {
    // ignore insert failures
  }

  // Update stats
  try {
    await updateTournamentGroupStatistics(groupId);
  } catch (e) {
    // ignore stats failures
  }

  return groupId;
};

export const prepareTournamentGroup = async (
  dateInput?: Date | string,
): Promise<SnapshotContext> => {
  // Today and date-only string (can be overridden by dateInput)
  const now = dateInput
    ? typeof dateInput === 'string'
      ? new Date(dateInput)
      : dateInput
    : new Date();
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

  if (currentMetaId == null) {
    return {
      date: dateOnly,
      tournamentGroupIdTwoWeeks: null,
      tournamentGroupIdWeek1: null,
      tournamentGroupIdWeek2: null,
      upcomingWeekTournamentGroupId: null,
    };
  }

  // 2) Compute dates of current TG of last 2 weeks using date-fns
  // Rule:
  // - if date is Sat or Sun -> base = DATE-7 days
  // - else -> base = DATE-14 days
  console.log('Now: ', now);
  console.log('Is weekend: ', isWeekend(now));
  const base = subDays(now, isWeekend(now) || isMonday(now) ? 7 : 14);
  console.log('Base: ', base);
  // Monday strictly before base
  const startOfWeekMonday = startOfWeek(base, { weekStartsOn: 1 });
  const startMonday = isMonday(base) ? subDays(startOfWeekMonday, 7) : startOfWeekMonday;
  console.log('startOfWeekMonday: ', startOfWeekMonday);
  console.log('startMonday: ', startMonday);

  // Create two week snapshot group
  const twoWeekGroupId = await upsertTournamentGroupForRange(
    currentMetaId,
    startMonday,
    new Date(dateOnly),
  );

  // Determine two weekend snapshots within the same timeframe
  // Find the most recent Saturday within [startMonday, now]
  const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });
  let recentSaturday = addDays(currentWeekStart, 5);
  if (recentSaturday > now) {
    recentSaturday = addDays(recentSaturday, -7);
  }
  if (recentSaturday < startMonday) {
    recentSaturday = addDays(startMonday, 5); // fallback to first Saturday in the window
  }
  const previousSaturday = addDays(recentSaturday, -7);

  // Weekend snapshot 1 (most recent)
  const weekend2GroupId = await upsertTournamentGroupForRange(currentMetaId, recentSaturday);
  // Weekend snapshot 2 (previous)
  let weekend1GroupId: string | null = null;
  if (previousSaturday >= startMonday) {
    weekend1GroupId = await upsertTournamentGroupForRange(currentMetaId, previousSaturday);
  }

  // Determine upcoming (or current) weekend group id per spec
  let upcomingWeekTournamentGroupId: string | null = null;
  if (isWeekend(now)) {
    // If it is a weekend now, reuse the most recent weekend group
    upcomingWeekTournamentGroupId = weekend2GroupId ?? null;
  } else {
    // Not a weekend: prepare upcoming weekend group (next Saturday)
    let nextSaturday = addDays(currentWeekStart, 5);
    if (nextSaturday <= now) {
      nextSaturday = addDays(nextSaturday, 7);
    }
    upcomingWeekTournamentGroupId = await upsertTournamentGroupForRange(
      currentMetaId,
      nextSaturday,
    );
  }

  return {
    date: dateOnly,
    tournamentGroupIdTwoWeeks: twoWeekGroupId ?? null,
    tournamentGroupIdWeek1: weekend1GroupId ?? null,
    tournamentGroupIdWeek2: weekend2GroupId ?? null,
    upcomingWeekTournamentGroupId: upcomingWeekTournamentGroupId ?? null,
  };
};

export default prepareTournamentGroup;

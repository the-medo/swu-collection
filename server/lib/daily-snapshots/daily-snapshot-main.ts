import prepareTournamentGroup from './prepare-tournament-group.ts';
import buildWeeklyChangeSection from './section/weekly-change.ts';
import buildMetaShare2WeeksSection from './section/meta-share-2-weeks.ts';
import buildRecentTournamentsSection from './section/recent-tournaments.ts';
import buildUpcomingTournamentsSection from './section/upcoming-tournaments.ts';
import buildMostPlayedCardsSection from './section/most-played-cards.ts';
import {
  type DailySnapshotSectionData,
  type SectionWeeklyChange,
  type SectionMetaShare2Weeks,
  type SectionRecentTournaments,
  type SectionUpcomingTournaments,
  type SectionMostPlayedCards,
} from '../../../types/DailySnapshots.ts';
import { db } from '../../db';
import { dailySnapshot, dailySnapshotSection } from '../../db/schema/daily_snapshot.ts';

export type SectionResult<T> = {
  name: string;
  ok: boolean;
  error?: string;
  payload?: DailySnapshotSectionData<T>;
};

export type DailySnapshotRunResult = {
  date: string;
  tournamentGroupId: string | null;
  sections: Array<
    | SectionResult<SectionWeeklyChange>
    | SectionResult<SectionMetaShare2Weeks>
    | SectionResult<SectionRecentTournaments>
    | SectionResult<SectionUpcomingTournaments>
    | SectionResult<SectionMostPlayedCards>
  >;
};

export const runDailySnapshot = async (
  dateInput?: Date | string,
): Promise<DailySnapshotRunResult> => {
  const context = await prepareTournamentGroup(dateInput);
  console.log(`[daily-snapshot] Preparing for date=${context.date}`);
  console.log(`[daily-snapshot] Two week tgid=${context.tournamentGroupIdTwoWeeks ?? 'none'}`);
  console.log(`[daily-snapshot] Weekend1 tgid=${context.tournamentGroupIdWeek1 ?? 'none'}`);
  console.log(`[daily-snapshot] Weekend2 tgid=${context.tournamentGroupIdWeek2 ?? 'none'}`);
  console.log(`[daily-snapshot] UpcomingWeekend tgid=${context.upcomingWeekTournamentGroupId ?? 'none'}`);

  const results: DailySnapshotRunResult = {
    date: context.date,
    tournamentGroupId: context.tournamentGroupIdTwoWeeks,
    sections: [],
  };

  // Define execution order
  const steps: Array<{
    name: string;
    exec: () => Promise<DailySnapshotSectionData<any>>;
  }> = [
    { name: 'weekly-change', exec: () => buildWeeklyChangeSection(context.tournamentGroupIdWeek1, context.tournamentGroupIdWeek2) },
    {
      name: 'meta-share-2-weeks',
      exec: () => buildMetaShare2WeeksSection(context.tournamentGroupIdTwoWeeks),
    },
    {
      name: 'most-played-cards',
      exec: () => buildMostPlayedCardsSection(context.tournamentGroupIdTwoWeeks),
    },
    {
      name: 'recent-tournaments',
      exec: () => buildRecentTournamentsSection(context.tournamentGroupIdTwoWeeks),
    },
    {
      name: 'upcoming-tournaments',
      exec: () => buildUpcomingTournamentsSection(context.upcomingWeekTournamentGroupId),
    },
  ];

  for (const step of steps) {
    try {
      const payload = await step.exec();
      const ok = Boolean(payload && payload.id && payload.title && payload.data !== undefined);
      if (ok) {
        console.log(`[daily-snapshot] Section '${step.name}' succeeded`);
      } else {
        console.warn(`[daily-snapshot] Section '${step.name}' returned invalid payload shape`);
      }
      results.sections.push({ name: step.name, ok, payload });
    } catch (err: any) {
      console.error(`[daily-snapshot] Section '${step.name}' failed:`, err?.message ?? err);
      results.sections.push({ name: step.name, ok: false, error: String(err?.message ?? err) });
    }
  }

  console.log(
    '[daily-snapshot] Finished with summary:',
    results.sections.map(s => `${s.name}:${s.ok ? 'OK' : 'FAIL'}`).join(', '),
  );

  await saveDailySnapshotResults(results);

  return results;
};

/**
 * Saves the results of runDailySnapshot into the database.
 * - Upserts daily_snapshot (by date)
 * - Upserts daily_snapshot_section (by date, section) for successful sections
 */
export const saveDailySnapshotResults = async (
  results: DailySnapshotRunResult,
): Promise<{ date: string; savedSections: number }> => {
  const now = new Date();

  // Upsert daily_snapshot
  await db
    .insert(dailySnapshot)
    .values({
      date: results.date as unknown as any, // schema uses 'date' type, but we provide ISO string; DB will cast
      tournamentGroupId: results.tournamentGroupId ?? null,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: dailySnapshot.date,
      set: {
        tournamentGroupId: results.tournamentGroupId ?? null,
        updatedAt: now,
      },
    });

  // Prepare and upsert sections
  let saved = 0;
  for (const section of results.sections) {
    if (!section.ok || !section.payload) continue;
    const dataText = JSON.stringify(section.payload);

    await db
      .insert(dailySnapshotSection)
      .values({
        date: results.date as unknown as any,
        section: section.name,
        data: dataText,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [dailySnapshotSection.date, dailySnapshotSection.section],
        set: {
          data: dataText,
          updatedAt: now,
        },
      });

    saved += 1;
  }

  return { date: results.date, savedSections: saved };
};

export default runDailySnapshot;

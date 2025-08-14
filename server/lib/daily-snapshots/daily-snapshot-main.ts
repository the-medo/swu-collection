import prepareTournamentGroup from './prepare-tournament-group.ts';
import buildWeeklyChangeSection from './section/weekly-change.ts';
import buildMetaShare2WeeksSection from './section/meta-share-2-weeks.ts';
import {
  type DailySnapshotSectionData,
  type SectionWeeklyChange,
  type SectionMetaShare2Weeks,
} from '../../../types/DailySnapshots.ts';

export type SectionResult<T> = {
  name: string;
  ok: boolean;
  error?: string;
  payload?: DailySnapshotSectionData<T>;
};

export type DailySnapshotRunResult = {
  date: string;
  tournamentGroupId: string | null;
  sections: Array<SectionResult<SectionWeeklyChange> | SectionResult<SectionMetaShare2Weeks>>;
};

export const runDailySnapshot = async (dateInput?: Date | string): Promise<DailySnapshotRunResult> => {
  const context = await prepareTournamentGroup(dateInput);
  console.log(`[daily-snapshot] Preparing for date=${context.date}`);
  console.log(`[daily-snapshot] Two week tgid=${context.tournamentGroupIdTwoWeeks ?? 'none'}`);
  console.log(`[daily-snapshot] Weekend1 tgid=${context.tournamentGroupIdWeek1 ?? 'none'}`);
  console.log(`[daily-snapshot] Weekend2 tgid=${context.tournamentGroupIdWeek2 ?? 'none'}`);

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
    { name: 'weekly-change', exec: () => buildWeeklyChangeSection() },
    { name: 'meta-share-2-weeks', exec: () => buildMetaShare2WeeksSection() },
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

  return results;
};

runDailySnapshot();

export default runDailySnapshot;

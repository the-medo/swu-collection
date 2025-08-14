import { type DailySnapshotSectionData, type SectionWeeklyChange } from '../../../../types/DailySnapshots.ts';

export const buildWeeklyChangeSection = async (): Promise<DailySnapshotSectionData<SectionWeeklyChange>> => {
  // Dummy implementation without real data
  const data: SectionWeeklyChange = {
    id: 'weekly-change-row-1',
    week1: 100,
    week2: 105,
  };

  return {
    id: 'weekly-change',
    title: 'Weekly Change',
    data,
  };
};

export default buildWeeklyChangeSection;

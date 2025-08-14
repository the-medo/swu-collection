import { type DailySnapshotSectionData, type SectionMetaShare2Weeks } from '../../../../types/DailySnapshots.ts';

export const buildMetaShare2WeeksSection = async (): Promise<DailySnapshotSectionData<SectionMetaShare2Weeks>> => {
  // Dummy implementation without real data
  const data: SectionMetaShare2Weeks = {
    id: 'meta-share-2-weeks-block-1',
    total: [{ leaderId: 1 }, { leaderId: 2 }],
    top8: [{ leaderId: 1 }],
    winners: [{ leaderId: 2 }],
  };

  return {
    id: 'meta-share-2-weeks',
    title: 'Meta Share (2 Weeks)',
    data,
  };
};

export default buildMetaShare2WeeksSection;

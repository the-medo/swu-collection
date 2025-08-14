export type DailySnapshotSectionData<T> = {
  id: string;
  title: string;
  data: T;
};

export type SectionMetaShare2WeeksType = {
  leaderId: number;
};

export type SectionMetaShare2Weeks = {
  id: string;
  total: SectionMetaShare2WeeksType[];
  top8: SectionMetaShare2WeeksType[];
  winners: SectionMetaShare2WeeksType[];
};

export type SectionWeeklyChange = {
  id: string;
  week1: number;
  week2: number;
};

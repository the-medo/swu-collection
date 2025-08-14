export type DailySnapshotSectionData<T> = {
  id: string;
  title: string;
  data: T;
};

export type SectionMetaShare2WeeksDataPoint = {
  leaderCardId: string;
  baseCardId: string;
  total: number;
  top8: number;
  winners: number;
};

export type SectionMetaShare2Weeks = {
  tournamentGroupId: string;
  tournamentsImported: number;
  tournamentsTotal: number;
  tournamentsAttendance: number; // taken as a sum of the "total" datapoints, not from `tournament_group_stats`!
  dataPoints: SectionMetaShare2WeeksDataPoint[];
};

export type SectionWeeklyChange = {
  id: string;
  week1: number;
  week2: number;
};

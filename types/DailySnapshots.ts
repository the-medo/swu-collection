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

export type TournamentGroupData = {
  tournamentGroupId: string;
  tournamentsImported: number;
  tournamentsTotal: number;
  tournamentsAttendance: number; // taken as a sum of the "total" datapoints, not from `tournament_group_stats`!
};

export type SectionMetaShare2Weeks = TournamentGroupData & {
  dataPoints: SectionMetaShare2WeeksDataPoint[];
};

export type SectionWeeklyChangeDataPoint = {
  leaderCardId: string;
  baseCardId: string;
  week1: {
    total: number;
    top8: number;
  };
  week2: {
    total: number;
    top8: number;
  };
};

export type SectionWeeklyChange = {
  week1: TournamentGroupData;
  week2: TournamentGroupData;
  dataPoints: SectionWeeklyChangeDataPoint[];
};

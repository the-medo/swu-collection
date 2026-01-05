import type { TournamentGroup } from '../server/db/schema/tournament_group.ts';
import type { TournamentGroupStats } from '../server/db/schema/tournament_group_stats.ts';
import type { TournamentStringDate } from './Tournament.ts';
import type { TournamentDeck } from '../server/db/schema/tournament_deck.ts';
import type { Deck } from '../server/db/schema/deck.ts';
import TournamentOverviewTable from '../frontend/src/components/app/tournaments/components/TournamentOverviewTable.tsx';

export type DailySnapshotSectionData<T> = {
  id: string;
  title: string;
  data: T;
};

export type TournamentGroupExtendedInfo = {
  tournamentGroup: TournamentGroup;
  tournamentGroupStats: TournamentGroupStats;
};

export type SectionMetaShare2WeeksDataPoint = {
  leaderCardId: string;
  baseCardId: string;
  total: number;
  top8: number;
  winners: number;
};

export type SectionMetaShare2Weeks = {
  dataPoints: SectionMetaShare2WeeksDataPoint[];
  tournamentGroupExt?: TournamentGroupExtendedInfo | null;
};

export type SectionWeeklyChangeDataPoint = {
  leaderCardId: string;
  baseCardId: string;
  week1: {
    total: number;
    top8: number;
    champions: number;
  };
  week2: {
    total: number;
    top8: number;
    champions: number;
  };
};

export type SectionWeeklyChange = {
  week1Ext?: TournamentGroupExtendedInfo | null;
  week2Ext?: TournamentGroupExtendedInfo | null;
  dataPoints: SectionWeeklyChangeDataPoint[];
};

export type SectionRecentTournamentsItem = TournamentOverviewTable;

export type SectionRecentTournaments = {
  tournamentGroupId: string;
  tournaments: SectionRecentTournamentsItem[];
  tournamentGroupExt?: TournamentGroupExtendedInfo | null;
};

// New section: Upcoming Tournaments (current or upcoming weekend)
export type SectionUpcomingTournaments = {
  tournamentGroupId: string;
  dataPoints: TournamentStringDate[];
  upcomingMajorTournaments?: TournamentStringDate[]; // majors (SQ/RQ/GC) in the next 20 days
  tournamentGroupExt?: TournamentGroupExtendedInfo | null;
};

// New section: Most Played Cards (two-week group)
export type SectionMostPlayedCardsItem = {
  cardId: string;
  deckCount: number;
  countMd: number;
  countSb: number;
};

export type SectionMostPlayedCards = {
  tournamentGroupId: string;
  dataPoints: SectionMostPlayedCardsItem[];
  tournamentGroupExt?: TournamentGroupExtendedInfo | null;
};

// New section: Force vs. Non-Force (two-weeks + weeks)
export type ForceNonforcePair = { force: number; nonforce: number };
export type ForceNonforceSplit = {
  total: ForceNonforcePair;
  top8: ForceNonforcePair;
  champions: ForceNonforcePair;
};
export type SectionForceVsNonForceCounts = {
  twoWeeks: ForceNonforceSplit;
  week1: ForceNonforceSplit;
  week2: ForceNonforceSplit;
  twoWeeksGroupExt?: TournamentGroupExtendedInfo | null;
  week1GroupExt?: TournamentGroupExtendedInfo | null;
  week2GroupExt?: TournamentGroupExtendedInfo | null;
};

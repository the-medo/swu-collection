export type UserMeleeTournament = {
  meleeId: number;
  tournamentId: string | null;
  name: string;
  type: string | null;
  typeName: string | null;
  date: string;
  format: string | null;
  attendance: number;
  placement: number | null;
  record: string | null;
  completed: boolean;
  topEight: boolean;
  dayTwo: boolean;
  major: boolean;
  dayTwoEligible: boolean;
  dayTwoCutoffKnown: boolean;
  deck: { id: string; name: string } | null;
  meleeDecklistId: number | null;
  meleeDecklistName: string | null;
};

export type BestMajorFinish = {
  tournamentId: string;
  name: string;
  placement: number;
  attendance: number;
  date: string;
};

export type UserMeleeTournamentStats = {
  topEights: number;
  pqOpenTotal: number;
  dayTwos: number;
  majorTotal: number;
  unknownDayTwoCutoffs: number;
  bestMajorFinishes: BestMajorFinish[];
};

export type UserMeleeTournamentsResponse = {
  connected: boolean;
  lastRefreshedAt: string | null;
  nextRefreshAt: string | null;
  tournaments: UserMeleeTournament[];
  stats: UserMeleeTournamentStats;
};

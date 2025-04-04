export interface Tournament {
  id: string;
  userId: string;
  type: string;
  season: number;
  set: string;
  metaShakeup: string | null;
  location: string;
  continent: string;
  name: string;
  attendance: number;
  meleeId: string | null;
  format: number;
  days: number;
  date: string;
  createdAt: string;
  updatedAt: string;
}

export interface TournamentType {
  id: string;
  name: string;
  sortValue: number;
  major: number;
}

export interface TournamentData {
  tournament: Tournament;
  tournamentType: TournamentType;
  user: {
    id: string;
    displayName: string;
  };
}
